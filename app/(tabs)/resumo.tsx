import { IconSymbol } from '@/components/ui/icon-symbol';
import { useClientes } from '@/hooks/useClientes';
import { supabase } from '@/services/supabase';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

// ✅ IMPORT DO HOOK DE SEGURANÇA
import { useAssinatura } from '@/hooks/useAssinatura';

export default function ResumoScreen() {
  const { t } = useTranslation(); 
  const router = useRouter(); 
  
  // --- SEGURANÇA / BLOQUEIO ---
  const { isPremium, loading: loadingAssinatura } = useAssinatura();

  const { clientes, fetchData } = useClientes(); 
  const [totais, setTotais] = useState({ dia: 0, semana: 0, mes: 0 });
  const [historicoRecente, setHistoricoRecente] = useState<any[]>([]);
  
  // 🚀 NOVO: Estado para armazenar a previsão de recebimentos
  const [previsao, setPrevisao] = useState({ hoje: 0, proximos7: 0, proximos30: 0 });

  // --- LÓGICA DE PROTEÇÃO ---
  useFocusEffect(
    useCallback(() => {
      // Se terminou de carregar e NÃO é Premium -> Manda para a aba Planos
      if (!loadingAssinatura && !isPremium) {
        router.replace('/planos');
      }
    }, [isPremium, loadingAssinatura])
  );

  // Recalcula sempre que os dados mudarem
  useEffect(() => {
    calcularFinancas();
  }, [clientes]);

  useFocusEffect(
    useCallback(() => {
      // Só busca dados se for Premium (economia de recurso)
      if (isPremium) {
        fetchData();
      }
    }, [isPremium])
  );

  useEffect(() => {
    console.log("📊 Iniciando Realtime na tela de Resumo...");
    const canalResumo = supabase
      .channel('atualizacao-resumo')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contratos' }, 
        (payload) => {
          fetchData(); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalResumo);
    };
  }, []);

  const calcularFinancas = () => {
    let somaDia = 0;
    let somaSemana = 0;
    let somaMes = 0;
    let listaMov: any[] = [];

    // Variáveis da Previsão
    let prevHoje = 0;
    let prev7 = 0;
    let prev30 = 0;

    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay()); 
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    clientes.forEach(cli => {
      (cli.contratos || []).forEach(con => {
          
        // 🚀 LÓGICA DE PREVISÃO CUIDADOSA
        if (con.status === 'ATIVO' || con.status === 'PARCELADO') {
            if (con.proximoVencimento) {
                let dVenc: Date | null = null;
                if (con.proximoVencimento.includes('-')) {
                    const [y, m, d] = con.proximoVencimento.split('-');
                    dVenc = new Date(parseInt(y), parseInt(m)-1, parseInt(d));
                } else if (con.proximoVencimento.includes('/')) {
                    const [d, m, y] = con.proximoVencimento.split('/');
                    dVenc = new Date(parseInt(y), parseInt(m)-1, parseInt(d));
                }

                if (dVenc && !isNaN(dVenc.getTime())) {
                    dVenc.setHours(0,0,0,0);
                    
                    let valorEsperado = 0;
                    const isFracionado = ['PARCELADO', 'SEMANAL', 'QUINZENAL', 'DIARIO'].includes(con.frequencia || '') || (con.totalParcelas || 0) > 1;

                    // Aplica a inteligência dos centavos na previsão
                    if (isFracionado) {
                        const isUltima = ((con.parcelasPagas || 0) + 1) >= (con.totalParcelas || 1);
                        if (isUltima && con.valorUltimaParcela && con.valorUltimaParcela > 0) {
                            valorEsperado = con.valorUltimaParcela;
                        } else {
                            valorEsperado = con.valorParcela || 0;
                        }
                    } else {
                        // Se for mensal, o lucroJurosPorParcela é o valor padrão de renovação
                        valorEsperado = con.lucroJurosPorParcela || 0; 
                    }

                    const diffTime = dVenc.getTime() - hoje.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    // Acumula na caixinha certa
                    if (diffDays <= 0) {
                        prevHoje += valorEsperado; // Vence hoje ou está atrasado
                    } else if (diffDays > 0 && diffDays <= 7) {
                        prev7 += valorEsperado;
                    } else if (diffDays > 7 && diffDays <= 30) {
                        prev30 += valorEsperado;
                    }
                }
            }
        }

        // LÓGICA EXISTENTE DO HISTÓRICO E TOTAIS REAIS
        (con.movimentacoes || []).forEach(mov => {
          
          let dataMov: Date | null = null;
          let dataOriginal = '';

          // --- ESTRATÉGIA 1: ISO (YYYY-MM-DD) ---
          const isoMatch = mov.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (isoMatch) {
             const ano = parseInt(isoMatch[1]);
             const mes = parseInt(isoMatch[2]);
             const dia = parseInt(isoMatch[3]);
             dataMov = new Date(ano, mes - 1, dia);
             dataOriginal = isoMatch[0];
          } 
          else {
             // --- ESTRATÉGIA 2: FORMATO COM BARRAS (XX/XX/XXXX) ---
             const slashMatch = mov.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
             
             if (slashMatch) {
                const p1 = parseInt(slashMatch[1]); 
                const p2 = parseInt(slashMatch[2]); 
                const p3 = parseInt(slashMatch[3]); 

                const temIngles = /SETTLED|RECEIVED|RENEWAL|AGREEMENT|Daily|Weekly|Monthly/i.test(mov);

                if (p1 > 12) {
                    dataMov = new Date(p3, p2 - 1, p1);
                } else if (p2 > 12) {
                    dataMov = new Date(p3, p1 - 1, p2);
                } else {
                    if (temIngles) {
                        dataMov = new Date(p3, p1 - 1, p2);
                    } else {
                        dataMov = new Date(p3, p2 - 1, p1);
                    }
                }
                dataOriginal = slashMatch[0];
             }
          }

          if (!dataMov) return;

          // --- 3. VALOR (R$ ou $) ---
          const valueMatch = mov.match(/(?:R\$|\$)\s*([\d\.]+)/);
          let valor = 0;

          if (valueMatch) {
             valor = parseFloat(valueMatch[1]);
          }

          // --- 4. FILTRO DE OPERAÇÕES ---
          const isRecebimento = /Recebido|Received|Recibido|Parcela/i.test(mov); 
          const isQuitacao = /QUITADO|SETTLED|LIQUIDADO/i.test(mov);
          const isRenovacao = /RENOVAÇÃO|RENEWAL|RENOVACIÓN/i.test(mov);
          
          const ehOperacaoFinanceira = isRecebimento || isQuitacao || isRenovacao;

          if (valor > 0 && !isNaN(dataMov.getTime()) && ehOperacaoFinanceira) {
            
            const dMov = new Date(dataMov);
            dMov.setHours(0,0,0,0);

            if (dMov.getTime() === hoje.getTime()) {
              somaDia += valor;
            }

            if (dMov >= inicioSemana && dMov <= new Date()) {
              somaSemana += valor;
            }

            if (dMov.getMonth() === hoje.getMonth() && dMov.getFullYear() === hoje.getFullYear()) {
              somaMes += valor;
            }

            listaMov.push({
              cliente: cli.nome,
              descricao: mov, 
              dataOriginal: dataOriginal,
              valor: valor,
              rawDate: dataMov
            });
          }
        });
      });
    });

    listaMov.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());

    setTotais({ dia: somaDia, semana: somaSemana, mes: somaMes });
    setPrevisao({ hoje: prevHoje, proximos7: prev7, proximos30: prev30 });
    setHistoricoRecente(listaMov.slice(0, 15)); 
  };

  const moeda = t('common.moeda', { defaultValue: 'R$' });

  const CardResumo = ({ titulo, valor, cor, icone }: any) => (
    <View style={[styles.card, { borderLeftColor: cor }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitulo}>{titulo}</Text>
        <IconSymbol size={24} name={icone} color={cor} />
      </View>
      <Text style={[styles.cardValor, { color: cor }]}>{moeda} {valor.toFixed(2)}</Text>
    </View>
  );

  // 🚀 NOVO COMPONENTE: Card Menor para a Previsão
  const CardPrevisao = ({ titulo, valor, cor, icone }: any) => (
    <View style={[styles.cardPrevisao, { borderTopColor: cor }]}>
      <View style={styles.cardPrevisaoHeader}>
        <Text style={styles.cardTituloPrevisao}>{titulo}</Text>
        <IconSymbol size={18} name={icone} color={cor} />
      </View>
      <Text style={[styles.cardValorPrevisao, { color: cor }]}>{moeda} {valor.toFixed(2)}</Text>
    </View>
  );

  // --- BLOQUEIO VISUAL (LOADING / REDIRECIONAMENTO) ---
  if (loadingAssinatura || !isPremium) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f6fa' }}>
        <ActivityIndicator size="large" color="#2c3e50" />
      </View>
    );
  }

  // --- RENDERIZAÇÃO DA TELA ---
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.header}>{t('resumo.titulo', {defaultValue: 'Resumo Financeiro'})}</Text>
      
      <View style={styles.grid}>
        <CardResumo titulo={t('resumo.hoje', {defaultValue: 'Hoje'})} valor={totais.dia} cor="#27ae60" icone="calendar" />
        <CardResumo titulo={t('resumo.semana', {defaultValue: 'Semana'})} valor={totais.semana} cor="#2980b9" icone="calendar.badge.clock" />
        <CardResumo titulo={t('resumo.mes', {defaultValue: 'Mês'})} valor={totais.mes} cor="#8e44ad" icone="calendar.circle.fill" />
      </View>

      {/* 🚀 NOVA SEÇÃO DE PREVISÃO (Scrool Horizontal para não ocupar muito espaço vertical) */}
      <View style={styles.secaoPrevisao}>
        <Text style={styles.subTitulo}>{t('resumo.previsao', {defaultValue: 'Previsão de Recebimentos'})}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16, paddingBottom: 10 }}>
           <CardPrevisao titulo={t('resumo.prevHoje', {defaultValue: 'Hoje / Atrasado'})} valor={previsao.hoje} cor="#e74c3c" icone="exclamationmark.triangle.fill" />
           <CardPrevisao titulo={t('resumo.prev7', {defaultValue: 'Próx. 7 Dias'})} valor={previsao.proximos7} cor="#f39c12" icone="clock.arrow.circlepath" />
           <CardPrevisao titulo={t('resumo.prev30', {defaultValue: 'Próx. 30 Dias'})} valor={previsao.proximos30} cor="#3498db" icone="calendar.badge.plus" />
        </ScrollView>
      </View>

      <View style={styles.secaoHistorico}>
        <Text style={styles.subTitulo}>{t('resumo.ultimasMovimentacoes', {defaultValue: 'Últimas Movimentações'})}</Text>
        {historicoRecente.map((item, index) => (
          <View key={index} style={styles.itemHistorico}>
            <View style={{flex: 1, paddingRight: 10}}>
                <Text style={styles.histCliente}>{item.cliente}</Text>
                <Text style={styles.histDesc} numberOfLines={1}>
                    {item.descricao.replace(/^[\d\-\/]+:\s*/, '')}
                </Text>
                <Text style={styles.histData}>{item.dataOriginal}</Text>
            </View>
            <Text style={styles.histValor}>+ {moeda} {item.valor.toFixed(2)}</Text>
          </View>
        ))}
        {historicoRecente.length === 0 && (
            <Text style={styles.avisoVazio}>{t('resumo.vazio', {defaultValue: 'Nenhum recebimento encontrado.'})}</Text>
        )}
      </View>
      <View style={{height: 40}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa', padding: 16 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#2c3e50', marginTop: 10 },
  
  grid: { gap: 12 },
  card: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 5,
    elevation: 3,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: {width:0, height:2}
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  cardTitulo: { fontSize: 16, color: '#7f8c8d', fontWeight: '600' },
  cardValor: { fontSize: 28, fontWeight: 'bold' },

  // Estilos da nova seção de Previsão
  secaoPrevisao: { marginTop: 30 },
  cardPrevisao: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    borderTopWidth: 4,
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: {width:0, height:1},
    width: 150, 
    marginRight: 12
  },
  cardPrevisaoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTituloPrevisao: { fontSize: 12, color: '#7f8c8d', fontWeight: 'bold' },
  cardValorPrevisao: { fontSize: 18, fontWeight: 'bold' },

  secaoHistorico: { marginTop: 20 },
  subTitulo: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', marginBottom: 15 },
  itemHistorico: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  histCliente: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  histDesc: { fontSize: 13, color: '#555', marginTop: 2 },
  histData: { fontSize: 12, color: '#999', marginTop: 4 },
  histValor: { fontSize: 16, fontWeight: 'bold', color: '#27ae60' },
  avisoVazio: { textAlign:'center', color:'#999', marginTop: 20, fontStyle: 'italic' }
});
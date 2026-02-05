import { IconSymbol } from '@/components/ui/icon-symbol';
import { useClientes } from '@/hooks/useClientes';
import { supabase } from '@/services/supabase';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ResumoScreen() {
  const { t } = useTranslation(); 
  const { clientes, fetchData } = useClientes(); 
  const [totais, setTotais] = useState({ dia: 0, semana: 0, mes: 0 });
  const [historicoRecente, setHistoricoRecente] = useState<any[]>([]);

  // Recalcula sempre que os dados mudarem
  useEffect(() => {
    calcularFinancas();
  }, [clientes]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
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

    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay()); 
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    clientes.forEach(cli => {
      (cli.contratos || []).forEach(con => {
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
             // Aceita 1 ou 2 dígitos para dia/mês (d/m/yyyy ou dd/mm/yyyy)
             const slashMatch = mov.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
             
             if (slashMatch) {
                const p1 = parseInt(slashMatch[1]); // Primeiro número
                const p2 = parseInt(slashMatch[2]); // Segundo número
                const p3 = parseInt(slashMatch[3]); // Ano

                // --- LÓGICA CONTEXTUAL (O Segredo!) ---
                // Verifica se a linha tem palavras em INGLÊS
                const temIngles = /SETTLED|RECEIVED|RENEWAL|AGREEMENT|Daily|Weekly|Monthly/i.test(mov);

                if (p1 > 12) {
                    // Se o 1º nº é > 12, SÓ PODE SER DIA (25/02)
                    dataMov = new Date(p3, p2 - 1, p1);
                } else if (p2 > 12) {
                    // Se o 2º nº é > 12, SÓ PODE SER DIA (02/25) - Formato US
                    dataMov = new Date(p3, p1 - 1, p2);
                } else {
                    // AMBIGUIDADE (ex: 02/05 ou 2/5):
                    // Se a frase tem inglês, assume Mês/Dia. Senão, assume Dia/Mês.
                    if (temIngles) {
                        // Formato US: Mês/Dia/Ano
                        dataMov = new Date(p3, p1 - 1, p2);
                    } else {
                        // Formato BR: Dia/Mês/Ano
                        dataMov = new Date(p3, p2 - 1, p1);
                    }
                }
                dataOriginal = slashMatch[0];
             }
          }

          if (!dataMov) return;

          // --- 3. VALOR (R$ ou $) ---
          // Agora aceita espaços opcionais e formatos variados
          const valueMatch = mov.match(/(?:R\$|\$)\s*([\d\.]+)/);
          let valor = 0;

          if (valueMatch) {
             valor = parseFloat(valueMatch[1]);
          }

          // --- 4. FILTRO DE OPERAÇÕES ---
          // Aceita palavras de todos os idiomas
          const isRecebimento = /Recebido|Received|Recibido/i.test(mov);
          const isQuitacao = /QUITADO|SETTLED|LIQUIDADO/i.test(mov);
          const isRenovacao = /RENOVAÇÃO|RENEWAL|RENOVACIÓN/i.test(mov);
          const isAcordo = /ACORDO|AGREEMENT|ACUERDO/i.test(mov);

          const ehOperacaoFinanceira = isRecebimento || isQuitacao || isRenovacao || isAcordo;

          // Se achou valor e data válida
          if (valor > 0 && !isNaN(dataMov.getTime()) && ehOperacaoFinanceira) {
            
            // Compara datas zerando as horas para evitar bugs de fuso
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

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>{t('resumo.titulo')}</Text>
      
      <View style={styles.grid}>
        <CardResumo titulo={t('resumo.hoje')} valor={totais.dia} cor="#27ae60" icone="calendar" />
        <CardResumo titulo={t('resumo.semana')} valor={totais.semana} cor="#2980b9" icone="calendar.badge.clock" />
        <CardResumo titulo={t('resumo.mes')} valor={totais.mes} cor="#8e44ad" icone="calendar.circle.fill" />
      </View>

      <View style={styles.secaoHistorico}>
        <Text style={styles.subTitulo}>{t('resumo.ultimasMovimentacoes')}</Text>
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
            <Text style={styles.avisoVazio}>{t('resumo.vazio')}</Text>
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

  secaoHistorico: { marginTop: 30 },
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
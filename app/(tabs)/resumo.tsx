import { IconSymbol } from '@/components/ui/icon-symbol';
import { useClientes } from '@/hooks/useClientes';
import { supabase } from '@/services/supabase';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next'; // <--- Importação da tradução
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ResumoScreen() {
  const { t } = useTranslation(); // <--- Hook de tradução
  // Agora desestruturamos o fetchData também
  const { clientes, fetchData } = useClientes(); 
  const [totais, setTotais] = useState({ dia: 0, semana: 0, mes: 0 });
  const [historicoRecente, setHistoricoRecente] = useState<any[]>([]);

  // Atualiza os cálculos locais sempre que a lista de 'clientes' mudar
  useEffect(() => {
    calcularFinancas();
  }, [clientes]);

  // Recarrega dados do banco ao entrar na tela (Foco)
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  // --- ✅ NOVO: REALTIME NO RESUMO ---
  useEffect(() => {
    console.log("📊 Iniciando Realtime na tela de Resumo...");
    
    const canalResumo = supabase
      .channel('atualizacao-resumo')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contratos' }, // Monitora pagamentos/emprestimos
        (payload) => {
          console.log('💰 Pagamento/Alteração detectada! Atualizando Resumo...', payload);
          fetchData(); // Busca os dados atualizados do Supabase
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalResumo);
    };
  }, []);
  // --------------------------------

  const calcularFinancas = () => {
    let somaDia = 0;
    let somaSemana = 0;
    let somaMes = 0;
    let listaMov: any[] = [];

    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    // Configura datas de corte (Semana e Mês)
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay()); // Domingo
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    clientes.forEach(cli => {
      (cli.contratos || []).forEach(con => {
        (con.movimentacoes || []).forEach(mov => {
          
          // 1. Tenta encontrar a data no início da frase (dd/mm/yyyy)
          const dateMatch = mov.match(/(\d{2})\/(\d{2})\/(\d{4})/);
          if (!dateMatch) return;

          const dia = parseInt(dateMatch[1]);
          const mes = parseInt(dateMatch[2]);
          const ano = parseInt(dateMatch[3]);
          const dataMov = new Date(ano, mes - 1, dia);

          // 2. Tenta encontrar o valor (seja Recebido ou Total)
          let valor = 0;

          // Caso A: Pagamento de Parcela ("Recebido R$ 50.00")
          const matchRecebido = mov.match(/Recebido R\$\s*([\d\.]+)/);
          if (matchRecebido) {
             valor = parseFloat(matchRecebido[1]);
          } 
          // Caso B: Renovação ou Quitação ("Total R$ 150.00")
          else {
             const matchTotal = mov.match(/Total R\$\s*([\d\.]+)/);
             if (matchTotal && (mov.includes('RENOVAÇÃO') || mov.includes('QUITADO'))) {
                valor = parseFloat(matchTotal[1]);
             }
          }

          // Se achou um valor válido e uma data válida
          if (valor > 0 && !isNaN(dataMov.getTime())) {
            
            // Soma Dia
            if (dataMov.getTime() === hoje.getTime()) {
              somaDia += valor;
            }

            // Soma Semana (>= Domingo E <= Hoje)
            if (dataMov >= inicioSemana && dataMov <= new Date()) {
              somaSemana += valor;
            }

            // Soma Mês (Mesmo Mês e Ano)
            if (dataMov.getMonth() === hoje.getMonth() && dataMov.getFullYear() === hoje.getFullYear()) {
              somaMes += valor;
            }

            // Adiciona ao histórico
            listaMov.push({
              cliente: cli.nome,
              descricao: mov, // Guarda o texto original para exibir
              dataOriginal: dateMatch[0],
              valor: valor,
              rawDate: dataMov
            });
          }
        });
      });
    });

    // Ordena: Mais recente primeiro
    listaMov.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());

    setTotais({ dia: somaDia, semana: somaSemana, mes: somaMes });
    setHistoricoRecente(listaMov.slice(0, 15)); // Pega apenas os 15 últimos
  };

  const CardResumo = ({ titulo, valor, cor, icone }: any) => (
    <View style={[styles.card, { borderLeftColor: cor }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitulo}>{titulo}</Text>
        <IconSymbol size={24} name={icone} color={cor} />
      </View>
      <Text style={[styles.cardValor, { color: cor }]}>R$ {valor.toFixed(2)}</Text>
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
                {/* Mostra um resumo do texto (ex: "Recebido..." ou "Renovação...") */}
                <Text style={styles.histDesc} numberOfLines={1}>
                    {item.descricao.split(':')[1]?.trim() || item.descricao}
                </Text>
                <Text style={styles.histData}>{item.dataOriginal}</Text>
            </View>
            <Text style={styles.histValor}>+ R$ {item.valor.toFixed(2)}</Text>
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
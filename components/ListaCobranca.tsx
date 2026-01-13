import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Cliente } from '../types';

type Props = {
  clientes: Cliente[];
};

export default function ListaCobranca({ clientes }: Props) {
  
  // Função que converte qualquer data (do Banco ou do App) para data real
  const converterData = (dataStr: string) => {
    if (!dataStr) return new Date();
    
    // Suporte para formato do Banco (AAAA-MM-DD)
    if (dataStr.includes('-')) {
        const [ano, mes, dia] = dataStr.split('-');
        return new Date(Number(ano), Number(mes) - 1, Number(dia));
    }
    
    // Suporte para formato do App (DD/MM/AAAA)
    const [dia, mes, ano] = dataStr.split('/');
    return new Date(Number(ano), Number(mes) - 1, Number(dia));
  };

  const cobrarNoZap = (nome: string, zap: string, valor: string, data: string, atrasado: boolean) => {
    if (!zap) return Alert.alert("Erro", "Cliente sem número.");
    const numero = zap.replace(/\D/g, '');
    
    let msg = '';
    if (atrasado) {
        msg = `Olá ${nome}, constou aqui que seu pagamento de R$ ${valor} venceu dia ${data}. Podemos regularizar hoje?`;
    } else {
        msg = `Olá ${nome}, lembrete do vencimento hoje (${data}). Valor: R$ ${valor}. Aguardo confirmação!`;
    }
    
    Linking.openURL(`https://wa.me/55${numero}?text=${encodeURIComponent(msg)}`);
  };

  let listaVencidos: any[] = [];
  let listaHoje: any[] = [];
  let totalAtrasado = 0;
  let totalHoje = 0;
  
  // Define "Hoje" zerando as horas (para comparar só o dia)
  const hoje = new Date();
  hoje.setHours(0,0,0,0);

  clientes.forEach(cli => {
    (cli.contratos || []).forEach(con => {
      // Filtra: Só contratos Ativos ou Parcelados
      if (con.status === 'ATIVO' || con.status === 'PARCELADO') {
        
        const dataVenc = converterData(con.proximoVencimento); 
        // Zera as horas do vencimento também
        dataVenc.setHours(0,0,0,0);

        // Diferença em milissegundos
        const diffTime = hoje.getTime() - dataVenc.getTime();
        // Diferença em dias (arredondando para cima)
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        // Define valor a cobrar
        let valor = 0;
        if (con.status === 'PARCELADO') valor = con.valorParcela || 0;
        else valor = con.capital + (con.capital * (con.taxa / 100));

        const item = {
          cliente: cli.nome,
          whatsapp: cli.whatsapp,
          contrato: con,
          diasAtraso: diffDays,
          valorCobrar: valor,
          parcelaAtual: (con.parcelasPagas || 0) + 1 
        };

        // Lógica: 
        // diffDays > 0 -> Passado (Atrasado)
        // diffDays === 0 -> Hoje (Vence Hoje)
        if (diffDays > 0) {
          listaVencidos.push(item);
          totalAtrasado += valor;
        } else if (diffDays === 0) {
          listaHoje.push(item);
          totalHoje += valor;
        }
      }
    });
  });

  // Ordena: Mais atrasados aparecem primeiro
  listaVencidos.sort((a, b) => b.diasAtraso - a.diasAtraso);

  const renderCard = (item: any, corBorda: string, textoStatus: string) => (
    <View key={`${item.contrato.id}`} style={[styles.card, { borderLeftColor: corBorda }]}>
      <View style={styles.linhaTopo}>
        <View>
            <Text style={styles.nomeCliente}>{item.cliente}</Text>
            <Text style={[styles.status, {color: corBorda}]}>{textoStatus}</Text>
        </View>
        <TouchableOpacity 
            style={[styles.btnZapMini, {backgroundColor: corBorda === '#E74C3C' ? '#E74C3C' : '#F1C40F'}]} 
            onPress={() => cobrarNoZap(item.cliente, item.whatsapp, item.valorCobrar.toFixed(2), item.contrato.proximoVencimento, item.diasAtraso > 0)}
        >
            <Ionicons name="logo-whatsapp" size={16} color="#FFF" />
            <Text style={styles.txtZap}> COBRAR</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.detalhes}>
        <Text style={styles.data}>📅 Vencimento: {item.contrato.proximoVencimento}</Text>
        
        {item.contrato.status === 'PARCELADO' ? (
            <View style={styles.rowInfo}>
                <Text style={styles.tipo}>PARCELA {item.parcelaAtual}/{item.contrato.totalParcelas}</Text>
                <Text style={styles.valor}>R$ {item.valorCobrar.toFixed(2)}</Text>
            </View>
        ) : (
            <View style={styles.rowInfo}>
                <Text style={styles.tipo}>QUITAÇÃO TOTAL</Text>
                <Text style={styles.valor}>R$ {item.valorCobrar.toFixed(2)}</Text>
            </View>
        )}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      
      {/* PAINEL DE TOTAIS */}
      <View style={styles.painelResumo}>
        <View style={styles.boxTotal}>
           <Text style={styles.lblTotal}>TOTAL ATRASADO</Text>
           <Text style={[styles.vlrTotal, {color:'#E74C3C'}]}>R$ {totalAtrasado.toFixed(2)}</Text>
        </View>
        <View style={styles.divisor} />
        <View style={styles.boxTotal}>
           <Text style={styles.lblTotal}>VENCE HOJE</Text>
           <Text style={[styles.vlrTotal, {color:'#F1C40F'}]}>R$ {totalHoje.toFixed(2)}</Text>
        </View>
      </View>

      {/* SEÇÃO VENCIDOS */}
      {listaVencidos.length > 0 && (
        <View style={styles.secao}>
          <Text style={styles.tituloSecao}>🚨 VENCIDOS ({listaVencidos.length})</Text>
          {listaVencidos.map((item) => renderCard(item, '#E74C3C', `${item.diasAtraso} dias de atraso`))}
        </View>
      )}

      {/* SEÇÃO HOJE */}
      {listaHoje.length > 0 && (
        <View style={styles.secao}>
          <Text style={styles.tituloSecao}>⚠️ VENCE HOJE ({listaHoje.length})</Text>
          {listaHoje.map((item) => renderCard(item, '#F1C40F', 'Vence Hoje!'))}
        </View>
      )}

      {listaVencidos.length === 0 && listaHoje.length === 0 && (
        <View style={{alignItems:'center', marginTop: 50}}>
            <Ionicons name="checkmark-circle-outline" size={60} color="#27AE60" />
            <Text style={{color:'#7F8C8D', marginTop:10, fontSize: 16}}>Tudo em dia por aqui!</Text>
        </View>
      )}

      <View style={{height: 40}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  
  painelResumo: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 10, padding: 15, marginBottom: 20, elevation: 3 },
  boxTotal: { flex: 1, alignItems: 'center' },
  divisor: { width: 1, backgroundColor: '#EEE', marginHorizontal: 10 },
  lblTotal: { fontSize: 12, fontWeight: 'bold', color: '#7F8C8D' },
  vlrTotal: { fontSize: 18, fontWeight: 'bold', marginTop: 5 },

  secao: { marginBottom: 20 },
  tituloSecao: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50', marginBottom: 10, marginLeft: 5 },

  card: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginBottom: 10, borderLeftWidth: 5, elevation: 2 },
  linhaTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  nomeCliente: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  status: { fontSize: 12, fontWeight: 'bold' },
  btnZapMini: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  txtZap: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  detalhes: { marginTop: 5, backgroundColor: '#F9F9F9', padding: 10, borderRadius: 5 },
  data: { fontSize: 14, color: '#555', marginBottom: 8, fontWeight: '600' },
  rowInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tipo: { fontSize: 12, color: '#7F8C8D', fontWeight: 'bold' },
  valor: { fontSize: 16, color: '#2C3E50', fontWeight: 'bold' }
});
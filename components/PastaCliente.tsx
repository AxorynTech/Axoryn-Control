import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import { Alert, Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Cliente, Contrato } from '../types';

type Props = {
  cliente: Cliente;
  expandido: boolean;
  aoExpandir: () => void;
  aoNovoEmprestimo: () => void;
  aoEditarCliente: () => void;
  aoExcluirCliente: () => void;
  aoEditarContrato: (c: Contrato) => void;
  aoExcluirContrato: (id: number) => void;
  aoRenovarOuQuitar: (tipo: string, c: Contrato) => void;
  aoNegociar: (c: Contrato) => void;
  aoPagarParcela: (c: Contrato) => void;
};

export default function PastaCliente({ 
  cliente, expandido, aoExpandir, aoNovoEmprestimo, 
  aoEditarCliente, aoExcluirCliente, aoEditarContrato, aoExcluirContrato, 
  aoRenovarOuQuitar, aoNegociar, aoPagarParcela 
}: Props) {

  const [historicoVisivel, setHistoricoVisivel] = useState(false);
  const [historicoConteudo, setHistoricoConteudo] = useState<string[]>([]);

  const abrirWhatsapp = (numero: string) => {
    if (!numero) return Alert.alert("Ops", "Cliente sem número cadastrado.");
    const apenasNumeros = numero.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/55${apenasNumeros}`);
  };

  const abrirHistoricoCompleto = (movimentacoes: string[]) => {
    setHistoricoConteudo(movimentacoes || []);
    setHistoricoVisivel(true);
  };

  // --- FUNÇÃO DE PDF COMPLETA E BONITA (RESTAURADA) ---
  const gerarPDF = async (con: Contrato) => {
    try {
      const linhasHistorico = (con.movimentacoes || []).map(m => `
        <tr><td style="padding: 10px; border-bottom: 1px solid #ddd; color: #555;">${m}</td></tr>
      `).join('');

      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #333; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2980B9; padding-bottom: 15px; }
              .title { font-size: 24px; font-weight: bold; color: #2C3E50; margin: 0; }
              .box { background-color: #F4F6F7; padding: 20px; border-radius: 8px; margin-bottom: 25px; border: 1px solid #E5E8E8; }
              .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #BDC3C7; border-top: 1px solid #EEE; padding-top: 10px; }
            </style>
          </head>
          <body>
            <div class="header"><h1 class="title">Extrato Financeiro - Axoryn</h1></div>
            <div class="box">
              <h3>👤 ${cliente.nome}</h3>
              <div class="row"><span>Status:</span> <b>${con.status}</b></div>
              <div class="row"><span>Valor Original:</span> <b>R$ ${con.capital.toFixed(2)}</b></div>
              <div class="row"><span>Lucro Gerado:</span> <b style="color:#2980B9">R$ ${(con.lucroTotal || 0).toFixed(2)}</b></div>
            </div>
            <h3>Histórico Completo</h3>
            <table>${linhasHistorico}</table>
            <div class="footer">Gerado por Axoryn Control</div>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) { Alert.alert("Erro", "Falha ao gerar PDF."); }
  };
  
  // Função auxiliar para detectar se é Venda ou Empréstimo
  const getDetalhesContrato = (garantiaTexto: string = '') => {
    if (garantiaTexto && garantiaTexto.startsWith('PRODUTO:')) {
       return {
         ehVenda: true,
         texto: garantiaTexto.replace('PRODUTO:', '').trim(),
         label: '📦 Produtos:',
         icone: 'cart' as const,
         corIcone: '#E67E22' // Laranja para vendas
       };
    }
    return {
       ehVenda: false,
       texto: garantiaTexto || 'Nenhuma',
       label: '🔐 Garantia:',
       icone: 'lock-closed' as const,
       corIcone: '#7F8C8D' // Cinza para garantias
    };
  };

  return (
    <View style={styles.card}>
      <Modal visible={historicoVisivel} transparent animationType="fade" onRequestClose={() => setHistoricoVisivel(false)}>
        <View style={styles.modalFundo}>
            <View style={styles.modalConteudo}>
                <View style={styles.modalTopo}>
                    <Text style={styles.modalTitulo}>🔍 Histórico Completo</Text>
                    <TouchableOpacity onPress={() => setHistoricoVisivel(false)}>
                        <Ionicons name="close-circle" size={30} color="#E74C3C" />
                    </TouchableOpacity>
                </View>
                <ScrollView style={{maxHeight: 400}}>
                    {historicoConteudo.map((mov, i) => (
                        <View key={i} style={styles.itemHistoricoModal}>
                            <Text style={styles.txtHistoricoModal}>{mov}</Text>
                        </View>
                    ))}
                </ScrollView>
            </View>
        </View>
      </Modal>

      <TouchableOpacity onPress={aoExpandir} style={styles.header}>
        <View style={styles.linhaTitulo}>
            <Text style={styles.nome}>{cliente.nome}</Text>
            <Text style={styles.seta}>{expandido ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {expandido && (
        <View style={styles.corpo}>
          <View style={styles.fichaCadastral}>
            <TouchableOpacity onPress={() => abrirWhatsapp(cliente.whatsapp)} style={styles.btnZap}>
              <Text style={styles.txtZap}>💬 Conversar no WhatsApp</Text>
            </TouchableOpacity>
            
            <View style={{flexDirection:'row', alignItems:'center', marginBottom:5}}>
                <Ionicons name="pricetag" size={14} color="#2980B9" style={{marginRight:5}} />
                <Text style={{fontWeight:'bold', color:'#2980B9'}}>
                   {cliente.segmento === 'VENDA' ? 'VENDA' : cliente.segmento === 'AMBOS' ? 'EMPRÉSTIMO E VENDA' : 'EMPRÉSTIMO'}
                </Text>
            </View>

            <Text style={styles.linhaFicha}>📍 {cliente.endereco || 'Sem endereço'}</Text>
            {cliente.indicacao ? <Text style={styles.linhaFicha}>🤝 Indicado por: {cliente.indicacao}</Text> : null}
            <Text style={styles.linhaFicha}>⭐ Reputação: {cliente.reputacao || 'Neutro'}</Text>
          </View>

          <View style={styles.acoesCliente}>
            <TouchableOpacity onPress={aoEditarCliente} style={styles.btnAcaoCli}><Text style={styles.txtAcaoCli}>Editar</Text></TouchableOpacity>
            <TouchableOpacity onPress={aoNovoEmprestimo} style={[styles.btnAcaoCli, {backgroundColor:'#2980B9'}]}><Text style={[styles.txtAcaoCli, {color:'#FFF'}]}>+ Novo</Text></TouchableOpacity>
            <TouchableOpacity onPress={aoExcluirCliente} style={[styles.btnAcaoCli, {backgroundColor:'#E74C3C'}]}><Text style={[styles.txtAcaoCli, {color:'#FFF'}]}>Excluir</Text></TouchableOpacity>
          </View>

          {cliente.contratos && cliente.contratos.map((con) => {
            const detalhes = getDetalhesContrato(con.garantia);
            
            return (
            <View key={con.id} style={[styles.contrato, con.status === 'QUITADO' && styles.quitado]}>
              <View style={styles.conHeader}>
                <View>
                  <Text style={styles.conId}>Contrato #{con.id}</Text>
                  <Text style={styles.conValor}>R$ {con.capital?.toFixed(2)}</Text>
                </View>
                <View style={{flexDirection:'row', alignItems:'center', gap: 10}}>
                  <View style={[styles.badge, con.status === 'QUITADO' ? {backgroundColor:'#CCC'} : con.status === 'PARCELADO' ? {backgroundColor:'#8E44AD'} : {backgroundColor:'#E67E22'}]}>
                    <Text style={styles.badgeTxt}>{con.status}</Text>
                  </View>
                  <TouchableOpacity onPress={() => abrirHistoricoCompleto(con.movimentacoes || [])} style={styles.btnIcone}>
                     <Ionicons name="search-circle" size={28} color="#2980B9" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => gerarPDF(con)} style={styles.btnIcone}>
                     <Text style={{fontSize:18}}>📄</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.boxVencimento}>
                <Ionicons name="calendar" size={18} color="#C0392B" style={{marginRight: 6}} />
                <Text style={styles.txtVencimento}>VENCE DIA: {con.proximoVencimento}</Text>
              </View>

              {/* LÓGICA DE EXIBIÇÃO: PRODUTO ou GARANTIA */}
              <View style={{flexDirection:'row', alignItems:'flex-start', marginBottom: 5}}>
                 <Ionicons name={detalhes.icone} size={16} color={detalhes.corIcone} style={{marginTop:2, marginRight:5}} />
                 <Text style={{fontSize:13, color:'#444', flex:1}}>
                    <Text style={{fontWeight:'bold'}}>{detalhes.label} </Text>
                    {detalhes.texto}
                 </Text>
              </View>

              {con.status === 'PARCELADO' ? (
                 <View style={{marginTop: 5}}>
                   <Text style={{fontWeight:'bold', color:'#8E44AD'}}>
                     Progresso: {con.parcelasPagas}/{con.totalParcelas} Pagas (R$ {con.valorParcela?.toFixed(2)})
                   </Text>
                 </View>
              ) : (
                 <Text style={styles.info}>Juros: {con.taxa}% ({con.frequencia || 'MENSAL'})</Text>
              )}

              {con.status !== 'QUITADO' && (
                <View style={styles.botoesCon}>
                  {con.status === 'ATIVO' ? (
                    <>
                      <TouchableOpacity onPress={() => aoRenovarOuQuitar('RENOVAR', con)} style={styles.btnRenovar}><Text style={styles.txtBtn}>RENOVAR</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => aoRenovarOuQuitar('QUITAR', con)} style={styles.btnQuitar}><Text style={styles.txtBtn}>QUITAR</Text></TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity onPress={() => aoPagarParcela(con)} style={styles.btnParcela}><Text style={styles.txtBtn}>PAGAR PARCELA {((con.parcelasPagas||0)+1)}/{con.totalParcelas}</Text></TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => aoExcluirContrato(con.id)} style={styles.btnLixo}><Text>🗑</Text></TouchableOpacity>
                </View>
              )}

              {con.status === 'ATIVO' && (
                <TouchableOpacity onPress={() => aoNegociar(con)} style={styles.btnNegociar}><Text style={styles.txtBtn}>NEGOCIAR / PARCELAR DÍVIDA</Text></TouchableOpacity>
              )}

              <View style={styles.historicoResumido}>
                 <Text style={{fontSize:10, fontWeight:'bold', color:'#999', marginBottom:2}}>ÚLTIMAS MOVIMENTAÇÕES (Resumo):</Text>
                 {con.movimentacoes?.slice(0, 3).map((m, k) => <Text key={k} style={{fontSize:10, color:'#555'}}>{m}</Text>)}
              </View>
            </View>
          )})}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF', borderRadius: 10, marginBottom: 10, elevation: 2 },
  header: { padding: 15 }, 
  linhaTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nome: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50' }, 
  seta: { fontSize: 18, color: '#BDC3C7' },
  corpo: { padding: 15, borderTopWidth: 1, borderTopColor: '#F0F2F5' },
  fichaCadastral: { backgroundColor: '#F8F9FA', padding: 10, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#EEE' },
  btnZap: { backgroundColor: '#25D366', paddingVertical: 8, borderRadius: 20, alignItems: 'center', marginBottom: 10, flexDirection: 'row', justifyContent: 'center' },
  txtZap: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  linhaFicha: { fontSize: 13, color: '#444', marginBottom: 3 },
  acoesCliente: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 15 },
  btnAcaoCli: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#EEE', marginLeft: 8 },
  txtAcaoCli: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  contrato: { backgroundColor: '#F8F9F9', borderRadius: 8, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E5E8E8' },
  quitado: { opacity: 0.6, backgroundColor: '#EAEDED' },
  conHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 },
  conId: { fontSize: 10, color: '#7F8C8D', fontWeight: 'bold' },
  conValor: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeTxt: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  btnIcone: { paddingHorizontal: 5 },
  boxVencimento: { backgroundColor: '#FDEDEC', borderRadius: 6, padding: 8, marginVertical: 8, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#E74C3C' },
  txtVencimento: { color: '#C0392B', fontWeight: 'bold', fontSize: 14 },
  info: { fontSize: 12, color: '#555', marginBottom: 2 },
  botoesCon: { flexDirection: 'row', marginTop: 10, gap: 8 },
  btnRenovar: { flex: 1, backgroundColor: '#2980B9', padding: 10, borderRadius: 6, alignItems: 'center' }, 
  btnQuitar: { flex: 1, backgroundColor: '#E74C3C', padding: 10, borderRadius: 6, alignItems: 'center' }, 
  btnParcela: { flex: 1, backgroundColor: '#8E44AD', padding: 10, borderRadius: 6, alignItems: 'center' },
  btnLixo: { padding: 10, justifyContent: 'center' },
  txtBtn: { color: '#FFF', fontWeight: 'bold', fontSize: 11 },
  btnNegociar: { marginTop: 8, backgroundColor: '#9B59B6', padding: 8, borderRadius: 6, alignItems: 'center' },
  historicoResumido: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#DDD', paddingTop: 5 },
  modalFundo: { flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'center', padding: 20 },
  modalConteudo: { backgroundColor:'#FFF', borderRadius: 10, padding: 20, maxHeight: '80%' },
  modalTopo: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 15, borderBottomWidth:1, borderBottomColor:'#EEE', paddingBottom:10 },
  modalTitulo: { fontSize: 20, fontWeight:'bold', color:'#2C3E50' }, 
  itemHistoricoModal: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }, 
  txtHistoricoModal: { fontSize: 18, color: '#333' } 
});
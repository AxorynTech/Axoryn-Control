import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Cliente, Contrato } from '../types';
import RiskRadarCSI from './RiskRadarCSI';

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
  aoAlternarBloqueio: (c: Cliente) => void;
};

export default function PastaCliente({ 
  cliente, expandido, aoExpandir, aoNovoEmprestimo, 
  aoEditarCliente, aoExcluirCliente, aoEditarContrato, aoExcluirContrato, 
  aoRenovarOuQuitar, aoNegociar, aoPagarParcela,
  aoAlternarBloqueio 
}: Props) {

  const { t } = useTranslation();
  const [historicoVisivel, setHistoricoVisivel] = useState(false);
  const [historicoConteudo, setHistoricoConteudo] = useState<string[]>([]);

  // --- HELPERS DE TRADUÇÃO ---
  const traduzirStatus = (status: string) => {
      return t(`status.${status}`, { defaultValue: status });
  };

  const traduzirFrequencia = (freq: string) => {
      return t(`novoContrato.freq${freq}`, { defaultValue: freq });
  };

  const abrirWhatsapp = (numero: string) => {
    if (!numero) return Alert.alert("Ops", t('pastaCliente.erroZap') || "Cliente sem número cadastrado.");
    const apenasNumeros = numero.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/55${apenasNumeros}`);
  };

  const abrirHistoricoCompleto = (movimentacoes: string[]) => {
    setHistoricoConteudo(movimentacoes || []);
    setHistoricoVisivel(true);
  };

  const handleNovoEmprestimo = () => {
    if (cliente.bloqueado) {
      return Alert.alert(
        t('pastaCliente.bloqueadoTitulo') || "🚫 Cliente Bloqueado", 
        t('pastaCliente.bloqueadoMsg') || "Este cliente possui um bloqueio administrativo. Remova o cadeado para criar novos empréstimos."
      );
    }
    aoNovoEmprestimo();
  };

  // --- FUNÇÕES DE EXCLUSÃO BLINDADAS (WEB x MOBILE) ---
  const handleExcluirCliente = () => {
      if (Platform.OS === 'web') {
          if (window.confirm(`${t('fluxo.excluirTitulo')}\n\n${t('fluxo.excluirMsg')} ${cliente.nome}?`)) {
              aoExcluirCliente();
          }
      } else {
          Alert.alert(
              t('fluxo.excluirTitulo'), 
              `${t('fluxo.excluirMsg')} ${cliente.nome}?`,
              [
                  { text: t('common.cancelar'), style: 'cancel' },
                  { 
                    text: t('fluxo.btnApagar'), 
                    style: 'destructive', 
                    onPress: () => aoExcluirCliente() 
                  }
              ]
          );
      }
  };

  const handleExcluirContrato = (id: number) => {
      if (Platform.OS === 'web') {
          if (window.confirm(`${t('fluxo.excluirTitulo')}\n\nDeseja realmente excluir este contrato?`)) {
              aoExcluirContrato(id);
          }
      } else {
          Alert.alert(
              t('fluxo.excluirTitulo'),
              "Deseja realmente excluir este contrato?",
              [
                  { text: t('common.cancelar'), style: 'cancel' },
                  { 
                    text: t('fluxo.btnApagar'), 
                    style: 'destructive', 
                    onPress: () => aoExcluirContrato(id) 
                  }
              ]
          );
      }
  };

  // --- LÓGICA DO PDF (WEB + MOBILE) ---
  const gerarPDF = async (con: Contrato) => {
    try {
      const dataEmissao = new Date().toLocaleDateString('pt-BR');
      const isVenda = con.frequencia === 'PARCELADO' || (con.garantia && con.garantia.startsWith('PRODUTO:'));
      const labelGarantia = isVenda ? (t('pdf.produtoServico') || '📦 Produto/Serviço') : (t('pdf.garantia') || '🔐 Garantia');
      const textoGarantia = con.garantia ? con.garantia.replace('PRODUTO:', '').trim() : (t('pdf.naoInformada') || 'Não informada');

      const statusPDF = traduzirStatus(con.status);
      const freqPDF = traduzirFrequencia(con.frequencia || 'MENSAL');

      const linhasHistorico = (con.movimentacoes || []).map((m, index) => `
        <tr style="background-color: ${index % 2 === 0 ? '#fff' : '#f9f9f9'}">
          <td style="padding: 8px; border-bottom: 1px solid #eee; color: #555; font-size: 12px;">${m}</td>
        </tr>
      `).join('');

      let infoExtra = '';
      if (con.status === 'PARCELADO') {
        infoExtra = `
          <div class="item"><span>${t('pdf.parcelas') || 'Parcelas'}:</span> <b>${con.parcelasPagas}/${con.totalParcelas}</b></div>
          <div class="item"><span>${t('pdf.valorParcela') || 'Valor Parcela'}:</span> <b>R$ ${(con.valorParcela || 0).toFixed(2)}</b></div>
        `;
      } else {
        infoExtra = `
          <div class="item"><span>${t('pdf.taxaJuros') || 'Taxa de Juros'}:</span> <b>${con.taxa}%</b></div>
          <div class="item"><span>${t('pdf.multaDiaria') || 'Multa Diária'}:</span> <b>R$ ${(con.valorMultaDiaria || 0).toFixed(2)}</b></div>
        `;
      }

      // HTML DO RELATÓRIO
      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; -webkit-print-color-adjust: exact; }
              .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2980B9; padding-bottom: 10px; margin-bottom: 20px; }
              .brand { font-size: 24px; font-weight: bold; color: #2C3E50; }
              .meta { text-align: right; font-size: 10px; color: #7F8C8D; }
              h2 { color: #2980B9; margin-bottom: 5px; margin-top: 0; font-size: 18px; }
              .grid-container { display: flex; gap: 20px; margin-bottom: 20px; }
              .box { flex: 1; background-color: #F4F6F7; padding: 15px; border-radius: 6px; border: 1px solid #E5E8E8; }
              .label { font-size: 10px; color: #7F8C8D; text-transform: uppercase; font-weight: bold; margin-bottom: 2px; }
              .value { font-size: 14px; color: #2C3E50; font-weight: bold; margin-bottom: 8px; display: block; }
              .row-items { display: flex; flex-wrap: wrap; gap: 15px; }
              .item { flex: 1; min-width: 45%; font-size: 12px; margin-bottom: 4px; }
              .item span { color: #7f8c8d; }
              h3 { border-left: 4px solid #E67E22; padding-left: 10px; font-size: 16px; color: #2C3E50; margin-top: 30px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th { text-align: left; background-color: #EEE; padding: 8px; font-size: 12px; }
              .footer { margin-top: 50px; text-align: center; font-size: 9px; color: #BDC3C7; border-top: 1px solid #EEE; padding-top: 10px; }
              @media print {
                body { padding: 20px; }
                .box { background-color: #f4f6f7 !important; -webkit-print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="brand">Axoryn Control</div>
              <div class="meta">
                ${t('pdf.emissao') || 'EMISSÃO'}: ${dataEmissao}<br/>
                ${t('pdf.contratoN') || 'CONTRATO Nº'}: <b>${con.id}</b>
              </div>
            </div>
            <div class="grid-container">
              <div class="box">
                <div class="label">${t('pdf.cliente') || 'CLIENTE'}</div>
                <span class="value">${cliente.nome}</span>
                <div class="item"><span>WhatsApp:</span> ${cliente.whatsapp || '-'}</div>
                <div class="item"><span>${t('pdf.endereco') || 'Endereço'}:</span> ${cliente.endereco || '-'}</div>
              </div>
              <div class="box">
                <div class="label">${t('pdf.resumoFinanceiro') || 'RESUMO FINANCEIRO'}</div>
                <div class="row-items">
                  <div class="item"><span>Status:</span> <b>${statusPDF}</b></div>
                  <div class="item"><span>${t('pdf.frequencia') || 'Frequência'}:</span> <b>${freqPDF}</b></div>
                  <div class="item"><span>${t('pdf.inicio') || 'Início'}:</span> ${con.dataInicio || '-'}</div>
                  <div class="item"><span>${t('pdf.vencimento') || 'Vencimento'}:</span> <b style="color:#C0392B">${con.proximoVencimento}</b></div>
                </div>
              </div>
            </div>
            <div class="box" style="background-color: #FFF; border: 2px solid #F0F2F5;">
               <div class="row-items">
                  <div class="item" style="font-size:14px"><span>${t('pdf.valorPrincipal') || 'Valor Principal'}:</span> <b style="color:#27AE60">R$ ${con.capital.toFixed(2)}</b></div>
                  <div class="item" style="font-size:14px"><span>${t('pdf.jurosRecebidos') || 'Juros Recebidos'}:</span> <b style="color:#2980B9">R$ ${(con.lucroTotal || 0).toFixed(2)}</b></div>
                  <div class="item" style="font-size:14px"><span>${t('pdf.multasRecebidas') || 'Multas Recebidas'}:</span> <b style="color:#E67E22">R$ ${(con.multasPagas || 0).toFixed(2)}</b></div>
               </div>
               <hr style="border:0; border-top:1px solid #eee; margin: 10px 0;"/>
               <div class="row-items">
                  <div class="item"><span>${labelGarantia}:</span> <b>${textoGarantia}</b></div>
                  ${infoExtra}
               </div>
            </div>
            <h3>${t('pdf.historicoTitulo') || 'Histórico de Movimentações'}</h3>
            <table>
              <thead>
                <tr><th>${t('pdf.colunaDescricao') || 'DESCRIÇÃO DA OPERAÇÃO'}</th></tr>
              </thead>
              <tbody>${linhasHistorico}</tbody>
            </table>
            <div class="footer">${t('pdf.rodape1') || 'Documento gerado eletronicamente pelo sistema Axoryn Control.'}<br/>${t('pdf.rodape2') || 'Este extrato serve para simples conferência.'}</div>
          </body>
        </html>
      `;

      // --- CORREÇÃO BLINDADA: WEB (IFRAME) x MOBILE (NATIVO) ---
      if (Platform.OS === 'web') {
          // WEB: Cria um iframe invisível para imprimir APENAS o conteúdo do relatório
          const iframe = document.createElement('iframe');
          iframe.style.position = 'absolute';
          iframe.style.width = '0px';
          iframe.style.height = '0px';
          iframe.style.border = 'none';
          document.body.appendChild(iframe);

          const doc = iframe.contentWindow?.document;
          if (doc) {
              doc.open();
              doc.write(html);
              doc.close();
              
              // Foca no iframe e imprime
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
          }

          // Remove o iframe do DOM após um tempo para limpar
          setTimeout(() => {
              document.body.removeChild(iframe);
          }, 1000);

      } else {
          // MOBILE: Gera arquivo temporário e abre o compartilhamento
          const { uri } = await Print.printToFileAsync({ html });
          await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }

    } catch (error) { 
      console.log(error);
      Alert.alert(t('common.erro'), t('pdf.erroGerar') || "Falha ao gerar PDF."); 
    }
  };
  
  const getDetalhesContrato = (garantiaTexto: string = '') => {
    if (garantiaTexto && garantiaTexto.startsWith('PRODUTO:')) {
       return { 
         ehVenda: true, 
         texto: garantiaTexto.replace('PRODUTO:', '').trim(), 
         label: t('pastaCliente.labelProdutos') || '📦 Produtos:', 
         icone: 'cart' as const, 
         corIcone: '#E67E22' 
       };
    }
    return { 
      ehVenda: false, 
      texto: garantiaTexto || (t('pastaCliente.nenhuma') || 'Nenhuma'), 
      label: t('pastaCliente.labelGarantia') || '🔐 Garantia:', 
      icone: 'lock-closed' as const, 
      corIcone: '#7F8C8D' 
    };
  };

  return (
    <View style={styles.card}>
      <Modal visible={historicoVisivel} transparent animationType="fade" onRequestClose={() => setHistoricoVisivel(false)}>
        <View style={styles.modalFundo}>
            <View style={styles.modalConteudo}>
                <View style={styles.modalTopo}>
                    <Text style={styles.modalTitulo}>{t('pastaCliente.historicoTitulo')}</Text>
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

      {/* HEADER DA PASTA (CLICÁVEL PARA ABRIR) */}
      <TouchableOpacity onPress={aoExpandir} style={styles.header}>
        <View style={styles.linhaTitulo}>
            <View style={{flexDirection:'row', alignItems:'center'}}>
                {cliente.bloqueado && <Text style={{fontSize:18, marginRight:5}}>🔒</Text>}
                <Text style={[styles.nome, cliente.bloqueado && {color:'#999'}]}>{cliente.nome}</Text>
            </View>
            <Text style={styles.seta}>{expandido ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {/* CONTEÚDO EXPANDIDO */}
      {expandido && (
        <View style={styles.corpo}>
          
          <View style={styles.fichaCadastral}>
            <TouchableOpacity onPress={() => abrirWhatsapp(cliente.whatsapp)} style={styles.btnZap}>
              <Text style={styles.txtZap}>{t('pastaCliente.btnZap')}</Text>
            </TouchableOpacity>
            
            <View style={{flexDirection:'row', alignItems:'center', marginBottom:5}}>
                <Ionicons name="pricetag" size={14} color="#2980B9" style={{marginRight:5}} />
                <Text style={{fontWeight:'bold', color:'#2980B9'}}>
                   {cliente.segmento === 'VENDA' ? t('cadastro.segVenda') : cliente.segmento === 'AMBOS' ? t('cadastro.segAmbos') : t('cadastro.segEmprestimo')}
                </Text>
            </View>

            <Text style={styles.linhaFicha}>📍 {cliente.endereco || t('pastaCliente.semEndereco')}</Text>
            {cliente.indicacao ? <Text style={styles.linhaFicha}>🤝 {t('pastaCliente.indicadoPor')}: {cliente.indicacao}</Text> : null}
            <Text style={styles.linhaFicha}>⭐ {t('pastaCliente.reputacao')}: {cliente.reputacao || 'Neutro'}</Text>
          </View>

          {/* ================================================= */}
          {/* =========== RADAR DE RISCO AUTOMÁTICO =========== */}
          {/* ================================================= */}
          <View style={styles.radarContainer}>
             <Text style={styles.radarLabel}>{t('radar.tituloSection')}</Text>
             <RiskRadarCSI 
               compacto={true}
               initialNome={cliente.nome}
               initialTelefone={cliente.whatsapp}
               initialCpf={cliente.cpf}
             />
          </View>
          {/* ================================================= */}

          <View style={styles.acoesCliente}>
            <TouchableOpacity 
                onPress={() => aoAlternarBloqueio(cliente)} 
                style={[styles.btnAcaoCli, {backgroundColor: cliente.bloqueado ? '#27AE60' : '#FFC300'}]}
            >
                <Text style={[styles.txtAcaoCli, {color: '#FFF'}]}>
                    {cliente.bloqueado ? t('pastaCliente.desbloquear') : t('pastaCliente.bloquear')}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={aoEditarCliente} style={styles.btnAcaoCli}><Text style={styles.txtAcaoCli}>{t('pastaCliente.editar')}</Text></TouchableOpacity>
            
            <TouchableOpacity 
                onPress={handleNovoEmprestimo} 
                style={[styles.btnAcaoCli, {backgroundColor: cliente.bloqueado ? '#CCC' : '#2980B9'}]}
            >
                <Text style={[styles.txtAcaoCli, {color:'#FFF'}]}>{t('pastaCliente.novo')}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleExcluirCliente} style={[styles.btnAcaoCli, {backgroundColor:'#E74C3C'}]}><Text style={[styles.txtAcaoCli, {color:'#FFF'}]}>{t('pastaCliente.excluir')}</Text></TouchableOpacity>
          </View>

          {cliente.contratos && cliente.contratos.map((con) => {
            const detalhes = getDetalhesContrato(con.garantia);
            
            return (
            <View key={con.id} style={[styles.contrato, con.status === 'QUITADO' && styles.quitado]}>
              <View style={styles.conHeader}>
                <View>
                  <Text style={styles.conId}>{t('pastaCliente.contrato')} #{con.id}</Text>
                  <Text style={styles.conValor}>R$ {con.capital?.toFixed(2)}</Text>
                </View>
                <View style={{flexDirection:'row', alignItems:'center', gap: 10}}>
                  <View style={[styles.badge, con.status === 'QUITADO' ? {backgroundColor:'#CCC'} : con.status === 'PARCELADO' ? {backgroundColor:'#8E44AD'} : {backgroundColor:'#E67E22'}]}>
                    <Text style={styles.badgeTxt}>{traduzirStatus(con.status)}</Text>
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
                <Text style={styles.txtVencimento}>{t('pastaCliente.venceDia')} {con.proximoVencimento}</Text>
              </View>

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
                     {t('pastaCliente.progresso')}: {con.parcelasPagas}/{con.totalParcelas} {t('pastaCliente.pagas')} (R$ {con.valorParcela?.toFixed(2)})
                   </Text>
                 </View>
              ) : (
                 <Text style={styles.info}>{t('pastaCliente.juros')}: {con.taxa}% ({traduzirFrequencia(con.frequencia || 'MENSAL')})</Text>
              )}

              {con.status !== 'QUITADO' && (
                <View style={styles.botoesCon}>
                  {con.status === 'ATIVO' ? (
                    <>
                      <TouchableOpacity onPress={() => aoRenovarOuQuitar('RENOVAR', con)} style={styles.btnRenovar}><Text style={styles.txtBtn}>{t('pastaCliente.renovar')}</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => aoRenovarOuQuitar('QUITAR', con)} style={styles.btnQuitar}><Text style={styles.txtBtn}>{t('pastaCliente.quitar')}</Text></TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity onPress={() => aoPagarParcela(con)} style={styles.btnParcela}><Text style={styles.txtBtn}>{t('pastaCliente.pagarParcela')} {((con.parcelasPagas||0)+1)}/{con.totalParcelas}</Text></TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => handleExcluirContrato(con.id)} style={styles.btnLixo}><Text>🗑</Text></TouchableOpacity>
                </View>
              )}

              {con.status === 'ATIVO' && (
                <TouchableOpacity onPress={() => aoNegociar(con)} style={styles.btnNegociar}><Text style={styles.txtBtn}>{t('pastaCliente.negociar')}</Text></TouchableOpacity>
              )}

              <View style={styles.historicoResumido}>
                 <Text style={{fontSize:10, fontWeight:'bold', color:'#999', marginBottom:2}}>{t('pastaCliente.ultimasMovimentacoes')}</Text>
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
  radarContainer: { marginBottom: 20, backgroundColor: '#EBF5FB', padding: 5, borderRadius: 8, borderWidth: 1, borderColor: '#AED6F1' },
  radarLabel: { fontSize: 10, color: '#2980B9', fontWeight: 'bold', marginBottom: 5, textAlign: 'center' },
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
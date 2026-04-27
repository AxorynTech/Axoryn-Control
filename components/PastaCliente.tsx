import { Ionicons } from '@expo/vector-icons'; // ⬅️ INJETADO PARA O ÍCONE DE ADICIONAR/REMOVER DATAS
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Image,
  InteractionManager,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../services/supabase';
import { Cliente, Contrato } from '../types';
import RiskRadarCSI from './RiskRadarCSI';

import ModalAbaterEmprestimo from './ModalAbaterEmprestimo';
import ModalEditarEmprestimo from './ModalEditarEmprestimo';

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
  aoAbaterEmprestimo?: (nomeCliente: string, c: Contrato, valorCap: number, valorJur: number, data: string) => void;
};

export default function PastaCliente({ 
  cliente, expandido, aoExpandir, aoNovoEmprestimo, 
  aoEditarCliente, aoExcluirCliente, aoEditarContrato, aoExcluirContrato, 
  aoRenovarOuQuitar, aoNegociar, aoPagarParcela,
  aoAlternarBloqueio, aoAbaterEmprestimo
}: Props) {

  const { t } = useTranslation();
  const [historicoVisivel, setHistoricoVisivel] = useState(false);
  const [historicoConteudo, setHistoricoConteudo] = useState<string[]>([]);

  const [urlFotoRosto, setUrlFotoRosto] = useState<string | null>(null);
  const [urlFotoDoc, setUrlFotoDoc] = useState<string | null>(null);
  const [carregandoFotos, setCarregandoFotos] = useState(false);
  const [fotoExpandida, setFotoExpandida] = useState<string | null>(null); 

  const [modalEditarContratoVisivel, setModalEditarContratoVisivel] = useState(false);
  const [contratoSendoEditado, setContratoSendoEditado] = useState<Contrato | null>(null);

  const [modalAbaterVisivel, setModalAbaterVisivel] = useState(false);
  const [contratoParaAbater, setContratoParaAbater] = useState<Contrato | null>(null);

  // 🚀 ARQUITETURA: Previne Network Storm e Memory Leaks no iOS
  useEffect(() => {
      let isMounted = true; 

      const carregarImagens = async () => {
          const cli = cliente as any;
          if (cli.foto_com_documento && !urlFotoRosto) {
              try {
                  const { data } = await supabase.storage.from('documentos_clientes').createSignedUrl(cli.foto_com_documento, 3600);
                  if (data && isMounted) setUrlFotoRosto(data.signedUrl);
              } catch (e) { console.log('Erro ao carregar miniatura', e); }
          }

          if (expandido && cli.foto_apenas_documento && !urlFotoDoc) {
              try {
                  const { data } = await supabase.storage.from('documentos_clientes').createSignedUrl(cli.foto_apenas_documento, 3600);
                  if (data && isMounted) setUrlFotoDoc(data.signedUrl);
              } catch (e) { console.log('Erro ao carregar foto doc', e); }
          }
      };

      // Só inicia o download da foto DEPOIS que a interface terminar de ser desenhada e as animações pararem
      InteractionManager.runAfterInteractions(() => {
          carregarImagens();
      });

      return () => {
          isMounted = false; // Se rolar a tela rápido, aborta a atualização de estado
      };
  }, [cliente, expandido]); 

  const traduzirStatus = (status: string) => {
      return t(`status.${status}`, { defaultValue: status });
  };

  const traduzirFrequencia = (freq: string) => {
      return t(`novoContrato.freq${freq}`, { defaultValue: freq });
  };

  const abrirWhatsapp = (numero: string) => {
    if (!numero) {
        if (Platform.OS === 'web') {
            window.alert(`Ops\n${t('pastaCliente.erroZap') || "Cliente sem número cadastrado."}`);
            return;
        } else {
            return Alert.alert("Ops", t('pastaCliente.erroZap') || "Cliente sem número cadastrado.");
        }
    }
    const apenasNumeros = numero.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/55${apenasNumeros}`);
  };

  const abrirHistoricoCompleto = (movimentacoes: string[]) => {
    setHistoricoConteudo(movimentacoes || []);
    setHistoricoVisivel(true);
  };

  const handleNovoEmprestimo = () => {
    if (cliente.bloqueado) {
      const titulo = t('pastaCliente.bloqueadoTitulo') || "🚫 Cliente Bloqueado";
      const msg = t('pastaCliente.bloqueadoMsg') || "Este cliente possui um bloqueio administrativo. Remova o cadeado para criar novos empréstimos.";
      
      if (Platform.OS === 'web') {
          window.alert(`${titulo}\n${msg}`);
          return;
      } else {
          return Alert.alert(titulo, msg);
      }
    }
    aoNovoEmprestimo();
  };

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

  const abrirEdicaoContrato = (contrato: Contrato) => {
      setContratoSendoEditado(contrato);
      setModalEditarContratoVisivel(true);
  };

  const salvarEdicaoContrato = async (dadosAtualizados: Partial<Contrato>) => {
      if (!contratoSendoEditado) return;
      const contratoCache = { ...contratoSendoEditado, ...dadosAtualizados };
      setModalEditarContratoVisivel(false);
      setContratoSendoEditado(null);
      
      setTimeout(async () => {
          try {
              await aoEditarContrato(contratoCache);
          } catch (error) {
              console.log("Erro ao salvar edição", error);
          }
      }, 500);
  };

  const abrirAbatimento = (contrato: Contrato) => {
      setContratoParaAbater(contrato);
      setModalAbaterVisivel(true);
  };

  const salvarAbatimento = async (valorCap: number, valorJur: number, data: string) => {
      if (!contratoParaAbater) return;
      setModalAbaterVisivel(false);
      setContratoParaAbater(null);

      setTimeout(async () => {
          if (aoAbaterEmprestimo) {
              await aoAbaterEmprestimo(cliente.nome, contratoParaAbater, valorCap, valorJur, data);
          } else {
              if (Platform.OS === 'web') {
                  window.alert("Aviso\nFunção de abater não está conectada na tela principal.");
              } else {
                  Alert.alert("Aviso", "Função de abater não está conectada na tela principal.");
              }
          }
      }, 500);
  };

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
        const jurosSalvoPDF = con.lucroJurosPorParcela || 0;
        if (jurosSalvoPDF > 0) {
            infoExtra = `
              <div class="item"><span>${t('pdf.taxaJuros') || 'Lucro Fixo'}:</span> <b>R$ ${Number(jurosSalvoPDF).toFixed(2)}</b></div>
              <div class="item"><span>${t('pdf.multaDiaria') || 'Multa Diária'}:</span> <b>R$ ${(con.valorMultaDiaria || 0).toFixed(2)}</b></div>
            `;
        } else {
            infoExtra = `
              <div class="item"><span>${t('pdf.taxaJuros') || 'Taxa de Juros'}:</span> <b>${con.taxa}%</b></div>
              <div class="item"><span>${t('pdf.multaDiaria') || 'Multa Diária'}:</span> <b>R$ ${(con.valorMultaDiaria || 0).toFixed(2)}</b></div>
            `;
        }
      }

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

      if (Platform.OS === 'web') {
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
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
          }

          setTimeout(() => {
              document.body.removeChild(iframe);
          }, 1000);

      } else {
          const { uri } = await Print.printToFileAsync({ html });
          await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }

    } catch (error) { 
      console.log(error);
      if (Platform.OS === 'web') {
          window.alert(`${t('common.erro')}\n${t('pdf.erroGerar') || "Falha ao gerar PDF."}`);
      } else {
          Alert.alert(t('common.erro'), t('pdf.erroGerar') || "Falha ao gerar PDF."); 
      }
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
      {/* 🚀 ARQUITETURA: Montagem Condicional dos Modais (Economiza RAM) */}
      {historicoVisivel && (
        <Modal visible={true} transparent animationType="fade" onRequestClose={() => setHistoricoVisivel(false)}>
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
      )}

      {!!fotoExpandida && (
        <Modal visible={true} transparent animationType="fade" onRequestClose={() => setFotoExpandida(null)}>
            <View style={styles.modalFundoFoto}>
                <TouchableOpacity style={styles.btnFecharFoto} onPress={() => setFotoExpandida(null)}>
                    <Ionicons name="close-circle" size={40} color="#FFF" />
                </TouchableOpacity>
                <Image source={{ uri: fotoExpandida }} style={styles.imgFullscreen} resizeMode="contain" />
            </View>
        </Modal>
      )}

      {modalEditarContratoVisivel && (
        <ModalEditarEmprestimo 
            visivel={true}
            contratoOriginal={contratoSendoEditado}
            fechar={() => { setModalEditarContratoVisivel(false); setContratoSendoEditado(null); }}
            salvar={salvarEdicaoContrato}
        />
      )}

      {modalAbaterVisivel && (
        <ModalAbaterEmprestimo
            visivel={true}
            contrato={contratoParaAbater}
            fechar={() => { setModalAbaterVisivel(false); setContratoParaAbater(null); }}
            salvar={salvarAbatimento}
        />
      )}

      <TouchableOpacity onPress={aoExpandir} style={styles.header}>
        <View style={styles.linhaTitulo}>
            <View style={{flexDirection:'row', alignItems:'center', flex: 1}}>
                {cliente.bloqueado ? <Text style={{fontSize:18, marginRight:5}}>🔒</Text> : null}
                
                {urlFotoRosto ? (
                    <TouchableOpacity onPress={() => setFotoExpandida(urlFotoRosto)}>
                        <Image source={{ uri: urlFotoRosto }} style={styles.avatarNome} />
                    </TouchableOpacity>
                ) : (cliente as any).foto_com_documento ? (
                    <View style={[styles.avatarNome, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#EEE' }]}>
                        <ActivityIndicator size="small" color="#999" />
                    </View>
                ) : null }

                <Text style={[styles.nome, cliente.bloqueado && {color:'#999'}]} numberOfLines={1}>{cliente.nome}</Text>
            </View>
            <Text style={styles.seta}>{expandido ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {expandido ? (
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

            {((cliente as any).foto_com_documento || (cliente as any).foto_apenas_documento) ? (
                <View style={styles.kycContainer}>
                    <Text style={styles.kycTitle}>📸 Documentos de Segurança (KYC)</Text>
                    <View style={styles.rowKyc}>
                        {urlFotoRosto ? (
                            <TouchableOpacity onPress={() => setFotoExpandida(urlFotoRosto)} style={styles.kycThumb}>
                                <Image source={{ uri: urlFotoRosto }} style={styles.imgThumb} />
                                <Text style={styles.txtThumb}>Foto + Doc</Text>
                            </TouchableOpacity>
                        ) : (cliente as any).foto_com_documento ? (
                            <ActivityIndicator color="#2980B9" style={styles.kycThumb} />
                        ) : null}
                        
                        {urlFotoDoc ? (
                            <TouchableOpacity onPress={() => setFotoExpandida(urlFotoDoc)} style={styles.kycThumb}>
                                <Image source={{ uri: urlFotoDoc }} style={styles.imgThumb} />
                                <Text style={styles.txtThumb}>Apenas Doc</Text>
                            </TouchableOpacity>
                        ) : ((cliente as any).foto_apenas_documento && expandido) ? (
                            <ActivityIndicator color="#2980B9" style={styles.kycThumb} />
                        ) : null}
                    </View>
                </View>
            ) : null}

          </View>

          <View style={styles.radarContainer}>
             <Text style={styles.radarLabel}>{t('radar.tituloSection')}</Text>
             <RiskRadarCSI 
               compacto={true}
               initialNome={cliente.nome}
               initialTelefone={cliente.whatsapp}
               initialCpf={cliente.cpf}
             />
          </View>

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
            
            const isFracionado = ['PARCELADO', 'SEMANAL', 'QUINZENAL', 'DIARIO'].includes(con.frequencia || '') || (con.totalParcelas || 0) > 1;
            const valorJurosSalvo = con.lucroJurosPorParcela || 0;
            
            // 🚀 AQUI É A MÁGICA DE EXIBIR O TOTAL CORRETAMENTE NA LISTA
            let jurosTotalCalculado = 0;
            if (isFracionado) {
                jurosTotalCalculado = valorJurosSalvo * (con.totalParcelas || 1);
            } else {
                if (valorJurosSalvo > 0) {
                    jurosTotalCalculado = valorJurosSalvo;
                } else {
                    jurosTotalCalculado = (con.capital || 0) * ((con.taxa || 0) / 100);
                }
            }
            const dividaTotal = (con.capital || 0) + jurosTotalCalculado;

            const exibicaoJuros = valorJurosSalvo > 0 ? `R$ ${Number(valorJurosSalvo).toFixed(2)}` : `${con.taxa}%`;

            return (
            <View key={con.id} style={[styles.contrato, con.status === 'QUITADO' && styles.quitado]}>
              <View style={styles.conHeader}>
                <View>
                  <Text style={styles.conId}>{t('pastaCliente.contrato')} #{con.id}</Text>
                  
                  {/* 🚀 EXIBIÇÃO DA DÍVIDA TOTAL 🚀 */}
                  {con.status === 'QUITADO' ? (
                     <Text style={styles.conValor}>R$ {con.capital?.toFixed(2)}</Text>
                  ) : (
                     <View>
                         <Text style={[styles.conValor, {color: '#27AE60', fontSize: 18}]}>
                             Total: R$ {dividaTotal.toFixed(2)}
                         </Text>
                         <Text style={{fontSize: 11, color: '#7F8C8D', marginTop: 2}}>
                             Capital: R$ {con.capital?.toFixed(2)}
                         </Text>
                     </View>
                  )}

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
                 <Text style={styles.info}>{valorJurosSalvo > 0 ? t('pdf.taxaJuros', 'Lucro Fixo') : t('pastaCliente.juros')}: {exibicaoJuros} ({traduzirFrequencia(con.frequencia || 'MENSAL')})</Text>
              )}

              {con.status !== 'QUITADO' ? (
                <View style={styles.botoesCon}>
                  {con.status === 'ATIVO' ? (
                    <>
                      <TouchableOpacity onPress={() => aoRenovarOuQuitar('RENOVAR', con)} style={styles.btnRenovar}><Text style={styles.txtBtn}>{t('pastaCliente.renovar')}</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => aoRenovarOuQuitar('QUITAR', con)} style={styles.btnQuitar}><Text style={styles.txtBtn}>{t('pastaCliente.quitar')}</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => abrirAbatimento(con)} style={styles.btnAbater}><Text style={styles.txtBtn}>ABATER</Text></TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity onPress={() => aoPagarParcela(con)} style={styles.btnParcela}><Text style={styles.txtBtn}>{t('pastaCliente.pagarParcela')} {((con.parcelasPagas||0)+1)}/{con.totalParcelas}</Text></TouchableOpacity>
                  )}
                  
                  <TouchableOpacity onPress={() => abrirEdicaoContrato(con)} style={styles.btnLixo}>
                      <Text>✏️</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => handleExcluirContrato(con.id)} style={styles.btnLixo}><Text>🗑</Text></TouchableOpacity>
                </View>
              ) : null}

              {con.status !== 'QUITADO' ? (
                <TouchableOpacity onPress={() => aoNegociar(con)} style={styles.btnNegociar}><Text style={styles.txtBtn}>{t('pastaCliente.negociar')}</Text></TouchableOpacity>
              ) : null}

              <View style={styles.historicoResumido}>
                 <Text style={{fontSize:10, fontWeight:'bold', color:'#999', marginBottom:2}}>{t('pastaCliente.ultimasMovimentacoes')}</Text>
                 {con.movimentacoes?.slice(0, 3).map((m, k) => <Text key={k} style={{fontSize:10, color:'#555'}}>{m}</Text>)}
              </View>
            </View>
          )})}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF', borderRadius: 10, marginBottom: 10, elevation: 2 },
  header: { padding: 15 }, 
  linhaTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nome: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50', flexShrink: 1 }, 
  seta: { fontSize: 18, color: '#BDC3C7', marginLeft: 10 }, 
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
  btnAbater: { flex: 1, backgroundColor: '#16A085', padding: 10, borderRadius: 6, alignItems: 'center' }, 
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
  txtHistoricoModal: { fontSize: 18, color: '#333' },
  kycContainer: { marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E5E8E8' },
  kycTitle: { fontSize: 12, fontWeight: 'bold', color: '#7F8C8D', marginBottom: 10 },
  rowKyc: { flexDirection: 'row', gap: 15 },
  kycThumb: { alignItems: 'center' },
  imgThumb: { width: 60, height: 60, borderRadius: 8, borderWidth: 1, borderColor: '#BDC3C7', backgroundColor: '#FFF' },
  txtThumb: { fontSize: 10, color: '#555', marginTop: 4, fontWeight: 'bold' },
  modalFundoFoto: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  imgFullscreen: { width: '100%', height: '80%' },
  btnFecharFoto: { position: 'absolute', top: 40, right: 20, zIndex: 10 },
  avatarNome: { width: 30, height: 30, borderRadius: 15, marginRight: 10, borderWidth: 1, borderColor: '#BDC3C7', backgroundColor: '#FFF' },
});
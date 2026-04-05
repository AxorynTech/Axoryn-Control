import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Cliente } from '../types';

interface Props {
  visivel: boolean;
  fechar: () => void;
  clientes: Cliente[];
}

export default function ModalRelatorio({ visivel, fechar, clientes }: Props) {
  const { t } = useTranslation();
  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const [dataIni, setDataIni] = useState(primeiroDia.toLocaleDateString('pt-BR'));
  const [dataFim, setDataFim] = useState(hoje.toLocaleDateString('pt-BR'));
  const [loading, setLoading] = useState(false);

  // --- PARSERS E HELPERS ---
  const parseData = (dataStr: string) => {
    try {
      if (!dataStr) return new Date('');
      const matchBR = dataStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (matchBR) {
        return new Date(parseInt(matchBR[3]), parseInt(matchBR[2]) - 1, parseInt(matchBR[1]));
      }
      return new Date(dataStr);
    } catch (e) { return new Date(''); }
  };

  const limparValor = (valorStr: string) => {
    if (!valorStr) return 0;
    let limpo = valorStr.replace(/[R$\s]/g, '');
    if (limpo.includes(',')) return parseFloat(limpo.replace(/\./g, '').replace(',', '.'));
    return parseFloat(limpo);
  };

  const extrairValor = (texto: string, padrao: RegExp) => {
    const match = texto.match(padrao);
    return match ? limparValor(match[1]) : 0;
  };

  // --- NOVO: Lógica de Identificação de Logs Mais Segura ---
  const analisarLog = (logStr: string) => {
      const lowerLog = logStr.toLowerCase();
      
      // 1. Logs de Criação (Investimento)
      if (lowerLog.includes('iniciado') || lowerLog.includes('criado')) {
          // Extrai o valor do capital dependendo do formato do log
          let capitalStr = logStr.match(/(?:R\$\s?|valor:\s?)([\d\.,]+)/i);
          // Tratamento especial para parcelado: "10x de R$ 50,00"
          if (lowerLog.includes('parcelado') || lowerLog.match(/\dx de/)) {
               const matchParc = logStr.match(/(\d+)x de R\$\s?([\d\.,]+)/i);
               if (matchParc) {
                   const qtd = parseInt(matchParc[1]);
                   const val = limparValor(matchParc[2]);
                   // Se for parcelado, não temos como saber o capital exato só pelo log sem a taxa,
                   // então retornamos 0 e usamos o con.capital fora desta função se for o log de criação
                   return { tipo: 'CRIACAO', valorTotal: 0, capital: 0, lucro: 0, multa: 0 }; 
               }
          }
          const val = capitalStr ? limparValor(capitalStr[1]) : 0;
          return { tipo: 'CRIACAO', valorTotal: val, capital: val, lucro: 0, multa: 0 };
      }
      
      // 2. Logs de Renovação
      if (lowerLog.includes('renova')) {
          const juros = extrairValor(logStr, /R\$\s?([\d\.,]+)/i); // O primeiro valor costuma ser o juros na string de renovação
          const multa = lowerLog.includes('multa') ? extrairValor(logStr, /multa.*?R\$\s?([\d\.,]+)/i) : 0;
          
          // Na renovação, o capital não é recuperado. Apenas se paga juros e multa.
          return { tipo: 'RENOVACAO', valorTotal: juros + multa, capital: 0, lucro: juros, multa: multa };
      }
      
      // 3. Logs de Recebimento de Parcela
      if (lowerLog.includes('recebid')) {
          // Ex: "Recebido Parcela 1/10 (R$ 50,00) (+ Multa R$ 10,00)"
          const parcelaBruta = extrairValor(logStr, /R\$\s?([\d\.,]+)/i);
          const multa = lowerLog.includes('multa') ? extrairValor(logStr, /multa.*?R\$\s?([\d\.,]+)/i) : 0;
          
          // O valor principal extraído regex costuma ser a soma (Parcela + Multa)
          // Precisamos separar. Assumimos que o primeiro 'R$' achado é o valor total daquele log.
          const totalPago = parcelaBruta; 
          
          return { tipo: 'PARCELA', valorTotal: totalPago, capital: 0, lucro: 0, multa: multa, brutoParcela: totalPago - multa };
      }
      
      // 4. Logs de Quitação
      if (lowerLog.includes('quitado')) {
           const totalPago = extrairValor(logStr, /R\$\s?([\d\.,]+)/i);
           const multa = lowerLog.includes('multa') ? extrairValor(logStr, /multa.*?R\$\s?([\d\.,]+)/i) : 0;
           return { tipo: 'QUITACAO', valorTotal: totalPago, capital: 0, lucro: 0, multa: multa, brutoQuitacao: totalPago - multa };
      }

      return { tipo: 'OUTRO', valorTotal: 0, capital: 0, lucro: 0, multa: 0 };
  };

  const gerarRelatorio = async () => {
    try {
      setLoading(true);
      const dtInicio = parseData(dataIni);
      const dtFim = parseData(dataFim);
      
      if (isNaN(dtInicio.getTime()) || isNaN(dtFim.getTime())) {
        Alert.alert(t('common.erro'), t('relatorio.erroDatas') || "Datas inválidas.");
        setLoading(false);
        return;
      }
      dtFim.setHours(23, 59, 59);

      let stats = {
        investido: 0, recebidoBruto: 0, capitalRecuperado: 0,
        lucroLiquido: 0, multas: 0, qtdNovosContratos: 0,
        qtdQuitados: 0, qtdPagamentos: 0
      };

      let inventarioGarantias: any[] = [];
      let totalEmRua = 0;
      let totalContratosAtivos = 0;

      let htmlEntradas = '';
      let htmlInvestimentos = '';

      clientes.forEach(cli => {
        (cli.contratos || []).forEach(con => {
            const movs = con.movimentacoes || [];
            
            // 1. Métricas Globais (Independente de Data)
            if (con.status === 'ATIVO' || con.status === 'PARCELADO') {
                totalEmRua += (con.capital || 0);
                totalContratosAtivos++;
                
                if (con.garantia && con.garantia.length > 2) {
                    const isProd = con.garantia.includes('PRODUTO:');
                    inventarioGarantias.push({
                        cliente: cli.nome,
                        item: con.garantia.replace('PRODUTO:', '').trim(),
                        valor: con.capital,
                        tipo: isProd ? (t('relatorio.tipoVenda') || 'Venda') : (t('relatorio.tipoGarantia') || 'Garantia'),
                        vencimento: con.proximoVencimento,
                        contratoId: con.id
                    });
                }
            }

            // 2. Análise de Criação do Contrato (Investimento/Saída)
            let dataInicioCon = parseData(con.dataInicio || '');
            if (isNaN(dataInicioCon.getTime()) && movs.length > 0) {
                 // Fallback: pega a data do último log (o mais antigo, índice length - 1)
                 const lastLogDataStr = movs[movs.length - 1].split('-')[0].trim();
                 dataInicioCon = parseData(lastLogDataStr);
            }

            // Capital Original para cálculos de lucro na quitação
            let capitalOriginal = con.capital || 0;
            if (con.status === 'QUITADO') {
                 // Tenta deduzir o capital original se já estiver quitado
                 // Esta é uma aproximação; idealmente o banco guardaria capital_original
                 if (con.lucroTotal && con.lucroTotal > 0 && con.taxa > 0) {
                     capitalOriginal = con.lucroTotal / (con.taxa/100);
                 }
            }

            if (!isNaN(dataInicioCon.getTime()) && dataInicioCon >= dtInicio && dataInicioCon <= dtFim) {
                // Soma como Investimento apenas se a data de criação estiver no filtro
                const valorInvestido = capitalOriginal;
                if (valorInvestido > 0) {
                    stats.investido += valorInvestido;
                    stats.qtdNovosContratos++;
                    htmlInvestimentos += `<tr><td>${dataInicioCon.toLocaleDateString('pt-BR')}</td><td>${cli.nome}</td><td>R$ ${valorInvestido.toFixed(2)}</td></tr>`;
                }
            }

            // 3. Varredura do Histórico para Entradas (Pagamentos, Renovações, Quitações)
            movs.forEach(movStr => {
                // A data costuma estar no começo da string: "15/04/2026 - Recebido..."
                const dataMovStr = movStr.split('-')[0].trim();
                const dataMov = parseData(dataMovStr);
                
                if (!isNaN(dataMov.getTime()) && dataMov >= dtInicio && dataMov <= dtFim) {
                    
                    const analise = analisarLog(movStr);
                    
                    if (analise.tipo === 'CRIACAO' || analise.tipo === 'OUTRO') return; // Pula

                    let valLucro = 0;
                    let valCapitalRecuperado = 0;
                    let valMulta = analise.multa;
                    let valTotalLog = analise.valorTotal;
                    let descDisplay = '';

                    if (analise.tipo === 'RENOVACAO') {
                        valLucro = analise.lucro;
                        valCapitalRecuperado = 0;
                        descDisplay = t('relatorio.renovacao') || 'Renovação';
                    } 
                    else if (analise.tipo === 'PARCELA') {
                        // Sabemos o valor bruto (Parcela - Multa)
                        const bruto = analise.brutoParcela!;
                        // Usamos o lucro_juros_por_parcela do contrato se existir (sistema Diário/Semanal/Quinzenal/Parcelado)
                        if (con.lucroJurosPorParcela && con.lucroJurosPorParcela > 0) {
                            valLucro = con.lucroJurosPorParcela;
                            valCapitalRecuperado = bruto - valLucro;
                        } else {
                            // Fallback caso falte o dado: chuta que tudo é capital (melhor errar lucro pra baixo do que misturar)
                            valCapitalRecuperado = bruto;
                            valLucro = 0; 
                        }
                        descDisplay = t('relatorio.parcela') || 'Parcela';
                    }
                    else if (analise.tipo === 'QUITACAO') {
                        const bruto = analise.brutoQuitacao!;
                        
                        // Lógica de quitação varia conforme o tipo de contrato
                        if (con.frequencia === 'PARCELADO' || con.frequencia === 'SEMANAL' || con.frequencia === 'QUINZENAL' || con.frequencia === 'DIARIO') {
                             // Num sistema parcelado, a quitação geralmente é o pagamento da última parcela ou saldo devedor restante
                             // Usamos a mesma lógica da parcela
                             if (con.lucroJurosPorParcela && con.lucroJurosPorParcela > 0) {
                                 valLucro = con.lucroJurosPorParcela;
                                 valCapitalRecuperado = bruto - valLucro;
                             } else {
                                 valCapitalRecuperado = bruto;
                             }
                        } else {
                             // Contrato MENSAL puro: Juros já foram cobrados nas renovações. A quitação é devolver o Principal + o Juros daquele mês corrente
                             // Pelo log de quitação: Total = Principal + Juros + Multa
                             valLucro = (capitalOriginal * (con.taxa/100));
                             valCapitalRecuperado = bruto - valLucro;
                             
                             // Correção de segurança: se o capital recuperado deduzido for menor que 0, ajusta.
                             if (valCapitalRecuperado < 0) {
                                 valCapitalRecuperado = bruto;
                                 valLucro = 0;
                             }
                        }
                        descDisplay = t('relatorio.quitacao') || 'Quitação';
                        stats.qtdQuitados++;
                    }

                    // Prevenção de números negativos por erros de aproximação
                    if (valLucro < 0) valLucro = 0;
                    if (valCapitalRecuperado < 0) valCapitalRecuperado = 0;

                    // Acumuladores Globais do Filtro
                    stats.recebidoBruto += valTotalLog;
                    stats.capitalRecuperado += valCapitalRecuperado;
                    stats.lucroLiquido += valLucro;
                    stats.multas += valMulta;
                    stats.qtdPagamentos++;

                    // Renderização da Tabela
                    const corLucro = valLucro > 0 ? '#27AE60' : '#BDC3C7';
                    const corMulta = valMulta > 0 ? '#E67E22' : '#BDC3C7';

                    let modLabel = con.frequencia || 'OUTROS';
                    if (con.garantia && con.garantia.includes('PRODUTO:')) modLabel = 'VENDA';
                    else if (modLabel === 'PARCELADO') modLabel = 'VENDA';
                    
                    let modStyle = "background:#EEE; color:#555;";
                    if (modLabel === 'VENDA') modStyle = "background:#D5F5E3; color:#186A3B;"; 
                    if (modLabel === 'MENSAL') modStyle = "background:#D6EAF8; color:#21618C;"; 
                    if (modLabel === 'SEMANAL') modStyle = "background:#FCF3CF; color:#9A7D0A;"; 
                    if (modLabel === 'DIARIO') modStyle = "background:#FADBD8; color:#943126;"; 

                    htmlEntradas += `
                        <tr>
                            <td>${dataMov.toLocaleDateString('pt-BR')}</td>
                            <td>${cli.nome}</td>
                            <td style="text-align:center;">#${con.id}</td>
                            <td><span style="font-size:8px; padding:2px 4px; border-radius:3px; font-weight:bold; ${modStyle}">${modLabel}</span></td>
                            <td><span class="badge">${descDisplay}</span></td>
                            <td style="font-weight:bold">R$ ${valTotalLog.toFixed(2)}</td>
                            <td style="color:#7F8C8D">R$ ${valCapitalRecuperado.toFixed(2)}</td>
                            <td style="color:${corLucro}; font-weight:bold;">R$ ${valLucro.toFixed(2)}</td>
                            <td style="color:${corMulta}; font-weight:bold;">R$ ${valMulta.toFixed(2)}</td>
                        </tr>
                    `;
                }
            });
        });
      });

      const roi = stats.investido > 0 ? ((stats.lucroLiquido + stats.multas) / stats.investido) * 100 : 0;
      const margemLucro = stats.recebidoBruto > 0 ? ((stats.lucroLiquido + stats.multas) / stats.recebidoBruto) * 100 : 0;
      const ticketMedio = stats.qtdPagamentos > 0 ? (stats.recebidoBruto / stats.qtdPagamentos) : 0;

      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #34495E; background: #FFF; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 4px solid #2C3E50; padding-bottom: 15px; }
              h1 { margin: 0; color: #2C3E50; font-size: 26px; text-transform: uppercase; letter-spacing: 1px; }
              .sub-header { color: #7F8C8D; font-size: 12px; margin-top: 5px; }
              .kpi-container { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 25px; }
              .kpi-box { flex: 1; min-width: 30%; background: #F4F6F7; padding: 15px; border-radius: 8px; border-left: 5px solid #BDC3C7; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
              .kpi-label { font-size: 10px; text-transform: uppercase; color: #7F8C8D; font-weight: bold; margin-bottom: 5px; }
              .kpi-value { font-size: 18px; font-weight: bold; color: #2C3E50; }
              .border-blue { border-left-color: #2980B9; } .border-green { border-left-color: #27AE60; }
              .border-red { border-left-color: #C0392B; } .border-orange { border-left-color: #E67E22; }
              h3 { font-size: 14px; color: #2C3E50; border-bottom: 2px solid #ECF0F1; padding-bottom: 5px; margin-top: 30px; margin-bottom: 10px; text-transform: uppercase; }
              table { width: 100%; border-collapse: collapse; font-size: 9px; }
              th { background: #2C3E50; color: #FFF; padding: 6px; text-align: left; font-weight: 600; }
              td { padding: 6px; border-bottom: 1px solid #ECF0F1; color: #555; vertical-align: middle; }
              tr:nth-child(even) { background: #F9F9F9; }
              .badge { background: #ECF0F1; padding: 2px 5px; border-radius: 4px; font-size: 8px; font-weight: bold; color: #7F8C8D; }
              .footer { margin-top: 50px; text-align: center; font-size: 9px; color: #BDC3C7; border-top: 1px solid #EEE; padding-top: 10px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${t('relatorio.tituloPDF') || 'Relatório Analítico'}</h1>
              <div class="sub-header">${t('relatorio.periodo') || 'PERÍODO'}: ${dataIni} ${t('relatorio.ate') || 'até'} ${dataFim}</div>
              <div class="sub-header">${t('relatorio.emissao') || 'EMISSÃO'}: ${new Date().toLocaleString('pt-BR')}</div>
            </div>

            <h3>📊 ${t('relatorio.performance') || 'Performance Financeira'}</h3>
            <div class="kpi-container">
              <div class="kpi-box border-green">
                <div class="kpi-label">${t('relatorio.lucroMultas') || 'Lucro Líquido + Multas'}</div>
                <div class="kpi-value" style="color:#27AE60">R$ ${(stats.lucroLiquido + stats.multas).toFixed(2)}</div>
              </div>
              <div class="kpi-box border-blue">
                <div class="kpi-label">${t('relatorio.faturamento') || 'Faturamento Bruto'}</div>
                <div class="kpi-value">R$ ${stats.recebidoBruto.toFixed(2)}</div>
              </div>
              <div class="kpi-box border-red">
                <div class="kpi-label">${t('relatorio.investido') || 'Total Investido'}</div>
                <div class="kpi-value">R$ ${stats.investido.toFixed(2)}</div>
              </div>
            </div>

            <div class="kpi-container">
               <div class="kpi-box border-orange"><div class="kpi-label">ROI</div><div class="kpi-value">${roi.toFixed(1)}%</div></div>
               <div class="kpi-box"><div class="kpi-label">${t('relatorio.margem') || 'Margem'}</div><div class="kpi-value">${margemLucro.toFixed(1)}%</div></div>
               <div class="kpi-box"><div class="kpi-label">${t('relatorio.ticket') || 'Ticket Médio'}</div><div class="kpi-value">R$ ${ticketMedio.toFixed(2)}</div></div>
            </div>

            <h3>💰 ${t('relatorio.detalhamento') || 'Detalhamento de Entradas'}</h3>
            ${htmlEntradas ? `
              <table>
                <thead>
                  <tr>
                    <th width="12%">${t('relatorio.colData') || 'Data'}</th>
                    <th width="18%">${t('relatorio.colCliente') || 'Cliente'}</th>
                    <th width="8%">ID</th>
                    <th width="10%">${t('relatorio.colMod') || 'Mod.'}</th>
                    <th width="10%">${t('relatorio.colTipo') || 'Tipo'}</th>
                    <th width="12%">${t('relatorio.colTotal') || 'Total'}</th>
                    <th width="10%">${t('relatorio.colPrinc') || 'Princ.'}</th>
                    <th width="10%">${t('relatorio.colLucro') || 'Lucro'}</th>
                    <th width="10%">${t('relatorio.colMulta') || 'Multa'}</th>
                  </tr>
                </thead>
                <tbody>${htmlEntradas}</tbody>
                <tfoot>
                  <tr style="background:#ECF0F1; font-weight:bold;">
                    <td colspan="5" style="text-align:right">${t('relatorio.totais') || 'TOTAIS'}:</td>
                    <td>R$ ${stats.recebidoBruto.toFixed(2)}</td>
                    <td>R$ ${stats.capitalRecuperado.toFixed(2)}</td>
                    <td style="color:#27AE60">R$ ${stats.lucroLiquido.toFixed(2)}</td>
                    <td style="color:#E67E22">R$ ${stats.multas.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            ` : '<p style="font-size:10px; color:#999; text-align:center;">' + (t('relatorio.nenhumaEntrada') || 'Nenhuma entrada registrada.') + '</p>'}

            <h3>📉 ${t('relatorio.saidas') || 'Saídas (Investimentos)'}</h3>
            ${htmlInvestimentos ? `
              <table>
                <thead><tr><th>${t('relatorio.colData') || 'Data'}</th><th>${t('relatorio.colCliente') || 'Cliente'}</th><th>${t('relatorio.colValor') || 'Valor Liberado'}</th></tr></thead>
                <tbody>${htmlInvestimentos}</tbody>
              </table>
            ` : '<p style="font-size:10px; color:#999; text-align:center;">' + (t('relatorio.nenhumContrato') || 'Nenhum novo contrato.') + '</p>'}

            <div style="page-break-before: always;"></div>
            <h3>🔐 ${t('relatorio.inventario') || 'Inventário de Ativos'}</h3>
            <div style="background:#F8F9FA; padding:10px; border:1px solid #EEE; margin-bottom:15px; border-radius:5px;">
                <span style="font-size:11px; font-weight:bold; margin-right:20px;">${t('relatorio.capitalRua') || 'CAPITAL NA RUA'}: R$ ${totalEmRua.toFixed(2)}</span>
                <span style="font-size:11px; font-weight:bold;">${t('relatorio.contratosAtivos') || 'CONTRATOS ATIVOS'}: ${totalContratosAtivos}</span>
            </div>

            ${inventarioGarantias.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th width="25%">${t('relatorio.colCliente') || 'Cliente'}</th>
                    <th width="40%">${t('relatorio.colItem') || 'Item / Garantia'}</th>
                    <th width="20%">${t('relatorio.colValorCont') || 'Valor Contrato'}</th>
                    <th width="15%">${t('relatorio.colVenc') || 'Vencimento'}</th>
                  </tr>
                </thead>
                <tbody>
                  ${inventarioGarantias.map(item => `
                    <tr>
                      <td>${item.cliente} <span style="font-size:8px; color:#999">(#${item.contratoId})</span></td>
                      <td><b>${item.tipo}:</b> ${item.item}</td>
                      <td>R$ ${(item.valor || 0).toFixed(2)}</td>
                      <td style="color:#C0392B">${item.vencimento}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<p style="font-size:10px; color:#999; text-align:center;">' + (t('relatorio.nenhumaGarantia') || 'Nenhuma garantia ativa.') + '</p>'}

            <div class="footer">${t('relatorio.rodape') || 'Axoryn Control © 2026 - Tecnologia Financeira Inteligente.'}</div>
          </body>
        </html>
      `;

      if (Platform.OS === 'web') {
          const pdfWindow = window.open('', '_blank');
          if (pdfWindow) {
              pdfWindow.document.write(html);
              pdfWindow.document.close();
              setTimeout(() => {
                  pdfWindow.focus();
                  pdfWindow.print();
              }, 500);
          } else {
              Alert.alert(t('common.erro'), "Permita pop-ups para imprimir.");
          }
      } else {
          const { uri } = await Print.printToFileAsync({ html });
          await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
      
      setLoading(false);
      fechar();
    } catch (error) { Alert.alert(t('common.erro'), t('relatorio.erroPDF') || 'Falha ao gerar PDF'); setLoading(false); }
  };

  return (
    <Modal visible={visivel} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.titulo}>{t('relatorio.tituloModal')}</Text>
          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('relatorio.dataInicial')}</Text>
            <TextInput style={styles.input} value={dataIni} onChangeText={setDataIni} keyboardType="numbers-and-punctuation" placeholder="DD/MM/AAAA" />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('relatorio.dataFinal')}</Text>
            <TextInput style={styles.input} value={dataFim} onChangeText={setDataFim} keyboardType="numbers-and-punctuation" placeholder="DD/MM/AAAA" />
          </View>
          
          {loading ? <ActivityIndicator size="large" color="#2C3E50" style={{marginTop:20}}/> : 
            <View style={styles.botoes}>
              <TouchableOpacity style={[styles.btn, styles.btnCancelar]} onPress={fechar}><Text style={styles.txtBtnCanc}>{t('common.cancelar') || 'Cancelar'}</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnGerar]} onPress={gerarRelatorio}><Text style={styles.txtBtnGerar}>{t('relatorio.btnGerar')}</Text></TouchableOpacity>
            </View>
          }
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '90%', backgroundColor: '#FFF', borderRadius: 16, padding: 25, elevation: 10 },
  titulo: { fontSize: 22, fontWeight: 'bold', marginBottom: 25, textAlign: 'center', color: '#2C3E50' },
  formGroup: { marginBottom: 15 },
  label: { fontSize: 13, color: '#7F8C8D', marginBottom: 6, fontWeight: 'bold', textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: '#ECF0F1', borderRadius: 10, padding: 14, fontSize: 16, backgroundColor: '#F8F9F9', color:'#2C3E50' },
  botoes: { flexDirection: 'row', gap: 12, marginTop: 15 },
  btn: { flex: 1, padding: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnCancelar: { backgroundColor: '#F0F2F5' },
  btnGerar: { backgroundColor: '#2C3E50', shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity:0.2, shadowRadius:4, elevation:3 },
  txtBtnCanc: { color: '#7F8C8D', fontWeight: 'bold' },
  txtBtnGerar: { color: '#FFF', fontWeight: 'bold', fontSize:13 }
});
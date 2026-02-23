import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import { ItemPedido, Pedido } from '../types';

export const gerarRelatorioPDF = async (
  pedidos: Pedido[], 
  dataInicio: Date, 
  dataFim: Date,
  totalPeriodo: number,
  t: any, 
  idioma: string = 'pt-BR'
) => {
  // 1. Formatar Datas
  const inicioFmt = dataInicio.toLocaleDateString(idioma);
  const fimFmt = dataFim.toLocaleDateString(idioma);
  const agoraFmt = new Date().toLocaleString(idioma);

  // 2. Criar linhas da tabela
  const linhasTabela = pedidos.map(p => `
    <tr>
      <td>${new Date(p.criado_em).toLocaleDateString(idioma)} ${new Date(p.criado_em).toLocaleTimeString(idioma, {hour: '2-digit', minute:'2-digit'})}</td>
      <td>${p.nome_cliente || t('estoque.balcao')}</td>
      <td>
        ${p.itens?.map((i: ItemPedido) => 
          `<div>${i.quantidade}x ${i.produto?.nome}</div>`
        ).join('') || '-'}
      </td>
      <td>${p.forma_pagamento || t('estoque.dinheiro')}</td>
      <td style="text-align: right; font-weight: bold;">${t('relatorioPdf.moeda')} ${p.total.toFixed(2).replace('.', ',')}</td>
    </tr>
  `).join('');

  // 3. O HTML Completo
  const html = `
    <!DOCTYPE html>
    <html lang="${idioma}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${t('estoque.relatorioTitulo')}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2C3E50; padding-bottom: 10px; }
        .header h1 { margin: 0; color: #2C3E50; font-size: 24px; }
        .header p { margin: 5px 0 0; color: #7f8c8d; font-size: 14px; }
        
        .resumo-card { background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
        .resumo-titulo { font-size: 14px; color: #777; font-weight: bold; text-transform: uppercase; }
        .resumo-valor { font-size: 28px; color: #27AE60; font-weight: bold; }

        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
        th { background-color: #2C3E50; color: #FFF; padding: 10px; text-align: left; font-weight: bold; }
        td { border-bottom: 1px solid #eee; padding: 10px; vertical-align: top; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        
        .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #aaa; border-top: 1px solid #eee; padding-top: 10px; }
        
        /* Ocultar elementos desnecessários na impressão */
        @media print {
            .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${t('estoque.relatorioTitulo')}</h1>
        <p>${t('relatorioPdf.periodo')}: ${inicioFmt} ${t('relatorioPdf.ate')} ${fimFmt}</p>
        <p>Axoryn Control</p>
      </div>

      <div class="resumo-card">
        <div>
          <div class="resumo-titulo">${t('relatorioPdf.totalVendido')}</div>
          <div style="font-size: 12px; color: #999;">${pedidos.length} ${t('relatorioPdf.vendasRealizadas')}</div>
        </div>
        <div class="resumo-valor">${t('relatorioPdf.moeda')} ${totalPeriodo.toFixed(2).replace('.', ',')}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th width="15%">${t('relatorioPdf.dataHora')}</th>
            <th width="20%">${t('relatorioPdf.cliente')}</th>
            <th width="35%">${t('relatorioPdf.itens')}</th>
            <th width="15%">${t('relatorioPdf.pagamento')}</th>
            <th width="15%" style="text-align: right;">${t('relatorioPdf.total')}</th>
          </tr>
        </thead>
        <tbody>
          ${linhasTabela}
        </tbody>
      </table>

      <div class="footer">
        ${t('relatorioPdf.geradoEm')} ${agoraFmt}
      </div>
    </body>
    </html>
  `;

  try {
    if (Platform.OS === 'web') {
      // ✅ SOLUÇÃO ROBUSTA PARA WEB: Iframe invisível
      const iframe = document.createElement('iframe');
      
      // Estilização para esconder o iframe
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
        
        // Foca e imprime
        iframe.contentWindow?.focus();
        
        // Pequeno delay para garantir que o conteúdo carregou antes de imprimir
        setTimeout(() => {
            iframe.contentWindow?.print();
            
            // Remove o iframe do DOM após a impressão iniciar
            setTimeout(() => {
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                }
            }, 1000);
        }, 500);
      }
    } else {
      // ✅ SOLUÇÃO NATIVA (iOS e Android)
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    }
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    Alert.alert(t('common.erro'), t('relatorio.erroPDF'));
  }
};
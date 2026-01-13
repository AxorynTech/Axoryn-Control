import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Cliente, Contrato } from '../types';

interface Props {
  visivel: boolean;
  fechar: () => void;
  clientes: Cliente[];
}

export default function ModalRelatorio({ visivel, fechar, clientes }: Props) {
  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const [dataIni, setDataIni] = useState(primeiroDia.toLocaleDateString('pt-BR'));
  const [dataFim, setDataFim] = useState(hoje.toLocaleDateString('pt-BR'));
  const [loading, setLoading] = useState(false);

  // --- PARSER DE DATA ---
  const parseData = (dataStr: string) => {
    try {
      if (!dataStr) return new Date('');
      const matchBR = dataStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (matchBR) {
        return new Date(parseInt(matchBR[3]), parseInt(matchBR[2]) - 1, parseInt(matchBR[1]));
      }
      const dateISO = new Date(dataStr);
      if (!isNaN(dateISO.getTime())) return dateISO;
      return new Date('');
    } catch (e) { return new Date(''); }
  };

  const limparValor = (valorStr: string) => {
    if (!valorStr) return 0;
    let limpo = valorStr.replace(/[R$\s]/g, '');
    if (limpo.includes(',')) return parseFloat(limpo.replace(/\./g, '').replace(',', '.'));
    return parseFloat(limpo);
  };

  const buscarValor = (texto: string, chave: string) => {
    const regex = new RegExp(`${chave}[^0-9-]*([0-9.,]+)`, 'i');
    const match = texto.match(regex);
    if (match) return limparValor(match[1]);
    return 0;
  };

  const extrairTotal = (texto: string) => {
    const matchRecebido = texto.match(/Recebido R\$\s?([\d\.,]+)/i);
    if (matchRecebido) return limparValor(matchRecebido[1]);

    const matchCombinado = texto.match(/Parcela.*\(R\$\s?([\d\.,]+)\).*\+ Multa R\$\s?([\d\.,]+)/i);
    if (matchCombinado) {
       return limparValor(matchCombinado[1]) + limparValor(matchCombinado[2]);
    }
    
    const match = texto.match(/R\$\s?([\d\.,]+)/i);
    if (match) return limparValor(match[1]);
    return 0;
  };

  const obterCapitalOriginal = (con: Contrato) => {
    // Tenta pegar do log de criação
    if (con.movimentacoes && con.movimentacoes.length > 0) {
        const logCriacao = con.movimentacoes[con.movimentacoes.length - 1]; 
        
        const matchCap = logCriacao.match(/Capital R\$\s?([\d\.,]+)/i);
        if (matchCap) return limparValor(matchCap[1]);

        const matchParcelado = logCriacao.match(/(\d+)x de R\$\s?([\d\.,]+)/i) || logCriacao.match(/(\d+) dias de R\$\s?([\d\.,]+)/i);
        if (matchParcelado) {
            const qtd = parseInt(matchParcelado[1]);
            const valParcela = limparValor(matchParcelado[2]);
            const totalReceber = qtd * valParcela;
            if (con.taxa > 0) return totalReceber / (1 + (con.taxa / 100));
            return totalReceber;
        }

        const matchQualquer = logCriacao.match(/R\$\s?([\d\.,]+)/i);
        if (matchQualquer) return limparValor(matchQualquer[1]);
    }
    // Fallback matemático
    if (con.valorParcela && con.totalParcelas) {
        const total = con.valorParcela * con.totalParcelas;
        if (con.taxa > 0) return total / (1 + (con.taxa / 100));
        return total;
    }
    return con.capital || 0;
  };

  const gerarRelatorio = async () => {
    try {
      setLoading(true);
      const dtInicio = parseData(dataIni);
      const dtFim = parseData(dataFim);
      
      if (isNaN(dtInicio.getTime()) || isNaN(dtFim.getTime())) {
        Alert.alert("Erro", "Datas inválidas.");
        setLoading(false);
        return;
      }
      
      dtFim.setHours(23, 59, 59);

      let totalInvestido = 0;
      let totalRecebidoBruto = 0;
      let totalLucroLiquido = 0; 
      let totalMultasRecolhidas = 0;

      let htmlInvestimentos = '';
      let htmlEntradas = '';
      let htmlQuitados = '';

      clientes.forEach(cli => {
        (cli.contratos || []).forEach(con => {
          
          // --- TABELA 1: SAÍDAS (INVESTIMENTOS) ---
          let dataCon = parseData(con.dataInicio || '');
          if (isNaN(dataCon.getTime()) && con.movimentacoes?.length > 0) {
             const primeiraMov = con.movimentacoes[con.movimentacoes.length - 1]; 
             dataCon = parseData(primeiraMov);
          }

          if (!isNaN(dataCon.getTime()) && dataCon >= dtInicio && dataCon <= dtFim) {
            const valorOriginal = obterCapitalOriginal(con);
            const displayValor = valorOriginal > 0 ? valorOriginal : (con.capital || 0);
            
            if (displayValor > 0) {
                totalInvestido += displayValor; 
                htmlInvestimentos += `<tr><td>${dataCon.toLocaleDateString('pt-BR')}</td><td>${cli.nome}</td><td>R$ ${displayValor.toFixed(2)}</td></tr>`;
            }
          }

          // --- TABELA 2: ENTRADAS ---
          (con.movimentacoes || []).forEach(mov => {
            const dataMov = parseData(mov);
            const descricao = mov;

            if (!isNaN(dataMov.getTime()) && dataMov >= dtInicio && dataMov <= dtFim) {
              if (descricao.toLowerCase().includes('iniciado') || descricao.toLowerCase().includes('acordo')) return;

              let valTotal = extrairTotal(descricao);
              let valMulta = 0;
              let valLucro = 0;
              let valCapital = 0;
              let tipo = 'Pagamento';

              const temLucro = buscarValor(descricao, 'Lucro');
              const temMulta = buscarValor(descricao, 'Multa');
              const temCapital = buscarValor(descricao, 'Capital');

              // DECISÃO DE VALORES
              if (temLucro > 0 || temCapital > 0) {
                 // LOG NOVO (Detalhado)
                 valLucro = temLucro;
                 valMulta = temMulta;
                 valCapital = temCapital;
                 // Ajuste se soma total não bater
                 if (valTotal < valLucro + valMulta + valCapital) {
                     valTotal = valLucro + valMulta + valCapital;
                 }
              } else {
                 // LOG ANTIGO (Estimativa)
                 valMulta = buscarValor(descricao, 'Multa');

                 if (descricao.toLowerCase().includes('quitado')) {
                    const capitalOriginal = obterCapitalOriginal(con);
                    const capitalRef = (con.capital && con.capital > 0) ? con.capital : capitalOriginal;
                    
                    if (valMulta === 0 && con.taxa > 0) {
                        const jurosEsperados = capitalRef * (con.taxa / 100);
                        const pagoExtra = valTotal - capitalRef;
                        if (pagoExtra > jurosEsperados + 1.00) {
                           valLucro = jurosEsperados;
                           valMulta = pagoExtra - jurosEsperados;
                           valCapital = capitalRef;
                        } else {
                           valCapital = capitalRef;
                           valLucro = valTotal - valCapital;
                        }
                    } else {
                        valCapital = capitalRef;
                        valLucro = valTotal - valCapital - valMulta;
                    }
                    if (valCapital > valTotal) valCapital = valTotal - valMulta;

                 } else if (descricao.toLowerCase().includes('parcela')) {
                    if (con.lucroJurosPorParcela) valLucro = con.lucroJurosPorParcela;
                    else valLucro = 0;
                    valCapital = valTotal - valMulta - valLucro;

                 } else if (descricao.toLowerCase().includes('renova')) {
                    valLucro = valTotal - valMulta;
                    valCapital = 0;
                 } else {
                    valCapital = valTotal - valMulta;
                 }
              }

              // Tipos
              if (descricao.toLowerCase().includes('quitado')) tipo = 'Quitação';
              else if (descricao.toLowerCase().includes('parcela')) tipo = 'Parcela';
              else if (descricao.toLowerCase().includes('renova')) tipo = 'Renovação';

              // Ajustes Finais
              if (valLucro < 0) valLucro = 0;
              if (valCapital < 0) valCapital = 0;

              totalRecebidoBruto += valTotal;
              totalMultasRecolhidas += valMulta;
              totalLucroLiquido += valLucro;

              const styleLucro = valLucro > 0 ? 'color:#27AE60; font-weight:bold;' : 'color:#CCC;';
              const styleMulta = valMulta > 0 ? 'color:#E67E22; font-weight:bold;' : 'color:#CCC;';
              
              // --- TABELA 3: QUITADOS (AGORA FORA DO IF/ELSE) ---
              // Se for quitação, adiciona na lista de conferência INDEPENDENTE se é log novo ou velho
              if (tipo === 'Quitação') {
                  const capOrigReal = obterCapitalOriginal(con);
                  htmlQuitados += `
                    <tr>
                      <td>${dataMov.toLocaleDateString('pt-BR')}</td>
                      <td>${cli.nome}</td>
                      <td style="color:#7F8C8D;">R$ ${capOrigReal.toFixed(2)}</td>
                      <td style="font-weight:bold;">R$ ${valTotal.toFixed(2)}</td>
                    </tr>
                  `;
              }

              htmlEntradas += `
                <tr>
                  <td>${dataMov.toLocaleDateString('pt-BR')}</td>
                  <td>${cli.nome}</td>
                  <td><span style="font-size:9px; background:#EEE; padding:2px 4px; border-radius:4px;">${tipo}</span></td>
                  <td style="font-weight:bold;">R$ ${valTotal.toFixed(2)}</td>
                  <td style="color:#555;">R$ ${valCapital.toFixed(2)}</td>
                  <td style="${styleLucro}">R$ ${valLucro.toFixed(2)}</td>
                  <td style="${styleMulta}">R$ ${valMulta.toFixed(2)}</td>
                </tr>
              `;
            }
          });
        });
      });

      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body { font-family: Helvetica, sans-serif; padding: 15px; color: #333; }
              h1 { text-align: center; color: #2C3E50; font-size: 22px; }
              .periodo { text-align: center; color: #7F8C8D; margin-bottom: 25px; font-size: 12px; }
              .resumo-grid { display: flex; justify-content: space-between; margin-bottom: 30px; gap: 8px; }
              .card { flex: 1; background: #F8F9FA; padding: 10px 5px; border-radius: 8px; border: 1px solid #E0E0E0; text-align: center; }
              .card-lbl { font-size: 9px; color: #666; font-weight: bold; text-transform: uppercase; }
              .card-val { font-size: 16px; font-weight: bold; }
              .red { color: #C0392B; } .blue { color: #2980B9; } .green { color: #27AE60; } .orange { color: #D35400; }
              table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 10px; }
              th { background: #34495E; color: #FFF; padding: 6px; text-align: left; }
              td { border-bottom: 1px solid #EEE; padding: 8px 6px; }
              tr:nth-child(even) { background: #FCFDFE; }
              h3 { border-bottom: 1px solid #333; padding-bottom: 5px; margin-top: 25px; font-size: 14px; text-transform: uppercase; }
            </style>
          </head>
          <body>
            <h1>Relatório Financeiro</h1>
            <div class="periodo">${dataIni} até ${dataFim}</div>
            
            <div class="resumo-grid">
              <div class="card"><div class="card-lbl">Investido</div><div class="card-val red">R$ ${totalInvestido.toFixed(2)}</div></div>
              <div class="card"><div class="card-lbl">Recebido</div><div class="card-val blue">R$ ${totalRecebidoBruto.toFixed(2)}</div></div>
              <div class="card"><div class="card-lbl">Lucro</div><div class="card-val green">R$ ${totalLucroLiquido.toFixed(2)}</div></div>
              <div class="card"><div class="card-lbl">Multas</div><div class="card-val orange">R$ ${totalMultasRecolhidas.toFixed(2)}</div></div>
            </div>

            <h3>Entradas (Recebimentos)</h3>
            ${htmlEntradas ? `
              <table>
                <thead><tr><th>Data</th><th>Cliente</th><th>Tipo</th><th>Total</th><th>Capital</th><th>Lucro</th><th>Multa</th></tr></thead>
                <tbody>${htmlEntradas}</tbody>
              </table>
            ` : '<p>Sem registros.</p>'}

            <h3>Saídas (Novos Empréstimos)</h3>
            ${htmlInvestimentos ? `
              <table>
                <thead><tr><th>Data</th><th>Cliente</th><th>Valor Investido</th></tr></thead>
                <tbody>${htmlInvestimentos}</tbody>
              </table>
            ` : '<p>Sem registros.</p>'}

            ${htmlQuitados ? `
              <h3>Empréstimos Quitados (Conferência)</h3>
              <table>
                <thead><tr><th>Data Quitação</th><th>Cliente</th><th>Investido (Orig.)</th><th>Valor Final Pago</th></tr></thead>
                <tbody>${htmlQuitados}</tbody>
              </table>
            ` : ''}

            <p style="text-align:center; font-size:8px; color:#CCC; margin-top:30px;">Relatório Verto App - Atualizado</p>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      setLoading(false);
      fechar();
    } catch (error) { Alert.alert('Erro', 'Falha ao gerar PDF'); setLoading(false); }
  };

  return (
    <Modal visible={visivel} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.titulo}>Relatório Financeiro</Text>
          <Text style={styles.label}>Início</Text>
          <TextInput style={styles.input} value={dataIni} onChangeText={setDataIni} keyboardType="numbers-and-punctuation" />
          <Text style={styles.label}>Fim</Text>
          <TextInput style={styles.input} value={dataFim} onChangeText={setDataFim} keyboardType="numbers-and-punctuation" />
          {loading ? <ActivityIndicator size="large" color="#2C3E50" style={{marginTop:20}}/> : 
            <View style={styles.botoes}>
              <TouchableOpacity style={[styles.btn, styles.btnCancelar]} onPress={fechar}><Text>Fechar</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnGerar]} onPress={gerarRelatorio}><Text style={{color:'#FFF', fontWeight:'bold'}}>Gerar PDF</Text></TouchableOpacity>
            </View>
          }
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '85%', backgroundColor: '#FFF', borderRadius: 12, padding: 20, elevation: 5 },
  titulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#2C3E50' },
  label: { fontSize: 14, color: '#666', marginBottom: 4, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 16, backgroundColor: '#F9F9F9' },
  botoes: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btn: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnCancelar: { backgroundColor: '#E0E0E0' },
  btnGerar: { backgroundColor: '#2C3E50' }
});
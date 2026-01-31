import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../services/supabase';

export function useFluxoPessoal() {
  const [contas, setContas] = useState<any[]>([]);
  const [movimentos, setMovimentos] = useState<any[]>([]);
  const [saldoGeral, setSaldoGeral] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Busca Contas
      const { data: dataContas, error: errContas } = await supabase.from('contas_pessoais').select('*').order('id');
      if (errContas) throw errContas;

      // 2. Busca Movimentos (últimos 100 para a tela)
      const { data: dataMov, error: errMov } = await supabase.from('fluxo_pessoal').select('*').order('data_movimento', { ascending: false }).limit(100);
      if (errMov) throw errMov;

      // 3. Calcula Saldos
      const contasCalculadas = dataContas.map((c: any) => ({ ...c, saldo: 0 }));

      for (let c of contasCalculadas) {
          const { data: inputs } = await supabase.from('fluxo_pessoal').select('valor').eq('conta_id', c.id).eq('tipo', 'ENTRADA');
          const { data: outputs } = await supabase.from('fluxo_pessoal').select('valor').eq('conta_id', c.id).eq('tipo', 'SAIDA');
          
          const totalEntrada = inputs?.reduce((acc, i) => acc + i.valor, 0) || 0;
          const totalSaida = outputs?.reduce((acc, i) => acc + i.valor, 0) || 0;
          c.saldo = totalEntrada - totalSaida;
      }

      const totalGeral = contasCalculadas.reduce((acc: number, c: any) => acc + c.saldo, 0);

      setContas(contasCalculadas);
      setMovimentos(dataMov || []);
      setSaldoGeral(totalGeral);

    } catch (error) { console.log(error); } finally { setLoading(false); }
  };

  const adicionarConta = async (nome: string, instituicao: string) => {
    const { error } = await supabase.from('contas_pessoais').insert([{ nome, instituicao }]);
    if (!error) await fetchData();
  };

  const excluirConta = async (id: number) => {
    await supabase.from('fluxo_pessoal').delete().eq('conta_id', id);
    const { error } = await supabase.from('contas_pessoais').delete().eq('id', id);
    if (!error) await fetchData();
  };

  const adicionarMovimento = async (dados: any) => {
    const { error } = await supabase.from('fluxo_pessoal').insert([{
        conta_id: dados.conta_id, type: dados.tipo, valor: dados.valor, descricao: dados.descricao, data_movimento: dados.data, tipo: dados.tipo
    }]);
    if (!error) { await fetchData(); return true; }
    return false;
  };

  const editarMovimento = async (id: number, dados: any) => {
    const { error } = await supabase.from('fluxo_pessoal').update({
        conta_id: dados.conta_id, tipo: dados.tipo, valor: dados.valor, descricao: dados.descricao, data_movimento: dados.data
    }).eq('id', id);
    if (!error) { await fetchData(); return true; }
    return false;
  };

  const excluirMovimento = async (id: number) => {
    const { error } = await supabase.from('fluxo_pessoal').delete().eq('id', id);
    if (!error) await fetchData();
  };

  const transferir = async (origemId: number, destinoId: number, valor: number, data: string, descricao: string) => {
    try {
        if (origemId === destinoId) { Alert.alert("Erro", "Origem e destino iguais."); return false; }
        const { error: err1 } = await supabase.from('fluxo_pessoal').insert([{ conta_id: origemId, tipo: 'SAIDA', valor: valor, data_movimento: data, descricao: `Transf. Enviada: ${descricao}` }]);
        if(err1) throw err1;
        const { error: err2 } = await supabase.from('fluxo_pessoal').insert([{ conta_id: destinoId, tipo: 'ENTRADA', valor: valor, data_movimento: data, descricao: `Transf. Recebida: ${descricao}` }]);
        if(err2) throw err2;
        await fetchData();
        Alert.alert("Sucesso", "Transferência realizada!");
        return true;
    } catch (e) { Alert.alert("Erro", "Falha na transferência."); return false; }
  };

  // --- NOVA FUNÇÃO: GERAR PDF ---
  const gerarRelatorioPDF = async (contaId: number, nomeConta: string, dataInicio: string, dataFim: string) => {
    try {
        // 1. Converter datas BR (DD/MM/AAAA) para ISO (AAAA-MM-DD) para busca
        const [dI, mI, aI] = dataInicio.split('/');
        const isoInicio = `${aI}-${mI}-${dI}`;
        
        const [dF, mF, aF] = dataFim.split('/');
        const isoFim = `${aF}-${mF}-${dF}`;

        // 2. Buscar dados filtrados
        const { data: extrato, error } = await supabase
            .from('fluxo_pessoal')
            .select('*')
            .eq('conta_id', contaId)
            .gte('data_movimento', isoInicio)
            .lte('data_movimento', isoFim)
            .order('data_movimento', { ascending: true });

        if (error) throw error;
        if (!extrato || extrato.length === 0) {
            Alert.alert("Aviso", "Nenhuma movimentação encontrada neste período.");
            return;
        }

        // 3. Calcular Totais do Relatório
        let totalEntradas = 0;
        let totalSaidas = 0;
        
        const linhasHTML = extrato.map(item => {
            const dataFmt = item.data_movimento.split('-').reverse().join('/');
            const valorFmt = item.valor.toFixed(2).replace('.', ',');
            const cor = item.tipo === 'ENTRADA' ? 'green' : 'red';
            const sinal = item.tipo === 'ENTRADA' ? '+' : '-';
            
            if (item.tipo === 'ENTRADA') totalEntradas += item.valor;
            else totalSaidas += item.valor;

            return `
              <tr>
                <td>${dataFmt}</td>
                <td>${item.descricao}</td>
                <td style="color:${cor}; text-align:right; font-weight:bold;">${sinal} R$ ${valorFmt}</td>
              </tr>
            `;
        }).join('');

        const saldoPeriodo = totalEntradas - totalSaidas;
        const corSaldo = saldoPeriodo >= 0 ? 'green' : 'red';

        // 4. Montar HTML
        const html = `
          <html>
            <head>
              <style>
                body { font-family: 'Helvetica', sans-serif; padding: 20px; }
                h1 { color: #2C3E50; text-align: center; }
                .header { margin-bottom: 20px; border-bottom: 2px solid #EEE; padding-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background-color: #F2F2F2; text-align: left; padding: 10px; border-bottom: 1px solid #DDD; }
                td { padding: 10px; border-bottom: 1px solid #EEE; }
                .totais { margin-top: 30px; text-align: right; font-size: 16px; }
                .saldo-final { font-size: 20px; font-weight: bold; margin-top: 10px; color: ${corSaldo}; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>Axoryn Control</h1>
                <p><strong>Extrato de Conta:</strong> ${nomeConta}</p>
                <p><strong>Período:</strong> ${dataInicio} até ${dataFim}</p>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th style="text-align:right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  ${linhasHTML}
                </tbody>
              </table>

              <div class="totais">
                <p>Total Entradas: <span style="color:green">R$ ${totalEntradas.toFixed(2).replace('.', ',')}</span></p>
                <p>Total Saídas: <span style="color:red">R$ ${totalSaidas.toFixed(2).replace('.', ',')}</span></p>
                <p class="saldo-final">Resultado do Período: R$ ${saldoPeriodo.toFixed(2).replace('.', ',')}</p>
              </div>
              
              <div style="margin-top: 50px; text-align: center; font-size: 10px; color: #999;">
                 Gerado automaticamente por Axoryn Control em ${new Date().toLocaleString('pt-BR')}
              </div>
            </body>
          </html>
        `;

        // 5. Gerar e Compartilhar
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });

    } catch (e) {
        Alert.alert("Erro", "Falha ao gerar PDF.");
        console.log(e);
    }
  };

  return {
    contas, movimentos, saldoGeral, loading,
    adicionarConta, excluirConta,
    adicionarMovimento, editarMovimento, excluirMovimento,
    transferir, gerarRelatorioPDF // <--- Exportado
  };
}
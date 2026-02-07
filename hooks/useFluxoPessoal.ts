import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform } from 'react-native'; // <--- Importações essenciais
import { supabase } from '../services/supabase';

export function useFluxoPessoal() {
  const { t } = useTranslation();
  const [contas, setContas] = useState<any[]>([]);
  const [movimentos, setMovimentos] = useState<any[]>([]);
  const [saldoGeral, setSaldoGeral] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  // --- ATUALIZAÇÃO EM TEMPO REAL ---
  useEffect(() => {
    const canalFluxo = supabase
      .channel('atualizacao-fluxo')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fluxo_pessoal' },
        (payload) => {
          console.log('🔄 Mudança no Fluxo detectada! Atualizando...');
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contas_pessoais' },
        (payload) => {
          console.log('🔄 Mudança nas Contas detectada! Atualizando...');
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalFluxo);
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Busca saldos (RPC)
      let { data: contasComSaldo, error: errContas } = await supabase.rpc('buscar_saldos_contas');
      
      if (errContas) {
        console.error("Erro RPC:", errContas);
        throw errContas;
      }

      // --- AUTO-CORREÇÃO: Se não tiver Carteira, cria agora! ---
      const temCarteira = contasComSaldo?.some((c: any) => c.nome === 'Carteira');
      
      if (!temCarteira) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
              const { error: errCriar } = await supabase.from('contas_pessoais').insert([{
                  nome: 'Carteira',
                  instituicao: 'Dinheiro em Mãos',
                  user_id: user.id
              }]);
              
              if (!errCriar) {
                  const retry = await supabase.rpc('buscar_saldos_contas');
                  contasComSaldo = retry.data;
              }
          }
      }
      
      // 2. Busca Movimentos (últimos 100)
      const { data: dataMov, error: errMov } = await supabase
        .from('fluxo_pessoal')
        .select('*')
        .order('data_movimento', { ascending: false })
        .limit(100);
      
      if (errMov) throw errMov;

      // 3. Formata e Calcula
      const contasFormatadas = (contasComSaldo || []).map((c: any) => ({
        ...c,
        saldo: parseFloat(c.saldo) || 0
      }));

      const totalGeral = contasFormatadas.reduce((acc: number, c: any) => acc + c.saldo, 0);

      setContas(contasFormatadas);
      setMovimentos(dataMov || []);
      setSaldoGeral(totalGeral);

    } catch (error) { 
      console.log(error); 
    } finally { 
      setLoading(false); 
    }
  };

  const getUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
  };

  const adicionarConta = async (nome: string, instituicao: string) => {
    const userId = await getUserId();
    const { error } = await supabase.from('contas_pessoais').insert([{ 
      nome, 
      instituicao,
      user_id: userId 
    }]);
    if (!error) await fetchData();
    else Alert.alert(t('common.erro'), t('fluxo.falhaCriarConta'));
  };

  const excluirConta = async (id: number) => {
    await supabase.from('fluxo_pessoal').delete().eq('conta_id', id);
    const { error } = await supabase.from('contas_pessoais').delete().eq('id', id);
    if (!error) await fetchData();
  };

  const adicionarMovimento = async (dados: any) => {
    const userId = await getUserId();

    const { error } = await supabase.from('fluxo_pessoal').insert([{
        conta_id: dados.conta_id, 
        valor: dados.valor, 
        descricao: dados.descricao, 
        data_movimento: dados.data, 
        tipo: dados.tipo,
        user_id: userId 
    }]);
    
    if (error) {
        Alert.alert(t('common.erro'), t('fluxo.falhaSalvar'));
        return false;
    } 

    await fetchData(); 
    return true;
  };

  const editarMovimento = async (id: number, dados: any) => {
    const { error } = await supabase.from('fluxo_pessoal').update({
        conta_id: dados.conta_id, 
        valor: dados.valor, 
        descricao: dados.descricao, 
        data_movimento: dados.data, 
        tipo: dados.tipo
    }).eq('id', id);
    
    if (error) return false;
    await fetchData(); 
    return true;
  };

  const excluirMovimento = async (id: number) => {
    const { error } = await supabase.from('fluxo_pessoal').delete().eq('id', id);
    if (!error) await fetchData();
  };

  const transferir = async (origemId: number, destinoId: number, valor: number, data: string, descricao: string) => {
    try {
        if (origemId === destinoId) { Alert.alert(t('common.erro'), t('fluxo.origemDestinoIguais')); return false; }
        const userId = await getUserId();

        const [res1, res2] = await Promise.all([
          supabase.from('fluxo_pessoal').insert([{ 
              conta_id: origemId, tipo: 'SAIDA', valor, data_movimento: data, descricao: `Transf. Env: ${descricao}`,
              user_id: userId 
          }]),
          supabase.from('fluxo_pessoal').insert([{ 
              conta_id: destinoId, tipo: 'ENTRADA', valor, data_movimento: data, descricao: `Transf. Rec: ${descricao}`,
              user_id: userId 
          }])
        ]);

        if(res1.error || res2.error) throw new Error("Erro no banco");

        await fetchData();
        Alert.alert(t('common.sucesso'), t('fluxo.sucessoTransferencia'));
        return true;
    } catch (e) { Alert.alert(t('common.erro'), t('fluxo.falhaTransferencia')); return false; }
  };

  const gerarRelatorioPDF = async (contaId: number, nomeConta: string, dataInicio: string, dataFim: string) => {
    try {
        // --- PARSER DE DATAS BLINDADO ---
        // Garante que converte DD/MM/AAAA para YYYY-MM-DD corretamente
        let isoInicio = '';
        let isoFim = '';
        
        try {
            if (dataInicio.includes('/')) {
                const [dI, mI, aI] = dataInicio.split('/');
                isoInicio = `${aI}-${mI}-${dI}`;
            } else { isoInicio = dataInicio; }

            if (dataFim.includes('/')) {
                const [dF, mF, aF] = dataFim.split('/');
                isoFim = `${aF}-${mF}-${dF}`;
            } else { isoFim = dataFim; }
        } catch (e) {
            Alert.alert(t('common.erro'), "Formato de data inválido. Use DD/MM/AAAA.");
            return;
        }

        const { data: extrato, error } = await supabase
            .from('fluxo_pessoal')
            .select('*')
            .eq('conta_id', contaId)
            .gte('data_movimento', isoInicio)
            .lte('data_movimento', isoFim)
            .order('data_movimento', { ascending: true });

        if (error) throw error;
        if (!extrato || extrato.length === 0) {
            Alert.alert(t('fluxo.aviso'), t('fluxo.nenhumaMovimentacao'));
            return;
        }

        let totalEntradas = 0, totalSaidas = 0;
        
        const linhasHTML = extrato.map(item => {
            // Formata a data para exibição (DD/MM/AAAA)
            const dataFmt = item.data_movimento ? item.data_movimento.split('-').reverse().join('/') : '-';
            const valorFmt = item.valor.toFixed(2).replace('.', ',');
            const cor = item.tipo === 'ENTRADA' ? 'green' : 'red';
            const sinal = item.tipo === 'ENTRADA' ? '+' : '-';
            
            if (item.tipo === 'ENTRADA') totalEntradas += item.valor; 
            else totalSaidas += item.valor;
            
            return `<tr><td>${dataFmt}</td><td>${item.descricao}</td><td style="color:${cor}; text-align:right; font-weight:bold;">${sinal} R$ ${valorFmt}</td></tr>`;
        }).join('');

        const saldoPeriodo = totalEntradas - totalSaidas;
        const corSaldo = saldoPeriodo >= 0 ? 'green' : 'red';

        const html = `
          <html>
            <head>
              <title>Extrato - ${nomeConta}</title>
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <style>
                body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
                h1 { color: #2C3E50; text-align: center; margin-bottom: 5px; }
                .header { margin-bottom: 20px; border-bottom: 2px solid #EEE; padding-bottom: 10px; text-align: center; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
                th { background-color: #F2F2F2; text-align: left; padding: 10px; border-bottom: 1px solid #DDD; font-weight: bold; }
                td { padding: 10px; border-bottom: 1px solid #EEE; }
                .totais { margin-top: 30px; text-align: right; font-size: 16px; padding-top: 10px; border-top: 1px solid #EEE; }
                .saldo-final { font-size: 20px; font-weight: bold; margin-top: 10px; color: ${corSaldo}; }
                @media print {
                    .no-print { display: none; }
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>Axoryn Control</h1>
                <p><strong>${t('fluxo.extratoConta')}:</strong> ${nomeConta}</p>
                <p><strong>${t('fluxo.periodo')}:</strong> ${dataInicio} ${t('relatorio.ate')} ${dataFim}</p>
              </div>
              <table>
                <thead>
                    <tr>
                        <th width="20%">${t('fluxo.data')}</th>
                        <th width="50%">${t('fluxo.descricao')}</th>
                        <th width="30%" style="text-align:right">${t('fluxo.valor')}</th>
                    </tr>
                </thead>
                <tbody>${linhasHTML}</tbody>
              </table>
              <div class="totais">
                <p>${t('fluxo.totalEntradas')}: <span style="color:green">R$ ${totalEntradas.toFixed(2).replace('.', ',')}</span></p>
                <p>${t('fluxo.totalSaidas')}: <span style="color:red">R$ ${totalSaidas.toFixed(2).replace('.', ',')}</span></p>
                <p class="saldo-final">${t('fluxo.resultadoPeriodo')}: R$ ${saldoPeriodo.toFixed(2).replace('.', ',')}</p>
              </div>
            </body>
          </html>`;

        // --- SOLUÇÃO HÍBRIDA (Web vs Mobile) ---
        if (Platform.OS === 'web') {
            // WEB: Abre uma nova janela e imprime
            const pdfWindow = window.open('', '_blank');
            if (pdfWindow) {
                pdfWindow.document.write(html);
                pdfWindow.document.close();
                // Pequeno delay para garantir que o CSS carregue
                setTimeout(() => {
                    pdfWindow.focus();
                    pdfWindow.print();
                }, 500);
            } else {
                Alert.alert(t('common.erro'), "Por favor, permita pop-ups para gerar o relatório.");
            }
        } else {
            // MOBILE: Gera PDF e Compartilha
            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        }

    } catch (e) { 
        Alert.alert(t('common.erro'), t('fluxo.falhaPDF')); 
        console.error(e);
    }
  };

  return { contas, movimentos, saldoGeral, loading, adicionarConta, excluirConta, adicionarMovimento, editarMovimento, excluirMovimento, transferir, gerarRelatorioPDF };
}
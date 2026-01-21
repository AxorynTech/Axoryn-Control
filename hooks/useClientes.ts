import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../services/supabase';
import { Cliente, Contrato } from '../types';

export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clientes')
        .select('*, contratos(*)')
        .order('nome');

      if (error) throw error;

      const formatados: Cliente[] = (data || []).map((cli: any) => ({
        id: cli.id,
        nome: cli.nome,
        whatsapp: cli.whatsapp,
        endereco: cli.endereco,
        indicacao: cli.indicacao,
        reputacao: cli.reputacao,
        segmento: cli.segmento, 
        contratos: (cli.contratos || []).map((c: any) => ({
          id: c.id,
          capital: c.capital,
          taxa: c.taxa,
          frequencia: c.frequencia,
          status: c.status,
          garantia: c.garantia,
          movimentacoes: c.movimentacoes || [],
          
          lucroTotal: c.lucro_total || 0,
          multasPagas: c.multas_pagas || 0,
          dataInicio: formatarDataDoBanco(c.data_inicio),
          proximoVencimento: formatarDataDoBanco(c.proximo_vencimento),
          valorMultaDiaria: c.valor_multa_diaria,
          diasDiario: c.dias_diario,
          
          totalParcelas: c.total_parcelas,
          parcelasPagas: c.parcelas_pagas,
          valorParcela: c.valor_parcela,
          lucroJurosPorParcela: c.lucro_juros_por_parcela
        })).sort((a: any, b: any) => b.id - a.id)
      }));

      setClientes(formatados);
    } catch (error: any) {
      console.log("Erro:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- HELPERS DE DATA ---
  const formatarDataDoBanco = (dataISO: string) => {
    if (!dataISO) return '';
    if (dataISO.includes('-')) {
       const [ano, mes, dia] = dataISO.split('-');
       return `${dia}/${mes}/${ano}`;
    }
    return dataISO;
  };

  const lerDataBR = (dataBR: string) => {
     if(!dataBR) return new Date();
     const [dia, mes, ano] = dataBR.split('/');
     return new Date(Number(ano), Number(mes)-1, Number(dia));
  };
  
  const paraBancoISO = (dataBR: string) => {
     try {
       const d = lerDataBR(dataBR);
       return d.toISOString().split('T')[0];
     } catch (e) { return new Date().toISOString().split('T')[0]; }
  };

  // --- LÓGICA ATUALIZADA AQUI ---
  const calcularTotais = () => {
    let capitalTotal = 0, lucro = 0, multas = 0, vendas = 0;

    clientes.forEach(cli => {
      (cli.contratos || []).forEach(con => {
        // Soma capital se estiver ativo/parcelado
        if (con.status === 'ATIVO' || con.status === 'PARCELADO') {
          capitalTotal += (con.capital || 0);
        }

        // SEPARAÇÃO: Venda vs Empréstimo
        if (con.frequencia === 'PARCELADO') {
            // É VENDA: Soma Parcelas Recebidas + Multas desta venda
            const recebidoParcelas = (con.parcelasPagas || 0) * (con.valorParcela || 0);
            const multasVenda = (con.multasPagas || 0);
            
            // Agora a multa da venda entra aqui também
            vendas += (recebidoParcelas + multasVenda);
            
        } else {
            // É EMPRÉSTIMO (Mensal, Semanal, Diário): 
            // Lucro vai para "Juros Empréstimos"
            lucro += (con.lucroTotal || 0);
            
            // Multa vai para "Multas Recebidas" (somente de empréstimos)
            multas += (con.multasPagas || 0);
        }
      });
    });

    return { capital: capitalTotal, lucro, multas, vendas };
  };

  // --- AÇÕES ---
  const adicionarCliente = async (dados: Partial<Cliente>) => {
    try {
      const { error } = await supabase.from('clientes').insert([{
        nome: dados.nome,
        whatsapp: dados.whatsapp,
        endereco: dados.endereco,
        indicacao: dados.indicacao,
        reputacao: dados.reputacao || 'NEUTRA',
        segmento: dados.segmento
      }]);
      if (error) throw error;
      await fetchData();
    } catch (e) { Alert.alert("Erro", "Falha ao salvar"); }
  };

  const editarCliente = async (nomeAntigo: string, dados: Partial<Cliente>) => {
    const cliente = clientes.find(c => c.nome === nomeAntigo);
    if (!cliente?.id) return;
    try {
        const { error } = await supabase.from('clientes').update({
            nome: dados.nome, whatsapp: dados.whatsapp, endereco: dados.endereco,
            indicacao: dados.indicacao, reputacao: dados.reputacao,
            segmento: dados.segmento
        }).eq('id', cliente.id);
        if (error) throw error;
        await fetchData();
    } catch(e) { Alert.alert("Erro", "Falha ao editar"); }
  };

  const excluirCliente = (nomeCliente: string) => {
    const cliente = clientes.find(c => c.nome === nomeCliente);
    if (!cliente?.id) return;
    Alert.alert("Excluir", `Apagar ${nomeCliente}?`, [
      { text: "Cancelar" },
      { text: "Apagar", style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('clientes').delete().eq('id', cliente.id);
          if (!error) await fetchData();
        }}
    ]);
  };

  const adicionarContrato = async (nomeCliente: string, novoContrato: any) => {
    const cliente = clientes.find(c => c.nome === nomeCliente);
    if (!cliente?.id) return Alert.alert("Erro", "Cliente não encontrado");

    try {
        const dataBaseStr = novoContrato.dataInicio || new Date().toLocaleDateString('pt-BR');
        
        const addDias = (d: Date, dias: number) => { d.setDate(d.getDate() + dias); return d.toISOString().split('T')[0]; };
        const addMes = (d: Date, meses: number) => { d.setMonth(d.getMonth() + meses); return d.toISOString().split('T')[0]; };

        let contratoDB: any = {
            cliente_id: cliente.id,
            capital: novoContrato.capital,
            taxa: novoContrato.taxa,
            frequencia: novoContrato.frequencia,
            data_inicio: paraBancoISO(dataBaseStr),
            garantia: novoContrato.garantia,
            valor_multa_diaria: novoContrato.valorMultaDiaria || 0,
            status: 'ATIVO',
            lucro_total: 0, multas_pagas: 0, movimentacoes: []
        };

        // --- LÓGICA DE FREQUÊNCIAS ---

        if (novoContrato.frequencia === 'PARCELADO') {
            // LÓGICA NOVA PARA VENDA PARCELADA (MENSAL)
            const parc = parseInt(novoContrato.totalParcelas || '1');
            const juros = novoContrato.capital * (novoContrato.taxa / 100);
            const total = novoContrato.capital + juros;
            const valorParc = total / parc;

            contratoDB.status = 'PARCELADO';
            contratoDB.total_parcelas = parc;
            contratoDB.valor_parcela = valorParc;
            contratoDB.lucro_juros_por_parcela = juros / parc;
            contratoDB.proximo_vencimento = addMes(lerDataBR(dataBaseStr), 1);
            contratoDB.movimentacoes = [`${dataBaseStr}: Venda Parcelada Iniciada (${parc}x R$ ${valorParc.toFixed(2)})`];

        } else if (novoContrato.frequencia === 'SEMANAL') {
            const juros = novoContrato.capital * (novoContrato.taxa / 100);
            const total = novoContrato.capital + juros;
            const parc = total / 4;
            contratoDB.status = 'PARCELADO';
            contratoDB.total_parcelas = 4;
            contratoDB.valor_parcela = parc;
            contratoDB.lucro_juros_por_parcela = juros / 4;
            contratoDB.proximo_vencimento = addDias(lerDataBR(dataBaseStr), 7);
            contratoDB.movimentacoes = [`${dataBaseStr}: Semanal Iniciado (4x R$ ${parc.toFixed(2)})`];

        } else if (novoContrato.frequencia === 'DIARIO' && novoContrato.diasDiario) {
            const dias = parseInt(novoContrato.diasDiario);
            const juros = novoContrato.capital * (novoContrato.taxa / 100);
            const total = novoContrato.capital + juros;
            const parc = total / dias;
            contratoDB.status = 'PARCELADO';
            contratoDB.dias_diario = dias;
            contratoDB.total_parcelas = dias;
            contratoDB.valor_parcela = parc;
            contratoDB.lucro_juros_por_parcela = juros / dias;
            contratoDB.proximo_vencimento = addDias(lerDataBR(dataBaseStr), 1);
            contratoDB.movimentacoes = [`${dataBaseStr}: Diário Iniciado (${dias}x R$ ${parc.toFixed(2)})`];

        } else {
            // MENSAL PADRÃO (EMPRÉSTIMO A JUROS RECORRENTES)
            contratoDB.proximo_vencimento = addMes(lerDataBR(dataBaseStr), 1);
            contratoDB.movimentacoes = [`${dataBaseStr}: Mensal Iniciado (R$ ${novoContrato.capital.toFixed(2)})`];
        }

        const { error } = await supabase.from('contratos').insert([contratoDB]);
        if (error) throw error;
        await fetchData();
    } catch (e: any) { Alert.alert("Erro", e.message); }
  };

  const acaoRenovarQuitar = async (tipo: string, contrato: Contrato, nomeCliente: string, dataInformada: string) => {
    try {
      const vJuro = contrato.capital * (contrato.taxa / 100);
      let vMulta = 0;
      
      if (contrato.valorMultaDiaria && contrato.valorMultaDiaria > 0) {
        const dtPag = lerDataBR(dataInformada);
        const dtVenc = lerDataBR(contrato.proximoVencimento);
        const diff = Math.ceil((dtPag.getTime() - dtVenc.getTime()) / (1000 * 60 * 60 * 24));
        if (diff > 0) vMulta = diff * contrato.valorMultaDiaria;
      }

      let updates: any = {};
      let h = [...(contrato.movimentacoes || [])];

      if (tipo === 'RENOVAR') {
          const d = lerDataBR(contrato.proximoVencimento || dataInformada);

          if (contrato.frequencia === 'MENSAL' || contrato.frequencia === 'PARCELADO') d.setMonth(d.getMonth() + 1);
          else if (contrato.frequencia === 'SEMANAL') d.setDate(d.getDate() + 7);
          else if (contrato.frequencia === 'DIARIO') d.setDate(d.getDate() + 1);

          let msg = `${dataInformada}: RENOVAÇÃO (Juros R$ ${vJuro.toFixed(2)}`;
          if(vMulta > 0) msg += ` + Multa R$ ${vMulta.toFixed(2)}`;
          msg += `)`;
          h.unshift(msg);

          updates = {
             lucro_total: (contrato.lucroTotal||0) + vJuro,
             multas_pagas: (contrato.multasPagas||0) + vMulta,
             proximo_vencimento: d.toISOString().split('T')[0],
             movimentacoes: h
          };
      } else {
          const total = contrato.capital + vJuro + vMulta;
          h.unshift(`${dataInformada}: QUITADO - Total R$ ${total.toFixed(2)}`);
          updates = {
             status: 'QUITADO',
             capital: 0,
             lucro_total: (contrato.lucroTotal||0) + vJuro,
             multas_pagas: (contrato.multasPagas||0) + vMulta,
             movimentacoes: h
          };
      }

      const { error } = await supabase.from('contratos').update(updates).eq('id', contrato.id);
      if(error) throw error;
      await fetchData();
      
      const val = tipo === 'RENOVAR' ? (vJuro + vMulta) : (contrato.capital + vJuro + vMulta);
      Alert.alert("Sucesso", `${tipo} realizado!\n💰 Receber: R$ ${val.toFixed(2)}`);

    } catch (e) { Alert.alert("Erro", "Erro ao processar."); }
  };

  const pagarParcela = async (nomeCliente: string, contrato: Contrato, dataPagamento: string) => {
    try {
      let vMulta = 0;
      if (contrato.valorMultaDiaria && contrato.valorMultaDiaria > 0) {
        const dtPag = lerDataBR(dataPagamento);
        const dtVenc = lerDataBR(contrato.proximoVencimento);
        const diff = Math.ceil((dtPag.getTime() - dtVenc.getTime()) / (1000 * 60 * 60 * 24));
        if (diff > 0) vMulta = diff * contrato.valorMultaDiaria;
      }

      const qtdPagas = (contrato.parcelasPagas || 0) + 1;
      const lucroParc = contrato.lucroJurosPorParcela || 0;
      const amortizacao = (contrato.valorParcela || 0) - lucroParc;
      let novoSaldo = (contrato.capital || 0) - amortizacao;
      if (novoSaldo < 0) novoSaldo = 0;

      let h = [...(contrato.movimentacoes || [])];
      h.unshift(`${dataPagamento}: Recebido R$ ${((contrato.valorParcela||0)+vMulta).toFixed(2)}`);

      let updates: any = {
           multas_pagas: (contrato.multasPagas || 0) + vMulta,
           lucro_total: (contrato.lucroTotal || 0) + lucroParc,
           parcelas_pagas: qtdPagas,
           movimentacoes: h
      };

      if (qtdPagas >= (contrato.totalParcelas || 0) || novoSaldo <= 0.1) {
         h.unshift(`${dataPagamento}: CONTRATO FINALIZADO!`);
         updates.status = 'QUITADO';
         updates.capital = 0;
      } else {
         updates.capital = novoSaldo;
         
         const d = lerDataBR(contrato.proximoVencimento || dataPagamento); 
         if (contrato.frequencia === 'SEMANAL') d.setDate(d.getDate() + 7);
         else if (contrato.frequencia === 'DIARIO') d.setDate(d.getDate() + 1);
         else d.setMonth(d.getMonth() + 1);
         updates.proximo_vencimento = d.toISOString().split('T')[0];
      }

      const { error } = await supabase.from('contratos').update(updates).eq('id', contrato.id);
      if(error) throw error;
      await fetchData();
      Alert.alert("Sucesso", `Parcela paga!\n💰 Receber: R$ ${((contrato.valorParcela||0)+vMulta).toFixed(2)}`);

    } catch (e) { Alert.alert("Erro", "Erro ao pagar."); }
  };

  const criarAcordo = async (nomeCliente: string, contratoId: number, valorTotal: number, qtd: number, data: string, multaDiaria: number) => {
    try {
        const contrato = clientes.find(c => c.nome === nomeCliente)?.contratos.find(ct => ct.id === contratoId);
        const saldoAnt = contrato?.capital || 0;
        const lucroAcordo = valorTotal - saldoAnt;
        const valorParc = valorTotal / qtd;

        const updates = {
            status: 'PARCELADO',
            capital: valorTotal,
            total_parcelas: qtd,
            parcelas_pagas: 0,
            valor_parcela: valorParc,
            valor_multa_diaria: multaDiaria,
            lucro_juros_por_parcela: lucroAcordo > 0 ? (lucroAcordo / qtd) : 0,
            proximo_vencimento: paraBancoISO(data),
            movimentacoes: [`${data}: ACORDO R$ ${valorTotal.toFixed(2)} (${qtd}x)`, ...(contrato?.movimentacoes || [])]
        };
        const { error } = await supabase.from('contratos').update(updates).eq('id', contratoId);
        if (error) throw error;
        await fetchData();
        Alert.alert("Sucesso", "Acordo realizado!");
    } catch(e) { Alert.alert("Erro", "Falha no acordo"); }
  };
  
  const editarContrato = async (nomeCliente: string, id: number, dados: any) => { Alert.alert("Aviso", "Edição rápida indisponível."); }; 
  const excluirContrato = async (id: number) => { 
      const { error } = await supabase.from('contratos').delete().eq('id', id);
      if(!error) await fetchData(); 
  };
  const importarDados = (d: any) => {};

  return {
    clientes, loading, totais: calcularTotais(), fetchData,
    adicionarCliente, editarCliente, excluirCliente,
    adicionarContrato, editarContrato, excluirContrato,
    acaoRenovarQuitar, pagarParcela, criarAcordo, importarDados
  };
}
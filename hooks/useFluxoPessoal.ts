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
      const { data: dataContas, error: errContas } = await supabase
        .from('contas_pessoais')
        .select('*')
        .order('id');
      if (errContas) throw errContas;

      // 2. Busca Movimentos (últimos 100)
      const { data: dataMov, error: errMov } = await supabase
        .from('fluxo_pessoal')
        .select('*')
        .order('data_movimento', { ascending: false })
        .limit(100);
      if (errMov) throw errMov;

      // 3. Calcula Saldos em Tempo Real
      const contasCalculadas = dataContas.map((c: any) => {
         // Filtra movimentos desta conta (buscando todos para saldo exato seria ideal, 
         // mas aqui assumimos que o backend ou uma view faria isso. 
         // Para simplificar no front, vamos somar o que temos ou confiar num saldo base se existir)
         // *Nota: Para precisão total, o ideal é somar TODOS os movimentos do banco, não só os 100 carregados.*
         // Vamos ajustar para calcular baseado no histórico carregado + saldo inicial se tivesse.
         // Mas como estamos sem saldo inicial, vamos calcular baseado no histórico total (numa query real seria sum(valor))
         return { ...c, saldo: 0 }; 
      });

      // Recalcular saldos corretamente buscando SUM do banco
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

    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const adicionarConta = async (nome: string, instituicao: string) => {
    const { error } = await supabase.from('contas_pessoais').insert([{ nome, instituicao }]);
    if (!error) await fetchData();
  };

  const excluirConta = async (id: number) => {
    // Primeiro apaga movimentos para não dar erro de FK (ou configure cascade no banco)
    await supabase.from('fluxo_pessoal').delete().eq('conta_id', id);
    const { error } = await supabase.from('contas_pessoais').delete().eq('id', id);
    if (!error) await fetchData();
  };

  const adicionarMovimento = async (dados: any) => {
    const { error } = await supabase.from('fluxo_pessoal').insert([{
        conta_id: dados.conta_id,
        tipo: dados.tipo,
        valor: dados.valor,
        descricao: dados.descricao,
        data_movimento: dados.data
    }]);
    if (!error) { await fetchData(); return true; }
    return false;
  };

  const editarMovimento = async (id: number, dados: any) => {
    const { error } = await supabase.from('fluxo_pessoal').update({
        conta_id: dados.conta_id,
        tipo: dados.tipo,
        valor: dados.valor,
        descricao: dados.descricao,
        data_movimento: dados.data
    }).eq('id', id);
    if (!error) { await fetchData(); return true; }
    return false;
  };

  const excluirMovimento = async (id: number) => {
    const { error } = await supabase.from('fluxo_pessoal').delete().eq('id', id);
    if (!error) await fetchData();
  };

  // --- NOVA FUNÇÃO DE TRANSFERÊNCIA ---
  const transferir = async (origemId: number, destinoId: number, valor: number, data: string, descricao: string) => {
    try {
        if (origemId === destinoId) { Alert.alert("Erro", "Origem e destino iguais."); return false; }

        // 1. Saída na Origem
        const { error: err1 } = await supabase.from('fluxo_pessoal').insert([{
            conta_id: origemId,
            tipo: 'SAIDA',
            valor: valor,
            data_movimento: data,
            descricao: `Transf. Enviada: ${descricao}`
        }]);
        if(err1) throw err1;

        // 2. Entrada no Destino
        const { error: err2 } = await supabase.from('fluxo_pessoal').insert([{
            conta_id: destinoId,
            tipo: 'ENTRADA',
            valor: valor,
            data_movimento: data,
            descricao: `Transf. Recebida: ${descricao}`
        }]);
        if(err2) throw err2;

        await fetchData();
        Alert.alert("Sucesso", "Transferência realizada!");
        return true;

    } catch (e) {
        Alert.alert("Erro", "Falha na transferência.");
        return false;
    }
  };

  return {
    contas, movimentos, saldoGeral, loading,
    adicionarConta, excluirConta,
    adicionarMovimento, editarMovimento, excluirMovimento,
    transferir // <--- Exportando a nova função
  };
}
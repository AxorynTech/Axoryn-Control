import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../services/supabase';

export interface ContaPessoal {
  id: number;
  nome: string;
  instituicao?: string; // <--- Novo Campo
  saldo: number;
}

export interface MovimentoPessoal {
  id: number;
  tipo: 'ENTRADA' | 'SAIDA';
  valor: number;
  descricao: string;
  data: string;
  conta_id: number;
}

export function useFluxoPessoal() {
  const [contas, setContas] = useState<ContaPessoal[]>([]);
  const [movimentos, setMovimentos] = useState<MovimentoPessoal[]>([]);
  const [saldoGeral, setSaldoGeral] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDados(); }, []);

  const fetchDados = async () => {
    try {
      setLoading(true);
      
      const { data: dataContas, error: erroContas } = await supabase.from('contas_pessoais').select('*').order('id');
      if (erroContas) throw erroContas;

      const { data: dataMov, error: erroMov } = await supabase
        .from('fluxo_pessoal')
        .select('*')
        .order('data_movimento', { ascending: false })
        .order('created_at', { ascending: false });
      if (erroMov) throw erroMov;

      const movFormatados: MovimentoPessoal[] = dataMov.map((m: any) => ({
        id: m.id,
        tipo: m.tipo,
        valor: Number(m.valor),
        descricao: m.descricao,
        data: m.data_movimento,
        conta_id: m.conta_id
      }));

      let totalGeral = 0;
      const contasComSaldo = dataContas.map((c: any) => {
        const movsDaConta = movFormatados.filter(m => m.conta_id === c.id);
        const saldoDaConta = movsDaConta.reduce((acc, m) => 
          m.tipo === 'ENTRADA' ? acc + m.valor : acc - m.valor, 0
        );
        totalGeral += saldoDaConta;
        return { ...c, saldo: saldoDaConta, instituicao: c.instituicao };
      });

      setContas(contasComSaldo);
      setMovimentos(movFormatados);
      setSaldoGeral(totalGeral);

    } catch (error) {
      console.log("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- ATUALIZADO: Recebe Instituição ---
  const adicionarConta = async (nome: string, instituicao: string) => {
    try {
      const { error } = await supabase.from('contas_pessoais').insert([{ 
        nome, 
        instituicao 
      }]);
      if (error) throw error;
      await fetchDados();
    } catch (e) { Alert.alert("Erro", "Falha ao criar conta."); }
  };

  const excluirConta = async (id: number) => {
    Alert.alert("Excluir Conta", "Isso apagará todas as movimentações dela.", [
      { text: "Cancelar" },
      { text: "Apagar", style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('contas_pessoais').delete().eq('id', id);
          if (!error) await fetchDados();
      }}
    ]);
  };

  const adicionarMovimento = async (novo: Omit<MovimentoPessoal, 'id'>) => {
    try {
      const { error } = await supabase.from('fluxo_pessoal').insert([{
        tipo: novo.tipo, valor: novo.valor, descricao: novo.descricao,
        data_movimento: novo.data, conta_id: novo.conta_id
      }]);
      if (error) throw error;
      await fetchDados();
      return true;
    } catch (error) { return false; }
  };

  const editarMovimento = async (id: number, dados: Partial<MovimentoPessoal>) => {
    try {
        const { error } = await supabase.from('fluxo_pessoal').update({
            tipo: dados.tipo, valor: dados.valor, descricao: dados.descricao,
            data_movimento: dados.data, conta_id: dados.conta_id
        }).eq('id', id);
        if (error) throw error;
        await fetchDados();
        return true;
    } catch (error) { return false; }
  };

  const excluirMovimento = async (id: number) => {
      const { error } = await supabase.from('fluxo_pessoal').delete().eq('id', id);
      if (!error) await fetchDados();
  };

  return { 
    contas, movimentos, saldoGeral, loading, 
    adicionarConta, excluirConta, 
    adicionarMovimento, editarMovimento, excluirMovimento, 
    fetchDados 
  };
}
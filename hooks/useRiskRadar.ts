import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../services/supabase';

export function useRiskRadar() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [consultasRestantes, setConsultasRestantes] = useState(0); 

  useEffect(() => {
    carregarUsuarioECreditos();
  }, []);

  const carregarUsuarioECreditos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; 

      // Busca os créditos
      const { data, error } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        verificarRenovacao(data, user.id);
      } else {
        await criarContaDeCreditos(user.id);
      }
    } catch (error) {
      console.log("Erro ao carregar créditos:", error);
    }
  };

  const criarContaDeCreditos = async (userId: string) => {
      const { error } = await supabase.from('user_credits').insert([
          { user_id: userId, consultas_restantes: 10, ultima_renovacao: new Date().toISOString() }
      ]);
      if (!error) setConsultasRestantes(10);
  };

  const verificarRenovacao = async (dadosBanco: any, userId: string) => {
      const hoje = new Date();
      const ultimaData = new Date(dadosBanco.ultima_renovacao);
      const diferencaDias = (hoje.getTime() - ultimaData.getTime()) / (1000 * 3600 * 24);

      if (diferencaDias >= 30) {
          console.log("Renovação Mensal Pessoal!");
          const novoSaldo = 10;
          await supabase.from('user_credits').update({ 
              consultas_restantes: novoSaldo,
              ultima_renovacao: new Date().toISOString()
          }).eq('user_id', userId);
          
          setConsultasRestantes(novoSaldo);
          Alert.alert("Renovação", "Seus créditos mensais foram renovados! +10 consultas.");
      } else {
          setConsultasRestantes(dadosBanco.consultas_restantes);
      }
  };

  const recarregarCreditos = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      try {
          const { error } = await supabase
            .from('user_credits')
            .update({ consultas_restantes: 10 })
            .eq('user_id', user.id);

          if (!error) {
              setConsultasRestantes(10);
              Alert.alert("Recarga", "Pacote de 10 consultas liberado para VOCÊ! 🚀");
          }
      } catch (e) { Alert.alert("Erro", "Falha ao recarregar."); }
  };

  const investigar = async (cpf: string, telefone: string, nome: string) => {
    if (consultasRestantes <= 0) {
        Alert.alert(
            "Seu Limite Atingiu 0", 
            "Você usou todas as suas consultas gratuitas.\nFaça uma recarga para continuar.",
            [
                { text: "Cancelar", style: "cancel" },
                { text: "Recarregar", onPress: recarregarCreditos }
            ]
        );
        return;
    }

    setLoading(true);
    setResultado(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não logado");

      // 1. Chama a inteligência (RPC)
      const { data, error } = await supabase
        .rpc('consultar_risco_triangulado', {
          cpf_input: cpf || '',
          telefone_input: telefone || '',
          nome_input: nome || ''
        });

      if (error) throw error;
      setResultado(data);

      // --- CORREÇÃO AQUI: REGISTRAR O LOG PARA O RANKING ---
      // Isso cria o registro que a tela de Perfil conta
      await supabase.from('risk_logs').insert([{
          user_id: user.id,
          data_consulta: new Date().toISOString(),
          termo_pesquisado: nome || cpf || telefone || 'Consulta Rápida'
      }]);
      // -----------------------------------------------------

      // 2. Desconta 1 crédito
      const novoSaldo = consultasRestantes - 1;
      setConsultasRestantes(novoSaldo);
      
      await supabase
        .from('user_credits')
        .update({ consultas_restantes: novoSaldo })
        .eq('user_id', user.id);

    } catch (error: any) {
      Alert.alert('Erro', 'Falha na conexão ou consulta.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return {
    investigar,
    resultado,
    loading,
    consultasRestantes,
    recarregarCreditos
  };
}
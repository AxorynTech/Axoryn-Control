import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next'; // <--- Importação
import { Alert } from 'react-native';
import { supabase } from '../services/supabase';

export function useRiskRadar() {
  const { t } = useTranslation(); // <--- Hook de tradução
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [consultasRestantes, setConsultasRestantes] = useState(0); 
  
  // --- NOVO: Estado para controlar o período grátis ---
  const [periodoGratis, setPeriodoGratis] = useState(false);

  useEffect(() => {
    carregarUsuarioECreditos();
  }, []);

  const carregarUsuarioECreditos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; 

      // --- 1. VERIFICA SE A CONTA TEM MENOS DE 30 DIAS ---
      const dataCriacao = new Date(user.created_at);
      const hoje = new Date();
      const diferencaTempo = hoje.getTime() - dataCriacao.getTime();
      const diasDeVida = diferencaTempo / (1000 * 3600 * 24);

      // Se tiver menos de 30 dias, ativa o modo ilimitado
      const isGratis = diasDeVida <= 30;
      setPeriodoGratis(isGratis);

      // Busca os créditos (mesmo sendo grátis, carregamos para quando acabar)
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
      // <--- AQUI VOCÊ ALTERA A QUANTIDADE INICIAL (PADRÃO 10)
      const QTD_INICIAL = 10; 

      const { error } = await supabase.from('user_credits').insert([
          { user_id: userId, consultas_restantes: QTD_INICIAL, ultima_renovacao: new Date().toISOString() }
      ]);
      if (!error) setConsultasRestantes(QTD_INICIAL);
  };

  const verificarRenovacao = async (dadosBanco: any, userId: string) => {
      const hoje = new Date();
      const ultimaData = new Date(dadosBanco.ultima_renovacao);
      const diferencaDias = (hoje.getTime() - ultimaData.getTime()) / (1000 * 3600 * 24);

      if (diferencaDias >= 30) {
          console.log("Renovação Mensal Pessoal!");
          
          // <--- AQUI VOCÊ ALTERA A QUANTIDADE DA RENOVAÇÃO MENSAL (PADRÃO 10)
          const QTD_RENOVACAO = 10;

          await supabase.from('user_credits').update({ 
              consultas_restantes: QTD_RENOVACAO,
              ultima_renovacao: new Date().toISOString()
          }).eq('user_id', userId);
          
          setConsultasRestantes(QTD_RENOVACAO);
          // TRADUZIDO: Mensagem de renovação
          Alert.alert(
              t('radar.renovacaoTitulo', 'Renovação'), 
              t('radar.msgRenovacao', 'Seus créditos mensais foram renovados! +10 consultas.')
          );
      } else {
          setConsultasRestantes(dadosBanco.consultas_restantes);
      }
  };

  const recarregarCreditos = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      try {
          // <--- AQUI VOCÊ ALTERA A QUANTIDADE DA RECARGA PAGA (PADRÃO 10)
          const QTD_RECARGA = 10;

          const { error } = await supabase
            .from('user_credits')
            .update({ consultas_restantes: QTD_RECARGA })
            .eq('user_id', user.id);

          if (!error) {
              setConsultasRestantes(QTD_RECARGA);
              // TRADUZIDO: Mensagem de recarga
              Alert.alert(
                  t('radar.recargaTitulo', 'Recarga'), 
                  t('radar.msgRecargaSucesso', 'Pacote de 10 consultas liberado para VOCÊ! 🚀')
              );
          }
      } catch (e) { 
          Alert.alert(t('common.erro'), t('radar.erroRecarga', 'Falha ao recarregar.')); 
      }
  };

  const investigar = async (cpf: string, telefone: string, nome: string) => {
    // --- LÓGICA DE BLOQUEIO ATUALIZADA ---
    // Só bloqueia se NÃO for período grátis E não tiver saldo
    if (!periodoGratis && consultasRestantes <= 0) {
        // TRADUZIDO: Alerta de limite
        Alert.alert(
            t('radar.limiteTitulo'), 
            t('radar.limiteMsg'),
            [
                { text: t('common.cancelar'), style: "cancel" },
                { text: t('radar.btnRecarregar'), onPress: recarregarCreditos }
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

      // --- REGISTRO DE LOG (Mantido) ---
      await supabase.from('risk_logs').insert([{
          user_id: user.id,
          data_consulta: new Date().toISOString(),
          termo_pesquisado: nome || cpf || telefone || 'Consulta Rápida'
      }]);
      // --------------------------------

      // 2. Desconta 1 crédito (APENAS SE NÃO FOR GRÁTIS)
      if (!periodoGratis) {
          const novoSaldo = consultasRestantes - 1;
          setConsultasRestantes(novoSaldo);
          
          await supabase
            .from('user_credits')
            .update({ consultas_restantes: novoSaldo })
            .eq('user_id', user.id);
      }

    } catch (error: any) {
      // TRADUZIDO: Mensagem de erro genérica
      Alert.alert(t('common.erro'), t('radar.erroConsulta', 'Falha na conexão ou consulta.'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return {
    investigar,
    resultado,
    loading,
    // Se for grátis, mostra 999 para dar sensação de ilimitado, senão mostra o real
    consultasRestantes: periodoGratis ? 999 : consultasRestantes,
    recarregarCreditos
  };
}
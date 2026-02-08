import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { supabase } from '../services/supabase';
import { useAssinatura } from './useAssinatura';

export function useRiskRadar() {
  const { t } = useTranslation();
  
  // Trazemos o tipo do plano para diferenciar Free de Pago
  const { isPremium, tipoPlano } = useAssinatura();

  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [consultasRestantes, setConsultasRestantes] = useState(0); 
  
  const [periodoGratis, setPeriodoGratis] = useState(false);

  // Adicionei tipoPlano nas dependências para recalcular se a assinatura mudar
  useEffect(() => {
    carregarUsuarioECreditos();
  }, [tipoPlano]);

  const carregarUsuarioECreditos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; 

      // --- 1. VERIFICA SE A CONTA TEM MENOS DE 30 DIAS ---
      const dataCriacao = new Date(user.created_at);
      const hoje = new Date();
      const diferencaTempo = hoje.getTime() - dataCriacao.getTime();
      const diasDeVida = diferencaTempo / (1000 * 3600 * 24);

      // --- CORREÇÃO AQUI ---
      // É Grátis/Ilimitado SE:
      // 1. Tiver menos de 30 dias DE VIDA
      // 2. E NÃO tiver um plano pago ('mensal' ou 'anual')
      // Se a pessoa pagou 'mensal', o tipoPlano será 'mensal', então isGratis vira FALSE (mostra saldo real)
      const isPlanoPago = tipoPlano === 'mensal' || tipoPlano === 'anual' || tipoPlano === 'recarga';
      const isGratis = (diasDeVida <= 30) && !isPlanoPago;
      
      setPeriodoGratis(isGratis);

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
          console.log("Renovação Mensal de Créditos!");
          const QTD_RENOVACAO = 10;

          await supabase.from('user_credits').update({ 
              consultas_restantes: QTD_RENOVACAO,
              ultima_renovacao: new Date().toISOString()
          }).eq('user_id', userId);
          
          setConsultasRestantes(QTD_RENOVACAO);
          
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
          const QTD_RECARGA = 10;

          const { error } = await supabase
            .from('user_credits')
            .update({ consultas_restantes: QTD_RECARGA })
            .eq('user_id', user.id);

          if (!error) {
              setConsultasRestantes(QTD_RECARGA);
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
    // --- LÓGICA DE BLOQUEIO ---
    // Bloqueia se: NÃO for período grátis E NÃO for vitalício E saldo for zero
    // (Quem paga Mensal entra aqui se acabar o saldo)
    if (!periodoGratis && tipoPlano !== 'vitalicio' && consultasRestantes <= 0) {
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

      const { data, error } = await supabase
        .rpc('consultar_risco_triangulado', {
          cpf_input: cpf || '',
          telefone_input: telefone || '',
          nome_input: nome || ''
        });

      if (error) throw error;
      setResultado(data);

      // --- LOG ---
      await supabase.from('risk_logs').insert([{
          user_id: user.id,
          data_consulta: new Date().toISOString(),
          termo_pesquisado: nome || cpf || telefone || 'Consulta Rápida'
      }]);

      // --- DESCONTO DE CRÉDITO ---
      // Desconta se NÃO for grátis E NÃO for vitalício
      // (Ou seja, desconta de quem paga Mensal/Anual)
      if (!periodoGratis && tipoPlano !== 'vitalicio') {
          const novoSaldo = consultasRestantes - 1;
          setConsultasRestantes(novoSaldo);
          
          await supabase
            .from('user_credits')
            .update({ consultas_restantes: novoSaldo })
            .eq('user_id', user.id);
      }

    } catch (error: any) {
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
    // VISUAL: Mostra 999 se for Grátis (Trial) ou Vitalício
    // Mostra o saldo REAL se for Pago (Mensal/Anual) ou Expirado
    consultasRestantes: (periodoGratis || tipoPlano === 'vitalicio') ? 999 : consultasRestantes,
    recarregarCreditos
  };
}
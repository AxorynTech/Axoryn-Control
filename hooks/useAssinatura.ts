import { useEffect, useState } from 'react';
import Purchases from 'react-native-purchases';
import { supabase } from '../services/supabase';

export function useAssinatura() {
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [diasRestantes, setDiasRestantes] = useState<number | string>(0);
  const [tipoPlano, setTipoPlano] = useState<'teste_gratis' | 'mensal' | 'anual' | 'vitalicio' | 'equipe' | 'expirado' | 'premium' | 'corporativo'>('expirado');

  useEffect(() => {
    checkStatus();
  }, []);

  // --- FUNÇÕES AUXILIARES DE SINCRONIZAÇÃO ---
  const sincronizarStatusNoBanco = async (userId: string, novoStatus: string, novoPlano: string) => {
    try {
      await supabase.from('profiles').update({ 
        status: novoStatus, 
        plano: novoPlano,
        updated_at: new Date().toISOString() 
      }).eq('user_id', userId);
    } catch (err) {
      console.log("Erro ao sincronizar banco:", err);
    }
  };

  const sincronizarEquipeNoBanco = async (teamId: string, statusPremium: boolean) => {
    try {
      await supabase.from('teams').update({ is_premium: statusPremium }).eq('id', teamId);
    } catch (err) {
      console.log("Erro ao sincronizar equipe:", err);
    }
  };

  async function checkStatus() {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // 🔥 VINCULAÇÃO REVENUECAT (Essencial para Cross-Platform)
      try {
        await Purchases.logIn(user.id);
      } catch (logInErr) {
        console.log("Erro ao vincular RevenueCat.", logInErr);
      }

      // ============================================================
      // 0. VERIFICAÇÃO REVENUECAT (Lojas Apple/Google)
      // ============================================================
      try {
        await Purchases.invalidateCustomerInfoCache(); 
        const customerInfo = await Purchases.getCustomerInfo();
        const entitlementAtivo = customerInfo.entitlements.active['premium']; 
        
        if (entitlementAtivo) {
          const idProduto = entitlementAtivo.productIdentifier.toLowerCase();
          const ehAnual = idProduto.includes('anual') || idProduto.includes('year') || idProduto.includes('yearly');
          const nomePlanoReal = ehAnual ? 'anual' : 'mensal';

          setIsPremium(true);
          setTipoPlano(nomePlanoReal); 
          setDiasRestantes('Gerenciado pela Loja');
          
          sincronizarStatusNoBanco(user.id, 'premium', nomePlanoReal);
          
          const { data: prof } = await supabase.from('profiles').select('team_id, teams(owner_id)').eq('user_id', user.id).single();
          if (prof?.teams?.owner_id === user.id) {
              sincronizarEquipeNoBanco(prof.team_id, true);
          }

          setLoading(false);
          return; 
        }
      } catch (rcError) {
        console.log("RevenueCat sem plano ativo. Seguindo para verificação manual/local...");
      }

      // ============================================================
      // 1. LÓGICA DE BACKUP (SUPABASE / CANETADA MANUAL / WEB)
      // ============================================================

      const { data: profile } = await supabase
        .from('profiles')
        .select(`
            *,
            teams (
                id,
                is_premium,
                owner_id
            )
        `)
        .eq('user_id', user.id)
        .single();

      const souDonoDaEquipe = profile?.teams?.owner_id === user.id;

      // Proteção de Equipe (Acesso herdado para funcionários)
      if (profile?.teams?.is_premium && !souDonoDaEquipe) {
         setIsPremium(true);
         setTipoPlano('equipe');
         setDiasRestantes('Acesso Corporativo');
         setLoading(false);
         return;
      }

      // Verificação de Vitalício
      const statusEncontrado = profile?.status || profile?.plano || "";
      if (statusEncontrado && String(statusEncontrado).toLowerCase().includes('vitalicio')) {
        setTipoPlano('vitalicio');
        setIsPremium(true);
        setDiasRestantes('Infinito');
        if (souDonoDaEquipe) sincronizarEquipeNoBanco(profile.teams.id, true);
        setLoading(false);
        return; 
      }

      const hoje = new Date();
      let dataVencimentoFinal: Date | null = null;
      let planoIdentificado: any = 'mensal';

      // 🛡️ PRIORIDADE 1: Data de fim no perfil (A LEI ABSOLUTA)
      // Removemos a trava do "hoje < dataPerfil". Agora, se houver data, ele trava nela.
      if (profile?.data_fim_assinatura) {
          dataVencimentoFinal = new Date(profile.data_fim_assinatura);
          planoIdentificado = (profile.plano && profile.plano !== 'expirado' && profile.plano !== 'gratis') 
                              ? profile.plano : 'premium';
      }

      // 🛡️ PRIORIDADE 2: Histórico de assinaturas (Pix/Web/Stripe)
      if (!dataVencimentoFinal) {
          const { data: assinatura } = await supabase
            .from('assinaturas')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'approved')
            .in('plano', ['mensal', 'anual']) // 🔥 A MÁGICA AQUI: Finge que não viu o corporativo
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (assinatura) {
            const dataPagamento = new Date(assinatura.created_at);
            const validade = new Date(dataPagamento);
            validade.setDate(dataPagamento.getDate() + (assinatura.plano === 'anual' ? 365 : 30));

            if (hoje < validade) {
              dataVencimentoFinal = validade;
              planoIdentificado = assinatura.plano || 'mensal';
            }
          }
      }

      // 🛡️ PRIORIDADE 3: Teste Grátis (Grandfathering)
      if (!dataVencimentoFinal) {
        const dataCadastro = new Date(user.created_at);
        const vencimentoTeste = new Date(dataCadastro);
        
        // Data de corte: 15/04/2026
        const dataCorte = new Date(2026, 3, 15); 
        const diasTeste = dataCadastro < dataCorte ? 30 : 14;
        
        vencimentoTeste.setDate(dataCadastro.getDate() + diasTeste);

        if (hoje < vencimentoTeste) {
          dataVencimentoFinal = vencimentoTeste;
          planoIdentificado = 'teste_gratis';
        }
      }

      // ============================================================
      // 2. APLICAÇÃO DO STATUS FINAL
      // ============================================================
      if (dataVencimentoFinal && hoje < dataVencimentoFinal) {
        setIsPremium(true);
        setTipoPlano(planoIdentificado);
        
        const diferencaTempo = dataVencimentoFinal.getTime() - hoje.getTime();
        setDiasRestantes(Math.ceil(diferencaTempo / (1000 * 3600 * 24)));
        
        if (souDonoDaEquipe) sincronizarEquipeNoBanco(profile.teams.id, true);

        // ✅ AUTO-CORREÇÃO: Se tem dias mas o status no banco está errado, corrige agora.
        if (profile?.status !== 'premium' || profile?.plano === 'expirado' || profile?.plano === 'gratis') {
             sincronizarStatusNoBanco(user.id, 'premium', planoIdentificado);
        }

      } else {
        // --- EXPIRADO ---
        setIsPremium(false);
        setTipoPlano('expirado');
        setDiasRestantes(0);
        
        if (souDonoDaEquipe && profile?.teams?.is_premium) {
             sincronizarEquipeNoBanco(profile.teams.id, false);
        }

        if (profile?.status !== 'gratis' && profile?.status !== 'expirado') {
             sincronizarStatusNoBanco(user.id, 'gratis', 'expirado');
        }
      }

    } catch (error) {
      console.log("Erro ao verificar assinatura:", error);
    } finally {
      setLoading(false);
    }
  }

  return { loading, isPremium, diasRestantes, tipoPlano, refresh: checkStatus };
}
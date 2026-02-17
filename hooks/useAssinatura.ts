import { useEffect, useState } from 'react';
import Purchases from 'react-native-purchases';
import { supabase } from '../services/supabase';

export function useAssinatura() {
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [diasRestantes, setDiasRestantes] = useState<number | string>(0);
  const [tipoPlano, setTipoPlano] = useState<'teste_gratis' | 'mensal' | 'anual' | 'vitalicio' | 'equipe' | 'expirado'>('expirado');

  useEffect(() => {
    checkStatus();
  }, []);

  // --- FUNÇÕES AUXILIARES DE SINCRONIZAÇÃO ---
  const sincronizarStatusNoBanco = async (userId: string, novoStatus: string, novoPlano: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          status: novoStatus, 
          plano: novoPlano,
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', userId);
        
      if (!error) console.log(`✅ Sync Perfil OK: ${novoStatus}`);
    } catch (err) {
      console.log("Erro ao sincronizar banco:", err);
    }
  };

  const sincronizarEquipeNoBanco = async (teamId: string, statusPremium: boolean) => {
    try {
      const { error } = await supabase
        .from('teams')
        .update({ is_premium: statusPremium })
        .eq('id', teamId);
      
      if (!error) console.log(`✅ Sync Equipe OK: ${statusPremium ? 'Ativada' : 'Desativada'}`);
    } catch (err) {
      console.log("Erro ao sincronizar equipe:", err);
    }
  };

  async function checkStatus() {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      // ============================================================
      // 0. VERIFICAÇÃO REVENUECAT (Prioridade Máxima - Google/Apple)
      // ============================================================
      try {
        await Purchases.invalidateCustomerInfoCache(); // Garante dados frescos para o lançamento
        const customerInfo = await Purchases.getCustomerInfo();
        const entitlementAtivo = customerInfo.entitlements.active['premium']; 
        
        if (entitlementAtivo) {
          const idProduto = entitlementAtivo.productIdentifier.toLowerCase();
          const ehAnual = idProduto.includes('anual') || idProduto.includes('year') || idProduto.includes('yearly');
          const nomePlanoReal = ehAnual ? 'anual' : 'mensal';

          setIsPremium(true);
          setTipoPlano(nomePlanoReal); 
          setDiasRestantes('Gerenciado pela Loja');
          
          if (user) {
            sincronizarStatusNoBanco(user.id, 'premium', nomePlanoReal);
            
            // Se for dono, garante que a equipe esteja ATIVA
            const { data: prof } = await supabase.from('profiles').select('team_id, teams(owner_id)').eq('user_id', user.id).single();
            if (prof?.teams?.owner_id === user.id) {
                sincronizarEquipeNoBanco(prof.team_id, true);
            }
          }

          setLoading(false);
          return; 
        }
      } catch (rcError) {
        console.log("RevenueCat Offline ou não inicializado. Seguindo para verificação local...");
      }

      if (!user) {
        setLoading(false);
        return;
      }

      // ============================================================
      // 1. LÓGICA DE BACKUP (SUPABASE / EQUIPE / VITALÍCIO / TESTE)
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

      // --- [NOVO] VERIFICAÇÃO DE EQUIPE (Proteção para Milhões de Usuários) ---
      // Apenas funcionários herdam o acesso da equipe. 
      // O dono precisa validar sua própria assinatura para evitar o loop.
      if (profile?.teams?.is_premium && !souDonoDaEquipe) {
         setIsPremium(true);
         setTipoPlano('equipe');
         setDiasRestantes('Acesso Corporativo');
         setLoading(false);
         return;
      }

      // Verifica Vitalício
      const statusEncontrado = profile?.status || profile?.plano || "";
      if (statusEncontrado && String(statusEncontrado).toLowerCase().includes('vitalicio')) {
        setTipoPlano('vitalicio');
        setIsPremium(true);
        setDiasRestantes('Infinito');
        if (souDonoDaEquipe) sincronizarEquipeNoBanco(profile.teams.id, true);
        setLoading(false);
        return; 
      }

      // 1.2 Busca Assinatura Antiga no Banco
      const { data: assinatura } = await supabase
        .from('assinaturas')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const hoje = new Date();
      let dataVencimentoFinal: Date | null = null;
      let planoIdentificado: any = 'expirado';

      if (assinatura) {
        const dataPagamento = new Date(assinatura.created_at);
        const validade = new Date(dataPagamento);
        validade.setDate(dataPagamento.getDate() + (assinatura.plano === 'anual' ? 365 : 30));

        if (hoje < validade) {
          dataVencimentoFinal = validade;
          planoIdentificado = assinatura.plano;
        }
      }

      // 1.3 Lógica do Teste Grátis
      if (!dataVencimentoFinal) {
        const dataCadastro = new Date(user.created_at);
        const vencimentoTeste = new Date(dataCadastro);
        vencimentoTeste.setDate(dataCadastro.getDate() + 30);

        if (hoje < vencimentoTeste) {
          dataVencimentoFinal = vencimentoTeste;
          planoIdentificado = 'teste_gratis';
          if (profile?.status !== 'teste_gratis' && profile?.status !== 'premium') {
             sincronizarStatusNoBanco(user.id, 'teste_gratis', 'teste_gratis');
          }
        }
      }

      // ============================================================
      // 2. DECISÃO FINAL E SINCRONIZAÇÃO DE EQUIPE
      // ============================================================
      if (dataVencimentoFinal && hoje < dataVencimentoFinal) {
        setIsPremium(true);
        setTipoPlano(planoIdentificado);
        const diferencaTempo = dataVencimentoFinal.getTime() - hoje.getTime();
        setDiasRestantes(Math.ceil(diferencaTempo / (1000 * 3600 * 24)));
        
        // Se eu sou o dono e estou válido, minha equipe fica ativa
        if (souDonoDaEquipe) sincronizarEquipeNoBanco(profile.teams.id, true);

      } else {
        // --- EXPIRADO ---
        setIsPremium(false);
        setTipoPlano('expirado');
        setDiasRestantes(0);
        
        // SE SOU DONO E EXPIREI: Desligo a equipe para todos os membros
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
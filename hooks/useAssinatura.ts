import { useEffect, useState } from 'react';
import Purchases from 'react-native-purchases';
import { supabase } from '../services/supabase';

export function useAssinatura() {
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [diasRestantes, setDiasRestantes] = useState<number | string>(0);
  const [tipoPlano, setTipoPlano] = useState<'teste_gratis' | 'mensal' | 'anual' | 'vitalicio' | 'expirado'>('expirado');

  useEffect(() => {
    checkStatus();
  }, []);

  // --- FUNÇÃO AUXILIAR: Sincroniza o Banco Silenciosamente ---
  // Isso garante que seu painel do Supabase mostre quem é pagante, mesmo sem Webhooks agora.
  const sincronizarStatusNoBanco = async (userId: string, novoStatus: string, novoPlano: string) => {
    try {
      // Atualiza o perfil sem bloquear a experiência do usuário
      const { error } = await supabase
        .from('profiles')
        .update({ 
          status: novoStatus, 
          plano: novoPlano,
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', userId);
        
      if (!error) console.log(`✅ Sync OK: Status alterado para ${novoStatus} / ${novoPlano}`);
    } catch (err) {
      console.log("Erro ao sincronizar banco (ignorado):", err);
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
        const customerInfo = await Purchases.getCustomerInfo();
        const entitlementAtivo = customerInfo.entitlements.active['premium']; // Pega o objeto completo
        
        // Se existe uma assinatura ativa na loja...
        if (entitlementAtivo) {
          
          // 🧠 LÓGICA INTELIGENTE: Descobre se é Anual ou Mensal pelo ID do produto
          const idProduto = entitlementAtivo.productIdentifier.toLowerCase();
          const ehAnual = idProduto.includes('anual') || idProduto.includes('year') || idProduto.includes('yearly');
          const nomePlanoReal = ehAnual ? 'anual' : 'mensal';

          setIsPremium(true);
          setTipoPlano(nomePlanoReal); 
          setDiasRestantes('Gerenciado pela Loja');
          
          // 🔥 SYNC: Avisa o Supabase o plano EXATO que ele comprou
          if (user) {
            sincronizarStatusNoBanco(user.id, 'premium', nomePlanoReal);
          }

          setLoading(false);
          return; // Para tudo, o usuário está aprovado pela loja.
        }
      } catch (rcError) {
        console.log("RevenueCat Offline ou não inicializado. Seguindo para verificação local...");
      }

      // Se não tem usuário logado, não tem como verificar o resto
      if (!user) {
        setLoading(false);
        return;
      }

      // ============================================================
      // 1. LÓGICA DE BACKUP (SUPABASE / VITALÍCIO / TESTE GRÁTIS)
      // ============================================================

      // 1.1 Busca dados do perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Verifica Vitalício
      const statusEncontrado = profile?.status || profile?.plano || "";
      if (statusEncontrado && String(statusEncontrado).toLowerCase().includes('vitalicio')) {
        setTipoPlano('vitalicio');
        setIsPremium(true);
        setDiasRestantes('Infinito');
        setLoading(false);
        return; 
      }

      // 1.2 Busca Assinatura Antiga no Banco (Caso RevenueCat falhe)
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
      let planoIdentificado: typeof tipoPlano = 'expirado';

      // Verifica validade da assinatura do banco
      if (assinatura) {
        const dataPagamento = new Date(assinatura.created_at);
        const validade = new Date(dataPagamento);
        
        if (assinatura.plano === 'anual') {
          validade.setDate(dataPagamento.getDate() + 365);
          planoIdentificado = 'anual';
        } else {
          validade.setDate(dataPagamento.getDate() + 30);
          planoIdentificado = 'mensal';
        }

        if (hoje < validade) {
          dataVencimentoFinal = validade;
          setIsPremium(true);
          setTipoPlano(planoIdentificado);
        }
      }

      // 1.3 Lógica do Teste Grátis (Se não achou pagamento válido)
      if (!dataVencimentoFinal) {
        const dataCadastro = new Date(user.created_at);
        const vencimentoTeste = new Date(dataCadastro);
        vencimentoTeste.setDate(dataCadastro.getDate() + 30);

        if (hoje < vencimentoTeste) {
          // ESTÁ NO PERÍODO DE TESTE
          dataVencimentoFinal = vencimentoTeste;
          setIsPremium(true);
          setTipoPlano('teste_gratis');
          
          // 🔥 SYNC: Atualiza que é teste grátis (se ainda não estiver)
          if (profile?.status !== 'teste_gratis' && profile?.status !== 'premium') {
             sincronizarStatusNoBanco(user.id, 'teste_gratis', 'teste_gratis');
          }

        } else {
          // ========================================================
          // ☠️ GAME OVER: Expirado (Assinatura venceu E Teste venceu)
          // ========================================================
          setIsPremium(false);
          setTipoPlano('expirado');
          setDiasRestantes(0);
          
          // 🔥 SYNC: O importante! Avisa o banco que acabou a mamata.
          // Só chama se o status atual não for 'gratis' ou 'expirado' para economizar requisições
          if (profile?.status !== 'gratis' && profile?.status !== 'expirado') {
             sincronizarStatusNoBanco(user.id, 'gratis', 'expirado');
          }
          
          setLoading(false);
          return;
        }
      }

      // 2. CÁLCULO DE DIAS (Só chega aqui se for Premium ou Teste Ativo)
      if (dataVencimentoFinal) {
        const diferencaTempo = dataVencimentoFinal.getTime() - hoje.getTime();
        const dias = Math.ceil(diferencaTempo / (1000 * 3600 * 24));
        setDiasRestantes(dias > 0 ? dias : 0);
      }

    } catch (error) {
      console.log("Erro ao verificar assinatura:", error);
    } finally {
      setLoading(false);
    }
  }

  return { loading, isPremium, diasRestantes, tipoPlano, refresh: checkStatus };
}
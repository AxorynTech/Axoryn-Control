import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import { supabase } from '../services/supabase';

// ----------------------------------------------------------------------
// CONFIGURAÇÃO DO REVENUECAT
// ----------------------------------------------------------------------
const API_KEY_GOOGLE = 'goog_eIEPHdCOVMCoYvxMxJwuJqtzqqw'; // <--- COLOCAR SUA CHAVE DO GOOGLE AQUI
const API_KEY_APPLE = '';  // <--- Pode deixar vazio por enquanto
const ENTITLEMENT_ID = 'pro'; 

export function useAssinatura() {
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [diasRestantes, setDiasRestantes] = useState<number | string>(0);
  const [tipoPlano, setTipoPlano] = useState<'teste_gratis' | 'mensal' | 'anual' | 'vitalicio' | 'expirado' | 'store'>('expirado');

  useEffect(() => {
    const initRevenueCat = async () => {
      try {
        if (Platform.OS === 'android') {
          // Só configura se estiver no Android
          await Purchases.configure({ apiKey: API_KEY_GOOGLE });
        } else if (Platform.OS === 'ios' && API_KEY_APPLE) {
          // Só tenta configurar iOS se você tiver colocado a chave (evita erros)
          await Purchases.configure({ apiKey: API_KEY_APPLE });
        }
      } catch (e) {
        console.log("Erro ao iniciar pagamentos:", e);
      }
    };
    
    initRevenueCat();
    checkStatus();
  }, []);

  async function checkStatus() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      console.log("Verificando assinatura para:", user.email);

      // ============================================================
      // 0. NOVO: Verifica Assinatura na Google Play (ou Apple se tiver)
      // ============================================================
      try {
        if (Platform.OS === 'android' || (Platform.OS === 'ios' && API_KEY_APPLE)) {
          await Purchases.logIn(user.id);
          const customerInfo = await Purchases.getCustomerInfo();
          
          if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
            console.log("Assinatura ativa encontrada via Loja");
            setTipoPlano('store');
            setIsPremium(true);
            setDiasRestantes('Assinatura Google/Apple');
            setLoading(false);
            return; 
          }
        }
      } catch (rcError) {
        // Erros aqui são normais se o usuário nunca comprou nada
        // console.log("Nota: Sem assinatura na loja.", rcError);
      }

      // ============================================================
      // 1. Verifica Status Vitalício no Banco de Dados
      // ============================================================
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*') 
        .eq('user_id', user.id)
        .single();

      const statusEncontrado = profile?.status || profile?.plano || profile?.role || "";

      if (statusEncontrado && String(statusEncontrado).toLowerCase().includes('vitalicio')) {
        setTipoPlano('vitalicio');
        setIsPremium(true);
        setDiasRestantes('Infinito');
        setLoading(false);
        return; 
      }

      // ============================================================
      // 2. Busca a Assinatura (Mensal/Anual) no Banco de Dados
      // ============================================================
      const { data: assinatura } = await supabase
        .from('assinaturas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const hoje = new Date();
      let dataVencimento: Date;

      if (assinatura && assinatura.status === 'approved') {
        const dataPagamento = new Date(assinatura.created_at);
        dataVencimento = new Date(dataPagamento);
        
        if (assinatura.plano === 'anual') {
          dataVencimento.setDate(dataPagamento.getDate() + 365);
          setTipoPlano('anual');
        } else {
          dataVencimento.setDate(dataPagamento.getDate() + 30);
          setTipoPlano('mensal');
        }
        
        if (hoje < dataVencimento) {
          setIsPremium(true);
        } else {
          setTipoPlano('expirado');
          setIsPremium(false);
        }
      } else {
        // ============================================================
        // 3. Teste Grátis (30 dias)
        // ============================================================
        const dataCadastro = new Date(user.created_at);
        dataVencimento = new Date(dataCadastro);
        dataVencimento.setDate(dataCadastro.getDate() + 30);

        if (hoje < dataVencimento) {
          setTipoPlano('teste_gratis');
          setIsPremium(true);
        } else {
          setTipoPlano('expirado');
          setIsPremium(false);
        }
      }

      if (tipoPlano !== 'vitalicio' && tipoPlano !== 'store') {
        const diferencaTempo = dataVencimento.getTime() - hoje.getTime();
        const dias = Math.ceil(diferencaTempo / (1000 * 3600 * 24));
        setDiasRestantes(dias > 0 ? dias : 0);
      }

    } catch (error) {
      console.log("Erro geral:", error);
    } finally {
      setLoading(false);
    }
  }

  return { loading, isPremium, diasRestantes, tipoPlano, refresh: checkStatus };
}
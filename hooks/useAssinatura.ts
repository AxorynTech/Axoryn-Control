import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import Purchases, { LOG_LEVEL, PurchasesPackage } from 'react-native-purchases';
import { supabase } from '../services/supabase'; // Ajuste o caminho se for ../services/supabase

// ----------------------------------------------------------------------
// CONFIGURAÇÃO DO REVENUECAT
// ----------------------------------------------------------------------
const API_KEYS = {
  google: 'goog_eIEPHdCOVMCoYvxMxJwuJqtzqqw', // Sua chave atual
  apple: 'appl_SUA_CHAVE_AQUI', // Coloque a da Apple quando tiver
};

const ENTITLEMENT_ID = 'premium'; // O ID que você criou no RevenueCat ("Entitlements")

export function useAssinatura() {
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [diasRestantes, setDiasRestantes] = useState<number | string>(0);
  const [tipoPlano, setTipoPlano] = useState<'teste_gratis' | 'mensal' | 'anual' | 'vitalicio' | 'expirado' | 'store'>('expirado');
  
  // Novos estados para suportar a tela de vendas
  const [pacotes, setPacotes] = useState<PurchasesPackage[]>([]);

  useEffect(() => {
    configurarRevenueCat();
  }, []);

  async function configurarRevenueCat() {
    try {
      Purchases.setLogLevel(LOG_LEVEL.ERROR); // Reduz logs desnecessários

      if (Platform.OS === 'android') {
        await Purchases.configure({ apiKey: API_KEYS.google });
      } else if (Platform.OS === 'ios' && API_KEYS.apple) {
        await Purchases.configure({ apiKey: API_KEYS.apple });
      }

      // Tenta carregar as ofertas de venda (para o Paywall usar)
      const offerings = await Purchases.getOfferings();
      if (offerings.current && offerings.current.availablePackages.length > 0) {
        setPacotes(offerings.current.availablePackages);
      }

      // Inicia a verificação de status
      checkStatus();

    } catch (e) {
      console.log("Erro ao configurar RevenueCat:", e);
      // Se der erro no RevenueCat, ainda verificamos o banco de dados
      checkStatus(); 
    }
  }

  async function checkStatus() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      // ============================================================
      // 1. PRIORIDADE: Verifica Google Play / App Store (RevenueCat)
      // ============================================================
      try {
        // Vincula o usuário do Supabase ao RevenueCat
        await Purchases.logIn(user.id);
        const customerInfo = await Purchases.getCustomerInfo();
        
        // Verifica se tem o entitlement "premium" (ou "pro")
        if (customerInfo.entitlements.active[ENTITLEMENT_ID] || customerInfo.entitlements.active['pro']) {
          setTipoPlano('store');
          setIsPremium(true);
          setDiasRestantes('Assinatura Ativa');
          setLoading(false);
          return; // Para aqui se achou na loja
        }
      } catch (rcError) {
        console.log("Sem assinatura na loja ou erro de conexão.", rcError);
      }

      // ============================================================
      // 2. Verifica Status Vitalício no Banco de Dados
      // ============================================================
      const { data: profile } = await supabase
        .from('profiles')
        .select('*') 
        .eq('id', user.id) // Geralmente a PK é 'id', mas se for 'user_id' mantenha
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
      // 3. Verifica Assinatura Manual (Tabelas Antigas)
      // ============================================================
      // Mantive sua lógica original de verificar a tabela 'assinaturas'
      const { data: assinatura } = await supabase
        .from('assinaturas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const hoje = new Date();
      let dataVencimento = new Date(); // Inicializa com hoje

      let achouNoBanco = false;

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
          achouNoBanco = true;
        }
      }

      // ============================================================
      // 4. FALLBACK: Teste Grátis (30 dias após cadastro)
      // ============================================================
      if (!achouNoBanco) {
        const dataCadastro = new Date(user.created_at);
        const fimDoTeste = new Date(dataCadastro);
        fimDoTeste.setDate(dataCadastro.getDate() + 30);
        dataVencimento = fimDoTeste; // Atualiza para cálculo de dias

        if (hoje < fimDoTeste) {
          setTipoPlano('teste_gratis');
          setIsPremium(true);
        } else {
          setTipoPlano('expirado');
          setIsPremium(false);
        }
      }

      // Cálculo visual de dias restantes (para UI)
      if (tipoPlano !== 'vitalicio' && tipoPlano !== 'store') {
        const diferencaTempo = dataVencimento.getTime() - hoje.getTime();
        const dias = Math.ceil(diferencaTempo / (1000 * 3600 * 24));
        setDiasRestantes(dias > 0 ? dias : 0);
      }

    } catch (error) {
      console.log("Erro geral no checkStatus:", error);
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // FUNÇÃO DE COMPRA CENTRALIZADA
  // ============================================================
  async function comprarPacote(pacote: PurchasesPackage) {
    setLoading(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pacote);

      // A) LÓGICA DE RECARGA (RISK RADAR) - Consumível
      if (pacote.product.identifier.includes('radar')) {
        let creditos = 0;
        if (pacote.product.identifier.includes('10')) creditos = 10;
        if (pacote.product.identifier.includes('50')) creditos = 50;
        if (pacote.product.identifier.includes('100')) creditos = 100;

        if (creditos > 0) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { error } = await supabase.rpc('adicionar_creditos', {
              user_id: user.id,
              quantidade: creditos
            });
            if (!error) {
              Alert.alert('Sucesso!', `${creditos} consultas adicionadas.`);
            } else {
              Alert.alert('Erro', 'Compra processada, mas erro ao creditar. Contate o suporte.');
            }
          }
        }
      } 
      // B) LÓGICA DE ASSINATURA (PREMIUM)
      else if (customerInfo.entitlements.active[ENTITLEMENT_ID] || customerInfo.entitlements.active['pro']) {
        await checkStatus(); // Atualiza o estado global
        Alert.alert('Parabéns!', 'Sua assinatura foi ativada com sucesso.');
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('Erro na compra', e.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function restaurarCompras() {
    setLoading(true);
    try {
      const info = await Purchases.restorePurchases();
      if (info.entitlements.active[ENTITLEMENT_ID] || info.entitlements.active['pro']) {
        await checkStatus();
        Alert.alert("Restaurado", "Suas compras foram recuperadas!");
      } else {
        Alert.alert("Aviso", "Nenhuma assinatura ativa encontrada para restaurar.");
      }
    } catch (e: any) {
      Alert.alert("Erro", e.message);
    } finally {
      setLoading(false);
    }
  }

  return { 
    loading, 
    isPremium, 
    diasRestantes, 
    tipoPlano, 
    pacotes,          // Exporta os pacotes para a UI usar
    comprarPacote,    // Exporta a função de compra
    restaurarCompras, // Exporta a função de restaurar
    refresh: checkStatus 
  };
}
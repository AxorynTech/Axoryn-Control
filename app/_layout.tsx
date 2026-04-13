import FontAwesome from '@expo/vector-icons/FontAwesome'; // ✅ Adicionado
import Ionicons from '@expo/vector-icons/Ionicons'; // ✅ Adicionado
import MaterialIcons from '@expo/vector-icons/MaterialIcons'; // ✅ Adicionado
import { Session } from '@supabase/supabase-js';
import { useFonts } from 'expo-font'; // ✅ Adicionado
import * as Notifications from 'expo-notifications';
import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router'; // ✅ SplashScreen adicionado
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import Purchases, { CustomerInfo, LOG_LEVEL } from 'react-native-purchases';
import '../i18n';
import { supabase } from '../services/supabase';

// ✅ Segura a tela de splash enquanto fontes e serviços carregam
SplashScreen.preventAutoHideAsync();

// ✅ SUAS CHAVES DO REVENUECAT
const API_KEY_GOOGLE = 'goog_eIEPHdCOVMCoYvxMxJwuJqtzqqw'; 
const API_KEY_APPLE = 'appl_nXmhhjSlmnwXMisBlWPYfiyakAI'; // ⬅️ COLE A SUA CHAVE PÚBLICA DA APPLE AQUI
const ENTITLEMENT_ID = 'premium'; // ✅ Ajustado de 'pro' para 'premium' para bater com os outros arquivos

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  
  // Estados de Carregamento
  const [isReady, setIsReady] = useState(false); // App Geral pronto
  const [isRevenueCatLoaded, setIsRevenueCatLoaded] = useState(false); // ✅ RevenueCat confirmou o status?
  const [isPro, setIsPro] = useState(false); // Status da Assinatura
  
  // 👇 INÍCIO DA ADIÇÃO: Carregamento de Fontes para os ícones na Web 👇
  const [fontsLoaded, fontError] = useFonts({
    ...FontAwesome.font,
    ...Ionicons.font,
    ...MaterialIcons.font,
  });

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    // Esconde a Splash apenas quando tudo (Fontes, RevenueCat e Supabase) estiver pronto
    if (fontsLoaded && isReady && isRevenueCatLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isReady, isRevenueCatLoaded]);
  // 👆 FIM DA ADIÇÃO 👆

  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const inicializarApp = async () => {
      try {
        console.log("🚀 Inicializando App...");
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);

        // 1. Configurar RevenueCat
        if (Platform.OS === 'android') {
          await Purchases.configure({ apiKey: API_KEY_GOOGLE });

          // Canal de Notificação
          await Notifications.setNotificationChannelAsync('resumo-diario', {
            name: 'Resumo Diário',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
        } 
        // 👇 CONFIGURAÇÃO DO IOS ADICIONADA AQUI 👇
        else if (Platform.OS === 'ios') {
          await Purchases.configure({ apiKey: API_KEY_APPLE });
        }
        
        // 2. Verificar Assinatura (AWAIT é crucial aqui)
        try {
            const customerInfo = await Purchases.getCustomerInfo();
            const usuarioPagante = typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
            setIsPro(usuarioPagante);
            console.log("Status Assinatura Carregado:", usuarioPagante ? "PREMIUM" : "GRÁTIS");
        } catch (e) {
            console.log("Erro ao buscar info do cliente:", e);
            setIsPro(false); // Em caso de erro, assume grátis por segurança
        } finally {
            setIsRevenueCatLoaded(true); // ✅ Agora temos certeza do status
        }

        // 3. Busca Sessão do Supabase
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);

      } catch (error) {
        console.error("ERRO FATAL na inicialização:", error);
      } finally {
        setIsReady(true);
      }
    };

    inicializarApp();

    // Listener para atualizações em tempo real (ex: comprou e voltou pro app)
    Purchases.addCustomerInfoUpdateListener((info: CustomerInfo) => {
        const isNowPro = typeof info.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
        setIsPro(isNowPro);
        setIsRevenueCatLoaded(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') {
        router.push('/reset-password');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- PROTEÇÃO DE ROTAS (GATEKEEPER) ---
  useEffect(() => {
    if (!isReady || !isRevenueCatLoaded) return;

    const inTabsGroup = segments[0] === '(tabs)';
    const inAuthGroup = segments[0] === 'auth';
    const inResetPassword = segments[0] === 'reset-password';
    const inEquipe = segments[0] === 'equipe';
    const inModal = segments[0] === 'modal';

    // Identifica se está tentando entrar na aba PRODUTOS
    const isTryingToAccessStock = segments[0] === '(tabs)' && segments[1] === 'produtos';

    if (session) {
      // Usuário Logado
      if (inAuthGroup) {
        router.replace('/(tabs)');
      } 
      
      // ✅ DESATIVADO AQUI: Deixando a responsabilidade 100% para o useAssinatura dentro da tela produtos.tsx
      // Isso resolve o problema de ser expulso mesmo tendo pago.
      /*
      else if (isTryingToAccessStock && !isPro) {
        console.log("Bloqueando acesso ao estoque: Usuário não é PRO");
        router.replace('/(tabs)/planos'); 
      }
      */

      // Rota inválida
      else if (!inTabsGroup && !inResetPassword && !inModal && !inEquipe) {
        router.replace('/(tabs)');
      }
    } else {
      // Usuário Deslogado
      if (inTabsGroup || inEquipe) {
        router.replace('/auth');
      }
    }
  }, [session, isReady, isRevenueCatLoaded, isPro, segments]); 

  // Tela de Loading (Exibida enquanto Supabase, RevenueCat ou Fontes carregam)
  // ✅ Adicionado !fontsLoaded na validação abaixo
  if (!isReady || !isRevenueCatLoaded || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#2C3E50" />
      </View>
    );
  }

  // ✅ ESTRUTURA MESTRE ATUALIZADA PARA FUNCIONAR PERFEITAMENTE NA WEB E MOBILE
  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: '#f0f0f0',
      alignItems: 'center',       // Centraliza horizontalmente no PC
      justifyContent: 'center',   // Centraliza verticalmente no PC
      height: Platform.OS === 'web' ? '100vh' : '100%', // Usa a altura inteira da janela no PC
    }}>
      <View style={{
        flex: 1, 
        width: '100%', 
        maxWidth: Platform.OS === 'web' ? 500 : '100%', // Largura de celular
        maxHeight: Platform.OS === 'web' ? 900 : '100%', // Altura máxima para não esticar infinitamente
        backgroundColor: '#fff',
        overflow: 'hidden', // IMPORTANTÍSSIMO: Força o scroll a acontecer apenas DENTRO do app, e não na janela do PC
        boxShadow: Platform.OS === 'web' ? '0px 10px 30px rgba(0,0,0,0.15)' : undefined, // Uma sombra elegante no PC
        borderRadius: Platform.OS === 'web' ? 12 : 0, // Bordas levemente arredondadas no PC
      }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="auth" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="reset-password" />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          
          <Stack.Screen 
            name="equipe" 
            options={{ 
                presentation: 'modal', 
                headerShown: false     
            }} 
          />
        </Stack>
      </View>
    </View>
  );
}
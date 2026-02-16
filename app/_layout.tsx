import { Session } from '@supabase/supabase-js';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import '../i18n';
import { supabase } from '../services/supabase';

// ✅ SUA CHAVE DO REVENUECAT (Já configurada)
const API_KEY_GOOGLE = 'goog_eIEPHdCOVMCoYvxMxJwuJqtzqqw'; 

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false); // Só vira true quando TUDO estiver carregado
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const inicializarApp = async () => {
      try {
        // 1. Configura RevenueCat (Espera terminar OBRIGATORIAMENTE)
        console.log("Iniciando RevenueCat...");
        Purchases.setLogLevel(LOG_LEVEL.DEBUG); // Logs para ajudar a ver erros

        if (Platform.OS === 'android') {
          await Purchases.configure({ apiKey: API_KEY_GOOGLE });
        } else if (Platform.OS === 'ios') {
          // await Purchases.configure({ apiKey: 'SUA_CHAVE_IOS' });
        }
        console.log("RevenueCat Configurado com Sucesso!");

        // 2. Busca Sessão do Supabase
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);

      } catch (error) {
        console.error("ERRO FATAL na inicialização:", error);
      } finally {
        // 3. Libera o App para aparecer na tela SÓ AGORA
        setIsReady(true);
      }
    };

    inicializarApp();

    // Listener de Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') {
        router.push('/reset-password');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Proteção de Rotas
  useEffect(() => {
    if (!isReady) return;

    const inTabsGroup = segments[0] === '(tabs)';
    const inAuthGroup = segments[0] === 'auth';
    const inResetPassword = segments[0] === 'reset-password';
    // Removida a verificação de 'paywall'

    if (session) {
      if (inAuthGroup) {
        router.replace('/(tabs)');
      } 
      // Se não estiver em Tabs, Reset ou Modal, manda para Tabs
      else if (!inTabsGroup && !inResetPassword && segments[0] !== 'modal') {
        router.replace('/(tabs)');
      }
    } else {
      // Se não tem sessão e tentar acessar abas protegidas, manda para Auth
      if (inTabsGroup) {
        router.replace('/auth');
      }
    }
  }, [session, isReady, segments]);

  // TELA DE CARREGAMENTO (Essencial para não dar erro de Singleton)
  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#2C3E50" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f0f0' }}>
      <View style={{
        flex: 1, width: '100%', maxWidth: Platform.OS === 'web' ? 500 : '100%',
        alignSelf: 'center', backgroundColor: '#fff',
        boxShadow: Platform.OS === 'web' ? '0px 0px 20px rgba(0,0,0,0.1)' : undefined,
      }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="auth" />
          <Stack.Screen name="(tabs)" />
          {/* <Stack.Screen name="paywall" />  <-- REMOVIDO */}
          <Stack.Screen name="reset-password" />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </View>
    </View>
  );
}
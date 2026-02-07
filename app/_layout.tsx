import { Session } from '@supabase/supabase-js';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native'; // <--- Importei Platform e View
import '../i18n';
import { supabase } from '../services/supabase';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Busca sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsMounted(true);
    });

    // Escuta mudanças de auth (Login, Logout e RECUPERAÇÃO DE SENHA)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);

      // ✅ FIX 1: Redirecionamento correto ao clicar no link do e-mail
      if (event === 'PASSWORD_RECOVERY') {
        router.push('/reset-password');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    // Identifica onde o usuário está
    const inTabsGroup = segments[0] === '(tabs)';
    const inAuthGroup = segments[0] === 'auth';
    const inResetPassword = segments[0] === 'reset-password';
    const inPaywall = segments[0] === 'paywall';

    if (session) {
      // --- USUÁRIO LOGADO ---
      
      // 1. Se tentar voltar pra tela de login, joga pra Home
      if (inAuthGroup) {
        router.replace('/(tabs)');
      } 
      // 2. Se estiver perdido (fora das abas, fora do reset e FORA DO PAYWALL), joga pra Home.
      else if (!inTabsGroup && !inResetPassword && !inPaywall && segments[0] !== 'modal') {
        // (Adicionei verificação de 'modal' para garantir que não feche modais acidentalmente)
        router.replace('/(tabs)');
      }

    } else {
      // --- USUÁRIO DESLOGADO ---
      
      // Se tentar acessar Abas ou Paywall sem conta, manda pro Login
      // Permitimos 'reset-password' e 'auth'
      if (inTabsGroup || inPaywall) {
        router.replace('/auth');
      }
    }
  }, [session, isMounted, segments]);

  if (!isMounted) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2C3E50" />
      </View>
    );
  }

  // ✅ FIX 2: Layout Web (Container para centralizar no PC)
  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: '#f0f0f0' // Fundo cinza fora da área do app (só aparece no PC)
    }}>
      <View style={{
        flex: 1,
        width: '100%',
        maxWidth: Platform.OS === 'web' ? 500 : '100%', // Limita largura no PC, 100% no celular
        alignSelf: 'center', // Centraliza a "tira" do app
        backgroundColor: '#fff', // Garante fundo branco no app
        boxShadow: Platform.OS === 'web' ? '0px 0px 20px rgba(0,0,0,0.1)' : undefined, // Sombra suave no PC
      }}>
        
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="auth" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="paywall" />
          <Stack.Screen name="reset-password" />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>

      </View>
    </View>
  );
}
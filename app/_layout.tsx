import { Session } from '@supabase/supabase-js';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from '../services/supabase';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsMounted(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const inTabsGroup = segments[0] === '(tabs)';
    // ✅ NOVO: Verifica se estamos na tela de resetar senha
    const inResetPassword = segments[0] === 'reset-password';

    if (session) {
      // Se tem sessão, mas não está nas abas E nem na tela de reset
      if (!inTabsGroup && !inResetPassword) {
        router.replace('/(tabs)');
      }
    } else {
      // Se NÃO tem sessão, e tenta acessar abas ou reset, manda pro login
      if (inTabsGroup || inResetPassword) {
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

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth" />
      <Stack.Screen name="(tabs)" />
      {/* ✅ Adicione a tela aqui caso precise de opções específicas, mas o default já funciona */}
      <Stack.Screen name="reset-password" /> 
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
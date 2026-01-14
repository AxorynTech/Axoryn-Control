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
    // 1. Checa se já existe um usuário salvo ao abrir o app
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsMounted(true);
    });

    // 2. Fica ouvindo: se alguém logar ou sair, atualiza a variável 'session'
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 3. O "SEGURANÇA": Redireciona automaticamente baseado na sessão
  useEffect(() => {
    if (!isMounted) return;

    // Verifica se o usuário está tentando acessar as abas ((tabs))
    const inTabsGroup = segments[0] === '(tabs)';

    if (session && !inTabsGroup) {
      // TEM sessão, mas está fora (na tela de login) -> Manda pra DENTRO
      router.replace('/(tabs)');
    } else if (!session && inTabsGroup) {
      // NÃO TEM sessão, mas está dentro -> Manda pra FORA (Login)
      router.replace('/auth');
    }
  }, [session, isMounted, segments]);

  // Tela de carregamento enquanto verifica a sessão inicial
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
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
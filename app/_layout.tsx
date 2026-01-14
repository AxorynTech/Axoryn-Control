import { Session } from '@supabase/supabase-js';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from '../services/supabase';

// Mantém a tela de carregamento visível até o app estar pronto
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsReady(true);
      SplashScreen.hideAsync();
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    // AQUI ESTÁ A CORREÇÃO: Usamos STACK, não TABS
    <Stack screenOptions={{ headerShown: false }}>
      {/* Se estiver logado, vai para as abas. Se não, para o auth */}
      {!session ? (
        <Stack.Screen name="auth" />
      ) : (
        <Stack.Screen name="(tabs)" />
      )}
      
      {/* Configuração do Modal para abrir por cima */}
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
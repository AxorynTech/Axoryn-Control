import { Session } from '@supabase/supabase-js';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from '../services/supabase'; // Importe seu client

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // 1. Verifica se já tem sessão salva
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
    });

    // 2. Escuta mudanças (Login, Logout, etc)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!initialized) return;

    // Está na tela de auth?
    const inAuthGroup = segments[0] === 'auth'; 
    
    if (session && inAuthGroup) {
      // Se tá logado e tenta ir pro login -> manda pra Home
      router.replace('/(tabs)'); 
    } else if (!session && !inAuthGroup) {
      // Se NÃO tá logado e tenta ver o app -> manda pro Login
      router.replace('/auth');
    }
  }, [session, initialized, segments]);

  // Enquanto carrega a sessão, mostra um loading
  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />; // Carrega a navegação normal do app
}
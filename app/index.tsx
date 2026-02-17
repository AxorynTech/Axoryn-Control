import { supabase } from '@/services/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkUser() {
      try {
        // 1. Verifica a sessão atual
        const { data: { session } } = await supabase.auth.getSession();

        if (mounted) {
          if (session) {
            // Usuário logado -> Vai para o App
            router.replace('/(tabs)');
          } else {
            // Usuário deslogado -> Vai para Login
            router.replace('/auth');
          }
        }
      } catch (error) {
        console.log("Erro ao verificar sessão inicial:", error);
        if (mounted) router.replace('/auth');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    checkUser();

    // 2. Proteção Extra: Escuta mudanças de estado em tempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
       if (mounted && session) {
          // Se o login acontecer repentinamente, redireciona
          router.replace('/(tabs)');
       }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' }}>
      <ActivityIndicator size="large" color="#2980B9" />
    </View>
  );
}
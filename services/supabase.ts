import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

// URL DO SEU PROJETO
const supabaseUrl = 'https://pcbywklgjmampecvgkqf.supabase.co';

// SUA CHAVE ANON
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjYnl3a2xnam1hbXBlY3Zna3FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwOTc1NjYsImV4cCI6MjA4MzY3MzU2Nn0.6BaIetmxJIEGKE-dR4_nt4GgjkOJfM1L4nbuYEGIo1g';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // LÓGICA DE ARMAZENAMENTO (Limpa e Segura):
    // Na Web: undefined -> O Supabase usa o localStorage do navegador automaticamente.
    // No App: AsyncStorage -> Usa o banco de dados do celular.
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,

    autoRefreshToken: true,
    persistSession: true,

    // A CORREÇÃO PRINCIPAL:
    // Web (true): Lê o token do link de recuperação de senha.
    // App (false): Não tenta ler URL (evita erros no Android/iOS).
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// Atualiza a sessão ao voltar para o app (Apenas Mobile)
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
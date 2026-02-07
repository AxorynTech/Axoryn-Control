import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

// URL DO SEU PROJETO
const supabaseUrl = 'https://pcbywklgjmampecvgkqf.supabase.co';

// ✅ SUA CHAVE ANON (CORRETA)
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjYnl3a2xnam1hbXBlY3Zna3FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwOTc1NjYsImV4cCI6MjA4MzY3MzU2Nn0.6BaIetmxJIEGKE-dR4_nt4GgjkOJfM1L4nbuYEGIo1g';

// Adaptador "Blindado" para Web e Native
const ExpoWebStorage = {
  getItem: (key: string) => {
    // Se for WEB e estiver no servidor (gerando o site), retorna nulo para não quebrar
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return Promise.resolve(null);
    }
    // No Android, iOS ou Navegador do usuário, funciona normal
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return Promise.resolve();
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return Promise.resolve();
    }
    return AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: ExpoWebStorage, // <--- Usamos o adaptador seguro aqui
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Atualiza a sessão ao voltar para o app (Evita erro no servidor web)
if (Platform.OS !== 'web' || typeof window !== 'undefined') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
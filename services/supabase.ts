import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import 'react-native-url-polyfill/auto';

// URL DO SEU PROJETO
const supabaseUrl = 'https://pcbywklgjmampecvgkqf.supabase.co';

// ✅ SUA CHAVE ANON (CORRETA)
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjYnl3a2xnam1hbXBlY3Zna3FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwOTc1NjYsImV4cCI6MjA4MzY3MzU2Nn0.6BaIetmxJIEGKE-dR4_nt4GgjkOJfM1L4nbuYEGIo1g';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Atualiza a sessão ao voltar para o app
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
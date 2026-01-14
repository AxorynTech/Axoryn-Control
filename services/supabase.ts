import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import 'react-native-url-polyfill/auto';

// SUA URL (que você mandou antes)
const supabaseUrl = 'https://pcbywklgjmampecvgkqf.supabase.co';

// SUA CHAVE (que você mandou agora)
const supabaseKey = 'sb_publishable_fhphv983nO_0lI-iMQDqTA_eDAy8BbR';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Listener para atualizar a sessão quando o app volta do background (Deep Link)
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// ✅ Sua URL correta (agora vai funcionar!)
const supabaseUrl = 'https://pcbywklgjmampecvgkqf.supabase.co';

// ✅ Sua Chave Pública
const supabaseAnonKey = 'sb_publishable_fhphv983nO_0lI-iMQDqTA_eDAy8BbR';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
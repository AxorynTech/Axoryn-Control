import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Configuração com as suas credenciais
    const supabaseClient = createClient(
      'https://pcbywklgjmampecvgkqf.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjYnl3a2xnam1hbXBlY3Zna3FmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODA5NzU2NiwiZXhwIjoyMDgzNjczNTY2fQ.YcbGbOdTTJv4eVVUuNZ3JuC39oL20oAcXKuJON1ITac'
    )

    const { titulo, mensagem, destinatarioId, senhaMestra } = await req.json()

    // 🔒 SUA SENHA DE ACESSO AO PAINEL
    if (senhaMestra !== 'AxorynAdmin2026!') {
      throw new Error('Acesso negado: Senha mestra incorreta.')
    }

    if (!titulo || !mensagem) {
      throw new Error('Título e mensagem são obrigatórios.')
    }

    let query = supabaseClient.from('profiles').select('expo_token').not('expo_token', 'is', null);
    
    if (destinatarioId && destinatarioId !== 'todos') {
        query = query.eq('user_id', destinatarioId);
    }

    const { data: perfis, error } = await query;

    if (error) throw error;
    if (!perfis || perfis.length === 0) {
        return new Response(JSON.stringify({ message: "Nenhum token encontrado." }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    }

    const mensagensPush = perfis.map((perfil) => ({
      to: perfil.expo_token,
      sound: 'default',
      title: titulo,
      body: mensagem,
      data: { rota: 'Notificacoes' },
    }))

    const chunkSize = 100;
    for (let i = 0; i < mensagensPush.length; i += chunkSize) {
      const chunk = mensagensPush.slice(i, i + chunkSize);
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk),
      });
    }

    return new Response(JSON.stringify({ success: true, disparos: mensagensPush.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
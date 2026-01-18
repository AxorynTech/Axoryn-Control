// supabase/functions/notificar-cobrancas/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// @ts-ignore: Ignora erro de Deno no editor se a extensão não estiver ativa
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Conecta ao Banco
    const supabase = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SERVICE_ROLE_KEY') ?? '' 
    )

    // 2. Busca usuários
    const { data: usuarios, error: erroUser } = await supabase
      .from('profiles')
      .select('user_id, expo_token')
      .not('expo_token', 'is', null)

    if (erroUser) throw erroUser;

    const mensagens = [];
    const hoje = new Date().toISOString().split('T')[0];

    console.log(`Verificando ${usuarios?.length || 0} usuários...`);

    // 3. Verifica cliente por cliente
    if (usuarios) {
      for (const usuario of usuarios) {
        const { data: clientes } = await supabase
          .from('clientes')
          .select('*')
          .eq('user_id', usuario.user_id)

        if (!clientes) continue;

        for (const cli of clientes) {
          if (!cli.contratos) continue;
          
          let contratos: any[] = [];
          try { 
            contratos = typeof cli.contratos === 'string' ? JSON.parse(cli.contratos) : cli.contratos; 
          } catch (e) { continue; }

          for (const con of contratos) {
            if (!con.parcelas) continue;
            // @ts-ignore
            const parcelaHoje = con.parcelas.find((p: any) => p.data === hoje && !p.pago);
            
            if (parcelaHoje) {
              mensagens.push({
                to: usuario.expo_token,
                sound: 'default',
                title: 'Cobrança Hoje 📅',
                body: `${cli.nome} vence hoje! Valor: ${parcelaHoje.valor}`,
                data: { url: '/(tabs)/cobranca' },
              });
            }
          }
        }
      }
    }

    if (mensagens.length === 0) {
      return new Response(JSON.stringify({ message: "Ninguém vence hoje." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Envia tudo para a Expo
    const respostaExpo = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mensagens),
    });

    const resultado = await respostaExpo.json();

    return new Response(JSON.stringify({ success: true, enviados: mensagens.length, expo: resultado }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) { // <--- O PULO DO GATO: Tipamos como 'any' para evitar erro
    const msgErro = error.message || String(error);
    return new Response(JSON.stringify({ error: msgErro }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
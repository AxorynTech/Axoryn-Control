// supabase/functions/notificar-cobrancas/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjYnl3a2xnam1hbXBlY3Zna3FmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODA5NzU2NiwiZXhwIjoyMDgzNjczNTY2fQ.YcbGbOdTTJv4eVVUuNZ3JuC39oL20oAcXKuJON1ITac';

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1. Busca usuários
    const { data: usuarios, error: erroUser } = await supabase
      .from('profiles')
      .select('user_id, expo_token')
      .not('expo_token', 'is', null)

    if (erroUser) throw erroUser;

    // Mapa para evitar duplicidade de tokens (se o usuário tiver 2 cadastros)
    const mensagensMap = new Map();
    
    // Data de Hoje
    const dataObj = new Date();
    const dia = String(dataObj.getDate()).padStart(2, '0');
    const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
    const ano = dataObj.getFullYear();
    const hojeISO = `${ano}-${mes}-${dia}`; 

    console.log(`🔎 Processando cobranças até: "${hojeISO}"`);

    if (usuarios) {
      for (const usuario of usuarios) {
        
        // Se já processamos esse token, pula (evita notificação dupla)
        if (mensagensMap.has(usuario.expo_token)) continue;

        let totalClientes = 0;
        let valorTotalGeral = 0.0;

        const { data: clientes, error: erroCli } = await supabase
          .from('clientes')
          .select('nome, contratos(*)') 
          .eq('user_id', usuario.user_id)

        if (!clientes || clientes.length === 0) continue;

        for (const cli of clientes) {
          if (!cli.contratos) continue;
          const listaContratos = Array.isArray(cli.contratos) ? cli.contratos : [];

          for (const con of listaContratos) {
            if (con.status !== 'ATIVO') continue;

            const dataVencimento = con.proximo_vencimento;

            // Vence HOJE ou ANTES
            if (dataVencimento && dataVencimento <= hojeISO) {
                
                let valorFinal = 0;

                // Limpa valores
                let parcela = parseFloat(String(con.valor_parcela).replace('R$', '').replace(',', '.').trim());
                let capital = parseFloat(String(con.capital).replace('R$', '').replace(',', '.').trim());
                let taxa = parseFloat(String(con.taxa).replace('R$', '').replace(',', '.').trim());

                if (isNaN(parcela)) parcela = 0;
                if (isNaN(capital)) capital = 0;
                if (isNaN(taxa)) taxa = 0;

                // Lógica de Prioridade: Parcela > (Capital + Juros)
                if (parcela > 0) {
                    valorFinal = parcela;
                } else if (capital > 0) {
                    const valorJuros = capital * (taxa / 100);
                    valorFinal = capital + valorJuros;
                }

                if (valorFinal > 0) {
                    totalClientes++;
                    valorTotalGeral += valorFinal;
                }
            }
          }
        }

        if (totalClientes > 0) {
            const valorFormatado = valorTotalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            
            // Salva no mapa para envio
            mensagensMap.set(usuario.expo_token, {
                to: usuario.expo_token,
                sound: 'default',
                title: 'Resumo do Dia 💰',
                body: `Total: ${totalClientes} cobranças | R$ ${valorFormatado}`,
                data: { url: '/(tabs)/cobranca' },
                channelId: 'resumo-diario', // Substitui a notificação anterior se houver
            });
        }
      }
    }

    // Converte o Mapa em Lista
    const mensagens = Array.from(mensagensMap.values());

    if (mensagens.length === 0) {
      return new Response(JSON.stringify({ message: "Sem cobranças hoje." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const respostaExpo = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mensagens),
    });

    return new Response(JSON.stringify({ success: true, enviados: mensagens.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
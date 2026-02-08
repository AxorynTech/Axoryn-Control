import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

// 1. CONFIGURAÇÃO DOS PLANOS (BRL)
// Centraliza os valores e regras para evitar fraudes no Frontend
const PLANS: any = {
  'mensal':  { price: 14.99,  title: 'Assinatura Mensal (Premium)', credits: 0 },
  'anual':   { price: 149.90, title: 'Assinatura Anual (Premium)',  credits: 0 },
  'recarga': { price: 20.00,  title: 'Recarga 10 Consultas',        credits: 10 }
};

Deno.serve(async (req: Request) => {
  // Lida com CORS
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    const MP_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')
    
    // Conecta ao Supabase com Permissão de Admin (Service Role)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Tenta ler o corpo da requisição de forma segura
    let body: any = {}
    try {
      const rawBody = await req.text()
      body = rawBody ? JSON.parse(rawBody) : {}
    } catch (e) {
      console.error("Erro ao ler JSON:", e)
    }

    // --- LOG DE ENTRADA ---
    console.log("Recebido:", { 
      action: body?.action, 
      topic: body?.topic, 
      id: body?.data?.id || body?.id 
    })

    // 🛡️ ESCUDO IMEDIATO PARA payment.created
    if (body.action === 'payment.created' || body.topic === 'merchant_order' || (body.action === 'payment.updated' && body.data?.id === undefined)) {
      return new Response(JSON.stringify({ status: 'ignored' }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // 🚀 ROTA A: CRIAÇÃO DE PAGAMENTO (Seu App chamando a função)
    // Alterado: Agora verifica 'type' e 'email' em vez de 'price'
    if (body.email && body.type) {
      
      const selectedPlan = PLANS[body.type];
      if (!selectedPlan) {
        return new Response(JSON.stringify({ error: "Plano inválido" }), { status: 400, headers: corsHeaders });
      }

      // Forçamos a URL de notificação manualmente
      const notificationUrl = `https://${new URL(req.url).hostname}/functions/v1/mercadopago`

      const preference = {
        items: [{ 
          title: selectedPlan.title, 
          quantity: 1, 
          currency_id: 'BRL', 
          unit_price: selectedPlan.price // Usa o preço do servidor, não do front
        }],
        payer: { 
          email: body.email,
          name: body.firstName || 'Cliente',
          surname: body.lastName || '',
          identification: {
            type: 'CPF',
            number: body.docNumber ? String(body.docNumber).replace(/\D/g, '') : '' 
          }
        },
        external_reference: String(body.user_id),
        // Metadados para o Webhook saber o que fazer depois
        metadata: {
          user_id: body.user_id,
          type: body.type, // 'mensal', 'anual' ou 'recarga'
          credits: selectedPlan.credits
        },
        notification_url: notificationUrl
      }

      const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${MP_TOKEN}` 
        },
        body: JSON.stringify(preference)
      })

      const mpData = await mpRes.json()
      return new Response(JSON.stringify(mpData), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // ✅ ROTA B: WEBHOOK DE PAGAMENTO APROVADO
    const paymentId = body?.data?.id || body?.id || url.searchParams.get('id')

    if (paymentId && (body.action === 'payment.updated' || url.searchParams.has('id'))) {
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${MP_TOKEN}` }
      })

      if (res.ok) {
        const pData = await res.json()
        if (pData.status === 'approved') {
          
          // 🛡️ NOVO: PROTEÇÃO CONTRA DUPLICIDADE 🛡️
          // Verifica se esse paymentId já foi processado antes
          const { data: transacaoJaExiste } = await supabase
            .from('historico_transacoes')
            .select('id')
            .eq('payment_id_externo', String(paymentId))
            .single();

          if (transacaoJaExiste) {
            console.log(`Pagamento ${paymentId} já processado anteriormente. Ignorando.`);
            // Retorna sucesso para o Mercado Pago parar de enviar
            return new Response(JSON.stringify({ success: true, status: 'already_processed' }), { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
          }
          
          // Recupera os dados salvos nos metadados da preferência
          const meta = pData.metadata || {};
          // Fallback: se não tiver metadata, usa external_reference e assume mensal
          const userId = meta.user_id || pData.external_reference;
          const type = meta.type || 'mensal';
          const creditsToAdd = Number(meta.credits || 0);

          console.log(`Pagamento MP Aprovado (${type}) para: ${userId}`);

          if (userId) {

            // 🛡️ NOVO: REGISTRA A TRANSAÇÃO PARA NÃO PROCESSAR DE NOVO 🛡️
            await supabase.from('historico_transacoes').insert({
                user_id: userId,
                payment_id_externo: String(paymentId),
                valor: pData.transaction_amount,
                tipo: type
            });

            if (type === 'recarga' && creditsToAdd > 0) {
              // --- LÓGICA DE RECARGA ---
              const { data: currentData } = await supabase
                .from('user_credits')
                .select('consultas_restantes')
                .eq('user_id', userId)
                .maybeSingle();

              const novoSaldo = (currentData?.consultas_restantes || 0) + creditsToAdd;

              await supabase.from('user_credits').upsert({
                user_id: userId,
                consultas_restantes: novoSaldo,
                ultima_renovacao: new Date().toISOString()
              });
              console.log(`Recarga efetuada. Novo saldo: ${novoSaldo}`);

            } else {
              // --- LÓGICA DE ASSINATURA ---
              await supabase.from('assinaturas').upsert({
                user_id: userId,
                payment_id: String(paymentId),
                status: 'approved',
                valor: pData.transaction_amount,
                plano: type // Salva 'mensal' ou 'anual' para o Frontend saber a validade
              })
              console.log(`Assinatura ${type} liberada.`)
            }
          }
        }
      }
    }

    // Resposta padrão
    return new Response(JSON.stringify({ success: true }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (err: any) {
    console.error("Erro Crítico:", err.message)
    return new Response(JSON.stringify({ error: "Erro tratado" }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
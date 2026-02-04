import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

Deno.serve(async (req: Request) => {
  // 1. Lida com CORS
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    const MP_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')

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
    // Se for criação ou ordem do mercante, respondemos 200 e PARAMOS por aqui.
    if (body.action === 'payment.created' || body.topic === 'merchant_order' || body.action === 'payment.updated' && body.data?.id === undefined) {
      return new Response(JSON.stringify({ status: 'ignored' }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // 🚀 ROTA A: CRIAÇÃO DE PAGAMENTO (Seu App chamando a função)
    if (body.price && body.email) {
      // Forçamos a URL de notificação manualmente para evitar erros de detecção dinâmica
      // Substitua 'mercadopago' pelo nome real da sua função se for diferente
      const notificationUrl = `https://${new URL(req.url).hostname}/functions/v1/mercadopago`

      const preference = {
        items: [{ 
          title: "Assinatura Axoryn", 
          quantity: 1, 
          currency_id: 'BRL', 
          unit_price: Number(body.price) 
        }],
        payer: { email: body.email },
        external_reference: String(body.user_id),
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
          const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
          )

          await supabase.from('assinaturas').upsert({
            user_id: pData.external_reference,
            payment_id: String(paymentId),
            status: 'approved',
            valor: pData.transaction_amount
          })
          console.log(`Sucesso: Usuário ${pData.external_reference} liberado.`)
        }
      }
    }

    // Resposta padrão para qualquer outra notificação do MP
    return new Response(JSON.stringify({ success: true }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (err) {
    console.error("Erro Crítico:", err.message)
    // Retornar 200 mesmo no erro evita que o Mercado Pago desative seu Webhook por 502
    return new Response(JSON.stringify({ error: "Erro tratado" }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
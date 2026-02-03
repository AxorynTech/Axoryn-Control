import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

Deno.serve(async (req: Request) => {
  // 1. Resposta rápida para o navegador (CORS)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Leitura segura do corpo da mensagem
    const text = await req.text()
    let body: any = {}
    try { body = text ? JSON.parse(text) : {} } catch(e) {}

    // =================================================================
    // 🛡️ ESCUDO CONTRA O ERRO 502 (CRUCIAL)
    // O Mercado Pago manda avisos de "payment.created" ou "merchant_order".
    // Se recebermos isso, respondemos 200 imediatamente e NÃO fazemos nada.
    // Isso impede o servidor de travar tentando processar pagamento vazio.
    // =================================================================
    if (body.action === 'payment.created' || body.topic === 'merchant_order') {
        return new Response("OK (Ignorado)", { status: 200, headers: corsHeaders })
    }

    // Carrega tokens
    const MP_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')
    
    // =================================================================
    // ROTA A: CRIAR O LINK (Vem do seu Site)
    // =================================================================
    if (body.price && body.email) {
      console.log(`🚀 Gerando QR Code para: ${body.email}`)

      // Monta a URL para onde o Mercado Pago deve mandar o aviso depois
      const reqUrl = new URL(req.url)
      const notificationUrl = `${reqUrl.origin}/functions/v1/mercadopago`

      const preference = {
        items: [{ title: "Assinatura Axoryn", quantity: 1, currency_id: 'BRL', unit_price: Number(body.price) }],
        payer: { email: body.email },
        external_reference: body.user_id,
        auto_return: "approved",
        back_urls: {
            success: "https://axoryn.com/sucesso",
            failure: "https://axoryn.com/erro",
            pending: "https://axoryn.com/pendente"
        },
        notification_url: notificationUrl
      }

      const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MP_TOKEN}` },
        body: JSON.stringify(preference)
      })

      const mpData = await mpRes.json()
      return new Response(JSON.stringify(mpData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // =================================================================
    // ROTA B: WEBHOOK (Vem do Mercado Pago)
    // =================================================================
    // Tenta achar o ID do pagamento em qualquer lugar possível
    const pId = body?.data?.id || body?.id || new URL(req.url).searchParams.get('id') || new URL(req.url).searchParams.get('data.id')
    
    if (pId) {
      // Pergunta para o Mercado Pago: "Qual o status REAL desse ID?"
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${pId}`, {
        headers: { 'Authorization': `Bearer ${MP_TOKEN}` }
      })

      if (res.ok) {
        const pData = await res.json()
        const status = pData.status // approved, pending, rejected, etc.

        // 🛑 BARREIRA FINAL: Só deixamos passar se for APROVADO
        if (status !== 'approved') {
             // Se for 'pending' ou qualquer outra coisa, tchau. 200 OK.
             console.log(`⏳ Status: ${status} (Ignorado)`)
             return new Response("OK", { status: 200, headers: corsHeaders })
        }

        // ✅ Se chegou aqui, é dinheiro confirmado!
        if (status === 'approved' && pData.external_reference) {
            console.log(`✅ DINHEIRO NA MÃO! Liberando user: ${pData.external_reference}`)
            
            // Só conectamos no Supabase AGORA (Economiza memória e evita crash)
            const SUP_URL = Deno.env.get('SUPABASE_URL')
            const SUP_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
            const supabase = createClient(SUP_URL!, SUP_KEY!)

            await supabase.from('assinaturas').upsert({
              user_id: pData.external_reference,
              payment_id: String(pId),
              status: 'approved',
              valor: pData.transaction_amount
            })
            // O Trigger do banco vai liberar os 30 dias ou 1 ano automaticamente
        }
      }
    }

    return new Response("OK", { status: 200, headers: corsHeaders })

  } catch (err: any) {
    // 🚨 REDE DE SEGURANÇA TOTAL
    // Se der qualquer erro no código, respondemos 200 para o Mercado Pago
    // Isso evita que apareça "502" ou "500" no painel deles.
    console.error("🔥 Erro capturado (Respondendo 200):", err.message)
    return new Response(JSON.stringify({ error: "Handled" }), { status: 200, headers: corsHeaders })
  }
})
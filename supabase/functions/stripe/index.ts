import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req: Request) => {
  // 1. Configuração Inicial
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const STRIPE_KEY = Deno.env.get('STRIPE_API_KEY');
  if (!STRIPE_KEY) {
    return new Response(JSON.stringify({ error: "Stripe Key não configurada" }), { status: 500, headers: corsHeaders });
  }

  const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2022-11-15', httpClient: Stripe.createFetchHttpClient() });
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  );

  const url = new URL(req.url);

  // 2. ROTA: CRIAR CHECKOUT (Link de Pagamento)
  if (req.method === 'POST' && url.pathname.includes('/checkout')) {
    try {
      const { price, title, email, user_id } = await req.json();

      console.log(`Criando Checkout Stripe: ${email} | Valor: ${price} USD`);

      // Cria a sessão de pagamento no Stripe
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: { name: title },
              unit_amount: Math.round(price * 100), // Stripe usa centavos (1.00 = 100)
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: "axoryn://payment-success", // Deep link do App
        cancel_url: "axoryn://payment-failure",
        customer_email: email,
        client_reference_id: user_id, // Enviamos o ID do usuário para saber quem pagou
      });

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
    }
  }

  // 3. ROTA: WEBHOOK (Stripe avisa que pagou)
  if (req.method === 'POST' && url.pathname.includes('/webhook')) {
    try {
      const signature = req.headers.get('stripe-signature');
      const body = await req.text();
      
      // Em produção, você deve verificar a assinatura com 'stripe.webhooks.constructEvent'
      // Para simplificar agora, vamos ler o evento direto (Cuidado em produção real)
      const event = JSON.parse(body);

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const userId = session.client_reference_id;
        
        console.log(`Pagamento Stripe Aprovado: ${userId}`);

        if (userId) {
          await supabase.from('assinaturas').upsert({
            user_id: userId,
            payment_id: session.id,
            status: 'approved', // Stripe completed = aprovado
            valor: session.amount_total / 100
          });
        }
      }

      return new Response(JSON.stringify({ received: true }), { headers: corsHeaders });
    } catch (err) {
      return new Response(`Webhook Error: ${err.message}`, { status: 400, headers: corsHeaders });
    }
  }

  return new Response("Stripe Function Online", { headers: corsHeaders });
});
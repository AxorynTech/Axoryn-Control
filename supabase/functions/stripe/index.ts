import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'npm:stripe@^14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// 1. CONFIGURAÇÃO DOS PLANOS (STRIPE - USD)
// Aqui definimos os valores exatos para garantir segurança total
const PLANS: any = {
  'mensal':  { price: 9.90,  title: 'Assinatura Mensal (Premium)', credits: 0 },
  'anual':   { price: 99.00, title: 'Assinatura Anual (Premium)',  credits: 0 },
  'recarga': { price: 10.00, title: 'Recarga 10 Consultas',        credits: 10 }
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const STRIPE_KEY = Deno.env.get('STRIPE_API_KEY');
  if (!STRIPE_KEY) {
    return new Response(JSON.stringify({ error: "Stripe Key não configurada" }), { status: 500, headers: corsHeaders });
  }

  const stripe = new Stripe(STRIPE_KEY, { 
    apiVersion: '2023-10-16', 
    httpClient: Stripe.createFetchHttpClient() 
  });

  // Mantido: Usa SERVICE_ROLE_KEY para ter permissão de escrita nas tabelas
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! 
  );

  const url = new URL(req.url);

  // 🚀 2. ROTA: CRIAR CHECKOUT
  if (req.method === 'POST' && url.pathname.includes('/checkout')) {
    try {
      // Recebemos apenas o 'type' (mensal, anual, recarga), sem valores soltos
      const { type, email, user_id } = await req.json();
      
      const selectedPlan = PLANS[type || 'mensal'];
      if (!selectedPlan) {
        throw new Error("Plano inválido selecionado.");
      }

      console.log(`Criando Checkout Stripe (${type}): ${selectedPlan.price} USD | User: ${email}`);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: { name: selectedPlan.title },
              unit_amount: Math.round(selectedPlan.price * 100), // Converte para centavos
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: "axoryn://payment-success",
        cancel_url: "axoryn://payment-failure",
        customer_email: email,
        client_reference_id: user_id,
        // METADADOS CRITICOS: Salvamos aqui para o Webhook ler depois
        metadata: {
          user_id: user_id,
          type: type, // 'mensal', 'anual' ou 'recarga'
          credits: String(selectedPlan.credits)
        }
      });

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error("Erro no checkout:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
    }
  }

  // ✅ 3. ROTA: WEBHOOK
  if (req.method === 'POST' && url.pathname.includes('/webhook')) {
    try {
      const body = await req.text();
      const event = JSON.parse(body);

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        
        // Recupera dados dos Metadados (Fallback para client_reference_id se necessário)
        const userId = session.metadata?.user_id || session.client_reference_id;
        const type = session.metadata?.type || 'mensal';
        const creditsToAdd = parseInt(session.metadata?.credits || '0');
        
        console.log(`Pagamento Stripe Aprovado (${type}) para UserID: ${userId}`);

        if (userId) {
          
          if (type === 'recarga' && creditsToAdd > 0) {
            // --- LÓGICA DE RECARGA (RiskRadar) ---
            const { data: currentData } = await supabase
              .from('user_credits')
              .select('consultas_restantes')
              .eq('user_id', userId)
              .maybeSingle();

            const saldoAtual = currentData?.consultas_restantes || 0;
            const novoSaldo = saldoAtual + creditsToAdd;

            const { error: creditError } = await supabase.from('user_credits').upsert({
              user_id: userId,
              consultas_restantes: novoSaldo,
              ultima_renovacao: new Date().toISOString()
            });

            if (creditError) throw new Error("Erro ao adicionar créditos: " + creditError.message);
            console.log(`Recarga efetuada. Novo saldo: ${novoSaldo}`);

          } else {
            // --- LÓGICA DE ASSINATURA (Mensal/Anual) ---
            const { error: upsertError } = await supabase.from('assinaturas').upsert({
              user_id: userId,
              payment_id: session.id,
              status: 'approved',
              valor: session.amount_total / 100,
              plano: type // Salva 'mensal' ou 'anual' para o App calcular a validade
            });

            if (upsertError) {
               console.error("Erro ao salvar no Supabase:", upsertError);
               throw new Error("Falha ao salvar assinatura: " + upsertError.message);
            }
          }
        }
      }

      return new Response(JSON.stringify({ received: true }), { headers: corsHeaders });
    } catch (err) {
      console.error("Erro no Webhook:", err);
      return new Response(`Webhook Error: ${err.message}`, { status: 400, headers: corsHeaders });
    }
  }

  return new Response("Stripe Function Online", { headers: corsHeaders });
});
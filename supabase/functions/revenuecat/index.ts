import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  try {
    const body = await req.json();
    const event = body.event;

    // Se não for um evento válido, ignora e responde OK
    if (!event || !event.app_user_id) {
      return new Response(JSON.stringify({ message: "Ignorado" }), { status: 200 });
    }

    const userId = event.app_user_id; 
    const tipoEvento = event.type; 
    const expirationAtMs = event.expiration_at_ms;
    const productId = event.product_id || '';

    // Conecta ao Supabase usando a chave de administrador
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // ============================================================
    // 1. EVENTO: COMPRA INICIAL OU RENOVAÇÃO
    // ============================================================
    if (tipoEvento === 'INITIAL_PURCHASE' || tipoEvento === 'RENEWAL') {
      const dataFim = new Date(expirationAtMs).toISOString();
      
      // Identifica o plano pelo ID do produto
      const ehAnual = productId.toLowerCase().includes('anual') || productId.toLowerCase().includes('year');
      const planoNome = ehAnual ? 'anual' : 'mensal';

      // A. Atualiza o Perfil (Libera o App)
      await supabase.from('profiles').update({ 
        data_fim_assinatura: dataFim,
        status: 'premium',
        plano: planoNome
      }).eq('user_id', userId);

      // B. Grava o Histórico Financeiro (A memória que faltava)
      await supabase.from('assinaturas').insert({
        user_id: userId,
        plano: planoNome,
        status: 'approved',
        valor: event.price || 0,
        metodo_pagamento: 'loja_app',
        transaction_id: event.transaction_id || event.id
      });

      // C. Garante que a Equipe também fique Premium
      const { data: prof } = await supabase.from('profiles').select('team_id').eq('user_id', userId).single();
      if (prof?.team_id) {
        await supabase.from('teams').update({ is_premium: true }).eq('id', prof.team_id);
      }

      console.log(`RC: Sucesso! Assinatura ${planoNome} gravada para ${userId}.`);
    } 

    // ============================================================
    // 2. EVENTO: EXPIRAÇÃO (Fim do Prazo ou Cancelamento)
    // ============================================================
    else if (tipoEvento === 'EXPIRATION') {
      const dataPassada = new Date(Date.now() - 86400000).toISOString(); 
      
      // A. Bloqueia o Perfil
      await supabase.from('profiles').update({ 
        data_fim_assinatura: dataPassada,
        status: 'gratis',
        plano: 'expirado'
      }).eq('user_id', userId);

      // B. Bloqueia a Equipe e zera limites
      const { data: prof } = await supabase.from('profiles').select('team_id').eq('user_id', userId).single();
      if (prof?.team_id) {
        await supabase.from('teams').update({ 
          is_premium: false,
          limite_membros: 0 
        }).eq('id', prof.team_id);
      }

      console.log(`RC: Assinatura expirada para ${userId}. Acesso cortado.`);
    }

    return new Response(JSON.stringify({ success: true }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error("Erro no Webhook RC:", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500 });
  }
});
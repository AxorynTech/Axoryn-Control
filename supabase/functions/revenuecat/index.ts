import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  try {
    const body = await req.json();
    const event = body.event;

    // Se não for um evento válido, ignora e responde OK
    if (!event || !event.app_user_id) {
      return new Response(JSON.stringify({ message: "Ignorado" }), { status: 200 });
    }

    const userId = event.app_user_id; // Esse é o ID do Supabase que enviamos via App!
    const tipoEvento = event.type; // INITIAL_PURCHASE, RENEWAL, EXPIRATION, etc.
    const expirationAtMs = event.expiration_at_ms;

    // Conecta ao Supabase usando a chave de administrador
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Se foi uma compra ou renovação aprovada
    if (tipoEvento === 'INITIAL_PURCHASE' || tipoEvento === 'RENEWAL') {
      const dataFim = new Date(expirationAtMs).toISOString();

      // Atualiza a validade do App no perfil do usuário
      await supabase.from('profiles').update({ 
        data_fim_assinatura: dataFim 
      }).eq('user_id', userId);

      console.log(`RC: Assinatura atualizada para ${userId}. Válida até ${dataFim}`);
    } 
    // Se a assinatura expirou
    else if (tipoEvento === 'EXPIRATION') {
      // Volta a data para o passado (ontem), bloqueando o acesso na Web
      const dataPassada = new Date(Date.now() - 86400000).toISOString(); 
      
      await supabase.from('profiles').update({ 
        data_fim_assinatura: dataPassada 
      }).eq('user_id', userId);

      // Zera a catraca da equipe por falta de pagamento do plano base
      await supabase.from('teams').update({ limite_membros: 0 }).eq('owner_id', userId);

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
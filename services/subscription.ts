import { supabase } from './supabase';

export const verificarAcesso = async () => {
  try {
    // 1. Pega o usuário logado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // 2. Busca o perfil dele no banco
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('status_assinatura, data_fim_assinatura')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.log('Erro ao buscar perfil:', error.message);
      // Se der erro (ex: perfil não criado), vamos assumir que é usuário novo e liberar pelo teste
    }

    // --- NOVA REGRA: ACESSO VIP / PARCEIRO (Adicionada) ---
    // Se o status for 'vitalicio', libera direto sem checar data
    if (profile?.status_assinatura === 'vitalicio') { //
      console.log("Acesso LIBERADO: Usuário Parceiro/Vitalício 👑");
      return true;
    }

    // --- REGRA 1: Assinatura Paga e Valida ---
    // Se o status for 'ativo' e a data de fim for no futuro
    if (profile?.status_assinatura === 'ativo' && profile?.data_fim_assinatura) {
      const hoje = new Date();
      const vencimento = new Date(profile.data_fim_assinatura);
      
      if (vencimento > hoje) {
        console.log("Acesso LIBERADO: Assinatura válida ✅");
        return true; 
      }
    }

    // --- REGRA 2: Teste Grátis de 7 Dias ---
    // Conta quantos dias passaram desde que o usuário foi criado
    const dataCriacao = new Date(user.created_at);
    const hoje = new Date();
    
    // Cálculo da diferença em dias (milissegundos -> dias)
    const diferencaEmTempo = hoje.getTime() - dataCriacao.getTime();
    const diasDeUso = diferencaEmTempo / (1000 * 3600 * 24);

    if (diasDeUso <= 0) {
      console.log(`Acesso LIBERADO: Período de teste (${Math.floor(diasDeUso)} dias usados) 🎁`);
      return true;
    }

    // Se chegou aqui: Não é vitalício, não pagou e passou de 7 dias
    console.log("Acesso NEGADO: Teste acabou e não tem assinatura ❌");
    return false;

  } catch (e) {
    console.log("Erro geral na verificação:", e);
    return false; // Por segurança, bloqueia se der erro grave
  }
};
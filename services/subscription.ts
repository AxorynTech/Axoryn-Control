import { supabase } from './supabase';

export const verificarAcesso = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Busca o perfil completo
    const { data: profile } = await supabase
      .from('profiles')
      .select('*') 
      .eq('user_id', user.id)
      .single();

    // Normaliza o status (pega de qualquer uma das colunas e garante string)
    const statusGeral = profile?.status || profile?.status_assinatura || '';
    
    // --- 1. REGRA VITALÍCIO (Prioridade Máxima) ---
    if (statusGeral && String(statusGeral).toLowerCase().includes('vitalicio')) {
      console.log("👑 Acesso VITALÍCIO Confirmado");
      return true;
    }

    // --- 2. REGRA PREMIUM (Assinatura Mensal) ---
    if ((statusGeral === 'ativo' || statusGeral === 'approved') && profile?.data_fim_assinatura) {
      const hoje = new Date();
      const vencimento = new Date(profile.data_fim_assinatura);
      
      if (vencimento > hoje) {
        // Adicionei este log que faltava para confirmar clientes pagantes
        const diasRestantes = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 3600 * 24));
        console.log(`🌟 Acesso PREMIUM Confirmado (${diasRestantes} dias restantes)`);
        return true; 
      }
    }

    // --- 3. REGRA TESTE GRÁTIS (30 Dias) ---
    const dataCriacao = new Date(user.created_at);
    const hoje = new Date();
    const diferenca = hoje.getTime() - dataCriacao.getTime();
    const dias = diferenca / (1000 * 3600 * 24);

    if (dias <= 0) {
      console.log(`🎁 Acesso TESTE (${Math.floor(dias)} dias usados)`);
      return true;
    }

    // Se chegou aqui, não tem acesso
    console.log("🔒 Acesso NEGADO: Período encerrado");
    return false;

  } catch (e) {
    console.log("Erro na verificação de acesso:", e);
    return false;
  }
};
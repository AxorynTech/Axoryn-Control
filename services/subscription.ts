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

    // --- 3. REGRA TESTE GRÁTIS COM DATA DE CORTE ---
    const dataCriacao = new Date(user.created_at);
    const hoje = new Date();
    const diferenca = hoje.getTime() - dataCriacao.getTime();
    const diasUsados = diferenca / (1000 * 3600 * 24);

    // ⬇️ INJETADO: Lógica de Data de Corte (Grandfathering) ⬇️
    const dataCorte = new Date(2026, 3, 15); // 15/04/2026 (Mês 3 = Abril)
    const limiteDias = dataCriacao < dataCorte ? 30 : 14;
    // ⬆️ FIM DA INJEÇÃO ⬆️

    if (diasUsados <= limiteDias) {
      console.log(`🎁 Acesso TESTE (${Math.floor(diasUsados)}/${limiteDias} dias usados)`);
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
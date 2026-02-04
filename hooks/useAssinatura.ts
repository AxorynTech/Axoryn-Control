import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export function useAssinatura() {
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [diasRestantes, setDiasRestantes] = useState<number | string>(0);
  // ATUALIZADO: Adicionados os tipos 'mensal' e 'anual'
  const [tipoPlano, setTipoPlano] = useState<'teste_gratis' | 'mensal' | 'anual' | 'vitalicio' | 'expirado'>('expirado');

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      console.log("Verificando assinatura para:", user.email);

      // ============================================================
      // 1. PRIORIDADE MÁXIMA: Verifica Status Vitalício no Perfil
      // ============================================================
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*') 
        .eq('user_id', user.id)
        .single();

      if (profileError) {
         console.log("Nota: Perfil não encontrado ou erro de busca.", profileError.message);
      }

      // Procura o status em várias colunas possíveis
      const statusEncontrado = profile?.status || profile?.plano || profile?.role || "";

      if (statusEncontrado && String(statusEncontrado).toLowerCase().includes('vitalicio')) {
        setTipoPlano('vitalicio');
        setIsPremium(true);
        setDiasRestantes('Infinito');
        setLoading(false);
        return; 
      }

      // ============================================================
      // 2. Busca a Assinatura mais recente (Mensal ou Anual)
      // ============================================================
      const { data: assinatura } = await supabase
        .from('assinaturas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const hoje = new Date();
      let dataVencimento: Date;

      if (assinatura && assinatura.status === 'approved') {
        const dataPagamento = new Date(assinatura.created_at);
        dataVencimento = new Date(dataPagamento);
        
        // --- NOVA LÓGICA: Verifica se é Anual ou Mensal ---
        if (assinatura.plano === 'anual') {
          dataVencimento.setDate(dataPagamento.getDate() + 365); // 1 Ano
          setTipoPlano('anual');
        } else {
          // Padrão (mensal) ou qualquer outro plano antigo
          dataVencimento.setDate(dataPagamento.getDate() + 30);  // 30 Dias
          setTipoPlano('mensal');
        }
        
        // Verifica se ainda está dentro do prazo
        if (hoje < dataVencimento) {
          setIsPremium(true);
        } else {
          setTipoPlano('expirado');
          setIsPremium(false);
        }
      } else {
        // ============================================================
        // 3. Lógica de Teste Grátis (7 dias após cadastro)
        // ============================================================
        const dataCadastro = new Date(user.created_at);
        dataVencimento = new Date(dataCadastro);
        dataVencimento.setDate(dataCadastro.getDate() + 7);

        if (hoje < dataVencimento) {
          setTipoPlano('teste_gratis');
          setIsPremium(true);
        } else {
          setTipoPlano('expirado');
          setIsPremium(false);
        }
      }

      // Calcula os dias restantes para exibição
      if (tipoPlano !== 'vitalicio') {
        const diferencaTempo = dataVencimento.getTime() - hoje.getTime();
        const dias = Math.ceil(diferencaTempo / (1000 * 3600 * 24));
        setDiasRestantes(dias > 0 ? dias : 0);
      }

    } catch (error) {
      console.log("Erro ao verificar assinatura:", error);
    } finally {
      setLoading(false);
    }
  }

  return { loading, isPremium, diasRestantes, tipoPlano, refresh: checkStatus };
}
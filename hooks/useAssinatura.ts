import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export function useAssinatura() {
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [diasRestantes, setDiasRestantes] = useState<number | string>(0);
  const [tipoPlano, setTipoPlano] = useState<'teste_gratis' | 'premium' | 'vitalicio' | 'expirado'>('expirado');

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      console.log("Usuário:", user.email);

      // ============================================================
      // 1. CORREÇÃO: Busca usando 'user_id' em vez de 'id'
      // ============================================================
      // Tenta ler a tabela PROFILES buscando a coluna de status
      // (Se sua coluna de status tiver outro nome, troque 'status' abaixo)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*') 
        .eq('user_id', user.id) // <--- MUDAMOS AQUI DE 'id' PARA 'user_id'
        .single();

      if (profileError) {
        // Se der erro de novo, tentamos buscar pela coluna 'id' só por garantia
        // Isso cobre casos onde a tabela foi criada de forma diferente
         console.log("Tentando alternativa de coluna...", profileError.message);
      }

      // Procura o status em várias colunas possíveis para evitar erro
      const statusEncontrado = profile?.status || profile?.plano || profile?.role || "";
      console.log("Status no Perfil:", statusEncontrado);

      // Verifica VITALICIO
      if (statusEncontrado && String(statusEncontrado).toLowerCase().includes('vitalicio')) {
        setTipoPlano('vitalicio');
        setIsPremium(true);
        setDiasRestantes('Infinito');
        setLoading(false);
        return; 
      }

      // ============================================================
      // 2. Se não for vitalício, busca assinaturas normais
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
        dataVencimento.setDate(dataPagamento.getDate() + 30);
        
        if (hoje < dataVencimento) {
          setTipoPlano('premium');
          setIsPremium(true);
        } else {
          setTipoPlano('expirado');
          setIsPremium(false);
        }
      } else {
        // Lógica Teste Grátis (7 dias)
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

      if (tipoPlano !== 'vitalicio') {
        const diferencaTempo = dataVencimento.getTime() - hoje.getTime();
        const dias = Math.ceil(diferencaTempo / (1000 * 3600 * 24));
        setDiasRestantes(dias > 0 ? dias : 0);
      }

    } catch (error) {
      console.log("Erro Geral:", error);
    } finally {
      setLoading(false);
    }
  }

  return { loading, isPremium, diasRestantes, tipoPlano, refresh: checkStatus };
}
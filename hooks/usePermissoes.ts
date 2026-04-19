import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export function usePermissoes() {
  const [permissoes, setPermissoes] = useState<string[] | null>(null);
  const [isDono, setIsDono] = useState(false);
  const [loadingPermissoes, setLoadingPermissoes] = useState(true);

  useEffect(() => {
    carregarAcessos();
  }, []);

  async function carregarAcessos() {
    try {
      setLoadingPermissoes(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('team_id, permissoes')
        .eq('user_id', user.id)
        .single();

      if (profile?.team_id) {
        // Verifica se é o dono da equipe
        const { data: team } = await supabase
          .from('teams')
          .select('owner_id')
          .eq('id', profile.team_id)
          .single();

        if (team?.owner_id === user.id) {
          setIsDono(true);
          setPermissoes(null); // Dono tem acesso a tudo
        } else {
          setIsDono(false);
          setPermissoes(profile.permissoes || []); // Funcionário tem acessos restritos
        }
      } else {
        // Se não tem equipe, ele é o próprio dono da sua conta individual
        setIsDono(true);
        setPermissoes(null);
      }
    } catch (error) {
      console.log('Erro ao carregar permissões', error);
    } finally {
      setLoadingPermissoes(false);
    }
  }

  // ✅ ADICIONADO 'compartilhar_carteira' AQUI NA LISTA
  const temPermissao = (acao: 'cadastrar_cliente' | 'gerar_contrato' | 'cobrar' | 'compartilhar_carteira') => {
    if (isDono) return true; // Dono sempre pode
    if (!permissoes) return false;
    return permissoes.includes(acao);
  };

  return { temPermissao, isDono, loadingPermissoes, carregarAcessos };
}
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export function usePermissoes() {
  const [permissoes, setPermissoes] = useState<string[]>([]);
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
          setPermissoes(['dono_absoluto']); // Dono tem acesso a tudo
        } else {
          setIsDono(false);
          // 🔥 GARANTIA DE SEGURANÇA: Transforma string em Array se o DB falhar
          let arrayPermissoes = profile.permissoes || [];
          if (typeof arrayPermissoes === 'string') {
              try { arrayPermissoes = JSON.parse(arrayPermissoes); } 
              catch(e) { arrayPermissoes = []; }
          }
          setPermissoes(arrayPermissoes);
        }
      } else {
        // Se não tem equipe, ele é o próprio dono da sua conta individual
        setIsDono(true);
        setPermissoes(['dono_absoluto']);
      }
    } catch (error) {
      console.log('Erro ao carregar permissões', error);
    } finally {
      setLoadingPermissoes(false);
    }
  }

  // Usado para esconder botões visuais (Rápido, mas usa a memória)
  // ✅ INJETADA A OPÇÃO 'acessar_caixa' ABAIXO
  const temPermissao = (acao: 'cadastrar_cliente' | 'gerar_contrato' | 'cobrar' | 'compartilhar_carteira' | 'acessar_caixa') => {
    if (isDono) return true; 
    return permissoes.includes(acao);
  };

  // 🔥 TRAVA DE SEGURANÇA EM TEMPO REAL (Ignora a memória e vai direto no Banco de Dados)
  // ✅ INJETADA A OPÇÃO 'acessar_caixa' ABAIXO
  const verificarPermissaoRealTime = async (acao: 'cadastrar_cliente' | 'gerar_contrato' | 'cobrar' | 'compartilhar_carteira' | 'acessar_caixa') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: profile } = await supabase
        .from('profiles')
        .select('team_id, permissoes')
        .eq('user_id', user.id)
        .single();

      if (profile?.team_id) {
        const { data: team } = await supabase
          .from('teams')
          .select('owner_id')
          .eq('id', profile.team_id)
          .single();

        if (team?.owner_id === user.id) return true; // É o Dono
        
        let arrayPermissoes = profile.permissoes || [];
        if (typeof arrayPermissoes === 'string') {
            try { arrayPermissoes = JSON.parse(arrayPermissoes); } 
            catch(e) { arrayPermissoes = []; }
        }
        return arrayPermissoes.includes(acao);
      }
      
      return true; // Conta individual (Dono de si mesmo)
    } catch (error) {
      console.log("Erro na verificação real-time", error);
      return false; // Bloqueia por segurança em caso de falha de internet
    }
  };

  return { temPermissao, isDono, loadingPermissoes, carregarAcessos, verificarPermissaoRealTime };
}
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
          
          // 🔥 GARANTIA DE SEGURANÇA: Tradutor Universal de string para Array
          let arrayLimpo: string[] = [];
          const perm = profile.permissoes;

          if (Array.isArray(perm)) {
              arrayLimpo = perm;
          } else if (typeof perm === 'string') {
              try { 
                  arrayLimpo = JSON.parse(perm); 
              } catch(e) { 
                  // Tradutor Universal
                  if (perm.includes('cadastrar_cliente')) arrayLimpo.push('cadastrar_cliente');
                  if (perm.includes('gerar_contrato')) arrayLimpo.push('gerar_contrato');
                  if (perm.includes('cobrar')) arrayLimpo.push('cobrar');
                  if (perm.includes('compartilhar_carteira')) arrayLimpo.push('compartilhar_carteira');
                  if (perm.includes('acessar_caixa')) arrayLimpo.push('acessar_caixa');
                  if (perm.includes('ver_dashboard')) arrayLimpo.push('ver_dashboard'); // 🚀 NOVO
              }
          }
          setPermissoes(arrayLimpo);
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

  // ✅ Lista completa para o TypeScript aceitar (INJETADO O ver_dashboard)
  type AcoesDisponiveis = 'cadastrar_cliente' | 'gerar_contrato' | 'cobrar' | 'compartilhar_carteira' | 'acessar_caixa' | 'ver_dashboard';

  // Usado para esconder botões visuais (Rápido, mas usa a memória)
  const temPermissao = (acao: AcoesDisponiveis) => {
    if (isDono) return true; 
    return permissoes.includes(acao);
  };

  // 🔥 TRAVA DE SEGURANÇA EM TEMPO REAL (Ignora a memória e vai direto no Banco de Dados)
  const verificarPermissaoRealTime = async (acao: AcoesDisponiveis) => {
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
        
        let arrayLimpo: string[] = [];
        const perm = profile.permissoes;

        if (Array.isArray(perm)) {
            arrayLimpo = perm;
        } else if (typeof perm === 'string') {
            try { 
                arrayLimpo = JSON.parse(perm); 
            } catch(e) { 
                if (perm.includes(acao)) arrayLimpo.push(acao);
            }
        }
        return arrayLimpo.includes(acao);
      }
      
      return true; // Conta individual (Dono de si mesmo)
    } catch (error) {
      console.log("Erro na verificação real-time", error);
      return false; // Bloqueia por segurança em caso de falha de internet
    }
  };

  return { temPermissao, isDono, loadingPermissoes, carregarAcessos, verificarPermissaoRealTime };
}
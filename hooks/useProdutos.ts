import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../services/supabase';
import { Produto } from '../types';

export function useProdutos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);

  // Buscar produtos ao carregar
  useEffect(() => {
    listarProdutos();
  }, []);

  const listarProdutos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      setProdutos(data || []);
    } catch (error) {
      console.log(error);
      Alert.alert('Erro', 'Falha ao carregar estoque.');
    } finally {
      setLoading(false);
    }
  };

  const salvarProduto = async (prod: Partial<Produto>) => {
    if (!prod.nome || !prod.preco) return Alert.alert('Atenção', 'Nome e Preço são obrigatórios.');

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (prod.id) {
        // ATUALIZAR
        const { error } = await supabase
          .from('produtos')
          .update({ nome: prod.nome, preco: prod.preco, estoque: prod.estoque })
          .eq('id', prod.id);
        if (error) throw error;
      } else {
        // CRIAR NOVO
        const { error } = await supabase
          .from('produtos')
          .insert({ 
            user_id: user.id,
            nome: prod.nome, 
            preco: prod.preco, 
            estoque: prod.estoque || 0 
          });
        if (error) throw error;
      }
      
      await listarProdutos(); // Recarrega a lista
      return true; // Sucesso
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar o produto.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const excluirProduto = async (id: number) => {
    try {
      setLoading(true);
      const { error } = await supabase.from('produtos').delete().eq('id', id);
      if (error) throw error;
      setProdutos(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível excluir.');
    } finally {
      setLoading(false);
    }
  };

  return { produtos, loading, listarProdutos, salvarProduto, excluirProduto };
}
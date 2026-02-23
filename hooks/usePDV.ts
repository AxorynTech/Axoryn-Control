import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../services/supabase';
import { ItemPedido, Pedido, Produto } from '../types';

export function usePDV() {
  const [carrinho, setCarrinho] = useState<ItemPedido[]>([]);
  const [comandasAbertas, setComandasAbertas] = useState<Pedido[]>([]);
  const [historicoVendas, setHistoricoVendas] = useState<Pedido[]>([]);
  const [receitaTotal, setReceitaTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Carregar dados iniciais
  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: abertos, error: errAbertos } = await supabase
        .from('pedidos')
        .select('*, itens:itens_pedido(*, produto:produtos(*))') 
        .eq('user_id', user.id)
        .in('status', ['ABERTO', 'ATENDIDO'])
        .order('criado_em', { ascending: false });

      if (errAbertos) console.log("Erro comandas:", errAbertos);
      setComandasAbertas(abertos || []);

      // ✅ Atualizado: Agora busca também o CAIXA_INICIAL para somar ao saldo
      const { data: historico, error: errPagos } = await supabase
        .from('pedidos')
        .select('*, itens:itens_pedido(*, produto:produtos(nome))')
        .eq('user_id', user.id)
        .in('status', ['PAGO', 'SANGRIA', 'CAIXA_INICIAL']) 
        .order('criado_em', { ascending: false })
        .limit(50);

      if (errPagos) console.log("Erro histórico:", errPagos);

      if (historico) {
        setHistoricoVendas(historico);
        const total = historico.reduce((acc, item) => acc + (item.total || 0), 0);
        setReceitaTotal(total);
      }
    } catch (error) {
      console.log("Erro ao carregar PDV", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const adicionarAoCarrinho = (produto: Produto) => {
    setCarrinho(prev => {
      const existente = prev.find(i => i.produto_id === produto.id);
      
      const qtdAtual = existente ? existente.quantidade : 0;

      if (existente) {
        return prev.map(i => i.produto_id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i);
      }
      return [...prev, {
        id: Date.now(),
        pedido_id: 0,
        produto_id: produto.id,
        quantidade: 1,
        preco_unitario: produto.preco,
        produto: produto
      }];
    });
  };

  const removerDoCarrinho = (produtoId: number) => {
    setCarrinho(prev => prev.filter(i => i.produto_id !== produtoId));
  };

  const criarPedido = async (nomeCliente: string, statusInicial: 'ABERTO' | 'PAGO', formaPagamento?: string) => {
    if (carrinho.length === 0) return Alert.alert('Vazio', 'Adicione itens ao carrinho.');
    
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const total = carrinho.reduce((acc, item) => acc + (item.quantidade * item.preco_unitario), 0);

      const { data: pedido, error } = await supabase
        .from('pedidos')
        .insert({
          user_id: user.id,
          nome_cliente: nomeCliente || 'Cliente Balcão',
          status: statusInicial,
          total: total,
          forma_pagamento: formaPagamento || null
        })
        .select()
        .single();

      if (error) throw error;

      const itensParaSalvar = carrinho.map(item => ({
        pedido_id: pedido.id,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario
      }));

      const { error: erroItens } = await supabase.from('itens_pedido').insert(itensParaSalvar);
      if (erroItens) throw erroItens;

      for (const item of carrinho) {
        const novoEstoque = (item.produto?.estoque || 0) - item.quantidade;
        await supabase.from('produtos').update({ estoque: novoEstoque }).eq('id', item.produto_id);
      }

      Alert.alert('Sucesso', statusInicial === 'PAGO' ? 'Venda realizada!' : 'Comanda aberta!');
      setCarrinho([]);
      carregarDados();
      return true;
    } catch (error) {
      console.log(error);
      Alert.alert('Erro', 'Falha ao processar pedido.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const adicionarItensComanda = async (pedidoId: number) => {
    if (carrinho.length === 0) return false;
    try {
      setLoading(true);
      
      const itensParaSalvar = carrinho.map(item => ({
        pedido_id: pedidoId,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario
      }));

      const { error: erroItens } = await supabase.from('itens_pedido').insert(itensParaSalvar);
      if (erroItens) throw erroItens;

      let valorAdicional = 0;
      for (const item of carrinho) {
        const novoEstoque = (item.produto?.estoque || 0) - item.quantidade;
        await supabase.from('produtos').update({ estoque: novoEstoque }).eq('id', item.produto_id);
        valorAdicional += (item.quantidade * item.preco_unitario);
      }

      const { data: pedidoAtual } = await supabase.from('pedidos').select('total').eq('id', pedidoId).single();
      if (pedidoAtual) {
        await supabase.from('pedidos').update({ total: pedidoAtual.total + valorAdicional }).eq('id', pedidoId);
      }

      Alert.alert('Sucesso', 'Novos itens salvos na comanda!');
      setCarrinho([]);
      carregarDados();
      return true;
    } catch (error) {
      console.log(error);
      Alert.alert('Erro', 'Falha ao adicionar itens à comanda.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const removerItemComanda = async (pedido: Pedido, itemParaRemover: any) => {
    try {
      setLoading(true);
      const { data: prodAtual } = await supabase.from('produtos').select('estoque').eq('id', itemParaRemover.produto_id).single();
      if (prodAtual) {
          await supabase.from('produtos').update({ estoque: prodAtual.estoque + itemParaRemover.quantidade }).eq('id', itemParaRemover.produto_id);
      }

      const { error: errDel } = await supabase.from('itens_pedido').delete().eq('id', itemParaRemover.id);
      if (errDel) throw errDel;

      const novoTotal = pedido.total - (itemParaRemover.preco_unitario * itemParaRemover.quantidade);
      const { error: errUpd } = await supabase.from('pedidos').update({ total: novoTotal }).eq('id', pedido.id);
      if (errUpd) throw errUpd;

      Alert.alert('Sucesso', 'Item removido da comanda.');
      carregarDados();
      return true;
    } catch (error) {
      console.log(error);
      Alert.alert('Erro', 'Não foi possível remover o item.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const atualizarStatusComanda = async (pedidoId: number, novoStatus: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.from('pedidos').update({ status: novoStatus }).eq('id', pedidoId);
      if (error) throw error;
      carregarDados();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao atualizar status.');
    } finally {
      setLoading(false);
    }
  };

  const receberComanda = async (pedidoId: number, formaPagamento: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.from('pedidos').update({ status: 'PAGO', forma_pagamento: formaPagamento }).eq('id', pedidoId);
      if (error) throw error;
      Alert.alert('Sucesso', 'Pagamento registrado!');
      carregarDados();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao receber pagamento.');
    } finally {
      setLoading(false);
    }
  };

  const realizarSangria = async (valor: number, motivo: string) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase.from('pedidos').insert({
        user_id: user.id,
        nome_cliente: motivo || 'SANGRIA / RETIRADA', 
        status: 'SANGRIA',
        total: -Math.abs(valor),
        forma_pagamento: 'DINHEIRO'
      });

      if (error) throw error;
      carregarDados(); 
      return true;
    } catch (error) {
      console.log(error);
      Alert.alert('Erro', 'Falha ao registrar sangria.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const editarSangria = async (id: number, novoValor: number, novoMotivo: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.from('pedidos').update({
        nome_cliente: novoMotivo || 'SANGRIA / RETIRADA',
        total: -Math.abs(novoValor), 
      }).eq('id', id);

      if (error) throw error;
      carregarDados();
      return true;
    } catch (error) {
      console.log(error);
      Alert.alert('Erro', 'Falha ao editar sangria.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ✅ NOVA FUNÇÃO: Caixa Inicial (Fundo de Troco)
  const registrarCaixaInicial = async (valor: number) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase.from('pedidos').insert({
        user_id: user.id,
        nome_cliente: 'CAIXA INICIAL / TROCO', 
        status: 'CAIXA_INICIAL',
        total: Math.abs(valor), // Adiciona positivo ao caixa
        forma_pagamento: 'DINHEIRO'
      });

      if (error) throw error;
      carregarDados(); 
      return true;
    } catch (error) {
      console.log(error);
      Alert.alert('Erro', 'Falha ao registrar caixa inicial.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const cancelarPedido = async (pedido: Pedido) => {
    try {
      setLoading(true);
      
      // ✅ Atualizado: Ignora estorno de stock se for Sangria ou Caixa Inicial
      if (pedido.status !== 'SANGRIA' && pedido.status !== 'CAIXA_INICIAL') {
          if (pedido.itens && pedido.itens.length > 0) {
            for (const item of pedido.itens) {
               const { data: prodAtual } = await supabase.from('produtos').select('estoque').eq('id', item.produto_id).single();
               if (prodAtual) {
                  const estoqueDevolvido = prodAtual.estoque + item.quantidade;
                  await supabase.from('produtos').update({ estoque: estoqueDevolvido }).eq('id', item.produto_id);
               }
            }
          } else {
            const { data: itensDoBanco } = await supabase.from('itens_pedido').select('*').eq('pedido_id', pedido.id);
            if (itensDoBanco) {
                for (const item of itensDoBanco) {
                    const { data: prodAtual } = await supabase.from('produtos').select('estoque').eq('id', item.produto_id).single();
                    if (prodAtual) {
                       const estoqueDevolvido = prodAtual.estoque + item.quantidade;
                       await supabase.from('produtos').update({ estoque: estoqueDevolvido }).eq('id', item.produto_id);
                    }
                }
            }
          }
      }

      const { error } = await supabase.from('pedidos').delete().eq('id', pedido.id);
      if (error) throw error;

      Alert.alert('Cancelado', 'Registro excluído com sucesso.');
      carregarDados();
      return true;
    } catch (error) {
      console.log(error);
      Alert.alert('Erro', 'Não foi possível cancelar.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const totalCarrinho = carrinho.reduce((acc, item) => acc + (item.quantidade * item.preco_unitario), 0);

  return { 
    carrinho, 
    comandasAbertas,
    historicoVendas,
    receitaTotal,
    loading, 
    totalCarrinho,
    carregarDados,
    adicionarAoCarrinho, 
    removerDoCarrinho, 
    criarPedido,
    adicionarItensComanda, 
    removerItemComanda, 
    atualizarStatusComanda,
    receberComanda,
    cancelarPedido,
    realizarSangria,
    editarSangria,
    registrarCaixaInicial // <--- EXPORTADO AQUI
  };
}
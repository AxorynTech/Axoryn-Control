import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useRouter } from 'expo-router';
import i18n from 'i18next';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

// IMPORTS PROPRIOS
import { usePDV } from '../../hooks/usePDV';
import { useProdutos } from '../../hooks/useProdutos';
import { ItemPedido, Pedido, Produto } from '../../types';
import { gerarRelatorioPDF } from '../../utils/gerarRelatorio';

// ✅ IMPORT DO HOOK DE SEGURANÇA
import { useAssinatura } from '../../hooks/useAssinatura';

export default function TelaProdutos() {
  const { t } = useTranslation();
  const router = useRouter(); // <-- Adicionado para o router não dar erro se for usado depois
  
  // ============================================================
  // 1. TODOS OS HOOKS AGRUPADOS AQUI (NUNCA MOVER DAQUI)
  // ============================================================
  const { isPremium, loading: loadingAssinatura, refresh } = useAssinatura();
  
  const { produtos, loading: loadingEstoque, salvarProduto, excluirProduto, listarProdutos } = useProdutos();
  const { 
    carrinho, totalCarrinho, receitaTotal, comandasAbertas, historicoVendas,
    carregarDados, adicionarAoCarrinho, removerDoCarrinho, criarPedido,
    atualizarStatusComanda, receberComanda, cancelarPedido, realizarSangria,
    loading: loadingPDV 
  } = usePDV();

  const [modo, setModo] = useState<'estoque' | 'pdv'>('estoque');
  const [abaPDV, setAbaPDV] = useState<'nova' | 'comandas'>('nova');
  const [filtro, setFiltro] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [modalPagamento, setModalPagamento] = useState(false); 
  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null);
  const [modalSangria, setModalSangria] = useState(false);
  const [valorSangria, setValorSangria] = useState('');
  const [motivoSangria, setMotivoSangria] = useState('');
  const [modalProduto, setModalProduto] = useState(false);
  const [produtoEmEdicao, setProdutoEmEdicao] = useState<Partial<Produto>>({});
  const [precoInput, setPrecoInput] = useState('');
  const [modalRelatorio, setModalRelatorio] = useState(false);
  const [modalDetalheVenda, setModalDetalheVenda] = useState(false);
  const [dataInicio, setDataInicio] = useState(new Date());
  const [dataFim, setDataFim] = useState(new Date());
  const [showPicker, setShowPicker] = useState<'inicio' | 'fim' | null>(null);

  // Efeito executado sempre que a tela é aberta
  useFocusEffect(
    useCallback(() => {
      // 1. Pede para o RevenueCat checar se está pago
      refresh();
      
      // 2. Se estiver pago, carrega o banco de dados
      if (isPremium) {
        if (modo === 'pdv') carregarDados();
        listarProdutos();
      }
    }, [isPremium, modo])
  );

  // ============================================================
  // 2. FUNÇÕES AUXILIARES (LÓGICA)
  // ============================================================

  const formatarResumoItens = (itens?: ItemPedido[]) => {
      if (!itens || itens.length === 0) return '';
      return itens.map(i => `${i.quantidade}x ${i.produto?.nome}`).join(', ');
  };

  const handleSangria = async () => {
    const valor = parseFloat(valorSangria.replace(',', '.'));
    if (!valor || valor <= 0) return Alert.alert(t('estoque.atencao'), 'Valor inválido');
    
    const sucesso = await realizarSangria(valor, motivoSangria);
    if (sucesso) {
        Alert.alert(t('estoque.sucesso'), t('estoque.msgSangriaSucesso'));
        setModalSangria(false);
        setValorSangria('');
        setMotivoSangria('');
    }
  };

  const handleGerarPDF = async () => {
    const inicio = new Date(dataInicio); inicio.setHours(0,0,0,0);
    const fim = new Date(dataFim); fim.setHours(23,59,59,999);

    const vendasFiltradas = historicoVendas.filter(v => {
        const dataVenda = new Date(v.criado_em);
        return dataVenda >= inicio && dataVenda <= fim;
    });

    if (vendasFiltradas.length === 0) {
        return Alert.alert(t('estoque.atencao'), t('estoque.nenhumaVendaPeriodo'));
    }

    const totalFiltrado = vendasFiltradas.reduce((acc, v) => acc + v.total, 0);
    await gerarRelatorioPDF(vendasFiltradas, inicio, fim, totalFiltrado, t, i18n.language);
  };

  const onChangeDate = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || (showPicker === 'inicio' ? dataInicio : dataFim);
    if (Platform.OS === 'android') setShowPicker(null);
    if (showPicker === 'inicio') setDataInicio(currentDate);
    else setDataFim(currentDate);
  };

  const abrirModalProduto = (prod?: Produto) => {
    if (prod) {
        setProdutoEmEdicao(prod);
        setPrecoInput(prod.preco.toFixed(2).replace('.', ','));
    } else {
        setProdutoEmEdicao({ nome: '', estoque: 0 });
        setPrecoInput('');
    }
    setModalProduto(true);
  };

  const salvarProdutoComTexto = async () => {
    const precoNumerico = parseFloat(precoInput.replace(',', '.'));
    if (isNaN(precoNumerico)) return Alert.alert(t('estoque.atencao'), 'Preço inválido');
    await salvarProduto({ ...produtoEmEdicao, preco: precoNumerico });
    setModalProduto(false);
    listarProdutos();
  };

  // ✅ NOVA FUNÇÃO: Excluir Produto do Estoque
  const handleExcluirProduto = (produto: Produto) => {
    Alert.alert(
      t('estoque.confirmarExclusaoTitulo', { defaultValue: 'Excluir Produto' }),
      t('estoque.confirmarExclusaoMsg', { nome: produto.nome, defaultValue: `Tem certeza que deseja excluir "${produto.nome}"?` }),
      [
        { text: t('estoque.cancelar', { defaultValue: 'Cancelar' }), style: 'cancel' },
        { 
          text: t('estoque.simExcluir', { defaultValue: 'Sim, excluir' }), 
          style: 'destructive', 
          onPress: async () => {
            await excluirProduto(produto.id);
            listarProdutos(); // Atualiza a lista após excluir
          } 
        }
      ]
    );
  };

  const handleBotaoCarrinho = () => {
    if (carrinho.length === 0) return;
    setPedidoSelecionado(null); 
    setModalPagamento(true);
  };

  const processarAcao = async (tipo: 'DINHEIRO' | 'PIX' | 'CREDITO' | 'DEBITO' | 'COMANDA') => {
    let sucesso = false;
    if (pedidoSelecionado) {
        await receberComanda(pedidoSelecionado.id, tipo);
        sucesso = true;
    } else {
        if (tipo === 'COMANDA') {
            if (!nomeCliente) return Alert.alert(t('estoque.atencao'), t('estoque.digiteNome'));
            sucesso = await criarPedido(nomeCliente, 'ABERTO') || false;
        } else {
            sucesso = await criarPedido(nomeCliente, 'PAGO', tipo) || false;
        }
    }
    if (sucesso) {
        setModalPagamento(false);
        setNomeCliente('');
        setPedidoSelecionado(null);
        if (tipo === 'COMANDA') setAbaPDV('comandas');
    }
  };

  const handleCancelarPedido = (pedido: Pedido) => {
    Alert.alert(
        t('estoque.cancelarPedido'),
        t('estoque.msgCancelar'),
        [
            { text: t('estoque.nao'), style: 'cancel' },
            { text: t('estoque.simExcluir'), style: 'destructive', onPress: async () => { await cancelarPedido(pedido); setModalPagamento(false); setModalDetalheVenda(false); } }
        ]
    );
  };

  const handleClickComanda = (pedido: Pedido) => {
      setPedidoSelecionado(pedido);
      setModalPagamento(true);
  };

  const handleClickHistorico = (pedido: Pedido) => {
      if (pedido.status === 'SANGRIA') return; 
      setPedidoSelecionado(pedido);
      setModalDetalheVenda(true);
  };

  // --- RENDERIZADORES DE ITENS ---
  const renderItemEstoque = ({ item }: { item: Produto }) => (
    <View style={styles.card}>
        <View style={{flex: 1}}>
            <Text style={styles.nome}>{item.nome}</Text>
            <Text style={styles.preco}>{t('relatorioPdf.moeda')} {item.preco.toFixed(2).replace('.', ',')}</Text>
            <Text style={[styles.estoque, item.estoque <= 5 && {color:'#E74C3C'}]}>{t('estoque.estoqueLabel')}: {item.estoque}</Text>
        </View>
        {/* ✅ BOTÕES DE AÇÃO: LÁPIS E LIXEIRA */}
        <View style={{flexDirection: 'row', gap: 15, alignItems: 'center'}}>
            <TouchableOpacity onPress={() => abrirModalProduto(item)}>
                 <Ionicons name="pencil" size={24} color="#2980B9" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleExcluirProduto(item)}>
                 <Ionicons name="trash-outline" size={24} color="#E74C3C" />
            </TouchableOpacity>
        </View>
    </View>
  );

  const renderItemPDV = ({ item }: { item: Produto }) => (
    <TouchableOpacity style={[styles.cardPDV, item.estoque <= 0 && {opacity: 0.5}]} onPress={() => item.estoque > 0 ? adicionarAoCarrinho(item) : null}>
        <Text numberOfLines={2} style={styles.nomePDV}>{item.nome}</Text>
        <Text style={styles.precoPDV}>{t('relatorioPdf.moeda')} {item.preco.toFixed(2).replace('.', ',')}</Text>
    </TouchableOpacity>
  );

  const renderComanda = ({ item }: { item: Pedido }) => (
    <TouchableOpacity style={styles.cardComanda} onPress={() => handleClickComanda(item)}>
        <View style={{flexDirection:'row', justifyContent:'space-between'}}>
            <Text style={styles.clienteComanda}>{item.nome_cliente}</Text>
            <Text style={{fontWeight:'bold', color: '#27AE60'}}>{t('relatorioPdf.moeda')} {item.total?.toFixed(2).replace('.', ',')}</Text>
        </View>
        <Text style={styles.resumoItens} numberOfLines={2}>{formatarResumoItens(item.itens)}</Text>
        <View style={{flexDirection:'row', justifyContent:'space-between', marginTop: 5}}>
            <Text style={{fontSize:10, color:'#999'}}>{new Date(item.criado_em).toLocaleTimeString().slice(0,5)}</Text>
            <View style={[styles.badgeStatus, item.status === 'ATENDIDO' ? {backgroundColor:'#27AE60'} : {backgroundColor:'#F39C12'}]}><Text style={{color:'#FFF', fontSize:10, fontWeight:'bold'}}>{item.status}</Text></View>
        </View>
    </TouchableOpacity>
  );

  const produtosFiltrados = produtos.filter(p => p.nome.toLowerCase().includes(filtro.toLowerCase()));

  // ============================================================
  // 3. BLOQUEIO DA TELA (Renderiza apenas o Loading se não liberar)
  // O redirecionamento real agora é feito pelo _layout.tsx
  // ============================================================
  if (loadingAssinatura || !isPremium) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2c3e50" />
      </View>
    );
  }

  // ============================================================
  // 4. INTERFACE PRINCIPAL (SÓ APARECE SE FOR PRO E CARREGADO)
  // ============================================================
  return (
    <View style={styles.container}>
      
      {/* HEADER DE MODO */}
      <View style={styles.headerModo}>
          <TouchableOpacity style={[styles.tabModo, modo === 'estoque' && styles.tabAtiva]} onPress={() => setModo('estoque')}><Text style={[styles.txtModo, modo === 'estoque' && {color:'#2C3E50'}]}>{t('estoque.abaEstoque')}</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.tabModo, modo === 'pdv' && styles.tabAtiva]} onPress={() => setModo('pdv')}><Text style={[styles.txtModo, modo === 'pdv' && {color:'#2C3E50'}]}>{t('estoque.abaPdv')}</Text></TouchableOpacity>
      </View>

      {/* --- MODO PDV --- */}
      {modo === 'pdv' && (
        <View style={{flex: 1}}>
            <View style={styles.painelReceita}>
                <TouchableOpacity style={{flex:1}} onPress={() => setModalRelatorio(true)}>
                    <Text style={{fontSize:12, color:'#FFF', opacity:0.8}}>{t('estoque.totalVendasHoje')}</Text>
                    <Text style={{fontSize:24, color:'#FFF', fontWeight:'bold'}}>{t('relatorioPdf.moeda')} {receitaTotal.toFixed(2).replace('.', ',')}</Text>
                </TouchableOpacity>
                <View style={{flexDirection:'row', gap: 15}}>
                    <TouchableOpacity onPress={() => setModalSangria(true)} style={{alignItems:'center'}}><View style={{backgroundColor:'#E74C3C', padding:8, borderRadius:20}}><Ionicons name="arrow-down" size={20} color="#FFF" /></View><Text style={{color:'#FFF', fontSize:8, marginTop:2}}>{t('estoque.sangria')}</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setModalRelatorio(true)} style={{alignItems:'center'}}><View style={{backgroundColor:'rgba(255,255,255,0.2)', padding:8, borderRadius:20}}><Ionicons name="document-text" size={20} color="#FFF" /></View><Text style={{color:'#FFF', fontSize:8, marginTop:2}}>{t('estoque.relatorios')}</Text></TouchableOpacity>
                </View>
            </View>

            <View style={styles.subAbas}>
                <TouchableOpacity onPress={() => setAbaPDV('nova')} style={[styles.btnSubAba, abaPDV === 'nova' && styles.btnSubAbaAtiva]}><Text style={{fontWeight:'bold', color: abaPDV === 'nova' ? '#FFF' : '#555'}}>{t('estoque.novaVenda')}</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setAbaPDV('comandas')} style={[styles.btnSubAba, abaPDV === 'comandas' && styles.btnSubAbaAtiva]}><Text style={{fontWeight:'bold', color: abaPDV === 'comandas' ? '#FFF' : '#555'}}>{t('estoque.comandas')} ({comandasAbertas.length})</Text></TouchableOpacity>
            </View>

            {abaPDV === 'nova' && (
                <>
                    <View style={styles.inputClienteArea}><Ionicons name="person" size={20} color="#777" /><TextInput placeholder={t('estoque.placeholderCliente')} style={{flex:1, marginLeft: 10}} value={nomeCliente} onChangeText={setNomeCliente} /></View>
                    <View style={{flex: 1, backgroundColor: '#EAECEE', marginHorizontal: 10, borderRadius: 8}}>
                        <FlatList data={produtosFiltrados} keyExtractor={item => item.id.toString()} renderItem={renderItemPDV} numColumns={3} contentContainerStyle={{padding: 5}} />
                    </View>
                    <View style={styles.carrinhoArea}>
                        <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:10}}><Text style={styles.tituloCarrinho}>{t('estoque.itens')} ({carrinho.length})</Text><Text style={{fontWeight:'bold', fontSize:16}}>{t('relatorioPdf.total')}: {t('relatorioPdf.moeda')} {totalCarrinho.toFixed(2).replace('.', ',')}</Text></View>
                        <FlatList data={carrinho} keyExtractor={(item, index) => index.toString()} style={{maxHeight: 80, marginBottom: 10}} renderItem={({item}) => (<View style={styles.itemCarrinho}><Text style={{flex:1, fontSize:12}}>{item.produto?.nome} (x{item.quantidade})</Text><TouchableOpacity onPress={() => removerDoCarrinho(item.produto_id)}><Ionicons name="close-circle" size={18} color="#E74C3C" /></TouchableOpacity></View>)} />
                        <TouchableOpacity style={[styles.btnFinalizar, totalCarrinho === 0 && {backgroundColor:'#CCC'}]} onPress={handleBotaoCarrinho} disabled={totalCarrinho === 0 || loadingPDV}><Text style={{color:'#FFF', fontWeight:'bold', textAlign:'center'}}>{t('estoque.concluirPedido')}</Text></TouchableOpacity>
                    </View>
                </>
            )}

            {abaPDV === 'comandas' && (<FlatList data={comandasAbertas} keyExtractor={item => item.id.toString()} renderItem={renderComanda} contentContainerStyle={{padding: 15}} ListEmptyComponent={<Text style={{textAlign:'center', marginTop:50, color:'#999'}}>{t('estoque.nenhumaComanda')}</Text>} />)}
        </View>
      )}

      {/* --- MODO ESTOQUE --- */}
      {modo === 'estoque' && (
        <>
            <View style={styles.barraBusca}><Ionicons name="search" size={20} color="#999" /><TextInput placeholder={t('estoque.buscarProduto')} style={{flex:1, marginLeft:10}} value={filtro} onChangeText={setFiltro} /></View>
            <FlatList data={produtosFiltrados} keyExtractor={item => item.id.toString()} renderItem={renderItemEstoque} contentContainerStyle={{padding: 15, paddingBottom: 80}} />
            <TouchableOpacity onPress={() => abrirModalProduto()} style={styles.fab}><Ionicons name="add" size={30} color="#FFF" /></TouchableOpacity>
        </>
      )}

      {/* --- MODAIS --- */}
      <Modal visible={modalSangria} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={[styles.modalTitulo, {color:'#E74C3C'}]}>{t('estoque.sangria')}</Text>
                <Text style={styles.label}>{t('estoque.valorSangria')}</Text>
                <TextInput placeholder="0,00" keyboardType="numeric" style={styles.input} value={valorSangria} onChangeText={setValorSangria} />
                <Text style={styles.label}>{t('estoque.motivoSangria')}</Text>
                <TextInput placeholder="..." style={styles.input} value={motivoSangria} onChangeText={setMotivoSangria} />
                <TouchableOpacity onPress={handleSangria} style={[styles.btnGerarPDF, {backgroundColor:'#E74C3C', marginTop:10}]}><Text style={{color:'#FFF', fontWeight:'bold'}}>{t('estoque.confirmarSangria')}</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setModalSangria(false)} style={{padding:15, alignItems:'center'}}><Text style={{color:'#777'}}>{t('estoque.cancelar')}</Text></TouchableOpacity>
            </View>
        </View>
      </Modal>

      <Modal visible={modalPagamento} transparent animationType="slide">
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
                      <Text style={styles.modalTitulo}>{pedidoSelecionado ? pedidoSelecionado.nome_cliente : t('estoque.finalizarVenda')}</Text>
                      {pedidoSelecionado && (<TouchableOpacity onPress={() => handleCancelarPedido(pedidoSelecionado)}><Ionicons name="trash-outline" size={24} color="#E74C3C" /></TouchableOpacity>)}
                  </View>
                  <View style={styles.listaItensModal}>
                      <Text style={{fontSize:12, fontWeight:'bold', marginBottom:5}}>{t('estoque.itens')}:</Text>
                      <ScrollView style={{maxHeight: 120}}>
                        {pedidoSelecionado ? (pedidoSelecionado.itens?.map(item => (<View key={item.id} style={{flexDirection:'row', justifyContent:'space-between', marginBottom: 4}}><Text style={{fontSize:13}}>• {item.produto?.nome} (x{item.quantidade})</Text><Text style={{fontSize:13}}>{t('relatorioPdf.moeda')} {(item.preco_unitario * item.quantidade).toFixed(2).replace('.', ',')}</Text></View>))) 
                        : (carrinho.map((item, idx) => (<View key={idx} style={{flexDirection:'row', justifyContent:'space-between', marginBottom: 4}}><Text style={{fontSize:13}}>• {item.produto?.nome} (x{item.quantidade})</Text><Text style={{fontSize:13}}>{t('relatorioPdf.moeda')} {(item.preco_unitario * item.quantidade).toFixed(2).replace('.', ',')}</Text></View>)))}
                      </ScrollView>
                  </View>
                  <Text style={{textAlign:'center', marginBottom: 15, fontSize: 22, fontWeight:'bold', color: '#27AE60'}}>{t('relatorioPdf.total')}: {t('relatorioPdf.moeda')} {pedidoSelecionado ? pedidoSelecionado.total.toFixed(2).replace('.', ',') : totalCarrinho.toFixed(2).replace('.', ',')}</Text>
                  {pedidoSelecionado && pedidoSelecionado.status === 'ABERTO' && (<TouchableOpacity style={[styles.btnPagamento, {backgroundColor:'#F39C12', marginBottom:15}]} onPress={() => { atualizarStatusComanda(pedidoSelecionado.id, 'ATENDIDO'); setModalPagamento(false); }}><Text style={styles.txtBtnPagamento}>{t('estoque.marcarAtendido')}</Text></TouchableOpacity>)}
                  {!pedidoSelecionado && (<TouchableOpacity style={[styles.btnPagamento, {backgroundColor: '#3498DB', marginBottom: 15}]} onPress={() => processarAcao('COMANDA')}><Ionicons name="clipboard-outline" size={24} color="#FFF" style={{marginRight:10}} /><Text style={styles.txtBtnPagamento}>{t('estoque.abrirComanda')}</Text></TouchableOpacity>)}
                  <Text style={{marginBottom: 10, textAlign:'center', color:'#777'}}>{t('estoque.baixarPagamento')}</Text>
                  <View style={{flexDirection:'row', gap: 10, marginBottom: 10}}>
                    <TouchableOpacity style={[styles.btnPagamento, {flex:1, backgroundColor: '#27AE60'}]} onPress={() => processarAcao('DINHEIRO')}><Ionicons name="cash" size={18} color="#FFF" style={{marginRight:5}} /><Text style={styles.txtBtnPagamento}>{t('estoque.dinheiro')}</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.btnPagamento, {flex:1, backgroundColor: '#8E44AD'}]} onPress={() => processarAcao('PIX')}><Ionicons name="qr-code" size={18} color="#FFF" style={{marginRight:5}} /><Text style={styles.txtBtnPagamento}>{t('estoque.pix')}</Text></TouchableOpacity>
                  </View>
                  <View style={{flexDirection:'row', gap: 10}}>
                    <TouchableOpacity style={[styles.btnPagamento, {flex:1, backgroundColor: '#2980B9'}]} onPress={() => processarAcao('CREDITO')}><Ionicons name="card" size={18} color="#FFF" style={{marginRight:5}} /><Text style={styles.txtBtnPagamento}>{t('estoque.credito')}</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.btnPagamento, {flex:1, backgroundColor: '#34495E'}]} onPress={() => processarAcao('DEBITO')}><Ionicons name="card-outline" size={18} color="#FFF" style={{marginRight:5}} /><Text style={styles.txtBtnPagamento}>{t('estoque.debito')}</Text></TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => setModalPagamento(false)} style={{padding:15, alignItems:'center', marginTop:10}}><Text style={{color:'#777'}}>{t('estoque.cancelar')}</Text></TouchableOpacity>
              </View>
          </View>
      </Modal>

      <Modal visible={modalDetalheVenda} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                    <Text style={styles.modalTitulo}>{t('estoque.detalhesVenda')}</Text>
                    <TouchableOpacity onPress={() => handleCancelarPedido(pedidoSelecionado!)}><Ionicons name="trash-outline" size={24} color="#E74C3C" /></TouchableOpacity>
                </View>
                {pedidoSelecionado && (
                    <>
                        <View style={{backgroundColor:'#F9F9F9', padding:10, borderRadius:8, marginBottom:10}}>
                            <Text>{t('estoque.cliente')}: <Text style={{fontWeight:'bold'}}>{pedidoSelecionado.nome_cliente}</Text></Text>
                            <Text>{t('estoque.pagamento')}: <Text style={{fontWeight:'bold'}}>{pedidoSelecionado.forma_pagamento}</Text></Text>
                            <Text>{t('estoque.data')}: {new Date(pedidoSelecionado.criado_em).toLocaleString()}</Text>
                        </View>
                        {pedidoSelecionado.status !== 'SANGRIA' && (
                            <>
                                <Text style={{fontWeight:'bold', marginBottom:5}}>{t('estoque.itensVendidos')}:</Text>
                                <ScrollView style={{maxHeight: 200}}>
                                    {pedidoSelecionado.itens?.map((item) => (
                                        <View key={item.id} style={{flexDirection:'row', justifyContent:'space-between', marginBottom: 8, borderBottomWidth:1, borderBottomColor:'#EEE', paddingBottom:5}}><View><Text style={{fontWeight:'bold', color:'#333'}}>{item.produto?.nome}</Text><Text style={{fontSize:12, color:'#777'}}>Qtd: {item.quantidade} x {t('relatorioPdf.moeda')} {item.preco_unitario.toFixed(2)}</Text></View><Text style={{fontWeight:'bold'}}>{t('relatorioPdf.moeda')} {(item.preco_unitario * item.quantidade).toFixed(2).replace('.', ',')}</Text></View>
                                    ))}
                                </ScrollView>
                            </>
                        )}
                        <View style={{height: 1, backgroundColor:'#EEE', marginVertical:10}} />
                        <Text style={{textAlign:'right', fontWeight:'bold', fontSize:20, color: pedidoSelecionado.total < 0 ? '#E74C3C' : '#27AE60'}}>{t('relatorioPdf.total')}: {t('relatorioPdf.moeda')} {pedidoSelecionado.total.toFixed(2).replace('.', ',')}</Text>
                    </>
                )}
                <TouchableOpacity onPress={() => setModalDetalheVenda(false)} style={{marginTop:20, alignItems:'center'}}><Text style={{color:'#2980B9'}}>{t('estoque.voltar')}</Text></TouchableOpacity>
            </View>
        </View>
      </Modal>

      <Modal visible={modalRelatorio} animationType="slide">
          <View style={{flex:1, backgroundColor:'#F5F6FA'}}>
              <View style={[styles.painelReceita, {margin:0, borderRadius:0, paddingTop:50}]}>
                  <Text style={{color:'#FFF', fontSize:18, fontWeight:'bold'}}>{t('estoque.relatorioTitulo')}</Text>
                  <TouchableOpacity onPress={() => setModalRelatorio(false)}><Ionicons name="close" size={30} color="#FFF" /></TouchableOpacity>
              </View>
              <View style={{padding: 15}}>
                  <Text style={{fontWeight:'bold', marginBottom:10, color:'#555'}}>{t('estoque.selecionePeriodo')}</Text>
                  <View style={{flexDirection:'row', gap: 10, marginBottom: 20}}>
                      <TouchableOpacity onPress={() => setShowPicker('inicio')} style={styles.btnData}><Ionicons name="calendar" size={20} color="#2C3E50" /><Text style={{marginLeft: 5}}>{t('estoque.de')} {dataInicio.toLocaleDateString()}</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => setShowPicker('fim')} style={styles.btnData}><Ionicons name="calendar" size={20} color="#2C3E50" /><Text style={{marginLeft: 5}}>{t('estoque.ate')} {dataFim.toLocaleDateString()}</Text></TouchableOpacity>
                  </View>
                  {showPicker && (<DateTimePicker value={showPicker === 'inicio' ? dataInicio : dataFim} mode="date" display="default" onChange={onChangeDate} maximumDate={new Date()} />)}
                  <TouchableOpacity onPress={handleGerarPDF} style={styles.btnGerarPDF}><Ionicons name="print-outline" size={24} color="#FFF" style={{marginRight: 10}} /><Text style={{color:'#FFF', fontWeight:'bold', fontSize:16}}>{t('estoque.gerarPdf')}</Text></TouchableOpacity>
                  <View style={{height: 1, backgroundColor:'#DDD', marginVertical: 20}} />
                  <Text style={{fontWeight:'bold', marginBottom:10, color:'#555'}}>{t('estoque.ultimasVendas')}</Text>
              </View>
              <ScrollView style={{flex:1, paddingHorizontal: 15}}>
                  {historicoVendas.map((venda) => (
                      <TouchableOpacity key={venda.id} style={[styles.itemHistorico, venda.status === 'SANGRIA' && {borderLeftWidth:4, borderLeftColor:'#E74C3C'}]} onPress={() => { if(venda.status !== 'SANGRIA') { setPedidoSelecionado(venda); setModalDetalheVenda(true); } }}>
                          <View style={{flex:1}}>
                              <Text style={{fontWeight:'bold', fontSize:16, color: venda.status === 'SANGRIA' ? '#E74C3C' : '#333'}}>{venda.nome_cliente || t('estoque.balcao')}</Text>
                              <Text style={{fontSize:11, color:'#555', marginTop:2}} numberOfLines={1}>{venda.status === 'SANGRIA' ? 'Retirada de Caixa' : formatarResumoItens(venda.itens)}</Text>
                              <Text style={{fontSize:10, color:'#777', marginTop:2}}>{new Date(venda.criado_em).toLocaleDateString()} • {venda.forma_pagamento}</Text>
                          </View>
                          <Text style={{fontWeight:'bold', color: venda.status === 'SANGRIA' ? '#E74C3C' : '#27AE60', fontSize:16}}>{t('relatorioPdf.moeda')} {venda.total.toFixed(2).replace('.', ',')}</Text>
                      </TouchableOpacity>
                  ))}
              </ScrollView>
          </View>
      </Modal>

      <Modal visible={modalProduto} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitulo}>{t('estoque.produtoTitulo')}</Text>
                <Text style={styles.label}>{t('estoque.nomeLabel')}</Text>
                <TextInput placeholder="Ex: Coca Cola" style={styles.input} value={produtoEmEdicao.nome} onChangeText={t => setProdutoEmEdicao({...produtoEmEdicao, nome: t})} />
                <View style={{flexDirection:'row', gap: 10}}>
                    <View style={{flex:1}}><Text style={styles.label}>{t('estoque.precoLabel')}</Text><TextInput placeholder="0,00" keyboardType="numeric" style={styles.input} value={precoInput} onChangeText={setPrecoInput} /></View>
                    <View style={{flex:1}}><Text style={styles.label}>{t('estoque.estoqueLabel')}</Text><TextInput placeholder="0" keyboardType='numeric' style={styles.input} value={produtoEmEdicao.estoque?.toString()} onChangeText={t => setProdutoEmEdicao({...produtoEmEdicao, estoque: parseInt(t)})} /></View>
                </View>
                <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                    <TouchableOpacity onPress={() => setModalProduto(false)} style={{padding:10}}><Text>{t('estoque.cancelar')}</Text></TouchableOpacity>
                    <TouchableOpacity onPress={salvarProdutoComTexto} style={{backgroundColor:'#2980B9', padding:10, borderRadius:5}}><Text style={{color:'#FFF'}}>{t('estoque.salvar')}</Text></TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA', paddingTop: 40 },
  headerModo: { flexDirection: 'row', backgroundColor: '#FFF', elevation: 2 },
  tabModo: { flex: 1, padding: 15, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabAtiva: { borderBottomColor: '#2C3E50' },
  txtModo: { fontWeight: 'bold', color: '#999' },
  subAbas: { flexDirection: 'row', margin: 10, backgroundColor: '#DDD', borderRadius: 8, padding: 2 },
  btnSubAba: { flex: 1, padding: 8, alignItems: 'center', borderRadius: 6 },
  btnSubAbaAtiva: { backgroundColor: '#2C3E50' },
  painelReceita: { backgroundColor: '#27AE60', margin: 10, padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 3 },
  inputClienteArea: { flexDirection: 'row', backgroundColor: '#FFF', marginHorizontal: 10, marginBottom: 10, padding: 10, borderRadius: 8, alignItems: 'center' },
  cardPDV: { flex: 1, backgroundColor: '#FFF', margin: 3, padding: 10, borderRadius: 6, alignItems: 'center', elevation: 1, minHeight: 70, justifyContent: 'center' },
  nomePDV: { fontSize: 10, fontWeight: 'bold', textAlign: 'center', color: '#333' },
  precoPDV: { fontSize: 11, color: '#27AE60', fontWeight: 'bold' },
  cardComanda: { backgroundColor: '#FFF', padding: 15, marginHorizontal: 10, marginBottom: 8, borderRadius: 8, elevation: 1, borderLeftWidth: 4, borderLeftColor: '#F39C12' },
  clienteComanda: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  resumoItens: { fontSize: 12, color: '#555', marginVertical: 4, fontStyle: 'italic' },
  badgeStatus: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  itemHistorico: { backgroundColor: '#FFF', padding: 15, marginBottom: 5, borderRadius: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  carrinhoArea: { backgroundColor: '#FFF', borderTopLeftRadius: 15, borderTopRightRadius: 15, padding: 15, elevation: 10 },
  tituloCarrinho: { fontWeight: 'bold', color: '#555' },
  itemCarrinho: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  btnFinalizar: { backgroundColor: '#27AE60', padding: 12, borderRadius: 8, marginTop: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 10, padding: 20 },
  modalTitulo: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  listaItensModal: { backgroundColor: '#F5F5F5', padding: 10, borderRadius: 8, marginBottom: 15 },
  btnPagamento: { flexDirection:'row', backgroundColor: '#2C3E50', padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  txtBtnPagamento: { color: '#FFF', fontWeight: 'bold', fontSize: 11 },
  input: { backgroundColor: '#F0F2F5', padding: 10, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#DDD' },
  barraBusca: { flexDirection: 'row', backgroundColor: '#FFF', margin: 10, padding: 10, borderRadius: 8, alignItems: 'center' },
  card: { backgroundColor: '#FFF', flexDirection: 'row', padding: 15, borderRadius: 10, marginHorizontal: 15, marginBottom: 10, elevation: 1 },
  nome: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  preco: { fontSize: 14, color: '#27AE60', fontWeight: 'bold' },
  estoque: { fontSize: 12, color: '#7F8C8D' },
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#2980B9', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  btnData: { flex: 1, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#DDD' },
  btnGerarPDF: { backgroundColor: '#E74C3C', flexDirection: 'row', padding: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  label: { fontSize: 12, color: '#555', marginBottom: 5, fontWeight: 'bold' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F6FA' },
});
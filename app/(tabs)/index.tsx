import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// ✅ IMPORTS DO TOKEN E SUPABASE
import { supabase } from '@/services/supabase';
import * as Notifications from 'expo-notifications';

// Serviços
import { verificarNotificacoes } from '@/services/NotificacaoService';

// Hook de Assinatura (A NOVA LÓGICA DE BLOQUEIO)
import { useAssinatura } from '@/hooks/useAssinatura';

// Componentes
import { BarraPesquisa } from '@/components/BarraPesquisa';
import Dashboard from '@/components/Dashboard';
import ListaCobranca from '@/components/ListaCobranca';
import MenuAbas from '@/components/MenuAbas';
import PastaCliente from '@/components/PastaCliente';
import TelaCadastro from '@/components/TelaCadastro';
import Topo from '@/components/Topo';
// ✅ IMPORT DA NOVA TELA DE FLUXO PESSOAL
import TelaFluxoPessoal from '@/components/TelaFluxoPessoal';

// Modais
import ModalAcao from '@/components/ModalAcao';
import ModalEditarCliente from '@/components/ModalEditarCliente';
import ModalEditarEmprestimo from '@/components/ModalEditarEmprestimo';
import ModalNovoEmprestimo from '@/components/ModalNovoEmprestimo';
import ModalPagarParcela from '@/components/ModalPagarParcela';
import ModalParcelamento from '@/components/ModalParcelamento';
import ModalRelatorio from '@/components/ModalRelatorio';

import { useClientes } from '@/hooks/useClientes';

export default function VertoApp() {
  const router = useRouter();
  const { t } = useTranslation();

  // --- CONTROLE DE ACESSO VIA HOOK ---
  // ATUALIZAÇÃO DELICADA: Adicionei o 'refresh' aqui
  const { isPremium, loading: loadingAssinatura, refresh } = useAssinatura();
  const [acessoLiberado, setAcessoLiberado] = useState(false);

  const { 
    clientes, totais, loading, fetchData, 
    adicionarCliente, editarCliente, excluirCliente, 
    adicionarContrato, editarContrato, excluirContrato, acaoRenovarQuitar, 
    criarAcordo, pagarParcela,
    alternarBloqueio
  } = useClientes();

  const [aba, setAba] = useState('carteira');
  const [pastasAbertas, setPastasAbertas] = useState<any>({});
  const [textoBusca, setTextoBusca] = useState('');

  // --- ✅ FUNÇÃO: SALVAR TOKEN NO SUPABASE ---
  async function registrarTokenDeNotificacao() {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;

      const tokenData = await Notifications.getExpoPushTokenAsync();
      const token = tokenData.data;

      const { data: { user } } = await supabase.auth.getUser();

      if (user && token) {
        await supabase
          .from('profiles')
          .update({ expo_token: token })
          .eq('user_id', user.id);
      }
    } catch (error) {
      console.log("Erro no registro de notificação:", error);
    }
  }

  // --- 1. LÓGICA DE PROTEÇÃO (ATUALIZADA PARA FORÇAR REFRESH) ---
  useFocusEffect(
    useCallback(() => {
      // Assim que a tela ganha foco, força a verificação no RevenueCat/Banco
      // Isso resolve o problema da tela não liberar logo após a compra
      refresh();
    }, [])
  );

  useEffect(() => {
    // Reage às mudanças de estado após o refresh
    if (!loadingAssinatura) {
      if (!isPremium) {
        router.replace('/planos'); // Redireciona para a vitrine
      } else {
        setAcessoLiberado(true); // Libera o uso
      }
    }
  }, [isPremium, loadingAssinatura]);

  // --- 2. NOTIFICAÇÕES & TOKEN ---
  useEffect(() => {
    if (acessoLiberado) {
      registrarTokenDeNotificacao();
      if (clientes.length > 0) {
        verificarNotificacoes(clientes);
      }
    }
  }, [acessoLiberado, clientes]);

  // --- 3. ✅ ATIVAÇÃO DO REALTIME ---
  useEffect(() => {
    if (!acessoLiberado) return;

    const canalRealtime = supabase
      .channel('atualizacao-global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contratos' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(canalRealtime);
    };
  }, [acessoLiberado]); 

  // Modais State
  const [modalNovoEmprestimo, setModalNovoEmprestimo] = useState({ visivel: false, clientePreSelecionado: '' });
  const [modalAcao, setModalAcao] = useState<any>({ visivel: false, tipo: '', contrato: null, cliente: '' });
  const [modalEditarCliente, setModalEditarCliente] = useState(false);
  const [modalEditarCon, setModalEditarCon] = useState(false);
  const [modalParcelamento, setModalParcelamento] = useState<any>({ visivel: false, contrato: null, cliente: '' });
  const [modalPagarParcela, setModalPagarParcela] = useState<any>({ visivel: false, contrato: null, clienteNome: '' });
  const [modalRelatorio, setModalRelatorio] = useState(false);

  const [clienteSendoEditado, setClienteSendoEditado] = useState<any>(null);
  const [clienteEditandoNome, setClienteEditandoNome] = useState<any>(null);
  const [contratoSendoEditado, setContratoSendoEditado] = useState<any>(null);

  const clientesFiltrados = clientes.filter((cli: any) => 
    cli.nome.toLowerCase().includes(textoBusca.toLowerCase())
  );

  // Funções de Ação
  const salvarNovoCliente = async (novo: any) => { await adicionarCliente(novo); setAba('carteira'); };
  const abrirEdicaoCliente = (cli: any) => { setClienteSendoEditado(cli); setModalEditarCliente(true); };
  const salvarEdicaoCliente = async (dados: any) => { await editarCliente(clienteSendoEditado.nome, dados); setModalEditarCliente(false); setClienteSendoEditado(null); };

  const salvarNovoContrato = async (clienteId: string, novoCon: any) => { 
    const clienteEncontrado = clientes.find(c => c.id === clienteId);
    const nomeParaSalvar = clienteEncontrado ? clienteEncontrado.nome : modalNovoEmprestimo.clientePreSelecionado;
    if (nomeParaSalvar) await adicionarContrato(nomeParaSalvar, novoCon);
    setModalNovoEmprestimo({ visivel: false, clientePreSelecionado: '' }); 
  };

  const abrirEdicaoContrato = (con: any, nomeCli: string) => { setClienteEditandoNome(nomeCli); setContratoSendoEditado(con); setModalEditarCon(true); };
  const salvarEdicaoContrato = async (dados: any) => { await editarContrato(clienteEditandoNome, contratoSendoEditado.id, dados); setModalEditarCon(false); setContratoSendoEditado(null); };

  const confirmarAcao = async (data: string) => {
    const { tipo, contrato, cliente } = modalAcao;
    if(contrato) await acaoRenovarQuitar(tipo, contrato, cliente, data);
    setModalAcao({ visivel: false, tipo: '', contrato: null, cliente: '' });
  };

  const confirmarParcelamento = async (valorTotal: number, qtd: number, data: string, multaDiaria: number) => {
    const { contrato, cliente } = modalParcelamento;
    if(contrato) await criarAcordo(cliente, contrato.id, valorTotal, qtd, data, multaDiaria);
    setModalParcelamento({ visivel: false, contrato: null, cliente: '' });
  };

  const confirmarPagamentoParcela = async (data: string) => {
    const { contrato, clienteNome } = modalPagarParcela;
    if (contrato) await pagarParcela(clienteNome, contrato, data);
    setModalPagarParcela({ visivel: false, contrato: null, clienteNome: '' });
  };

  // --- BLOQUEIO VISUAL (ENQUANTO CARREGA OU SE NÃO FOR PREMIUM) ---
  if (loadingAssinatura || !isPremium) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F2F5' }}>
        <ActivityIndicator size="large" color="#2C3E50" />
        <Text style={{ marginTop: 20, color: '#666', fontWeight: '500' }}>
          {t('index.verificando') || "Verificando sua assinatura..."}
        </Text>
      </View>
    );
  }

  // --- RENDERIZAÇÃO DO APP (SÓ CHEGA AQUI SE FOR PREMIUM) ---
  return (
    <View style={styles.container}>
      <Topo dados={clientes} />
      <MenuAbas abaAtual={aba} setAba={setAba} />

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 30}
      >
        <ScrollView 
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}
          keyboardShouldPersistTaps="handled"
        >
          {aba === 'carteira' && (
            <>
              <Dashboard 
                capital={totais.capital} 
                lucro={totais.lucro} 
                multas={totais.multas} 
                vendas={totais.vendas} 
              />
              
              <TouchableOpacity style={styles.btnRelatorio} onPress={() => setModalRelatorio(true)}>
                <Ionicons name="stats-chart" size={20} color="#2C3E50" style={{ marginRight: 8 }} />
                <Text style={{ fontWeight: 'bold', color: '#2C3E50' }}>{t('index.gerarRelatorio') || "Gerar Relatório Financeiro"}</Text>
              </TouchableOpacity>

              <BarraPesquisa texto={textoBusca} aoDigitar={setTextoBusca} />

              {clientesFiltrados.map((cli: any, i: number) => (
                <PastaCliente 
                  key={i}
                  cliente={cli}
                  expandido={pastasAbertas[cli.nome]}
                  aoExpandir={() => setPastasAbertas({...pastasAbertas, [cli.nome]: !pastasAbertas[cli.nome]})}
                  aoNovoEmprestimo={() => setModalNovoEmprestimo({visivel:true, clientePreSelecionado: cli.nome})}
                  aoEditarCliente={() => abrirEdicaoCliente(cli)}
                  aoExcluirCliente={() => excluirCliente(cli.nome)}
                  aoEditarContrato={(con) => abrirEdicaoContrato(con, cli.nome)}
                  aoExcluirContrato={(conId) => excluirContrato(conId)}
                  aoRenovarOuQuitar={(tipo, con) => setModalAcao({visivel:true, tipo, contrato:con, cliente:cli.nome})}
                  aoNegociar={(con) => setModalParcelamento({visivel:true, contrato:con, cliente:cli.nome})}
                  aoPagarParcela={(con) => setModalPagarParcela({visivel:true, contrato:con, clienteNome:cli.nome})}
                  aoAlternarBloqueio={alternarBloqueio}
                />
              ))}
            </>
          )}

          {aba === 'pessoal' && <TelaFluxoPessoal />}

          {aba === 'cadastro' && <TelaCadastro aoSalvar={salvarNovoCliente} />}
          {aba === 'cobranca' && <ListaCobranca clientes={clientes} />}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODAIS */}
      <ModalNovoEmprestimo 
        visivel={modalNovoEmprestimo.visivel} 
        clientes={clientes} 
        clientePreSelecionado={modalNovoEmprestimo.clientePreSelecionado}
        fechar={() => setModalNovoEmprestimo({visivel: false, clientePreSelecionado: ''})} 
        salvar={salvarNovoContrato} 
      />

      <ModalEditarCliente visivel={modalEditarCliente} clienteOriginal={clienteSendoEditado} fechar={() => setModalEditarCliente(false)} salvar={salvarEdicaoCliente} />
      <ModalEditarEmprestimo visivel={modalEditarCon} contratoOriginal={contratoSendoEditado} fechar={() => setModalEditarCon(false)} salvar={salvarEdicaoContrato} />
      <ModalAcao visivel={modalAcao.visivel} tipo={modalAcao.tipo} fechar={() => setModalAcao({visivel:false, tipo:'', contrato:null, cliente:''})} confirmar={confirmarAcao} />
      <ModalParcelamento visivel={modalParcelamento.visivel} fechar={() => setModalParcelamento({visivel:false, contrato:null, cliente:''})} confirmar={confirmarParcelamento} />
      <ModalPagarParcela visivel={modalPagarParcela.visivel} contrato={modalPagarParcela.contrato} fechar={() => setModalPagarParcela({visivel:false, contrato:null, clienteNome:''})} confirmar={confirmarPagamentoParcela} />
      <ModalRelatorio visivel={modalRelatorio} fechar={() => setModalRelatorio(false)} clientes={clientes} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5', paddingTop: 10 },
  content: { padding: 15 },
  btnRelatorio: { flexDirection: 'row', backgroundColor: '#FFF', padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 10, elevation: 1, borderWidth: 1, borderColor: '#EEE' }
});
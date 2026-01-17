import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { BarraPesquisa } from '../../components/BarraPesquisa';
import Dashboard from '../../components/Dashboard';
import ListaCobranca from '../../components/ListaCobranca';
import MenuAbas from '../../components/MenuAbas';
import PastaCliente from '../../components/PastaCliente';
import TelaCadastro from '../../components/TelaCadastro';
import Topo from '../../components/Topo';

import ModalAcao from '../../components/ModalAcao';
import ModalEditarCliente from '../../components/ModalEditarCliente';
import ModalEditarEmprestimo from '../../components/ModalEditarEmprestimo';
import ModalNovoEmprestimo from '../../components/ModalNovoEmprestimo';
import ModalPagarParcela from '../../components/ModalPagarParcela';
import ModalParcelamento from '../../components/ModalParcelamento';
import ModalRelatorio from '../../components/ModalRelatorio';

import { useClientes } from '../../hooks/useClientes';

// TESTE DE ISOLAMENTO: Comentando o serviço de notificação para o app não crashar
// import { verificarNotificacoes } from '../../services/NotificacaoService';

export default function VertoApp() {
  const { 
    clientes, totais, loading, fetchData, 
    adicionarCliente, editarCliente, excluirCliente, 
    adicionarContrato, editarContrato, excluirContrato, acaoRenovarQuitar, 
    criarAcordo, pagarParcela 
  } = useClientes();

  const [aba, setAba] = useState('carteira');
  const [pastasAbertas, setPastasAbertas] = useState<any>({});
  const [textoBusca, setTextoBusca] = useState('');

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

  // TESTE DE ISOLAMENTO: Comentando o useEffect da notificação
  // useEffect(() => {
  //   if (clientes.length > 0) verificarNotificacoes(clientes);
  //   // registrarTokenPush(); <--- Se existisse essa função aqui, também estaria desligada
  // }, [clientes]);

  const clientesFiltrados = clientes.filter((cli: any) => 
    cli.nome.toLowerCase().includes(textoBusca.toLowerCase())
  );

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

  return (
    <View style={styles.container}>
      <Topo dados={clientes} />
      <MenuAbas abaAtual={aba} setAba={setAba} />

      {/* MUDANÇA AQUI: behavior='height' para Android */}
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
                <Text style={{ fontWeight: 'bold', color: '#2C3E50' }}>Gerar Relatório Financeiro</Text>
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
                />
              ))}
            </>
          )}

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
  container: { flex: 1, backgroundColor: '#F0F2F5', paddingTop: 40 },
  content: { padding: 15 },
  btnRelatorio: { flexDirection: 'row', backgroundColor: '#FFF', padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 10, elevation: 1, borderWidth: 1, borderColor: '#EEE' }
});
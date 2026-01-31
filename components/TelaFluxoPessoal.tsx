import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useFluxoPessoal } from '../hooks/useFluxoPessoal';

export default function TelaFluxoPessoal() {
  const { 
    contas, movimentos, saldoGeral, loading, 
    adicionarConta, excluirConta, 
    adicionarMovimento, editarMovimento, excluirMovimento,
    transferir, gerarRelatorioPDF // <--- Importando
  } = useFluxoPessoal();
  
  const [contaSelecionada, setContaSelecionada] = useState<number | null>(null);
  const [visivel, setVisivel] = useState(true);

  // Modais
  const [modalMovimento, setModalMovimento] = useState(false);
  const [modalNovaConta, setModalNovaConta] = useState(false);
  const [modalTransferencia, setModalTransferencia] = useState(false);
  const [modalRelatorio, setModalRelatorio] = useState(false); // <--- NOVO MODAL

  // Form Movimento
  const [idEdicao, setIdEdicao] = useState<number | null>(null);
  const [tipo, setTipo] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState(new Date().toLocaleDateString('pt-BR'));
  const [contaIdForm, setContaIdForm] = useState<number | null>(null);

  // Form Conta
  const [nomeNovaConta, setNomeNovaConta] = useState('');
  const [instituicaoConta, setInstituicaoConta] = useState('');

  // Form Transferência
  const [transfOrigem, setTransfOrigem] = useState<number | null>(null);
  const [transfDestino, setTransfDestino] = useState<number | null>(null);
  const [transfValor, setTransfValor] = useState('');
  const [transfDesc, setTransfDesc] = useState('');

  // Form Relatório
  const [dataInicioRel, setDataInicioRel] = useState('');
  const [dataFimRel, setDataFimRel] = useState('');

  // --- SEPARAÇÃO E CÁLCULOS ---
  const contaCarteira = contas.find(c => c.nome === 'Carteira');
  const outrasContas = contas.filter(c => c.nome !== 'Carteira');
  const saldoPessoalTotal = outrasContas.reduce((acc, c) => acc + c.saldo, 0);

  // --- EXIBIÇÃO ---
  const listaExibida = contaSelecionada 
    ? movimentos.filter(m => m.conta_id === contaSelecionada)
    : [];

  const saldoExibido = contaSelecionada
    ? contas.find(c => c.id === contaSelecionada)?.saldo || 0
    : saldoPessoalTotal; 

  const nomeExibido = contaSelecionada
    ? contas.find(c => c.id === contaSelecionada)?.nome
    : "Total Pessoal (S/ Carteira)";

  const formatarMoeda = (val: number) => {
    if (!visivel) return '••••'; 
    return `R$ ${val.toFixed(2).replace('.', ',')}`;
  };

  const abrirNovo = () => {
    limparForm();
    setContaIdForm(contaSelecionada || (contaCarteira?.id || outrasContas[0]?.id || null));
    setModalMovimento(true);
  };

  const abrirTransferencia = () => {
      setTransfOrigem(contaCarteira?.id || null);
      setTransfDestino(null);
      setTransfValor('');
      setTransfDesc('');
      setModalTransferencia(true);
  };

  // --- LÓGICA DO RELATÓRIO ---
  const abrirModalRelatorio = () => {
      if (!contaSelecionada) return Alert.alert("Aviso", "Selecione uma conta primeiro.");
      
      // Define datas padrão (Mês atual)
      const hoje = new Date();
      const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      
      const format = (d: Date) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
      
      setDataInicioRel(format(primeiroDia));
      setDataFimRel(format(hoje));
      setModalRelatorio(true);
  };

  const handleGerarPDF = async () => {
      if (!contaSelecionada) return;
      const conta = contas.find(c => c.id === contaSelecionada);
      if (!conta) return;

      await gerarRelatorioPDF(conta.id, conta.nome, dataInicioRel, dataFimRel);
      setModalRelatorio(false);
  };
  // ---------------------------

  const abrirEdicao = (item: any) => {
    setIdEdicao(item.id);
    setTipo(item.tipo);
    setValor(item.valor.toString().replace('.', ','));
    setDescricao(item.descricao);
    
    const dataBanco = item.data_movimento || ''; 
    if (dataBanco.includes('-')) {
        const [ano, mes, dia] = dataBanco.split('-');
        setData(`${dia}/${mes}/${ano}`);
    } else {
        setData(new Date().toLocaleDateString('pt-BR'));
    }
    
    setContaIdForm(item.conta_id);
    setModalMovimento(true);
  };

  const handleSalvarMovimento = async () => {
    if (!valor || !descricao || !contaIdForm) return alert("Preencha tudo!");
    const [d, m, a] = data.split('/');
    const dataISO = `${a}-${m}-${d}`;
    const valorFloat = parseFloat(valor.replace(',', '.'));

    let sucesso = false;
    if (idEdicao) {
        sucesso = await editarMovimento(idEdicao, { tipo, valor: valorFloat, descricao, data: dataISO, conta_id: contaIdForm });
    } else {
        sucesso = await adicionarMovimento({ tipo, valor: valorFloat, descricao, data: dataISO, conta_id: contaIdForm });
    }

    if (sucesso) {
      setModalMovimento(false);
      limparForm();
    }
  };

  const handleRealizarTransferencia = async () => {
      if (!transfOrigem || !transfDestino || !transfValor) return alert("Preencha tudo!");
      if (transfOrigem === transfDestino) return alert("Origem e destino iguais!");
      
      const valorFloat = parseFloat(transfValor.replace(',', '.'));
      const hojeISO = new Date().toISOString().split('T')[0];
      
      const sucesso = await transferir(transfOrigem, transfDestino, valorFloat, hojeISO, transfDesc || 'Transferência');
      if (sucesso) setModalTransferencia(false);
  };

  const handleSalvarConta = async () => {
    if(!nomeNovaConta || !instituicaoConta) return alert("Preencha nome e instituição!");
    await adicionarConta(nomeNovaConta, instituicaoConta);
    setModalNovaConta(false);
    setNomeNovaConta('');
    setInstituicaoConta('');
  };

  const handleExcluirNoModal = () => {
    if (!idEdicao) return;
    Alert.alert("Excluir", "Apagar este lançamento?", [
        { text: "Cancelar" },
        { text: "Apagar", style: 'destructive', onPress: async () => {
            await excluirMovimento(idEdicao);
            setModalMovimento(false);
            limparForm();
        }}
    ]);
  };

  const limparForm = () => {
    setIdEdicao(null); setValor(''); setDescricao(''); 
    setContaIdForm(contaSelecionada || null);
    setTipo('ENTRADA'); setData(new Date().toLocaleDateString('pt-BR'));
  };

  if (loading) return <ActivityIndicator style={{marginTop: 50}} size="large" color="#2C3E50" />;

  return (
    <View style={{ flex: 1 }}>
      
      {/* 1. LISTA DE CONTAS */}
      <View style={{ marginBottom: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15, paddingVertical: 10 }}>
          
          {contaCarteira && (
            <TouchableOpacity 
              onPress={() => setContaSelecionada(contaCarteira.id)} 
              activeOpacity={0.8}
              style={[styles.cardConta, contaSelecionada === contaCarteira.id && styles.cardContaAtivo, { borderColor: '#27AE60', borderWidth: 1 }]}
            >
              <View style={{flexDirection:'row', alignItems:'center', marginBottom:2}}>
                 <Ionicons name="briefcase" size={14} color={contaSelecionada === contaCarteira.id ? '#FFF' : '#27AE60'} style={{marginRight:4}} />
                 <Text style={[styles.txtContaNome, contaSelecionada === contaCarteira.id && {color:'#FFF'}]}>Carteira</Text>
              </View>
              <Text style={[styles.txtContaInst, contaSelecionada === contaCarteira.id && {color:'#DDD'}]}>Giro do Negócio</Text>
              <Text style={[styles.txtContaSaldo, contaSelecionada === contaCarteira.id && {color:'#FFF'}]}>{formatarMoeda(contaCarteira.saldo)}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => setContaSelecionada(null)} style={[styles.cardConta, !contaSelecionada && styles.cardContaAtivo]}>
            <Text style={[styles.txtContaNome, !contaSelecionada && {color:'#FFF'}]}>Visão Geral</Text>
            <Text style={[styles.txtContaInst, !contaSelecionada && {color:'#DDD'}]}>Exceto Carteira</Text>
            <Text style={[styles.txtContaSaldo, !contaSelecionada && {color:'#FFF'}]}>{formatarMoeda(saldoPessoalTotal)}</Text>
          </TouchableOpacity>

          {outrasContas.map(c => (
            <TouchableOpacity key={c.id} onPress={() => setContaSelecionada(c.id)} onLongPress={() => excluirConta(c.id)} style={[styles.cardConta, contaSelecionada === c.id && styles.cardContaAtivo]}>
              <Text style={[styles.txtContaNome, contaSelecionada === c.id && {color:'#FFF'}]}>{c.nome}</Text>
              <Text style={[styles.txtContaInst, contaSelecionada === c.id && {color:'#DDD'}]}>{c.instituicao}</Text>
              <Text style={[styles.txtContaSaldo, contaSelecionada === c.id && {color:'#FFF'}]}>{formatarMoeda(c.saldo)}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity onPress={() => setModalNovaConta(true)} style={[styles.cardConta, { borderStyle:'dashed', borderWidth:1, borderColor:'#999', backgroundColor:'transparent' }]}>
            <Ionicons name="add" size={24} color="#666" />
            <Text style={{ fontSize: 10, color: '#666', fontWeight:'bold' }}>Nova Conta</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 2. CARD DE SALDO */}
      <View style={styles.cardSaldo}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <Text style={styles.tituloSaldo}>
              {contaSelecionada ? `Saldo: ${nomeExibido}` : "Total Pessoal (S/ Carteira)"}
            </Text>
            <TouchableOpacity onPress={() => setVisivel(!visivel)} style={{ padding: 5 }}>
                <Ionicons name={visivel ? "eye" : "eye-off"} size={22} color="#95A5A6" />
            </TouchableOpacity>
        </View>

        <Text style={[styles.valorSaldo, { color: saldoExibido >= 0 ? '#27AE60' : '#E74C3C' }]}>
          {formatarMoeda(saldoExibido)}
        </Text>
        
        {/* BOTÃO RELATÓRIO (SÓ APARECE SE TIVER CONTA SELECIONADA) */}
        {contaSelecionada && (
            <TouchableOpacity onPress={abrirModalRelatorio} style={{position: 'absolute', right: 20, bottom: 20}}>
                <View style={{backgroundColor:'#ECF0F1', padding:8, borderRadius:20}}>
                    <Ionicons name="print-outline" size={20} color="#2C3E50" />
                </View>
            </TouchableOpacity>
        )}
      </View>

      {/* 3. BOTÕES DE AÇÃO */}
      <View style={{ flexDirection: 'row', marginHorizontal: 15, gap: 10 }}>
          <TouchableOpacity style={[styles.btnNovo, {flex: 1}]} onPress={abrirNovo}>
            <Ionicons name="add-circle" size={24} color="#FFF" />
            <Text style={styles.txtBtnNovo}>Lançamento</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btnNovo, {flex: 0.8, backgroundColor: '#2980B9'}]} onPress={abrirTransferencia}>
            <Ionicons name="swap-horizontal" size={24} color="#FFF" />
            <Text style={styles.txtBtnNovo}>Transferir</Text>
          </TouchableOpacity>
      </View>

      {/* 4. LISTA DE MOVIMENTAÇÕES */}
      <View style={{ marginTop: 15, paddingHorizontal: 15, paddingBottom: 20 }}>
        {!contaSelecionada ? (
            <View style={{ alignItems: 'center', marginTop: 40, opacity: 0.5 }}>
                <Ionicons name="pie-chart-outline" size={50} color="#95A5A6" />
                <Text style={{ color: '#7F8C8D', marginTop: 10, textAlign:'center', fontSize: 14 }}>
                    Selecione uma conta específica{'\n'}para ver o extrato.
                </Text>
            </View>
        ) : (
            <>
                {listaExibida.map((item) => (
                <TouchableOpacity key={item.id} onPress={() => abrirEdicao(item)} style={styles.item}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={[styles.bola, { backgroundColor: item.tipo === 'ENTRADA' ? '#D5F5E3' : '#FADBD8' }]}>
                        <Ionicons name={item.tipo === 'ENTRADA' ? "arrow-up" : "arrow-down"} size={18} color={item.tipo === 'ENTRADA' ? '#27AE60' : '#E74C3C'} />
                    </View>
                    <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text style={styles.desc}>{item.descricao}</Text>
                        <Text style={styles.contaBadge}>{contas.find(c => c.id === item.conta_id)?.nome}</Text>
                    </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.valor, { color: item.tipo === 'ENTRADA' ? '#27AE60' : '#E74C3C' }]}>
                        {item.tipo === 'ENTRADA' ? '+' : '-'} {visivel ? formatarMoeda(item.valor).replace('R$ ', '') : '••••'}
                    </Text>
                    
                    <Text style={styles.data}>
                        {(item.data_movimento || '').split('-').reverse().join('/')}
                    </Text>

                    </View>
                </TouchableOpacity>
                ))}
                
                {listaExibida.length === 0 && (
                    <Text style={{ textAlign: 'center', marginTop: 20, color: '#999' }}>Nenhum lançamento nesta conta.</Text>
                )}
            </>
        )}
      </View>

      {/* MODAL NOVA CONTA */}
      <Modal visible={modalNovaConta} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalPequeno}>
            <Text style={styles.modalTitle}>Criar Nova Conta</Text>
            <Text style={styles.labelInput}>Nome (Ex: Investimentos)</Text>
            <TextInput placeholder="Nome" style={styles.input} value={nomeNovaConta} onChangeText={setNomeNovaConta} autoFocus />
            <Text style={styles.labelInput}>Instituição (Ex: Banco Inter)</Text>
            <TextInput placeholder="Instituição" style={styles.input} value={instituicaoConta} onChangeText={setInstituicaoConta} />
            <View style={styles.rowBtns}>
              <TouchableOpacity onPress={() => setModalNovaConta(false)} style={styles.btnCancel}><Text>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSalvarConta} style={styles.btnSave}><Text style={{color:'#FFF'}}>Criar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL MOVIMENTO */}
      <Modal visible={modalMovimento} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <Text style={styles.modalTitle}>{idEdicao ? "Editar Lançamento" : "Novo Lançamento"}</Text>
                {idEdicao && (
                    <TouchableOpacity onPress={handleExcluirNoModal} style={{ padding: 5 }}>
                        <Ionicons name="trash-outline" size={24} color="#E74C3C" />
                    </TouchableOpacity>
                )}
            </View>

            <Text style={styles.labelInput}>Conta de Movimentação:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
              {[contaCarteira, ...outrasContas].filter(Boolean).map((c: any) => (
                <TouchableOpacity key={c.id} onPress={() => setContaIdForm(c.id)} style={[styles.badgeConta, contaIdForm === c.id && styles.badgeContaAtivo]}>
                  <Text style={{ color: contaIdForm === c.id ? '#FFF' : '#333' }}>{c.nome}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.rowTipo}>
              <TouchableOpacity onPress={() => setTipo('ENTRADA')} style={[styles.btnTipo, tipo === 'ENTRADA' && {backgroundColor:'#27AE60', borderColor:'transparent'}]}>
                <Text style={{color: tipo==='ENTRADA'?'#FFF':'#27AE60'}}>Entrada</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setTipo('SAIDA')} style={[styles.btnTipo, tipo === 'SAIDA' && {backgroundColor:'#E74C3C', borderColor:'transparent'}]}>
                <Text style={{color: tipo==='SAIDA'?'#FFF':'#E74C3C'}}>Saída</Text>
              </TouchableOpacity>
            </View>

            <TextInput placeholder="Valor (R$)" keyboardType="numeric" style={styles.input} value={valor} onChangeText={setValor} />
            <TextInput placeholder="Descrição" style={styles.input} value={descricao} onChangeText={setDescricao} />
            <TextInput placeholder="Data (DD/MM/AAAA)" keyboardType="numeric" style={styles.input} value={data} onChangeText={setData} />

            <View style={styles.rowBtns}>
              <TouchableOpacity onPress={() => setModalMovimento(false)} style={styles.btnCancel}><Text>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSalvarMovimento} style={styles.btnSave}><Text style={{color:'#FFF'}}>Salvar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- MODAL DE TRANSFERÊNCIA --- */}
      <Modal visible={modalTransferencia} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Transferir entre Contas</Text>
            
            {/* DE: ORIGEM */}
            <Text style={styles.labelInput}>De (Origem):</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
              {[contaCarteira, ...outrasContas].filter(Boolean).map((c: any) => (
                <TouchableOpacity key={c.id} onPress={() => setTransfOrigem(c.id)} style={[styles.badgeConta, transfOrigem === c.id && {backgroundColor:'#E74C3C'}]}>
                  <Text style={{ color: transfOrigem === c.id ? '#FFF' : '#333' }}>{c.nome}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{alignItems:'center', marginVertical:-5}}><Ionicons name="arrow-down" size={20} color="#999"/></View>

            {/* PARA: DESTINO */}
            <Text style={styles.labelInput}>Para (Destino):</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
              {[contaCarteira, ...outrasContas].filter(Boolean).map((c: any) => (
                <TouchableOpacity key={c.id} onPress={() => setTransfDestino(c.id)} style={[styles.badgeConta, transfDestino === c.id && {backgroundColor:'#27AE60'}]}>
                  <Text style={{ color: transfDestino === c.id ? '#FFF' : '#333' }}>{c.nome}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput placeholder="Valor da Transferência (R$)" keyboardType="numeric" style={styles.input} value={transfValor} onChangeText={setTransfValor} />
            <TextInput placeholder="Descrição (Opcional)" style={styles.input} value={transfDesc} onChangeText={setTransfDesc} />

            <View style={styles.rowBtns}>
              <TouchableOpacity onPress={() => setModalTransferencia(false)} style={styles.btnCancel}><Text>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleRealizarTransferencia} style={[styles.btnSave, {backgroundColor:'#2980B9'}]}><Text style={{color:'#FFF'}}>Transferir</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- NOVO MODAL DE RELATÓRIO PDF --- */}
      <Modal visible={modalRelatorio} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modalPequeno}>
            <Text style={styles.modalTitle}>Gerar Extrato em PDF</Text>
            <Text style={{textAlign:'center', color:'#7F8C8D', marginBottom:15}}>
                Conta: <Text style={{fontWeight:'bold', color:'#2C3E50'}}>{contas.find(c=>c.id===contaSelecionada)?.nome}</Text>
            </Text>

            <Text style={styles.labelInput}>Data Início (DD/MM/AAAA)</Text>
            <TextInput style={styles.input} value={dataInicioRel} onChangeText={setDataInicioRel} placeholder="01/01/2024" keyboardType="numeric"/>

            <Text style={styles.labelInput}>Data Fim (DD/MM/AAAA)</Text>
            <TextInput style={styles.input} value={dataFimRel} onChangeText={setDataFimRel} placeholder="31/01/2024" keyboardType="numeric"/>

            <View style={styles.rowBtns}>
              <TouchableOpacity onPress={() => setModalRelatorio(false)} style={styles.btnCancel}><Text>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleGerarPDF} style={[styles.btnSave, {backgroundColor:'#E74C3C'}]}>
                  <Text style={{color:'#FFF'}}>Gerar PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  cardConta: { backgroundColor: '#FFF', padding: 12, borderRadius: 10, marginRight: 10, minWidth: 110, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  cardContaAtivo: { backgroundColor: '#2C3E50' },
  txtContaNome: { fontSize: 13, color: '#7F8C8D', fontWeight: 'bold' },
  txtContaInst: { fontSize: 10, color: '#95A5A6', marginBottom: 4 },
  txtContaSaldo: { fontSize: 14, color: '#2C3E50', fontWeight: 'bold' },
  
  cardSaldo: { backgroundColor: '#FFF', padding: 20, marginHorizontal: 15, borderRadius: 12, alignItems: 'center', elevation: 2, marginBottom: 15 },
  tituloSaldo: { fontSize: 14, color: '#95A5A6', textTransform: 'uppercase', letterSpacing: 1 },
  valorSaldo: { fontSize: 32, fontWeight: 'bold', marginVertical: 5 },
  
  btnNovo: { backgroundColor: '#34495E', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 8 },
  txtBtnNovo: { color: '#FFF', fontWeight: 'bold', marginLeft: 8 },
  
  item: { backgroundColor: '#FFF', padding: 15, borderRadius: 8, marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', elevation: 1 },
  bola: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  desc: { fontWeight: 'bold', color: '#2C3E50', fontSize: 15 },
  contaBadge: { fontSize: 10, color: '#7F8C8D', marginTop: 2 },
  valor: { fontWeight: 'bold', fontSize: 15 },
  data: { color: '#BDC3C7', fontSize: 11 },
  
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: '#FFF', padding: 20, borderRadius: 10 },
  modalPequeno: { backgroundColor: '#FFF', padding: 20, borderRadius: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50', marginBottom: 15, textAlign: 'center' },
  
  input: { borderWidth: 1, borderColor: '#ECF0F1', padding: 12, borderRadius: 8, marginBottom: 10, fontSize: 16, backgroundColor: '#F9F9F9', width: '100%' },
  rowTipo: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  btnTipo: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#DDD' },
  rowBtns: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, width: '100%' },
  btnCancel: { padding: 15, flex: 1, alignItems: 'center' },
  btnSave: { backgroundColor: '#2C3E50', padding: 15, borderRadius: 8, flex: 1, alignItems: 'center' },
  labelInput: { fontSize: 12, color: '#666', marginBottom: 5, fontWeight: 'bold', alignSelf:'flex-start' },
  badgeConta: { padding: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#EEE', marginRight: 8, marginBottom: 8 },
  badgeContaAtivo: { backgroundColor: '#2980B9' }
});
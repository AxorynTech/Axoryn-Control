import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

type Props = {
  visivel: boolean;
  clientes: any[];
  clientePreSelecionado?: string;
  fechar: () => void;
  salvar: (clienteId: string, dados: any) => void;
};

export default function ModalNovoEmprestimo({ visivel, clientes, clientePreSelecionado, fechar, salvar }: Props) {
  const [tipoOperacao, setTipoOperacao] = useState<'EMPRESTIMO' | 'VENDA'>('EMPRESTIMO');

  const [clienteId, setClienteId] = useState('');
  const [capital, setCapital] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [taxa, setTaxa] = useState('20');
  const [frequencia, setFrequencia] = useState('MENSAL'); // Compartilhado: MENSAL, SEMANAL, DIARIO, PARCELADO
  const [garantia, setGarantia] = useState('');
  const [multa, setMulta] = useState('');
  const [produtos, setProdutos] = useState('');
  
  // Controle de parcelas
  const [diasDiario, setDiasDiario] = useState('25');
  const [qtdParcelasVenda, setQtdParcelasVenda] = useState('1');

  useEffect(() => {
    if (visivel) {
      if (clientePreSelecionado) {
        const cli = clientes.find(c => c.nome === clientePreSelecionado);
        if (cli) setClienteId(cli.id);
      }
      
      const hoje = new Date();
      const dia = String(hoje.getDate()).padStart(2, '0');
      const mes = String(hoje.getMonth() + 1).padStart(2, '0');
      setDataInicio(`${dia}/${mes}/${hoje.getFullYear()}`);

      setCapital('');
      setGarantia('');
      setProdutos('');
      setMulta('');
      setTipoOperacao('EMPRESTIMO');
      setFrequencia('MENSAL');
      setQtdParcelasVenda('1');
    }
  }, [visivel, clientePreSelecionado]);

  // Ao trocar de aba, ajusta defaults sugeridos
  const trocarAba = (novaAba: 'EMPRESTIMO' | 'VENDA') => {
    setTipoOperacao(novaAba);
    if (novaAba === 'VENDA') setFrequencia('PARCELADO');
    else setFrequencia('MENSAL');
  };

  const handleSalvar = () => {
    if (!clienteId) return Alert.alert("Erro", "Selecione um cliente.");
    if (!capital) return Alert.alert("Erro", "Digite o valor.");
    if (!dataInicio) return Alert.alert("Erro", "Informe a data.");

    const valCapital = parseFloat(capital.replace(',', '.'));
    const valTaxa = parseFloat(taxa.replace(',', '.'));
    const valMulta = parseFloat(multa.replace(',', '.') || '0');

    const textoDescritivo = tipoOperacao === 'VENDA' 
      ? `PRODUTO: ${produtos}` 
      : garantia;

    // Se for venda, respeita a frequência escolhida (PARCELADO ou MENSAL)
    // Se for empréstimo, usa a frequência escolhida (MENSAL, SEMANAL, DIARIO)
    const frequenciaFinal = frequencia;
    
    // Parcelas só existem se for VENDA PARCELADA
    const parcelasFinal = (tipoOperacao === 'VENDA' && frequencia === 'PARCELADO') ? qtdParcelasVenda : null;

    salvar(clienteId, {
      capital: valCapital,
      taxa: valTaxa,
      frequencia: frequenciaFinal,
      garantia: textoDescritivo,
      diasDiario: frequencia === 'DIARIO' ? diasDiario : null,
      totalParcelas: parcelasFinal,
      dataInicio,
      valorMultaDiaria: valMulta
    });
  };

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={fechar}>
      {/* KeyboardAvoidingView substitui a View externa para empurrar o conteúdo */}
      <KeyboardAvoidingView 
        style={styles.fundo} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.janela}>
          <Text style={styles.titulo}>Novo Contrato</Text>

          {/* ABAS */}
          <View style={styles.abas}>
             <TouchableOpacity 
               style={[styles.aba, tipoOperacao === 'EMPRESTIMO' && styles.abaAtiva]} 
               onPress={() => trocarAba('EMPRESTIMO')}
             >
               <Text style={[styles.txtAba, tipoOperacao === 'EMPRESTIMO' && styles.txtAbaAtiva]}>💰 EMPRÉSTIMO</Text>
             </TouchableOpacity>
             <TouchableOpacity 
               style={[styles.aba, tipoOperacao === 'VENDA' && styles.abaAtiva]} 
               onPress={() => trocarAba('VENDA')}
             >
               <Text style={[styles.txtAba, tipoOperacao === 'VENDA' && styles.txtAbaAtiva]}>🛒 VENDA</Text>
             </TouchableOpacity>
          </View>

          <ScrollView style={{maxHeight: 400}}>
            <Text style={styles.label}>Cliente</Text>
            {clientePreSelecionado ? (
              <TextInput style={[styles.input, {backgroundColor:'#EEE'}]} value={clientePreSelecionado} editable={false} />
            ) : (
              <ScrollView style={{height: 100, marginBottom:10, borderWidth:1, borderColor:'#EEE'}} nestedScrollEnabled>
                {clientes.map(c => (
                  <TouchableOpacity key={c.id} onPress={() => setClienteId(c.id)} style={{padding:10, backgroundColor: clienteId === c.id ? '#D6EAF8' : '#FFF'}}>
                    <Text>{c.nome}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* LINHA: VALOR e DATA */}
            <View style={{flexDirection:'row', gap:10}}>
                <View style={{flex:1.5}}>
                    <Text style={styles.label}>{tipoOperacao === 'VENDA' ? 'Valor Venda' : 'Valor Empréstimo'}</Text>
                    <TextInput style={styles.input} value={capital} onChangeText={setCapital} keyboardType="numeric" placeholder="0.00" />
                </View>
                <View style={{flex:1}}>
                    <Text style={styles.label}>Data</Text>
                    <TextInput style={styles.input} value={dataInicio} onChangeText={setDataInicio} placeholder="DD/MM/AAAA" />
                </View>
            </View>

            {tipoOperacao === 'VENDA' ? (
              <>
                <Text style={styles.label}>Descrição dos Produtos</Text>
                <TextInput 
                  style={[styles.input, {height: 60, textAlignVertical:'top'}]} 
                  value={produtos} 
                  onChangeText={setProdutos} 
                  multiline 
                  placeholder="Ex: 1 Perfume, 1 Kit..." 
                />
                
                {/* --- SELETOR DE MODALIDADE (VENDA) --- */}
                <View style={{marginTop: 10}}>
                     <Text style={styles.label}>Modalidade da Venda</Text>
                     <TouchableOpacity style={styles.btnFreq} onPress={() => setFrequencia(frequencia === 'PARCELADO' ? 'MENSAL' : 'PARCELADO')}>
                        <Text style={{fontWeight:'bold', color:'#333'}}>
                            {frequencia === 'PARCELADO' ? '📅 PARCELADO (Crediário)' : '🗓️ MENSAL (Juros Recorrente)'}
                        </Text>
                     </TouchableOpacity>
                </View>

                {/* LINHA UNIFICADA DE RECEBIMENTO: PARCELAS | JUROS | MULTA */}
                <Text style={[styles.label, {marginTop: 15}]}>Condições de Recebimento</Text>
                <View style={{flexDirection:'row', gap:10}}>
                   
                   {/* Só mostra parcelas se for PARCELADO */}
                   {frequencia === 'PARCELADO' && (
                       <View style={{flex:1}}>
                          <Text style={{fontSize:12, color:'#555', fontWeight:'bold', marginBottom:2}}>Parcelas</Text>
                          <TextInput style={styles.input} value={qtdParcelasVenda} onChangeText={setQtdParcelasVenda} keyboardType="numeric" placeholder="Ex: 3" />
                       </View>
                   )}
                   
                   <View style={{flex:1}}>
                      <Text style={{fontSize:12, color:'#555', fontWeight:'bold', marginBottom:2}}>Juros (%)</Text>
                      <TextInput style={styles.input} value={taxa} onChangeText={setTaxa} keyboardType="numeric" />
                   </View>
                   <View style={{flex:1.2}}>
                      <Text style={{fontSize:12, color:'#555', fontWeight:'bold', marginBottom:2}}>Multa Diária (R$)</Text>
                      <TextInput 
                        style={styles.input} 
                        value={multa} 
                        onChangeText={setMulta} 
                        keyboardType="numeric" 
                        placeholder="0.00" 
                      />
                   </View>
                </View>
              </>
            ) : (
              // --- EMPRÉSTIMO ---
              <>
                <Text style={styles.label}>Garantia (Opcional)</Text>
                <TextInput style={styles.input} value={garantia} onChangeText={setGarantia} placeholder="Ex: Celular..." />

                <View style={{flexDirection:'row', gap:10}}>
                  <View style={{flex:1}}>
                     <Text style={styles.label}>Taxa (%)</Text>
                     <TextInput style={styles.input} value={taxa} onChangeText={setTaxa} keyboardType="numeric" />
                  </View>
                  <View style={{flex:1}}>
                     <Text style={styles.label}>Multa Diária (R$)</Text>
                     <TextInput style={styles.input} value={multa} onChangeText={setMulta} keyboardType="numeric" placeholder="0.00" />
                  </View>
                </View>

                {/* --- SELETOR DE MODALIDADE (EMPRESTIMO) --- */}
                <View style={{marginTop: 10}}>
                     <Text style={styles.label}>Modalidade</Text>
                     <TouchableOpacity style={styles.btnFreq} onPress={() => setFrequencia(frequencia === 'MENSAL' ? 'SEMANAL' : frequencia === 'SEMANAL' ? 'DIARIO' : 'MENSAL')}>
                        <Text style={{fontWeight:'bold', color:'#333'}}>{frequencia}</Text>
                     </TouchableOpacity>
                </View>
                
                {frequencia === 'DIARIO' && (
                   <View>
                     <Text style={styles.label}>Quantos dias?</Text>
                     <TextInput style={styles.input} value={diasDiario} onChangeText={setDiasDiario} keyboardType="numeric" />
                   </View>
                )}
              </>
            )}

            <TouchableOpacity style={styles.btnSalvar} onPress={handleSalvar}>
              <Text style={styles.txtSalvar}>
                {tipoOperacao === 'VENDA' ? 'CONFIRMAR VENDA' : 'CONFIRMAR EMPRÉSTIMO'}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <TouchableOpacity style={styles.btnCancelar} onPress={fechar}>
             <Text style={{color:'#999'}}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  janela: { backgroundColor: '#FFF', width: '90%', padding: 20, borderRadius: 12, elevation: 5 },
  titulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#2C3E50' },
  abas: { flexDirection: 'row', marginBottom: 15, borderRadius: 8, backgroundColor: '#F0F2F5', padding: 4 },
  aba: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  abaAtiva: { backgroundColor: '#FFF', elevation: 2 },
  txtAba: { fontWeight: 'bold', color: '#95A5A6', fontSize: 12 },
  txtAbaAtiva: { color: '#2980B9' },
  label: { fontWeight: 'bold', color: '#555', marginBottom: 5, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, fontSize: 16, backgroundColor: '#FAFAFA' },
  btnFreq: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, alignItems: 'center', backgroundColor: '#EEE', marginTop: 0 },
  btnSalvar: { backgroundColor: '#27AE60', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  txtSalvar: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  btnCancelar: { marginTop: 15, alignItems: 'center', padding: 10 }
});
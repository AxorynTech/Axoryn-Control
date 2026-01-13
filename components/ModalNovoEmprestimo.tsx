import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
  const [taxa, setTaxa] = useState('20');
  const [frequencia, setFrequencia] = useState('MENSAL');
  const [garantia, setGarantia] = useState('');
  const [produtos, setProdutos] = useState('');
  
  // Controle de parcelas
  const [diasDiario, setDiasDiario] = useState('25'); // Para empréstimo diário
  const [qtdParcelasVenda, setQtdParcelasVenda] = useState('1'); // Para venda parcelada

  useEffect(() => {
    if (visivel) {
      if (clientePreSelecionado) {
        const cli = clientes.find(c => c.nome === clientePreSelecionado);
        if (cli) setClienteId(cli.id);
      }
      setCapital('');
      setGarantia('');
      setProdutos('');
      setTipoOperacao('EMPRESTIMO');
      setFrequencia('MENSAL');
      setQtdParcelasVenda('1');
    }
  }, [visivel, clientePreSelecionado]);

  const handleSalvar = () => {
    if (!clienteId) return Alert.alert("Erro", "Selecione um cliente.");
    if (!capital) return Alert.alert("Erro", "Digite o valor.");

    const valCapital = parseFloat(capital.replace(',', '.'));
    const valTaxa = parseFloat(taxa.replace(',', '.'));

    const textoDescritivo = tipoOperacao === 'VENDA' 
      ? `PRODUTO: ${produtos}` 
      : garantia;

    // Se for VENDA, forçamos a frequência 'PARCELADO'
    const frequenciaFinal = tipoOperacao === 'VENDA' ? 'PARCELADO' : frequencia;
    
    // Se for VENDA, usamos a quantidade de parcelas definida, senão null
    const parcelasFinal = tipoOperacao === 'VENDA' ? qtdParcelasVenda : null;

    salvar(clienteId, {
      capital: valCapital,
      taxa: valTaxa,
      frequencia: frequenciaFinal,
      garantia: textoDescritivo,
      diasDiario: frequencia === 'DIARIO' ? diasDiario : null,
      totalParcelas: parcelasFinal // Enviamos para o hook calcular
    });
  };

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={fechar}>
      <View style={styles.fundo}>
        <View style={styles.janela}>
          <Text style={styles.titulo}>Novo Contrato</Text>

          {/* ABAS */}
          <View style={styles.abas}>
             <TouchableOpacity 
               style={[styles.aba, tipoOperacao === 'EMPRESTIMO' && styles.abaAtiva]} 
               onPress={() => setTipoOperacao('EMPRESTIMO')}
             >
               <Text style={[styles.txtAba, tipoOperacao === 'EMPRESTIMO' && styles.txtAbaAtiva]}>💰 EMPRÉSTIMO</Text>
             </TouchableOpacity>
             <TouchableOpacity 
               style={[styles.aba, tipoOperacao === 'VENDA' && styles.abaAtiva]} 
               onPress={() => setTipoOperacao('VENDA')}
             >
               <Text style={[styles.txtAba, tipoOperacao === 'VENDA' && styles.txtAbaAtiva]}>🛒 VENDA</Text>
             </TouchableOpacity>
          </View>

          <ScrollView style={{maxHeight: 400}}>
            <Text style={styles.label}>Cliente</Text>
            {clientePreSelecionado ? (
              <TextInput style={[styles.input, {backgroundColor:'#EEE'}]} value={clientePreSelecionado} editable={false} />
            ) : (
              <ScrollView style={{height: 100, marginBottom:10, borderWidth:1, borderColor:'#EEE'}}>
                {clientes.map(c => (
                  <TouchableOpacity key={c.id} onPress={() => setClienteId(c.id)} style={{padding:10, backgroundColor: clienteId === c.id ? '#D6EAF8' : '#FFF'}}>
                    <Text>{c.nome}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <Text style={styles.label}>{tipoOperacao === 'VENDA' ? 'Valor da Venda (R$)' : 'Valor do Empréstimo (R$)'}</Text>
            <TextInput style={styles.input} value={capital} onChangeText={setCapital} keyboardType="numeric" placeholder="0.00" />

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
                
                {/* CAMPO ESPECÍFICO DE VENDA: QUANTIDADE DE PARCELAS */}
                <View style={{flexDirection:'row', gap:10}}>
                   <View style={{flex:1}}>
                      <Text style={styles.label}>Nº Parcelas (Mensais)</Text>
                      <TextInput style={styles.input} value={qtdParcelasVenda} onChangeText={setQtdParcelasVenda} keyboardType="numeric" placeholder="Ex: 3" />
                   </View>
                   <View style={{flex:1}}>
                      <Text style={styles.label}>Juros Total (%)</Text>
                      <TextInput style={styles.input} value={taxa} onChangeText={setTaxa} keyboardType="numeric" />
                   </View>
                </View>
              </>
            ) : (
              // LÓGICA DE EMPRÉSTIMO (Mantida igual)
              <>
                <Text style={styles.label}>Garantia (Opcional)</Text>
                <TextInput style={styles.input} value={garantia} onChangeText={setGarantia} placeholder="Ex: Celular..." />

                <View style={{flexDirection:'row', gap:10}}>
                  <View style={{flex:1}}>
                     <Text style={styles.label}>Taxa (%)</Text>
                     <TextInput style={styles.input} value={taxa} onChangeText={setTaxa} keyboardType="numeric" />
                  </View>
                  <View style={{flex:1}}>
                     <Text style={styles.label}>Modalidade</Text>
                     <TouchableOpacity style={styles.btnFreq} onPress={() => setFrequencia(frequencia === 'MENSAL' ? 'SEMANAL' : frequencia === 'SEMANAL' ? 'DIARIO' : 'MENSAL')}>
                        <Text style={{fontWeight:'bold', color:'#333'}}>{frequencia}</Text>
                     </TouchableOpacity>
                  </View>
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
      </View>
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
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Contrato } from '../types';

type Props = {
  visivel: boolean;
  contratoOriginal: Contrato | null;
  fechar: () => void;
  salvar: (dadosAtualizados: Partial<Contrato>) => void;
};

export default function ModalEditarEmprestimo({ visivel, contratoOriginal, fechar, salvar }: Props) {
  const [capital, setCapital] = useState('');
  const [juros, setJuros] = useState('');
  const [lucroTotal, setLucroTotal] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [proximoVencimento, setProximoVencimento] = useState('');
  const [garantia, setGarantia] = useState('');
  const [multa, setMulta] = useState('');
  
  // ⬇️ INJETADO: Campos específicos para parcelamentos (Diário, Semanal, Quinzenal) ⬇️
  const [valorParcela, setValorParcela] = useState('');
  const [totalParcelas, setTotalParcelas] = useState('');
  const [parcelasPagas, setParcelasPagas] = useState('');
  // ⬆️ FIM DA INJEÇÃO ⬆️
  
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (visivel) {
        setSalvando(false);
    }
    
    if (contratoOriginal) {
      setCapital(contratoOriginal.capital?.toString() || '');
      setJuros(contratoOriginal.taxa?.toString() || '');
      setLucroTotal(contratoOriginal.lucroTotal?.toString() || '0'); 
      setDataInicio(contratoOriginal.dataInicio || '');
      setProximoVencimento(contratoOriginal.proximoVencimento || '');
      setGarantia(contratoOriginal.garantia || '');
      setMulta(contratoOriginal.valorMultaDiaria?.toString() || '0'); 
      
      // ⬇️ INJETADO: Puxa os dados antigos se existirem ⬇️
      setValorParcela(contratoOriginal.valorParcela?.toString() || '');
      setTotalParcelas(contratoOriginal.totalParcelas?.toString() || '');
      setParcelasPagas(contratoOriginal.parcelasPagas?.toString() || '0');
    }
  }, [contratoOriginal, visivel]);

  const handleSalvar = () => {
    if (salvando) return;
    if (!capital || !juros) return Alert.alert("Erro", "Preencha Capital e Juros");
    
    setSalvando(true);
    
    try {
      salvar({
        capital: parseFloat(capital.replace(',', '.')),
        taxa: parseFloat(juros.replace(',', '.')),
        lucroTotal: parseFloat(lucroTotal.replace(',', '.')),
        dataInicio: dataInicio,
        proximoVencimento: proximoVencimento,
        garantia: garantia,
        valorMultaDiaria: parseFloat(multa.replace(',', '.')) || 0,
        
        // ⬇️ INJETADO: Envia os dados novos se o usuário tiver preenchido ⬇️
        valorParcela: valorParcela ? parseFloat(valorParcela.replace(',', '.')) : undefined,
        totalParcelas: totalParcelas ? parseInt(totalParcelas) : undefined,
        parcelasPagas: parcelasPagas ? parseInt(parcelasPagas) : undefined,
      });
      
    } catch(e) { 
      setSalvando(false);
      Alert.alert("Erro", "Verifique os dados"); 
    }
  };

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={fechar}>
      {/* ⬇️ Envolvido com KeyboardAvoidingView e ScrollView para caber tudo ⬇️ */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.mF}>
        <View style={styles.mC}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              
              {/* \u00E9 = é */}
              <Text style={styles.mT}>Editar Empr{'\u00E9'}stimo</Text>
              
              <Text style={styles.label}>Capital (Valor Emprestado)</Text>
              <TextInput placeholder="Capital" style={styles.input} keyboardType="numeric" value={capital} onChangeText={setCapital} />

              <Text style={styles.label}>Taxa de Juros (%)</Text>
              <TextInput placeholder="Juros" style={styles.input} keyboardType="numeric" value={juros} onChangeText={setJuros} />

              {/* ⬇️ INJETADO: Mostra os campos de parcelamento se a frequência NÃO for MENSAL ⬇️ */}
              {contratoOriginal?.frequencia && contratoOriginal.frequencia !== 'MENSAL' && (
                  <View style={styles.blocoParcelas}>
                      <Text style={[styles.label, {color: '#8E44AD'}]}>Valor da Parcela (R$)</Text>
                      <TextInput placeholder="Ex: 50.00" style={[styles.input, { borderColor: '#8E44AD', borderWidth: 1 }]} keyboardType="numeric" value={valorParcela} onChangeText={setValorParcela} />

                      <View style={{flexDirection: 'row', gap: 10}}>
                          <View style={{flex: 1}}>
                              <Text style={styles.label}>Total de Parcelas</Text>
                              <TextInput placeholder="Ex: 10" style={styles.input} keyboardType="numeric" value={totalParcelas} onChangeText={setTotalParcelas} />
                          </View>
                          <View style={{flex: 1}}>
                              <Text style={styles.label}>Parcelas Pagas</Text>
                              <TextInput placeholder="Ex: 2" style={styles.input} keyboardType="numeric" value={parcelasPagas} onChangeText={setParcelasPagas} />
                          </View>
                      </View>
                  </View>
              )}
              {/* ⬆️ FIM DA INJEÇÃO ⬆️ */}

              <Text style={styles.label}>Lucro Total (Acumulado)</Text>
              <TextInput placeholder="Lucro" style={[styles.input, { borderColor: '#F39C12', borderWidth: 1 }]} keyboardType="numeric" value={lucroTotal} onChangeText={setLucroTotal} />

              {/* \u00ED = í (Início) */}
              <Text style={styles.label}>Data de In{'\u00ED'}cio</Text>
              <TextInput placeholder="DD/MM/AAAA" style={styles.input} value={dataInicio} onChangeText={setDataInicio} />

              {/* \u00F3 = ó (Próximo) */}
              <Text style={styles.label}>Pr{'\u00F3'}ximo Vencimento</Text>
              <TextInput placeholder="DD/MM/AAAA" style={[styles.input, { borderColor: '#2980B9', borderWidth: 1 }]} value={proximoVencimento} onChangeText={setProximoVencimento} />

              <Text style={styles.label}>Multa por dia (R$)</Text>
              <TextInput placeholder="0.00" style={[styles.input, { borderColor: '#E74C3C', borderWidth: 1 }]} keyboardType="numeric" value={multa} onChangeText={setMulta} />

              <Text style={styles.label}>Garantia</Text>
              <TextInput placeholder="Garantia" style={styles.input} value={garantia} onChangeText={setGarantia} />
              
              <TouchableOpacity 
                style={[styles.btnP, salvando && { opacity: 0.7 }]} 
                onPress={handleSalvar} 
                disabled={salvando}
              >
                {salvando ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <Text style={styles.btnTxt}>SALVAR CORRE{'\u00C7'}{'\u00C3'}O</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity onPress={fechar} style={styles.btnCancel} disabled={salvando}>
                <Text style={{color:'#999'}}>Cancelar</Text>
              </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mF: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  mC: { backgroundColor: '#FFF', width: '85%', padding: 20, borderRadius: 15, maxHeight: '90%' },
  mT: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  label: { fontSize: 12, color: '#666', marginBottom: 4, marginLeft: 2, fontWeight: 'bold' },
  input: { backgroundColor: '#F1F3F4', padding: 12, borderRadius: 8, marginBottom: 10, color: '#333' },
  btnP: { backgroundColor: '#27AE60', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  btnTxt: { color: '#FFF', fontWeight: 'bold' },
  btnCancel: { marginTop: 15, alignItems: 'center', padding: 10 },
  blocoParcelas: { backgroundColor: '#F9E79F', padding: 10, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#F1C40F' }
});
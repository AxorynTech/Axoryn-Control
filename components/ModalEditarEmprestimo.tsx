import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';
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

  useEffect(() => {
    if (contratoOriginal) {
      setCapital(contratoOriginal.capital?.toString() || '');
      setJuros(contratoOriginal.taxa?.toString() || '');
      setLucroTotal(contratoOriginal.lucroTotal?.toString() || '0'); 
      setDataInicio(contratoOriginal.dataInicio || '');
      setProximoVencimento(contratoOriginal.proximoVencimento || '');
      setGarantia(contratoOriginal.garantia || '');
      setMulta(contratoOriginal.valorMultaDiaria?.toString() || '0'); 
    }
  }, [contratoOriginal]);

  const handleSalvar = () => {
    if (!capital || !juros) return Alert.alert("Erro", "Preencha Capital e Juros");
    
    try {
      salvar({
        capital: parseFloat(capital),
        taxa: parseFloat(juros),
        lucroTotal: parseFloat(lucroTotal),
        dataInicio: dataInicio,
        proximoVencimento: proximoVencimento,
        garantia: garantia,
        valorMultaDiaria: parseFloat(multa) || 0,
      });
      
    } catch(e) { Alert.alert("Erro", "Verifique os dados"); }
  };

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={fechar}>
      <View style={styles.mF}>
        <View style={styles.mC}>
          {/* \u00E9 = é */}
          <Text style={styles.mT}>Editar Empr{'\u00E9'}stimo</Text>
          
          <Text style={styles.label}>Capital (Valor Emprestado)</Text>
          <TextInput placeholder="Capital" style={styles.input} keyboardType="numeric" value={capital} onChangeText={setCapital} />

          <Text style={styles.label}>Taxa de Juros (%)</Text>
          <TextInput placeholder="Juros" style={styles.input} keyboardType="numeric" value={juros} onChangeText={setJuros} />

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
          
          <TouchableOpacity style={styles.btnP} onPress={handleSalvar}>
            {/* AQUI ESTÁ A CORREÇÃO BLINDADA: \u00C7 = Ç, \u00C3 = Ã */}
            <Text style={styles.btnTxt}>SALVAR CORRE{'\u00C7'}{'\u00C3'}O</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={fechar} style={styles.btnCancel}>
            <Text style={{color:'#999'}}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mF: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  mC: { backgroundColor: '#FFF', width: '85%', padding: 20, borderRadius: 15 },
  mT: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  label: { fontSize: 12, color: '#666', marginBottom: 4, marginLeft: 2, fontWeight: 'bold' },
  input: { backgroundColor: '#F1F3F4', padding: 12, borderRadius: 8, marginBottom: 10, color: '#333' },
  btnP: { backgroundColor: '#27AE60', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnTxt: { color: '#FFF', fontWeight: 'bold' },
  btnCancel: { marginTop: 15, alignItems: 'center', padding: 10 }
});
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';

type Props = {
  visivel: boolean;
  fechar: () => void;
  aoImportar: (dados: any) => void;
};

export default function ModalImportar({ visivel, fechar, aoImportar }: Props) {
  const [texto, setTexto] = useState('');

  const handleImportar = () => {
    try {
      if (!texto) return;
      const dados = JSON.parse(texto);
      if (Array.isArray(dados)) {
        aoImportar(dados);
        setTexto(''); // Limpa o campo
      } else {
        Alert.alert("Erro", "Formato inv\u00E1lido"); // invlido
      }
    } catch (e) {
      Alert.alert("Erro", "C\u00F3digo inv\u00E1lido"); // Código inválido
    }
  };

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={fechar}>
      <View style={styles.mF}>
        <View style={styles.mC}>
          <Text style={styles.mT}>Restaurar Backup</Text>
          <TextInput 
            placeholder="Cole o codigo aqui" 
            style={[styles.input, {height:80}]} 
            multiline 
            value={texto} 
            onChangeText={setTexto} 
          />
          <TouchableOpacity style={styles.btnP} onPress={handleImportar}>
            <Text style={styles.btnTxt}>RESTAURAR</Text>
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
  input: { backgroundColor: '#F1F3F4', padding: 12, borderRadius: 8, marginBottom: 10, color: '#333' },
  btnP: { backgroundColor: '#27AE60', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnTxt: { color: '#FFF', fontWeight: 'bold' },
  btnCancel: { marginTop: 15, alignItems: 'center', padding: 10 }
});
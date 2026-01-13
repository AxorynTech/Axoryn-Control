import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';
import { Contrato } from '../types';

type Props = {
  visivel: boolean;
  contrato: Contrato | null;
  fechar: () => void;
  confirmar: (data: string) => void;
};

export default function ModalPagarParcela({ visivel, contrato, fechar, confirmar }: Props) {
  const [data, setData] = useState('');

  useEffect(() => {
    if (visivel) setData(new Date().toLocaleDateString('pt-BR'));
  }, [visivel]);

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={fechar}>
      <View style={styles.fundo}>
        <View style={styles.card}>
          <View style={styles.cabecalho}>
            <Text style={styles.titulo}>PAGAR PARCELA</Text>
          </View>

          <View style={styles.corpo}>
            {contrato && (
              <Text style={styles.descricao}>
                Confirmar recebimento da parcela <Text style={{fontWeight:'bold'}}>{(contrato.parcelasPagas || 0) + 1}/{contrato.totalParcelas}</Text>?
                {'\n'}Valor: <Text style={{fontWeight:'bold', color:'#27AE60'}}>R$ {contrato.valorParcela?.toFixed(2)}</Text>
              </Text>
            )}
            
            <Text style={styles.label}>Data do Pagamento</Text>
            <TextInput 
              style={styles.input} 
              value={data} 
              onChangeText={setData} 
              placeholder="DD/MM/AAAA"
              keyboardType="numeric"
            />
            
            <TouchableOpacity 
              style={styles.botaoConfirmar} 
              onPress={() => confirmar(data)}
            >
              <Text style={styles.textoBotao}>CONFIRMAR RECEBIMENTO</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={fechar} style={styles.botaoCancelar}>
              <Text style={styles.textoCancelar}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#FFF', width: '85%', borderRadius: 15, overflow: 'hidden', elevation: 5 },
  cabecalho: { backgroundColor: '#8E44AD', padding: 15, alignItems: 'center' },
  titulo: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  corpo: { padding: 20 },
  descricao: { textAlign: 'center', color: '#555', marginBottom: 20, fontSize: 14, lineHeight: 20 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 5, marginLeft: 2 },
  input: { backgroundColor: '#F1F3F4', padding: 14, borderRadius: 8, marginBottom: 20, color: '#333', fontSize: 16, textAlign: 'center', fontWeight: 'bold' },
  botaoConfirmar: { backgroundColor: '#27AE60', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  textoBotao: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  botaoCancelar: { alignItems: 'center', padding: 10 },
  textoCancelar: { color: '#999', fontWeight: 'bold' }
});
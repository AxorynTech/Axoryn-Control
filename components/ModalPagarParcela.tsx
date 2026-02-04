import DateTimePicker from '@react-native-community/datetimepicker'; // <--- IMPORT NOVO
import React, { useEffect, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Contrato } from '../types';

type Props = {
  visivel: boolean;
  contrato: Contrato | null;
  fechar: () => void;
  confirmar: (data: string) => void;
};

export default function ModalPagarParcela({ visivel, contrato, fechar, confirmar }: Props) {
  // Mudamos de string para Date
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  // Reseta para a data de hoje ao abrir
  useEffect(() => {
    if (visivel) {
      setDate(new Date());
    }
  }, [visivel]);

  // Função que captura a mudança no calendário
  const onChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

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
            
            {/* SUBSTITUIÇÃO: Botão com aparência de Input que abre o calendário */}
            <TouchableOpacity 
              style={styles.inputBotao} 
              onPress={() => setShowPicker(true)}
            >
              <Text style={styles.textoData}>
                {date.toLocaleDateString('pt-BR')}
              </Text>
            </TouchableOpacity>

            {/* Componente do Calendário */}
            {showPicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={onChange}
                maximumDate={new Date()} // Opcional: Evita datas futuras
              />
            )}
            
            <TouchableOpacity 
              style={styles.botaoConfirmar} 
              onPress={() => confirmar(date.toLocaleDateString('pt-BR'))}
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
  
  // ADAPTADO: Renomeei para inputBotao para manter a semântica
  inputBotao: { 
    backgroundColor: '#F1F3F4', 
    padding: 14, 
    borderRadius: 8, 
    marginBottom: 20, 
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  // NOVO: Estilo do texto dentro do botão
  textoData: {
    color: '#333', 
    fontSize: 16, 
    fontWeight: 'bold'
  },

  botaoConfirmar: { backgroundColor: '#27AE60', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  textoBotao: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  botaoCancelar: { alignItems: 'center', padding: 10 },
  textoCancelar: { color: '#999', fontWeight: 'bold' }
});
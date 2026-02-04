import DateTimePicker from '@react-native-community/datetimepicker'; // <--- IMPORT NOVO
import React, { useEffect, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  visivel: boolean;
  tipo: string; // 'RENOVAR' ou 'QUITAR'
  fechar: () => void;
  confirmar: (dataInformada: string) => void;
};

export default function ModalAcao({ visivel, tipo, fechar, confirmar }: Props) {
  // Mudamos o estado de string para Date para funcionar com o calendário
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  // Toda vez que abrir o modal, reseta a data para hoje
  useEffect(() => {
    if (visivel) {
      setDate(new Date());
    }
  }, [visivel]);

  // Função que captura a mudança no calendário
  const onChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false); // Fecha o modal nativo no Android
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  // Define a cor baseada no tipo de ação
  const corPrincipal = tipo === 'QUITAR' ? '#27AE60' : '#2980B9';
  
  // Texto descritivo (Mantido original)
  const textoDescricao = tipo === 'QUITAR' 
    ? 'O cliente pagou tudo? Informe a data:' 
    : 'O cliente pagou s\u00F3 os juros? Informe a data:';

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={fechar}>
      <View style={styles.fundo}>
        <View style={styles.card}>
          {/* Cabeçalho com cor dinâmica */}
          <View style={[styles.cabecalho, { backgroundColor: corPrincipal }]}>
            <Text style={styles.titulo}>{tipo}</Text>
          </View>

          <View style={styles.corpo}>
            <Text style={styles.descricao}>{textoDescricao}</Text>
            
            <Text style={styles.label}>Data do Pagamento</Text>
            
            {/* SUBSTITUIÇÃO: Em vez de TextInput, usamos um TouchableOpacity 
               com a mesma aparência para abrir o calendário.
            */}
            <TouchableOpacity 
              style={styles.inputBotao} 
              onPress={() => setShowPicker(true)}
            >
              <Text style={styles.textoData}>
                {date.toLocaleDateString('pt-BR')}
              </Text>
            </TouchableOpacity>

            {/* Componente do Calendário (Invisível até ser chamado) */}
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
              style={[styles.botaoConfirmar, { backgroundColor: corPrincipal }]} 
              onPress={() => confirmar(date.toLocaleDateString('pt-BR'))}
            >
              <Text style={styles.textoBotao}>CONFIRMAR {tipo}</Text>
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
  
  cabecalho: { padding: 15, alignItems: 'center' },
  titulo: { fontSize: 18, fontWeight: 'bold', color: '#FFF', letterSpacing: 1 },
  
  corpo: { padding: 20 },
  descricao: { textAlign: 'center', color: '#666', marginBottom: 20, fontSize: 14 },
  
  label: { fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 5, marginLeft: 2 },
  
  // ADAPTADO: Renomeei 'input' para 'inputBotao' e adicionei alignItems para centralizar o texto
  inputBotao: { 
    backgroundColor: '#F1F3F4', 
    padding: 14, 
    borderRadius: 8, 
    marginBottom: 20, 
    alignItems: 'center', 
    justifyContent: 'center'
  },
  
  // NOVO: Estilo do texto da data dentro do botão
  textoData: {
    color: '#333', 
    fontSize: 16, 
    fontWeight: 'bold'
  },
  
  botaoConfirmar: { padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  textoBotao: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  
  botaoCancelar: { alignItems: 'center', padding: 10 },
  textoCancelar: { color: '#999', fontWeight: 'bold' }
});
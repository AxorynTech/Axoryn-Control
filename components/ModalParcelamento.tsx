import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';

type Props = {
  visivel: boolean;
  fechar: () => void;
  // ATUALIZADO: Agora recebe também o valor da multa
  confirmar: (valorTotal: number, qtdParcelas: number, dataPrimeira: string, multaDiaria: number) => void;
};

export default function ModalParcelamento({ visivel, fechar, confirmar }: Props) {
  const [valorTotal, setValorTotal] = useState('');
  const [qtdParcelas, setQtdParcelas] = useState('');
  const [dataPrimeira, setDataPrimeira] = useState('');
  const [multa, setMulta] = useState('');

  const calcularParcela = () => {
    if(!valorTotal || !qtdParcelas) return '0.00';
    return (parseFloat(valorTotal) / parseInt(qtdParcelas)).toFixed(2);
  };

  const handleConfirmar = () => {
    if (!valorTotal || !qtdParcelas || !dataPrimeira) return Alert.alert("Erro", "Preencha tudo");
    
    // Envia os dados, incluindo a multa (se estiver vazio, vai 0)
    confirmar(
      parseFloat(valorTotal), 
      parseInt(qtdParcelas), 
      dataPrimeira,
      multa ? parseFloat(multa) : 0
    );
    
    setValorTotal(''); setQtdParcelas(''); setDataPrimeira(''); setMulta('');
  };

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={fechar}>
      <View style={styles.fundo}>
        <View style={styles.card}>
          <View style={styles.cabecalho}>
            {/* \u00C7 = Ç, \u00C3 = Ã */}
            <Text style={styles.titulo}>NEGOCIA{'\u00C7'}{'\u00C3'}O / ACORDO</Text>
          </View>

          <View style={styles.corpo}>
            <Text style={styles.aviso}>
              Ao confirmar, o empr{'\u00E9'}stimo vira um parcelamento fixo.
            </Text>
            
            <Text style={styles.label}>Valor TOTAL do Acordo (R$)</Text>
            <TextInput style={styles.input} value={valorTotal} onChangeText={setValorTotal} placeholder="Ex: 1000.00" keyboardType="numeric" />
            
            <Text style={styles.label}>Quantidade de Parcelas</Text>
            <TextInput style={styles.input} value={qtdParcelas} onChangeText={setQtdParcelas} placeholder="Ex: 5" keyboardType="numeric" />

            {/* CAMPO NOVO: MULTA */}
            <Text style={styles.label}>Multa por Dia de Atraso (R$)</Text>
            <TextInput 
              style={[styles.input, {borderColor: '#E74C3C', borderWidth: 1}]} 
              value={multa} 
              onChangeText={setMulta} 
              placeholder="Ex: 5.00" 
              keyboardType="numeric" 
            />

            <Text style={styles.label}>Data da 1{'\u00AA'} Parcela</Text>
            <TextInput style={styles.input} value={dataPrimeira} onChangeText={setDataPrimeira} placeholder="DD/MM/AAAA" />

            <View style={styles.resumo}>
              <Text style={styles.resumoTexto}>
                Ser{'\u00E3'}o {qtdParcelas || '0'}x de <Text style={{fontWeight:'bold', color:'#8E44AD'}}>R$ {calcularParcela()}</Text>
              </Text>
            </View>
            
            <TouchableOpacity style={styles.botaoConfirmar} onPress={handleConfirmar}>
              <Text style={styles.textoBotao}>CRIAR PARCELAMENTO</Text>
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
  aviso: { fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 15, fontStyle: 'italic' },
  label: { fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 5, marginLeft: 2 },
  input: { backgroundColor: '#F1F3F4', padding: 12, borderRadius: 8, marginBottom: 10, color: '#333', fontSize: 16, fontWeight: 'bold' },
  resumo: { alignItems: 'center', marginBottom: 20, padding: 10, backgroundColor: '#F5EEF8', borderRadius: 8 },
  resumoTexto: { fontSize: 14, color: '#555' },
  botaoConfirmar: { backgroundColor: '#8E44AD', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  textoBotao: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  botaoCancelar: { alignItems: 'center', padding: 10 },
  textoCancelar: { color: '#999', fontWeight: 'bold' }
});
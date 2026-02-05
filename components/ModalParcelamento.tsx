import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next'; // <--- Importação da tradução
import { Alert, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Props = {
  visivel: boolean;
  fechar: () => void;
  // ATUALIZADO: Agora recebe também o valor da multa
  confirmar: (valorTotal: number, qtdParcelas: number, dataPrimeira: string, multaDiaria: number) => void;
};

export default function ModalParcelamento({ visivel, fechar, confirmar }: Props) {
  const { t } = useTranslation(); // <--- Hook de tradução
  
  const [valorTotal, setValorTotal] = useState('');
  const [qtdParcelas, setQtdParcelas] = useState('');
  const [multa, setMulta] = useState('');
  
  // ESTADO NOVO: Data para o calendário
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  // Pega formatação de data e moeda do JSON
  const localeData = t('common.formatoData', { defaultValue: 'pt-BR' });
  const moeda = t('common.moeda', { defaultValue: 'R$' });

  // Reseta a data para hoje sempre que abrir o modal
  useEffect(() => {
    if (visivel) {
      setDate(new Date());
    }
  }, [visivel]);

  const calcularParcela = () => {
    if(!valorTotal || !qtdParcelas) return '0.00';
    return (parseFloat(valorTotal) / parseInt(qtdParcelas)).toFixed(2);
  };

  // Função que captura a mudança no calendário
  const onChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleConfirmar = () => {
    if (!valorTotal || !qtdParcelas) return Alert.alert(t('common.erro'), t('common.preenchaCampos'));
    
    // Envia os dados, incluindo a multa (se estiver vazio, vai 0)
    confirmar(
      parseFloat(valorTotal), 
      parseInt(qtdParcelas), 
      date.toLocaleDateString(localeData), // <--- Envia a data formatada
      multa ? parseFloat(multa) : 0
    );
    
    setValorTotal(''); setQtdParcelas(''); setMulta('');
  };

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={fechar}>
      <View style={styles.fundo}>
        <View style={styles.card}>
          <View style={styles.cabecalho}>
            <Text style={styles.titulo}>{t('modalParcelamento.titulo')}</Text>
          </View>

          <View style={styles.corpo}>
            <Text style={styles.aviso}>
              {t('modalParcelamento.aviso')}
            </Text>
            
            <Text style={styles.label}>{t('modalParcelamento.valorTotal')} ({moeda})</Text>
            <TextInput style={styles.input} value={valorTotal} onChangeText={setValorTotal} placeholder="Ex: 1000.00" keyboardType="numeric" />
            
            <Text style={styles.label}>{t('modalParcelamento.qtdParcelas')}</Text>
            <TextInput style={styles.input} value={qtdParcelas} onChangeText={setQtdParcelas} placeholder="Ex: 5" keyboardType="numeric" />

            {/* CAMPO NOVO: MULTA */}
            <Text style={styles.label}>{t('modalParcelamento.multaDiaria')} ({moeda})</Text>
            <TextInput 
              style={[styles.input, {borderColor: '#E74C3C', borderWidth: 1}]} 
              value={multa} 
              onChangeText={setMulta} 
              placeholder="Ex: 5.00" 
              keyboardType="numeric" 
            />

            <Text style={styles.label}>{t('modalParcelamento.dataPrimeira')}</Text>
            
            {/* SUBSTITUIÇÃO: Botão que abre o calendário */}
            <TouchableOpacity 
              style={styles.inputBotao} 
              onPress={() => setShowPicker(true)}
            >
              <Text style={styles.textoData}>
                {date.toLocaleDateString(localeData)}
              </Text>
            </TouchableOpacity>

            {/* Componente do Calendário */}
            {showPicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={onChange}
              />
            )}

            <View style={styles.resumo}>
              <Text style={styles.resumoTexto}>
                {t('modalParcelamento.serao')} {qtdParcelas || '0'}x {t('modalParcelamento.de')} <Text style={{fontWeight:'bold', color:'#8E44AD'}}>{moeda} {calcularParcela()}</Text>
              </Text>
            </View>
            
            <TouchableOpacity style={styles.botaoConfirmar} onPress={handleConfirmar}>
              <Text style={styles.textoBotao}>{t('modalParcelamento.btnCriar')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={fechar} style={styles.botaoCancelar}>
              <Text style={styles.textoCancelar}>{t('common.cancelar')}</Text>
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
  
  // ADAPTADO: Estilo do botão que finge ser input
  inputBotao: { 
    backgroundColor: '#F1F3F4', 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 10, 
    alignItems: 'center',
    justifyContent: 'center'
  },
  textoData: {
    color: '#333', 
    fontSize: 16, 
    fontWeight: 'bold'
  },

  resumo: { alignItems: 'center', marginBottom: 20, padding: 10, backgroundColor: '#F5EEF8', borderRadius: 8 },
  resumoTexto: { fontSize: 14, color: '#555' },
  botaoConfirmar: { backgroundColor: '#8E44AD', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  textoBotao: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  botaoCancelar: { alignItems: 'center', padding: 10 },
  textoCancelar: { color: '#999', fontWeight: 'bold' }
});
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next'; // <--- Importação da tradução
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Contrato } from '../types';

type Props = {
  visivel: boolean;
  contrato: Contrato | null;
  fechar: () => void;
  confirmar: (data: string) => void;
};

export default function ModalPagarParcela({ visivel, contrato, fechar, confirmar }: Props) {
  const { t, i18n } = useTranslation(); // <--- Hook de tradução
  
  // Pega o locale do arquivo de configuração (pt-BR ou en-US)
  const localeData = t('common.formatoData', { defaultValue: 'pt-BR' });
  const moeda = t('common.moeda', { defaultValue: 'R$' });

  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (visivel) {
      setDate(new Date());
    }
  }, [visivel]);

  const onChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleConfirmar = () => {
      // Envia a data formatada de acordo com o idioma local para o hook processar
      confirmar(date.toLocaleDateString(localeData));
  };

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={fechar}>
      <View style={styles.fundo}>
        <View style={styles.card}>
          <View style={styles.cabecalho}>
            {/* TRADUZIDO: Título */}
            <Text style={styles.titulo}>{t('pagarParcela.titulo')}</Text>
          </View>

          <View style={styles.corpo}>
            {contrato && (
              <Text style={styles.descricao}>
                {/* TRADUZIDO: Texto descritivo com formatação */}
                {t('pagarParcela.confirmarMsg')} <Text style={{fontWeight:'bold'}}>{(contrato.parcelasPagas || 0) + 1}/{contrato.totalParcelas}</Text>?
                {'\n'}{t('pagarParcela.valor')}: <Text style={{fontWeight:'bold', color:'#27AE60'}}>{moeda} {contrato.valorParcela?.toFixed(2)}</Text>
              </Text>
            )}
            
            {/* TRADUZIDO: Label da Data */}
            <Text style={styles.label}>{t('pagarParcela.dataPagamento')}</Text>
            
            <TouchableOpacity 
              style={styles.inputBotao} 
              onPress={() => setShowPicker(true)}
            >
              <Text style={styles.textoData}>
                {/* Formata a data visualmente conforme o idioma */}
                {date.toLocaleDateString(localeData)}
              </Text>
            </TouchableOpacity>

            {showPicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={onChange}
                maximumDate={new Date()} 
              />
            )}
            
            <TouchableOpacity 
              style={styles.botaoConfirmar} 
              onPress={handleConfirmar}
            >
              {/* TRADUZIDO: Botão Confirmar */}
              <Text style={styles.textoBotao}>{t('pagarParcela.btnReceber')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={fechar} style={styles.botaoCancelar}>
              {/* TRADUZIDO: Botão Cancelar */}
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
  descricao: { textAlign: 'center', color: '#555', marginBottom: 20, fontSize: 14, lineHeight: 20 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 5, marginLeft: 2 },
  inputBotao: { 
    backgroundColor: '#F1F3F4', 
    padding: 14, 
    borderRadius: 8, 
    marginBottom: 20, 
    alignItems: 'center',
    justifyContent: 'center'
  },
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
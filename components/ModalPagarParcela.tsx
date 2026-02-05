import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next'; // <--- Importação da tradução
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Contrato } from '../types';

type Props = {
  visivel: boolean;
  contrato: Contrato | null;
  fechar: () => void;
  confirmar: (data: string) => void;
};

export default function ModalPagarParcela({ visivel, contrato, fechar, confirmar }: Props) {
  const { t } = useTranslation(); // <--- Hook de tradução
  
  const moeda = t('common.moeda', { defaultValue: 'R$' });

  // Agora usamos string para o input manual
  const [data, setData] = useState('');

  useEffect(() => {
    if (visivel) {
      // Preenche automaticamente com a data de hoje (DD/MM/AAAA)
      const hoje = new Date();
      const dia = String(hoje.getDate()).padStart(2, '0');
      const mes = String(hoje.getMonth() + 1).padStart(2, '0');
      const ano = hoje.getFullYear();
      setData(`${dia}/${mes}/${ano}`);
    }
  }, [visivel]);

  const handleConfirmar = () => {
      // Envia a data digitada diretamente
      confirmar(data);
  };

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={fechar}>
      <View style={styles.fundo}>
        <View style={styles.card}>
          <View style={styles.cabecalho}>
            <Text style={styles.titulo}>{t('pagarParcela.titulo')}</Text>
          </View>

          <View style={styles.corpo}>
            {contrato && (
              <Text style={styles.descricao}>
                {t('pagarParcela.confirmarMsg')} <Text style={{fontWeight:'bold'}}>{(contrato.parcelasPagas || 0) + 1}/{contrato.totalParcelas}</Text>?
                {'\n'}{t('pagarParcela.valor')}: <Text style={{fontWeight:'bold', color:'#27AE60'}}>{moeda} {contrato.valorParcela?.toFixed(2)}</Text>
              </Text>
            )}
            
            <Text style={styles.label}>{t('pagarParcela.dataPagamento')}</Text>
            
            {/* SUBSTITUIÇÃO: Input Manual de Data */}
            <TextInput 
              style={styles.input} 
              value={data} 
              onChangeText={setData} 
              placeholder="DD/MM/AAAA"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
            
            <TouchableOpacity 
              style={styles.botaoConfirmar} 
              onPress={handleConfirmar}
            >
              <Text style={styles.textoBotao}>{t('pagarParcela.btnReceber')}</Text>
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
  descricao: { textAlign: 'center', color: '#555', marginBottom: 20, fontSize: 14, lineHeight: 20 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 5, marginLeft: 2 },
  
  // Estilo adaptado para o TextInput
  input: { 
    backgroundColor: '#F1F3F4', 
    padding: 14, 
    borderRadius: 8, 
    marginBottom: 20, 
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  
  botaoConfirmar: { backgroundColor: '#27AE60', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  textoBotao: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  botaoCancelar: { alignItems: 'center', padding: 10 },
  textoCancelar: { color: '#999', fontWeight: 'bold' }
});
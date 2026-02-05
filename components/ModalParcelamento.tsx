import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

type Props = {
  visivel: boolean;
  fechar: () => void;
  confirmar: (valorTotal: number, qtdParcelas: number, dataPrimeira: string, multaDiaria: number) => void;
};

export default function ModalParcelamento({ visivel, fechar, confirmar }: Props) {
  const { t } = useTranslation();
  
  const [valorTotal, setValorTotal] = useState('');
  const [qtdParcelas, setQtdParcelas] = useState('');
  const [multa, setMulta] = useState('');
  
  const [data, setData] = useState('');

  const moeda = t('common.moeda', { defaultValue: 'R$' });

  useEffect(() => {
    if (visivel) {
      const hoje = new Date();
      const dia = String(hoje.getDate()).padStart(2, '0');
      const mes = String(hoje.getMonth() + 1).padStart(2, '0');
      const ano = hoje.getFullYear();
      setData(`${dia}/${mes}/${ano}`);
    }
  }, [visivel]);

  const calcularParcela = () => {
    if(!valorTotal || !qtdParcelas) return '0.00';
    return (parseFloat(valorTotal) / parseInt(qtdParcelas)).toFixed(2);
  };

  const handleConfirmar = () => {
    if (!valorTotal || !qtdParcelas) return Alert.alert(t('common.erro'), t('common.preenchaCampos'));
    
    if (!data || data.length < 8) return Alert.alert(t('common.erro'), "Informe uma data válida (DD/MM/AAAA).");

    confirmar(
      parseFloat(valorTotal), 
      parseInt(qtdParcelas), 
      data, 
      multa ? parseFloat(multa) : 0
    );
    
    setValorTotal(''); setQtdParcelas(''); setMulta('');
  };

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={fechar}>
      {/* KeyboardAvoidingView: Empurra o conteúdo para cima no iOS.
         Behavior 'padding' costuma funcionar melhor com Modais centralizados.
      */}
      <KeyboardAvoidingView 
        style={styles.fundo} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* ScrollView: Permite rolar para ver campos escondidos */}
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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

              <Text style={styles.label}>{t('modalParcelamento.multaDiaria')} ({moeda})</Text>
              <TextInput 
                style={[styles.input, {borderColor: '#E74C3C', borderWidth: 1}]} 
                value={multa} 
                onChangeText={setMulta} 
                placeholder="Ex: 5.00" 
                keyboardType="numeric" 
              />

              <Text style={styles.label}>{t('modalParcelamento.dataPrimeira')}</Text>
              <TextInput 
                style={styles.input} 
                value={data}
                onChangeText={setData}
                placeholder="DD/MM/AAAA"
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />

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
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  // Novo estilo para alinhar o conteúdo do scroll no centro
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20
  },
  card: { 
    backgroundColor: '#FFF', 
    width: '85%', 
    minWidth: 300, // Garante largura mínima
    maxWidth: 400, // Limita largura em telas grandes
    borderRadius: 15, 
    overflow: 'hidden', 
    elevation: 5 
  },
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
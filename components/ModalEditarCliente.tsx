import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next'; // <--- Importação da tradução
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Props = {
  visivel: boolean;
  clienteOriginal: any;
  fechar: () => void;
  salvar: (dadosAtualizados: any) => void;
};

export default function ModalEditarCliente({ visivel, clienteOriginal, fechar, salvar }: Props) {
  const { t } = useTranslation(); // <--- Hook de tradução
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [endereco, setEndereco] = useState('');
  const [indicacao, setIndicacao] = useState('');
  const [reputacao, setReputacao] = useState('');
  const [segmento, setSegmento] = useState('EMPRESTIMO');

  useEffect(() => {
    if (clienteOriginal) {
      setNome(clienteOriginal.nome || '');
      setWhatsapp(clienteOriginal.whatsapp || '');
      setEndereco(clienteOriginal.endereco || '');
      setIndicacao(clienteOriginal.indicacao || '');
      setReputacao(clienteOriginal.reputacao || '');
      setSegmento(clienteOriginal.segmento || 'EMPRESTIMO');
    } else {
      setNome(''); setWhatsapp(''); setEndereco(''); setIndicacao(''); setReputacao('');
    }
  }, [clienteOriginal, visivel]);

  const handleSalvar = () => {
    if (!nome.trim()) return Alert.alert(t('common.erro'), t('modalEditarCliente.erroNome'));
    salvar({ nome: nome.trim().toUpperCase(), whatsapp, endereco, indicacao, reputacao, segmento });
  };

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={fechar}>
      {/* Container principal com KeyboardAvoidingView */}
      <KeyboardAvoidingView 
        style={styles.mF} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.mC}>
          <ScrollView 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.mT}>
                {clienteOriginal ? t('modalEditarCliente.tituloEditar') : t('cadastro.titulo')}
            </Text>
            
            <TextInput 
                placeholder={t('cadastro.nome')} 
                placeholderTextColor="#999" 
                style={styles.input} 
                value={nome} 
                onChangeText={setNome} 
            />
            
            <Text style={{fontWeight:'bold', marginBottom:5, color:'#555'}}>{t('cadastro.segmento')}:</Text>
            <View style={styles.rowSeg}>
               <TouchableOpacity onPress={() => setSegmento('EMPRESTIMO')} style={[styles.btnSeg, segmento === 'EMPRESTIMO' && styles.btnSegAtivo]}>
                 <Text style={[styles.txtSeg, segmento === 'EMPRESTIMO' && styles.txtSegAtivo]}>{t('cadastro.segEmprestimo')}</Text>
               </TouchableOpacity>
               <TouchableOpacity onPress={() => setSegmento('VENDA')} style={[styles.btnSeg, segmento === 'VENDA' && styles.btnSegAtivo]}>
                 <Text style={[styles.txtSeg, segmento === 'VENDA' && styles.txtSegAtivo]}>{t('cadastro.segVenda')}</Text>
               </TouchableOpacity>
               <TouchableOpacity onPress={() => setSegmento('AMBOS')} style={[styles.btnSeg, segmento === 'AMBOS' && styles.btnSegAtivo]}>
                 <Text style={[styles.txtSeg, segmento === 'AMBOS' && styles.txtSegAtivo]}>{t('cadastro.segAmbos')}</Text>
               </TouchableOpacity>
            </View>

            <TextInput 
                placeholder={t('cadastro.whatsapp')} 
                placeholderTextColor="#999" 
                style={styles.input} 
                value={whatsapp} 
                onChangeText={setWhatsapp} 
                keyboardType="phone-pad" 
            />
            <TextInput 
                placeholder={t('cadastro.endereco')} 
                placeholderTextColor="#999" 
                style={styles.input} 
                value={endereco} 
                onChangeText={setEndereco} 
            />
            <TextInput 
                placeholder={t('cadastro.indicacao')} 
                placeholderTextColor="#999" 
                style={styles.input} 
                value={indicacao} 
                onChangeText={setIndicacao} 
            />
            <TextInput 
                placeholder={t('cadastro.reputacao')} 
                placeholderTextColor="#999" 
                style={styles.input} 
                value={reputacao} 
                onChangeText={setReputacao} 
            />
            
            <TouchableOpacity style={styles.btnP} onPress={handleSalvar}>
              <Text style={styles.btnTxt}>{t('modalEditarCliente.btnSalvarMudancas')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={fechar} style={styles.btnCancel}>
              <Text style={{color:'#999'}}>{t('common.cancelar')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mF: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  mC: { 
    backgroundColor: '#FFF', 
    width: '100%', 
    maxWidth: 400,
    borderRadius: 15, 
    padding: 20,
    maxHeight: '85%', // Limite de altura
    flexShrink: 1, // Permite encolher se o teclado apertar
    elevation: 5
  },
  mT: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#333' },
  input: { backgroundColor: '#F1F3F4', padding: 12, borderRadius: 8, marginBottom: 10, color: '#333', fontSize: 16 },
  
  rowSeg: { flexDirection: 'row', gap: 5, marginBottom: 15 },
  btnSeg: { flex: 1, padding: 8, borderRadius: 6, backgroundColor: '#EEE', alignItems: 'center' },
  btnSegAtivo: { backgroundColor: '#2980B9' },
  txtSeg: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  txtSegAtivo: { color: '#FFF' },

  btnP: { 
    backgroundColor: '#2980B9',
    padding: 12, borderRadius: 8, alignItems: 'center' 
  },
  btnTxt: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  btnCancel: { marginTop: 15, alignItems: 'center', padding: 10 }
});
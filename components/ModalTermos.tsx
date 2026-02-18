import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ModalTermos({ visivel, fechar, aceitar }: any) {
  const { t } = useTranslation();

  const renderItem = (numero: number) => {
    const tituloKey = `termos.item${numero}Tit`;
    const textoKey = `termos.item${numero}Txt`;
    
    // @ts-ignore
    const titulo = t(tituloKey);
    // @ts-ignore
    const texto = t(textoKey);
    
    // Se a tradução não existir (retornar a própria chave), esconde o item
    if (titulo === tituloKey || !titulo) return null;

    return (
      <View key={numero} style={{ marginBottom: 20 }}>
        <Text style={styles.bold}>{titulo}</Text>
        <Text style={styles.textoItem}>{texto}</Text>
      </View>
    );
  };

  // Cria um array de 1 a 30 para tentar renderizar até 30 cláusulas
  const listaItens = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <Modal visible={visivel} animationType="slide" transparent={true} onRequestClose={fechar}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.titulo}>{t('termos.tituloPrincipal')}</Text>
          
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={true}>
            <View onStartShouldSetResponder={() => true}>
                <Text style={styles.intro}>{t('termos.intro')}</Text>
                
                {listaItens.map((num) => renderItem(num))}

                <Text style={styles.conclusao}>
                    {t('termos.conclusao')}
                </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity onPress={fechar} style={styles.btnRecusar}>
              <Text style={[styles.txtBtn, styles.txtRecusar]}>{t('common.cancelar')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={aceitar} style={styles.btnAceitar}>
              <Text style={[styles.txtBtn, styles.txtAceitar]}>{t('termos.btnAceitar')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 12, maxHeight: '90%', padding: 20, elevation: 10 },
  titulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#2C3E50' },
  scrollView: { marginBottom: 20 },
  intro: { fontSize: 13, color: '#555', marginBottom: 15, fontStyle: 'italic' },
  textoItem: { fontSize: 13, color: '#333', lineHeight: 20, textAlign: 'justify', marginTop: 4 },
  bold: { fontWeight: 'bold', color: '#2980B9', fontSize: 14, marginTop: 10, textTransform: 'uppercase' },
  conclusao: { fontStyle: 'italic', fontWeight: 'bold', marginTop: 25, color: '#2C3E50', textAlign:'center', padding: 10, backgroundColor:'#ECF0F1', borderRadius: 8 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  btnRecusar: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#C0392B' },
  btnAceitar: { flex: 1, backgroundColor: '#27AE60', padding: 14, borderRadius: 8, alignItems: 'center', elevation: 2 },
  txtBtn: { fontWeight: 'bold', fontSize: 12 },
  txtRecusar: { color: '#C0392B' }, 
  txtAceitar: { color: '#FFF' }
});
import React from 'react';
import { useTranslation } from 'react-i18next'; // <--- Importação da tradução
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ModalTermos({ visivel, fechar, aceitar }: any) {
  const { t } = useTranslation(); // <--- Hook de tradução

  return (
    <Modal visible={visivel} animationType="slide" transparent={true} onRequestClose={fechar}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.titulo}>{t('termos.tituloPrincipal')}</Text>
          
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={true}>
            <Text style={styles.texto}>
              {/* ITEM 1 */}
              <Text style={styles.bold}>{t('termos.item1Tit')}</Text>{'\n'}
              {t('termos.item1Txt')}
              {'\n\n'}

              {/* ITEM 2 */}
              <Text style={styles.bold}>{t('termos.item2Tit')}</Text>{'\n'}
              {t('termos.item2Txt')}
              {'\n\n'}

              {/* ITEM 3 */}
              <Text style={styles.bold}>{t('termos.item3Tit')}</Text>{'\n'}
              {t('termos.item3Txt')}
              {'\n\n'}

              {/* ITEM 4 */}
              <Text style={styles.bold}>{t('termos.item4Tit')}</Text>{'\n'}
              {t('termos.item4Txt')}
              {'\n\n'}

              {/* ITEM 5 */}
              <Text style={styles.bold}>{t('termos.item5Tit')}</Text>{'\n'}
              {t('termos.item5Txt')}
              {'\n\n'}

              {/* ITEM 6 - Propriedade Intelectual */}
              <Text style={styles.bold}>{t('termos.item6Tit')}</Text>{'\n'}
              {t('termos.item6Txt')}
              {'\n\n'}

              {/* ITEM 7 - Indenização */}
              <Text style={styles.bold}>{t('termos.item7Tit')}</Text>{'\n'}
              {t('termos.item7Txt')}
              {'\n\n'}

              {/* ITEM 8 - Alterações */}
              <Text style={styles.bold}>{t('termos.item8Tit')}</Text>{'\n'}
              {t('termos.item8Txt')}
              {'\n\n'}

              {/* CONCLUSÃO */}
              <Text style={styles.conclusao}>
                {t('termos.conclusao')}
              </Text>
            </Text>
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
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 10, maxHeight: '85%', padding: 20, elevation: 5 },
  titulo: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#2C3E50' },
  scrollView: { marginBottom: 20 },
  texto: { fontSize: 13, color: '#333', lineHeight: 20, textAlign: 'justify' },
  bold: { fontWeight: 'bold', color: '#2C3E50', fontSize: 14 },
  conclusao: { fontStyle: 'italic', fontWeight: '600', marginTop: 10, color: '#555' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  btnRecusar: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#E74C3C' },
  btnAceitar: { flex: 1, backgroundColor: '#27AE60', padding: 12, borderRadius: 8, alignItems: 'center' },
  txtBtn: { fontWeight: 'bold', fontSize: 13 },
  txtRecusar: { color: '#E74C3C' }, 
  txtAceitar: { color: '#FFF' }
});
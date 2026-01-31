import React from 'react';
import { useTranslation } from 'react-i18next'; // <--- Importação da tradução
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  abaAtual: string;
  setAba: (novaAba: string) => void;
};

export default function MenuAbas({ abaAtual, setAba }: Props) {
  const { t } = useTranslation(); // <--- Hook de tradução

  return (
    <View style={styles.tabBar}>
      
      {/* 1. Botão + CLIENTE */}
      <TouchableOpacity 
        onPress={() => setAba('cadastro')} 
        style={[styles.tab, abaAtual === 'cadastro' && styles.tabA]}
      >
        <Text style={styles.tabT}>{t('menuAbas.novoCliente')}</Text>
      </TouchableOpacity>

      {/* 2. Botão CARTEIRA */}
      <TouchableOpacity 
        onPress={() => setAba('carteira')} 
        style={[styles.tab, abaAtual === 'carteira' && styles.tabA]}
      >
        <Text style={styles.tabT}>{t('menuAbas.carteira')}</Text>
      </TouchableOpacity>

      {/* 3. Botão COBRANÇA */}
      <TouchableOpacity 
        onPress={() => setAba('cobranca')} 
        style={[styles.tab, abaAtual === 'cobranca' && styles.tabA]}
      >
        <Text style={[styles.tabT, { color: '#E74C3C' }]}>
          {t('menuAbas.cobranca')}
        </Text>
      </TouchableOpacity>

      {/* 4. Botão CAIXA PESSOAL (Novo) */}
      <TouchableOpacity 
        onPress={() => setAba('pessoal')} 
        style={[styles.tab, abaAtual === 'pessoal' && styles.tabA]}
      >
        <Text style={[styles.tabT, { color: '#2980B9' }]}>
          {t('menuAbas.caixa')}
        </Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  // flexWrap: 'wrap' ajuda a não quebrar se a tela for muito pequena
  tabBar: { flexDirection: 'row', justifyContent: 'center', marginVertical: 10, flexWrap: 'nowrap' },
  // Reduzi um pouco o padding lateral para caber os 4 botões
  tab: { paddingVertical: 12, paddingHorizontal: 8 }, 
  tabA: { borderBottomWidth: 3, borderBottomColor: '#27AE60' },
  // Reduzi levemente a fonte para garantir leitura em uma linha
  tabT: { fontWeight: 'bold', color: '#7F8C8D', fontSize: 11 },
});
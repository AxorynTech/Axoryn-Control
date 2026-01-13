import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  abaAtual: string;
  setAba: (novaAba: string) => void;
};

export default function MenuAbas({ abaAtual, setAba }: Props) {
  return (
    <View style={styles.tabBar}>
      
      {/* Botão + CLIENTE */}
      <TouchableOpacity 
        onPress={() => setAba('cadastro')} 
        style={[styles.tab, abaAtual === 'cadastro' && styles.tabA]}
      >
        <Text style={styles.tabT}>+ CLIENTE</Text>
      </TouchableOpacity>

      {/* Botão CARTEIRA */}
      <TouchableOpacity 
        onPress={() => setAba('carteira')} 
        style={[styles.tab, abaAtual === 'carteira' && styles.tabA]}
      >
        <Text style={styles.tabT}>CARTEIRA</Text>
      </TouchableOpacity>

      {/* Botão COBRANÇA (Com código universal do Ç) */}
      <TouchableOpacity 
        onPress={() => setAba('cobranca')} 
        style={[styles.tab, abaAtual === 'cobranca' && styles.tabA]}
      >
        <Text style={[styles.tabT, { color: '#E74C3C' }]}>
          COBRAN{'\u00C7'}A
        </Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: 'row', justifyContent: 'center', marginVertical: 10 },
  tab: { padding: 12, paddingHorizontal: 15 },
  tabA: { borderBottomWidth: 3, borderBottomColor: '#27AE60' },
  tabT: { fontWeight: 'bold', color: '#7F8C8D', fontSize: 12 },
});
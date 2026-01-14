import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  capital: number;
  lucro: number;
  multas: number;
  vendas: number;
};

export default function Dashboard({ capital, lucro, multas, vendas }: Props) {
  const [visivel, setVisivel] = useState(true);

  const formatarValor = (valor: number, cor: string) => {
    if (!visivel) return <View style={styles.escondido} />;
    return <Text style={[styles.valor, { color: cor }]}>R$ {valor.toFixed(2)}</Text>;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Visão Geral</Text>
        <TouchableOpacity onPress={() => setVisivel(!visivel)} style={styles.btnOlho}>
          <Ionicons name={visivel ? "eye" : "eye-off"} size={24} color="#555" />
        </TouchableOpacity>
      </View>

      <View style={styles.linha}>
        <View style={styles.card}>
          <Text style={styles.label}>CAPITAL NA RUA</Text>
          {formatarValor(capital, '#E74C3C')}
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>JUROS EMPRÉSTIMOS</Text>
          {/* MUDADO PARA AZUL */}
          {formatarValor(lucro, '#2980B9')} 
        </View>
      </View>

      <View style={[styles.linha, { marginTop: 10 }]}>
        <View style={styles.card}>
          <Text style={styles.label}>RECEB. VENDAS</Text>
          {formatarValor(vendas, '#27AE60')}
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>MULTAS RECEBIDAS</Text>
          {formatarValor(multas, '#F39C12')}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 5 },
  titulo: { fontSize: 20, fontWeight: 'bold', color: '#2C3E50' },
  btnOlho: { padding: 5 },
  linha: { flexDirection: 'row', justifyContent: 'space-between' },
  card: { flex: 1, backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginHorizontal: 5, elevation: 2, alignItems: 'center', minHeight: 80, justifyContent: 'center' },
  label: { fontSize: 10, color: '#7F8C8D', fontWeight: 'bold', marginBottom: 5, textAlign: 'center' },
  valor: { fontSize: 18, fontWeight: 'bold' },
  escondido: { width: '80%', height: 20, backgroundColor: '#E0E0E0', borderRadius: 4, marginTop: 2 }
});
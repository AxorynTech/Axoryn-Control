import React from 'react';
import { TextInput, StyleSheet, View } from 'react-native';

export function BarraPesquisa({ texto, aoDigitar }: any) {
  return (
    <View style={styles.container}>
      <TextInput 
        style={styles.input}
        placeholder="🔍 Buscar cliente..."
        placeholderTextColor="#999"
        value={texto}
        onChangeText={aoDigitar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 15, // Espaço entre a barra e as pastas
    paddingHorizontal: 5, // Um respiro nas laterais
  },
  input: {
    backgroundColor: '#FFFFFF', // Fundo Branco (Mais claro)
    color: '#333', // Letra escura para ler no fundo branco
    padding: 12,
    borderRadius: 12, // Bordas mais arredondadas
    borderWidth: 1,
    borderColor: '#DDD', // Borda cinza bem suave
    fontSize: 16,
    elevation: 2, // Sombra leve no Android
    shadowColor: '#000', // Sombra no iPhone
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }
  },
});
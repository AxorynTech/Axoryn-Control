import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../services/supabase';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async () => {
    if (!password) {
      Alert.alert("Erro", "Digite a nova senha.");
      return;
    }

    try {
      setLoading(true);
      // O link mágico do Supabase JÁ LOGOU o usuário ao abrir o app.
      // Então só precisamos atualizar o usuário atual.
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      Alert.alert("Sucesso", "Senha atualizada! Você será redirecionado.");
      router.replace('/(tabs)'); // Manda para o painel principal

    } catch (error: any) {
      Alert.alert("Erro", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Criar Nova Senha 🔒</Text>
        <Text style={styles.description}>
          O link autenticou você com sucesso. Defina sua nova senha abaixo.
        </Text>

        <Text style={styles.label}>Nova Senha</Text>
        <TextInput
          style={styles.input}
          placeholder="Digite sua nova senha"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
        />

        <TouchableOpacity 
          style={[styles.button, loading && { opacity: 0.7 }]} 
          onPress={handleUpdatePassword}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "SALVANDO..." : "ATUALIZAR SENHA"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#FFF', padding: 25, borderRadius: 15, elevation: 3 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2C3E50', marginBottom: 10, textAlign: 'center' },
  description: { color: '#7F8C8D', textAlign: 'center', marginBottom: 20 },
  label: { fontWeight: 'bold', color: '#34495E', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#BDC3C7', borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 16, backgroundColor: '#FAFAFA' },
  button: { backgroundColor: '#27AE60', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});
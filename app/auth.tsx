import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../services/supabase';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) Alert.alert('Erro no Login', error.message);
    setLoading(false);
  }

  async function signUpWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) Alert.alert('Erro no Cadastro', error.message);
    else Alert.alert('Sucesso', 'Verifique seu e-mail para confirmar o cadastro!');
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verto App</Text>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <TextInput
          onChangeText={(text) => setEmail(text)}
          value={email}
          placeholder="email@endereco.com"
          autoCapitalize={'none'}
          style={styles.input}
        />
      </View>
      <View style={styles.verticallySpaced}>
        <TextInput
          onChangeText={(text) => setPassword(text)}
          value={password}
          secureTextEntry={true}
          placeholder="Senha"
          autoCapitalize={'none'}
          style={styles.input}
        />
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <View style={[styles.verticallySpaced, styles.mt20]}>
            <TouchableOpacity style={styles.button} onPress={signInWithEmail}>
                <Text style={styles.buttonText}>Entrar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.button, styles.buttonOutline]} onPress={signUpWithEmail}>
                <Text style={[styles.buttonText, styles.textOutline]}>Cadastrar</Text>
            </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, flex: 1, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 30, fontWeight: 'bold', textAlign: 'center', marginBottom: 40 },
  verticallySpaced: { paddingTop: 4, paddingBottom: 4, alignSelf: 'stretch' },
  mt20: { marginTop: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 5, fontSize: 16 },
  button: { backgroundColor: '#000', padding: 15, borderRadius: 5, alignItems: 'center', marginBottom: 10 },
  buttonOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#000' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  textOutline: { color: '#000' }
});
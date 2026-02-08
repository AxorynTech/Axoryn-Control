import * as Linking from 'expo-linking';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../services/supabase';

type Props = {
  visivel: boolean;
  fechar: () => void;
};

export default function ModalRecuperarSenha({ visivel, fechar }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRecuperar = async () => {
    if (!email.trim()) {
      Alert.alert("Erro", "Digite seu e-mail para recuperar a senha.");
      return;
    }

    try {
      setLoading(true);
      
      let siteDeRecuperacao;

      if (Platform.OS === 'web') {
        // --- WEB ---
        if (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')) {
             // Teste local: Pega a url do navegador + a rota
             siteDeRecuperacao = `${window.location.origin}/reset-password`;
        } else {
             // PRODUÇÃO: Aponta para a rota do App (e não mais para o arquivo .html)
             siteDeRecuperacao = 'https://axoryntech.com.br/reset-password';
        }
      } else {
        // --- MOBILE ---
        // Cria o deep link para abrir o app
        siteDeRecuperacao = Linking.createURL('/reset-password');
      }

      console.log("🔗 Enviando link para:", siteDeRecuperacao);

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: siteDeRecuperacao,
      });

      if (error) throw error;

      Alert.alert(
        "E-mail Enviado",
        "Acesse seu e-mail e clique no link para redefinir a senha.",
        [{ text: "OK", onPress: () => { setEmail(''); fechar(); } }]
      );
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Falha ao enviar e-mail.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={fechar}>
      <KeyboardAvoidingView style={styles.fundo} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.janela}>
          <Text style={styles.titulo}>Recuperar Senha 🔒</Text>
          <Text style={styles.descricao}>Digite seu e-mail para receber o link.</Text>
          <Text style={styles.label}>E-mail</Text>
          <TextInput 
            style={styles.input} 
            value={email} 
            onChangeText={setEmail} 
            keyboardType="email-address" 
            autoCapitalize="none" 
            placeholder="seu@email.com" 
          />
          <TouchableOpacity style={[styles.btnEnviar, loading && { opacity: 0.7 }]} onPress={handleRecuperar} disabled={loading}>
            <Text style={styles.txtBtn}>{loading ? "ENVIANDO..." : "ENVIAR LINK"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnCancelar} onPress={fechar}>
            <Text style={styles.txtCancelar}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  janela: { backgroundColor: '#FFF', width: '100%', maxWidth: 350, padding: 20, borderRadius: 12, elevation: 5 },
  titulo: { fontSize: 20, fontWeight: 'bold', color: '#2C3E50', marginBottom: 10, textAlign: 'center' },
  descricao: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#FAFAFA', marginBottom: 20 },
  btnEnviar: { backgroundColor: '#2980B9', padding: 12, borderRadius: 8, alignItems: 'center' },
  txtBtn: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  btnCancelar: { marginTop: 15, alignItems: 'center', padding: 10 },
  txtCancelar: { color: '#999', fontSize: 14 }
});
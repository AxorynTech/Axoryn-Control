import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import ModalNovaSenha from '../components/ModalNovaSenha';
import ModalRecuperarSenha from '../components/ModalRecuperarSenha';
import ModalTermos from '../components/ModalTermos';
import { supabase } from '../services/supabase';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [modalRecuperar, setModalRecuperar] = useState(false);
  const [modalNovaSenha, setModalNovaSenha] = useState(false);
  const [termosAceitos, setTermosAceitos] = useState(false);
  const [modalTermosVisivel, setModalTermosVisivel] = useState(false);

  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      let url = event.url;
      console.log("🔗 LINK:", url);

      if (url.includes('%23')) url = url.replace('%23', '#');

      if (url.includes('access_token') && url.includes('refresh_token')) {
        try {
          const hashIndex = url.indexOf('#');
          if (hashIndex === -1) return; 

          const params = new URLSearchParams(url.substring(hashIndex + 1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          const type = params.get('type'); 

          if (accessToken && refreshToken) {
            
            // LÓGICA DE CADASTRO (Vindo de confirmar.html)
            if (type === 'signup') {
              const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
              if (!error) {
                Alert.alert("🎉 Parabéns!", "Cadastro confirmado! Aproveite seus 7 dias gratuitos.", [
                  { text: "COMEÇAR AGORA", onPress: () => router.replace('/(tabs)') }
                ]);
              }
            } 
            // LÓGICA DE RECUPERAÇÃO (Vindo de recuperar.html)
            else if (type === 'recovery') {
              const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
              if (!error) setModalNovaSenha(true); 
            } 
            // LOGIN DIRETO
            else {
              await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
              router.replace('/(tabs)');
            }
          }
        } catch (error: any) {
          console.log("Erro parser:", error);
        }
      }
    };

    const sub = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then((url) => { if (url) handleDeepLink({ url }); });
    return () => sub.remove();
  }, []);

  const loginComTimeout = async (acao: Promise<any>) => {
    const tempoLimite = new Promise((_, reject) => setTimeout(() => reject(new Error("Sem resposta do servidor.")), 15000));
    return Promise.race([acao, tempoLimite]);
  };

  async function handleAuth() {
    if (!email || !password) return Alert.alert("Erro", "Preencha e-mail e senha.");
    if (isSignUp && !termosAceitos) return Alert.alert("Atenção", "Aceite os Termos de Uso.");

    setLoading(true);
    try {
      if (isSignUp) {
        // --- CADASTRO: APONTA PARA confirmar.html ---
        const { error }: any = await loginComTimeout(
          supabase.auth.signUp({ 
            email, 
            password,
            options: {
              // 👇 LINK CORRIGIDO AQUI
              emailRedirectTo: 'https://regal-capybara-c7ac2c.netlify.app/confirmar.html' 
            }
          })
        );
        if (error) throw error;
        Alert.alert("Sucesso", "Cadastro realizado! Verifique seu e-mail.");
      } else {
        // --- LOGIN ---
        const { error, data }: any = await loginComTimeout(
          supabase.auth.signInWithPassword({ email, password })
        );
        if (error) throw error;
        if (data.session) router.replace('/(tabs)'); 
      }
    } catch (error: any) {
      Alert.alert("Erro", error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Image source={require('../assets/images/app-icon.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Axoryn Control</Text>
          <Text style={styles.subtitle}>{isSignUp ? "Crie sua conta" : "Entre para continuar"}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>E-mail</Text>
          <TextInput style={styles.input} placeholder="seu@email.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          
          <Text style={styles.label}>Senha</Text>
          <View style={styles.passwordContainer}>
            <TextInput style={styles.inputPassword} placeholder="********" value={password} onChangeText={setPassword} secureTextEntry={!senhaVisivel} />
            <TouchableOpacity onPress={() => setSenhaVisivel(!senhaVisivel)} style={styles.eyeIcon}>
              <Ionicons name={senhaVisivel ? "eye-off" : "eye"} size={24} color="#7F8C8D" />
            </TouchableOpacity>
          </View>

          {!isSignUp && (
            <TouchableOpacity onPress={() => setModalRecuperar(true)} style={styles.btnEsqueci}>
              <Text style={styles.txtEsqueci}>Esqueci minha senha</Text>
            </TouchableOpacity>
          )}

          {isSignUp && (
            <View style={styles.termosContainer}>
              <TouchableOpacity style={styles.checkbox} onPress={() => setTermosAceitos(!termosAceitos)}>
                <Ionicons name={termosAceitos ? "checkbox" : "square-outline"} size={24} color={termosAceitos ? "#27AE60" : "#888"} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setModalTermosVisivel(true)}>
                <Text style={styles.termosTexto}>Li e concordo com os <Text style={styles.linkTermos}>Termos de Uso</Text></Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={[styles.btnPrimary, loading && styles.btnDisabled]} onPress={handleAuth} disabled={loading}>
            <Text style={styles.txtPrimary}>{loading ? "AGUARDE..." : (isSignUp ? "CADASTRAR" : "ENTRAR")}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnSecondary} onPress={() => setIsSignUp(!isSignUp)}>
            <Text style={styles.txtSecondary}>{isSignUp ? "Já tem uma conta? Entre aqui" : "Não tem conta? Cadastre-se"}</Text>
          </TouchableOpacity>
        </View>

        <ModalRecuperarSenha visivel={modalRecuperar} fechar={() => setModalRecuperar(false)} />
        <ModalNovaSenha visivel={modalNovaSenha} fechar={() => setModalNovaSenha(false)} />
        <ModalTermos visivel={modalTermosVisivel} fechar={() => setModalTermosVisivel(false)} aceitar={() => { setTermosAceitos(true); setModalTermosVisivel(false); }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 30 },
  logo: { width: 100, height: 100, marginBottom: 15, borderRadius: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2C3E50' },
  subtitle: { fontSize: 16, color: '#7F8C8D', marginTop: 5 },
  form: { backgroundColor: '#FFF', padding: 25, borderRadius: 15, elevation: 3 },
  label: { fontWeight: 'bold', color: '#34495E', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#BDC3C7', borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 16, backgroundColor: '#FAFAFA' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#BDC3C7', borderRadius: 8, backgroundColor: '#FAFAFA', marginBottom: 15 },
  inputPassword: { flex: 1, padding: 12, fontSize: 16 },
  eyeIcon: { padding: 10 },
  btnEsqueci: { alignSelf: 'flex-end', marginBottom: 20, paddingVertical: 5 },
  txtEsqueci: { color: '#2980B9', fontWeight: '600', fontSize: 14 },
  btnPrimary: { backgroundColor: '#2C3E50', padding: 15, borderRadius: 8, alignItems: 'center' },
  btnDisabled: { opacity: 0.7 },
  txtPrimary: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  btnSecondary: { marginTop: 20, alignItems: 'center' },
  txtSecondary: { color: '#2980B9', fontSize: 15 },
  termosContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingHorizontal: 5 },
  checkbox: { marginRight: 10 },
  termosTexto: { color: '#333', fontSize: 14, flexShrink: 1 },
  linkTermos: { color: '#2980B9', fontWeight: 'bold', textDecorationLine: 'underline' },
});
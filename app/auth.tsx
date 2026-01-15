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
import ModalNovaSenha from '../components/ModalNovaSenha'; // Seu componente importado
// IMPORTANTE: Importe o ModalRecuperarSenha se for usar o componente externo
import ModalRecuperarSenha from '../components/ModalRecuperarSenha';
import { supabase } from '../services/supabase';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  const [modalRecuperar, setModalRecuperar] = useState(false);
  const [modalNovaSenha, setModalNovaSenha] = useState(false);

  // --- NOVO: Lógica para pegar o link de recuperação de senha ---
  useEffect(() => {
    // Função para tratar a URL que abriu o app
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      console.log("🔗 App aberto via link:", url);

      // Verifica se é um link de reset de senha (contém o path 'reset-password' e tokens no hash)
      if (url.includes('reset-password') && url.includes('access_token')) {
        try {
          // Extrai os parâmetros da hash da URL (#access_token=...&refresh_token=...)
          // O supabase envia os tokens na hash, não na query string
          const params = new URLSearchParams(url.split('#')[1]);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            // Cria a sessão manualmente com os tokens recebidos
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) throw error;

            console.log("✅ Sessão de recuperação iniciada!");
            // Abre o modal para o usuário digitar a nova senha
            setModalNovaSenha(true);
          }
        } catch (error: any) {
          console.log("Erro ao processar link de recuperação:", error.message);
          Alert.alert("Erro", "O link de recuperação expirou ou é inválido.");
        }
      }
    };

    // Escuta links enquanto o app está aberto
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Checa se o app foi aberto fechado (Cold Start)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      subscription.remove();
    };
  }, []);
  // -----------------------------------------------------------

  const loginComTimeout = async (acao: Promise<any>) => {
    const tempoLimite = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("O servidor demorou para responder. Verifique sua internet.")), 10000)
    );
    return Promise.race([acao, tempoLimite]);
  };

  async function handleAuth() {
    if (!email || !password) return Alert.alert("Erro", "Preencha e-mail e senha.");
    
    setLoading(true);
    try {
      if (isSignUp) {
        const { error }: any = await loginComTimeout(
          supabase.auth.signUp({ email, password })
        );
        if (error) throw error;
        Alert.alert("Sucesso", "Cadastro realizado! Verifique seu e-mail.");
      } else {
        const { error, data }: any = await loginComTimeout(
          supabase.auth.signInWithPassword({ email, password })
        );

        if (error) throw error;

        if (data.session) {
           router.replace('/(tabs)'); 
        }
      }
    } catch (error: any) {
      Alert.alert("Atenção", error.message || "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
           {/* Se der erro na imagem, comente a linha abaixo */}
          <Image source={require('../assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Axoryn Control</Text>
          <Text style={styles.subtitle}>{isSignUp ? "Crie sua conta" : "Entre para continuar"}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>E-mail</Text>
          <TextInput 
            style={styles.input} 
            placeholder="seu@email.com" 
            value={email} 
            onChangeText={setEmail} 
            autoCapitalize="none" 
            keyboardType="email-address" 
          />

          <Text style={styles.label}>Senha</Text>
          <TextInput 
            style={styles.input} 
            placeholder="********" 
            value={password} 
            onChangeText={setPassword} 
            secureTextEntry 
          />

          {!isSignUp && (
            <TouchableOpacity onPress={() => setModalRecuperar(true)} style={styles.btnEsqueci}>
              <Text style={styles.txtEsqueci}>Esqueci minha senha</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.btnPrimary, loading && styles.btnDisabled]} 
            onPress={handleAuth} 
            disabled={loading}
          >
            <Text style={styles.txtPrimary}>
              {loading ? "AGUARDE..." : (isSignUp ? "CADASTRAR" : "ENTRAR")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnSecondary} onPress={() => setIsSignUp(!isSignUp)}>
            <Text style={styles.txtSecondary}>
              {isSignUp ? "Já tem uma conta? Entre aqui" : "Não tem conta? Cadastre-se"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Use o componente importado que você já criou */}
        <ModalRecuperarSenha 
           visivel={modalRecuperar} 
           fechar={() => setModalRecuperar(false)} 
        />
        
        <ModalNovaSenha 
           visivel={modalNovaSenha} 
           fechar={() => setModalNovaSenha(false)} 
        />

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
  btnEsqueci: { alignSelf: 'flex-end', marginBottom: 20, paddingVertical: 5 },
  txtEsqueci: { color: '#2980B9', fontWeight: '600', fontSize: 14 },
  btnPrimary: { backgroundColor: '#2C3E50', padding: 15, borderRadius: 8, alignItems: 'center' },
  btnDisabled: { opacity: 0.7 },
  txtPrimary: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  btnSecondary: { marginTop: 20, alignItems: 'center' },
  txtSecondary: { color: '#2980B9', fontSize: 15 },
});
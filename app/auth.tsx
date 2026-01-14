import * as Linking from 'expo-linking';
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
import { supabase } from '../services/supabase';

// Certifique-se que os caminhos dos modais estão certos
import ModalNovaSenha from '../components/ModalNovaSenha';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  const [modalRecuperar, setModalRecuperar] = useState(false);
  const [modalNovaSenha, setModalNovaSenha] = useState(false);

  // --- 1. DETECÇÃO INTELIGENTE DO LINK ---
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      let url = event.url;
      console.log("🔗 Link detectado:", url);

      // Se o link tiver tokens de recuperação (access_token), forçamos o login
      if (url && url.includes('type=recovery') && url.includes('access_token')) {
         try {
            // Extrai o token da URL (funciona para exp:// e axoryn://)
            const params = new URLSearchParams(url.split('#')[1] || url.split('?')[1]);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');

            if (accessToken && refreshToken) {
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (!error) {
                 setModalNovaSenha(true); // Abre a tela de trocar senha
                 Alert.alert("Acesso Recuperado", "Crie sua nova senha agora.");
              }
            }
         } catch (e) {
            console.log("Erro no link:", e);
         }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then((url) => { if (url) handleDeepLink({ url }); });

    return () => subscription.remove();
  }, []);

  // --- 2. LOGIN E CADASTRO ---
  async function handleAuth() {
    if (!email || !password) return Alert.alert("Erro", "Preencha todos os campos.");
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        Alert.alert("Sucesso", "Cadastro realizado! Verifique seu e-mail.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      Alert.alert("Erro", error.message);
    } finally {
      setLoading(false);
    }
  }

  // --- 3. ENVIO DO E-MAIL DE RECUPERAÇÃO ---
  async function enviarEmailRecuperacao() {
    // GERA O LINK MÁGICO COMPATÍVEL COM EXPO GO
    const urlRedirecionamento = Linking.createURL('reset-password');
    console.log("👉 ADICIONE ESTA URL NO SUPABASE:", urlRedirecionamento);

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: urlRedirecionamento,
    });
    setLoading(false);

    if (error) {
      Alert.alert("Erro", error.message);
    } else {
      Alert.alert("E-mail Enviado!", "Verifique o console (terminal) do computador para pegar a URL correta e colocar no Supabase.");
      setModalRecuperar(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <Image source={require('../assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Axoryn Control</Text>
          <Text style={styles.subtitle}>{isSignUp ? "Crie sua conta" : "Entre para continuar"}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>E-mail</Text>
          <TextInput style={styles.input} placeholder="seu@email.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

          <Text style={styles.label}>Senha</Text>
          <TextInput style={styles.input} placeholder="********" value={password} onChangeText={setPassword} secureTextEntry />

          {!isSignUp && (
            <TouchableOpacity onPress={() => setModalRecuperar(true)} style={styles.btnEsqueci}>
              <Text style={styles.txtEsqueci}>Esqueci minha senha</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.btnPrimary, loading && styles.btnDisabled]} onPress={handleAuth} disabled={loading}>
            <Text style={styles.txtPrimary}>{loading ? "Carregando..." : (isSignUp ? "CADASTRAR" : "ENTRAR")}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnSecondary} onPress={() => setIsSignUp(!isSignUp)}>
            <Text style={styles.txtSecondary}>{isSignUp ? "Já tem uma conta? Entre aqui" : "Não tem conta? Cadastre-se"}</Text>
          </TouchableOpacity>
        </View>

        {/* MODAL SIMPLIFICADO DENTRO DA TELA PARA EVITAR ERROS DE IMPORT */}
        <ModalRecuperarSenhaVisivel 
           visivel={modalRecuperar} 
           fechar={() => setModalRecuperar(false)} 
           email={email} 
           setEmail={setEmail}
           acaoEnviar={enviarEmailRecuperacao}
        />
        
        <ModalNovaSenha visivel={modalNovaSenha} fechar={() => setModalNovaSenha(false)} />

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Pequeno componente interno para facilitar (pode substituir seu ModalRecuperarSenha.tsx se quiser)
function ModalRecuperarSenhaVisivel({ visivel, fechar, email, setEmail, acaoEnviar }: any) {
  return (
    <React.Fragment>
      {visivel && (
        <View style={styles.modalOverlay}>
           <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Recuperar Senha</Text>
              <TextInput 
                style={styles.input} 
                value={email} 
                onChangeText={setEmail} 
                placeholder="Confirme seu e-mail" 
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.btnPrimary} onPress={acaoEnviar}>
                  <Text style={styles.txtPrimary}>ENVIAR LINK</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{marginTop:15}} onPress={fechar}>
                  <Text style={{color:'#999'}}>Cancelar</Text>
              </TouchableOpacity>
           </View>
        </View>
      )}
    </React.Fragment>
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
  // Estilos do Modal Interno
  modalOverlay: { position: 'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'center', alignItems:'center', zIndex: 1000 },
  modalCard: { width: '85%', backgroundColor:'#FFF', padding:20, borderRadius:12, alignItems:'center', elevation:5 },
  modalTitle: { fontSize: 18, fontWeight:'bold', marginBottom:15 }
});
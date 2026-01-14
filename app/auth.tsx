import * as Linking from 'expo-linking';
import { router } from 'expo-router'; // <--- IMPORTANTE
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
import { supabase } from '../services/supabase';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  const [modalRecuperar, setModalRecuperar] = useState(false);
  const [modalNovaSenha, setModalNovaSenha] = useState(false);

  // --- Função com Timeout para evitar travamento eterno ---
  const loginComTimeout = async (acao: Promise<any>) => {
    // Cria um erro se demorar mais de 10 segundos
    const tempoLimite = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("O servidor demorou para responder. Verifique sua internet.")), 10000)
    );
    // Corrida entre o login e o tempo limite
    return Promise.race([acao, tempoLimite]);
  };

  async function handleAuth() {
    if (!email || !password) return Alert.alert("Erro", "Preencha e-mail e senha.");
    
    setLoading(true);
    try {
      if (isSignUp) {
        // --- CADASTRO ---
        const { error }: any = await loginComTimeout(
          supabase.auth.signUp({ email, password })
        );
        if (error) throw error;
        Alert.alert("Sucesso", "Cadastro realizado! Verifique seu e-mail.");
      } else {
        // --- LOGIN ---
        console.log("Tentando logar...");
        const { error, data }: any = await loginComTimeout(
          supabase.auth.signInWithPassword({ email, password })
        );

        if (error) {
           console.log("Erro Supabase:", error.message);
           throw error;
        }

        console.log("Login OK! Usuário:", data.session?.user?.email);
        
        // --- FORÇA A NAVEGAÇÃO IMEDIATA ---
        if (data.session) {
           router.replace('/(tabs)'); 
        } else {
           throw new Error("Login pareceu funcionar, mas sem sessão.");
        }
      }
    } catch (error: any) {
      console.log("Caiu no Catch:", error);
      Alert.alert("Atenção", error.message || "Erro desconhecido");
    } finally {
      // Garante que o botão destrave
      if(mounted) setLoading(false);
    }
  }
  
  // Controle de montagem para evitar erro de estado
  let mounted = true;
  useEffect(() => {
     return () => { mounted = false; };
  }, []);

  // --- (O resto do código de recuperação de senha permanece igual) ---
  // --- MANTENHA A PARTE VISUAL ABAIXO ---

  async function enviarEmailRecuperacao() {
    try {
      setLoading(true);
      const urlRedirecionamento = Linking.createURL('reset-password');
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: urlRedirecionamento,
      });
      if (error) throw error;
      Alert.alert("E-mail Enviado!", "Verifique sua caixa de entrada.");
      setModalRecuperar(false);
    } catch (e: any) {
      Alert.alert("Erro", e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          {/* Se a imagem der erro, remova temporariamente para testar */}
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

// Componente visual do modal (copie se não tiver outro arquivo)
function ModalRecuperarSenhaVisivel({ visivel, fechar, email, setEmail, acaoEnviar }: any) {
  if (!visivel) return null;
  return (
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
  modalOverlay: { position: 'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'center', alignItems:'center', zIndex: 1000 },
  modalCard: { width: '85%', backgroundColor:'#FFF', padding:20, borderRadius:12, alignItems:'center', elevation:5 },
  modalTitle: { fontSize: 18, fontWeight:'bold', marginBottom:15 }
});
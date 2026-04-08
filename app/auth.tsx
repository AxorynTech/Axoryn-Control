import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [modalRecuperar, setModalRecuperar] = useState(false);
  const [modalNovaSenha, setModalNovaSenha] = useState(false);
  const [termosAceitos, setTermosAceitos] = useState(false);
  const [modalTermosVisivel, setModalTermosVisivel] = useState(false);

  // 🔒 TRAVA DE SEGURANÇA PARA LINKS
  const processandoLink = useRef(false);

  // --- FUNÇÃO DE TROCA DE IDIOMA ---
  const mudarIdioma = async (lang: string) => {
    try {
      await AsyncStorage.setItem('user-language', lang);
      i18n.changeLanguage(lang);
    } catch (e) {
      console.error("Erro ao salvar idioma", e);
    }
  };

  // ⬇️ INJETADO: FUNÇÕES DE SUPORTE ⬇️
  const abrirWhatsAppSuporte = () => {
    const telefone = "5515996292295";
    const mensagem = "Olá, preciso de ajuda com o acesso ao Axoryn Control.";
    const url = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
    Linking.openURL(url).catch(() => Alert.alert("Erro", "WhatsApp não instalado."));
  };

  const abrirEmailSuporte = () => {
    Linking.openURL('mailto:axoryncontrol@gmail.com?subject=Suporte Axoryn Control')
      .catch(() => Alert.alert("Erro", "Não foi possível abrir o aplicativo de e-mail."));
  };
  // ⬆️ FIM DA INJEÇÃO ⬆️

  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      if (processandoLink.current) return;
      processandoLink.current = true;
      setTimeout(() => { processandoLink.current = false; }, 2000);

      let url = event.url;
      // Correção para links que chegam com encoding errado
      if (url.includes('%23')) url = url.replace('%23', '#');

      if (url.includes('access_token') && url.includes('refresh_token')) {
        const hashIndex = url.indexOf('#');
        if (hashIndex === -1) return; 
        const params = new URLSearchParams(url.substring(hashIndex + 1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type'); 

        if (accessToken && refreshToken) {
          if (type === 'signup') {
            const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            if (!error) {
              // --- CORREÇÃO ALERT WEB/MOBILE ---
              if (Platform.OS === 'web') {
                  window.alert(`🎉 ${t('common.sucesso', 'Sucesso')}\n\n${t('auth.cadastroConfirmado', 'Cadastro confirmado!')}`);
                  router.replace('/(tabs)');
              } else {
                  Alert.alert("🎉 " + t('common.sucesso', 'Sucesso'), t('auth.cadastroConfirmado', 'Cadastro confirmado!'), [
                    { text: t('auth.comecarAgora', 'COMEÇAR'), onPress: () => router.replace('/(tabs)') }
                  ]);
              }
            }
          } 
          else if (type === 'recovery') {
            const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            if (!error) setModalNovaSenha(true); 
          } 
          else {
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            router.replace('/(tabs)');
          }
        }
      }
    };

    const sub = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then((url) => { if (url) handleDeepLink({ url }); });
    return () => sub.remove();
  }, []);

  async function handleAuth() {
    if (!email || !password) {
        // --- CORREÇÃO ALERT WEB/MOBILE ---
        if (Platform.OS === 'web') {
            return window.alert(`${t('common.erro', 'Erro')}\n\n${t('common.preenchaCampos', 'Preencha todos os campos.')}`);
        }
        return Alert.alert(t('common.erro', 'Erro'), t('common.preenchaCampos', 'Preencha todos os campos.'));
    }
    
    // Validação dos termos no cadastro
    if (isSignUp && !termosAceitos) {
        // --- CORREÇÃO ALERT WEB/MOBILE ---
        if (Platform.OS === 'web') {
            return window.alert(`${t('common.erro', 'Erro')}\n\n${t('auth.aceiteTermos', 'É necessário ler e aceitar os Termos de Uso.')}`);
        }
        return Alert.alert(t('common.erro', 'Erro'), t('auth.aceiteTermos', 'É necessário ler e aceitar os Termos de Uso.'));
    }

    setLoading(true);
    try {
      if (isSignUp) {
        // --- CORREÇÃO URL REDIRECT WEB/MOBILE ---
        const redirectUrl = Platform.OS === 'web' 
          ? 'https://axoryntech.com.br/auth/confirmar' // Web: Vai para a home do site
          : Linking.createURL('/');     // Mobile: Abre o app

        const { error }: any = await supabase.auth.signUp({ 
            email, 
            password,
            options: { 
              emailRedirectTo: redirectUrl
            }
        });
        
        if (error) throw error;
        
        // --- CORREÇÃO ALERT WEB/MOBILE ---
        if (Platform.OS === 'web') {
            window.alert(`${t('common.sucesso', 'Sucesso')}\n\n${t('auth.cadastroSucesso', 'Verifique seu e-mail para confirmar o cadastro.')}`);
        } else {
            Alert.alert(t('common.sucesso', 'Sucesso'), t('auth.cadastroSucesso', 'Verifique seu e-mail para confirmar o cadastro.'));
        }

      } else {
        const { error, data }: any = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.session) router.replace('/(tabs)'); 
      }
    } catch (error: any) {
      // --- CORREÇÃO ALERT WEB/MOBILE ---
      if (Platform.OS === 'web') {
          window.alert(`${t('common.erro', 'Erro')}\n\n${error.message}`);
      } else {
          Alert.alert(t('common.erro', 'Erro'), error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  const langAtual = i18n.language || 'pt';

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <Image source={require('../assets/images/app-icon.png')} style={styles.logo} resizeMode="contain" />
          
          {/* --- SELETOR DE IDIOMAS --- */}
          <View style={styles.langContainer}>
            <TouchableOpacity onPress={() => mudarIdioma('pt')} style={[styles.langBtn, langAtual.startsWith('pt') && styles.langBtnActive]}>
              <Text style={styles.flag}>🇧🇷</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => mudarIdioma('en')} style={[styles.langBtn, langAtual.startsWith('en') && styles.langBtnActive]}>
              <Text style={styles.flag}>🇺🇸</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => mudarIdioma('es')} style={[styles.langBtn, langAtual.startsWith('es') && styles.langBtnActive]}>
              <Text style={styles.flag}>🇪🇸</Text>
            </TouchableOpacity>
            {/* --- NOVO BOTÃO HINDI (ÍNDIA) --- */}
            <TouchableOpacity onPress={() => mudarIdioma('hi')} style={[styles.langBtn, langAtual.startsWith('hi') && styles.langBtnActive]}>
              <Text style={styles.flag}>🇮🇳</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Axoryn Control</Text>
          <Text style={styles.subtitle}>{isSignUp ? t('auth.criarContaTitulo', 'Criar Conta') : t('auth.entrarTitulo', 'Acessar Conta')}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{t('auth.email', 'E-MAIL')}</Text>
          <TextInput style={styles.input} placeholder="seu@email.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          
          <Text style={styles.label}>{t('auth.senha', 'SENHA')}</Text>
          <View style={styles.passwordContainer}>
            <TextInput style={styles.inputPassword} placeholder="********" value={password} onChangeText={setPassword} secureTextEntry={!senhaVisivel} />
            <TouchableOpacity onPress={() => setSenhaVisivel(!senhaVisivel)} style={styles.eyeIcon}>
              <Ionicons name={senhaVisivel ? "eye-off" : "eye"} size={24} color="#7F8C8D" />
            </TouchableOpacity>
          </View>

          {!isSignUp && (
            <TouchableOpacity onPress={() => setModalRecuperar(true)} style={styles.btnEsqueci}>
              <Text style={styles.txtEsqueci}>{t('auth.esqueciSenha', 'Esqueci minha senha')}</Text>
            </TouchableOpacity>
          )}

          {isSignUp && (
            <View style={styles.termosContainer}>
              <TouchableOpacity style={styles.checkbox} onPress={() => setTermosAceitos(!termosAceitos)}>
                <Ionicons name={termosAceitos ? "checkbox" : "square-outline"} size={24} color={termosAceitos ? "#27AE60" : "#888"} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setModalTermosVisivel(true)}>
                <Text style={styles.termosTexto}>
                  {t('auth.liConcordo', 'Li e concordo com os')} <Text style={styles.linkTermos}>{t('auth.termos', 'Termos de Uso')}</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={[styles.btnPrimary, loading && styles.btnDisabled]} onPress={handleAuth} disabled={loading}>
            <Text style={styles.txtPrimary}>{loading ? t('auth.aguarde', 'Aguarde...') : (isSignUp ? t('auth.btnCadastrar', 'CADASTRAR') : t('auth.btnEntrar', 'ENTRAR'))}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnSecondary} onPress={() => setIsSignUp(!isSignUp)}>
            <Text style={styles.txtSecondary}>{isSignUp ? t('auth.jaTemConta', 'Já tem conta? Entrar') : t('auth.naoTemConta', 'Não tem conta? Cadastre-se')}</Text>
          </TouchableOpacity>
        </View>

        {/* ⬇️ INJETADO: BOTÕES DE SUPORTE ⬇️ */}
        <View style={styles.suporteContainer}>
          <Text style={styles.suporteTitulo}>{t('auth.precisaAjuda', 'Precisa de ajuda? Fale com o suporte:')}</Text>
          <View style={styles.rowSuporte}>
            <TouchableOpacity style={styles.btnSuporteZap} onPress={abrirWhatsAppSuporte}>
              <Ionicons name="logo-whatsapp" size={18} color="#FFF" />
              <Text style={styles.txtBtnSuporte}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSuporteEmail} onPress={abrirEmailSuporte}>
              <Ionicons name="mail" size={18} color="#FFF" />
              <Text style={styles.txtBtnSuporte}>E-mail</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* ⬆️ FIM DA INJEÇÃO ⬆️ */}

        <ModalRecuperarSenha visivel={modalRecuperar} fechar={() => setModalRecuperar(false)} />
        <ModalNovaSenha visivel={modalNovaSenha} fechar={() => setModalNovaSenha(false)} />
        {/* Passamos a função de aceitar para o modal */}
        <ModalTermos visivel={modalTermosVisivel} fechar={() => setModalTermosVisivel(false)} aceitar={() => { setTermosAceitos(true); setModalTermosVisivel(false); }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 20 },
  logo: { width: 100, height: 100, marginBottom: 15, borderRadius: 20 },
  langContainer: { flexDirection: 'row', gap: 15, marginBottom: 10, backgroundColor: '#EAECEE', padding: 8, borderRadius: 30 },
  langBtn: { padding: 6, borderRadius: 20, opacity: 0.3, transform: [{ scale: 0.9 }] },
  langBtnActive: { opacity: 1, backgroundColor: '#FFF', elevation: 3, transform: [{ scale: 1.1 }] },
  flag: { fontSize: 24 },
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

  // ⬇️ INJETADO: ESTILOS DO SUPORTE ⬇️
  suporteContainer: { marginTop: 30, alignItems: 'center' },
  suporteTitulo: { color: '#7F8C8D', fontSize: 13, marginBottom: 10, fontWeight: '600' },
  rowSuporte: { flexDirection: 'row', gap: 15 },
  btnSuporteZap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#25D366', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 25, gap: 6, elevation: 1 },
  btnSuporteEmail: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E74C3C', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 25, gap: 6, elevation: 1 },
  txtBtnSuporte: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  // ⬆️ FIM DA INJEÇÃO ⬆️
});
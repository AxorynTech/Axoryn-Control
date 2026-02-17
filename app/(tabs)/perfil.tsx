import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Image,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import ModalDadosPessoais from '../../components/ModalDadosPessoais';
import { useAssinatura } from '../../hooks/useAssinatura';
import { useClientes } from '../../hooks/useClientes';
import { supabase } from '../../services/supabase';

export default function Perfil() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  
  // Hooks de Assinatura e Clientes
  const { loading: loadingAssinatura, isPremium, refresh: refreshAssinatura } = useAssinatura();
  const { clientes, fetchData: recarregarClientes, loading: loadingClientes } = useClientes();

  // Estados locais
  const [email, setEmail] = useState('');
  const [modalDadosVisivel, setModalDadosVisivel] = useState(false);
  const [modalIdiomaVisivel, setModalIdiomaVisivel] = useState(false);
  const [consultasCount, setConsultasCount] = useState(0);
  const [posicao, setPosicao] = useState<number | null>(null);

  // Configuração Visual baseada no Status
  let textoBadge = t('perfil.usuarioRegistrado');
  if (isPremium) {
      textoBadge = t('perfil.contaVerificada');   
  }

  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [])
  );

  const carregarDados = async () => {
    // 1. Pega e-mail do usuário logado
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) setEmail(user.email);

    // 2. Atualiza dados de Clientes e Assinatura
    await recarregarClientes();
    await refreshAssinatura();

    // 3. Estatísticas de Consultas e Ranking via RPC
    try {
        if (user) {
            const { count, error } = await supabase
                .from('risk_logs')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);
            if (!error) setConsultasCount(count || 0);

            const { data: rankData, error: rankError } = await supabase.rpc('get_my_rank');
            if (!rankError) setPosicao(rankData);
        }
    } catch (e) {
        console.log("Erro ao carregar estatísticas do perfil:", e);
    }
  };

  // Funções de Gerenciamento
  const mudarIdioma = async (lang: string) => {
    await AsyncStorage.setItem('user-language', lang);
    await i18n.changeLanguage(lang);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('profiles').update({ language: lang }).eq('user_id', user.id);
        }
    } catch (e) { console.log(e); }
    setModalIdiomaVisivel(false);
  };

  const abrirSuporte = () => {
    const telefone = "5515996292295";
    const mensagem = t('perfil.msgSuporte', "Olá, preciso de ajuda com o suporte do App.");
    const url = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
    Linking.openURL(url).catch(() => Alert.alert("Erro", "WhatsApp não instalado."));
  };

  // ✅ NOVA FUNÇÃO: Sair da Conta
  const handleSignOut = async () => {
    Alert.alert(
      t('perfil.confirmarSairTitulo', 'Sair'),
      t('perfil.confirmarSairMsg', 'Deseja realmente sair da sua conta?'),
      [
        { text: t('comum.cancelar', 'Cancelar'), style: 'cancel' },
        { 
          text: t('comum.sair', 'Sair'), 
          style: 'destructive', 
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/auth'); // Redireciona para login
          } 
        }
      ]
    );
  };

  // Lógica de Ranking e Progressão (Cálculo de XP)
  const numClientes = clientes.length;
  const numContratos = clientes.reduce((total, cli) => total + (cli.contratos ? cli.contratos.length : 0), 0);
  const scoreTotal = (numClientes * 10) + (numContratos * 5) + (consultasCount * 2);
  
  let nivelAtual = { nome: t('perfil.nivelIniciante'), cor: "#BDC3C7", icone: "leaf", min: 0, max: 200 };
  if (scoreTotal >= 200 && scoreTotal < 1000) {
      nivelAtual = { nome: t('perfil.nivelProfissional'), cor: "#F39C12", icone: "medal", min: 200, max: 1000 };
  } else if (scoreTotal >= 1000) {
      nivelAtual = { nome: t('perfil.nivelMagnata'), cor: "#8E44AD", icone: "diamond", min: 1000, max: 5000 };
  }
  const progresso = Math.min(Math.max((scoreTotal - nivelAtual.min) / (nivelAtual.max - nivelAtual.min), 0), 1);

  const renderLanguageOption = (langCode: string, label: string, flag: string) => (
    <TouchableOpacity 
      style={[styles.languageOption, i18n.language === langCode && styles.selectedOption]} 
      onPress={() => mudarIdioma(langCode)}
    >
      <Text style={styles.flag}>{flag}</Text>
      <Text style={styles.languageText}>{label}</Text>
      {i18n.language === langCode && <Ionicons name="checkmark-circle" size={24} color="#2980B9" />}
    </TouchableOpacity>
  );

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loadingAssinatura || loadingClientes} onRefresh={carregarDados} />}
    >
      {/* HEADER: Avatar e Identificação */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Image source={{ uri: 'https://ui-avatars.com/api/?background=E0E0E0&color=555&size=128&name=' + email }} style={styles.avatar} />
          {isPremium && (
            <View style={styles.badge}>
              <Ionicons name="checkmark" size={14} color="#FFF" />
            </View>
          )}
        </View>
        <Text style={styles.email}>{email}</Text>
        <View style={styles.tagRole}>
          <Text style={styles.roleText}>{textoBadge}</Text>
        </View>
      </View>

      {/* SEÇÃO 1: Ranking e Performance */}
      <View style={styles.section}>
         <Text style={styles.sectionTitle}>{t('perfil.rankingGlobal')}</Text>
         <View style={styles.cardRank}>
            <View style={styles.headerRank}>
                <View style={[styles.iconRankBox, { backgroundColor: '#2C3E50' }]}>
                   <Text style={{fontSize: 22}}>🏆</Text>
                </View>
                <View style={{flex: 1}}>
                    <Text style={styles.labelNivel}>{t('perfil.suaPosicao')}</Text>
                    <Text style={[styles.txtNivel, { color: '#2C3E50', fontSize: 24 }]}>
                      {posicao ? `${posicao}º ${t('perfil.lugar')}` : t('perfil.calculando')}
                    </Text>
                </View>
                <View style={{alignItems:'flex-end'}}>
                    <Text style={[styles.scoreTotal, {color: nivelAtual.cor}]}>{scoreTotal}</Text>
                    <Text style={styles.scoreLabel}>{t('perfil.totalXP')}</Text>
                </View>
            </View>

            <View style={{marginTop: 10}}>
                <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom: 5}}>
                   <Text style={{fontSize:12, color:nivelAtual.cor, fontWeight:'bold'}}>{nivelAtual.nome}</Text>
                   <Text style={{fontSize:10, color:'#999'}}>{t('perfil.proximoNivel')}</Text>
                </View>
                <View style={styles.barraContainer}>
                  <View style={[styles.barraFill, { width: `${progresso * 100}%`, backgroundColor: nivelAtual.cor }]} />
                </View>
            </View>

            <View style={styles.gridStats}>
                <View style={styles.itemStat}>
                  <Text style={styles.valorStat}>{numClientes}</Text>
                  <Text style={styles.labelStat}>{t('perfil.clientes')}</Text>
                </View>
                <View style={[styles.itemStat, { borderLeftWidth:1, borderRightWidth:1, borderColor:'#EEE' }]}>
                  <Text style={styles.valorStat}>{numContratos}</Text>
                  <Text style={styles.labelStat}>{t('perfil.contratos')}</Text>
                </View>
                <View style={styles.itemStat}>
                  <Text style={styles.valorStat}>{consultasCount}</Text>
                  <Text style={styles.labelStat}>{t('perfil.consultas')}</Text>
                </View>
            </View>
         </View>
      </View>

      {/* SEÇÃO 2: Configurações e Ajuda */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('perfil.opcoes')}</Text>
        
        {/* Idioma */}
        <TouchableOpacity style={styles.menuItem} onPress={() => setModalIdiomaVisivel(true)}>
          <View style={[styles.menuIconConfig, { backgroundColor: '#5D6D7E' }]}>
            <Ionicons name="language" size={20} color="#fff" />
          </View>
          <Text style={styles.menuText}>{t('perfil.idioma')}</Text>
          <View style={styles.row}>
            <Text style={styles.currentLang}>{i18n.language.toUpperCase()}</Text>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </View>
        </TouchableOpacity>

        {/* Meus Dados */}
        <TouchableOpacity style={styles.menuItem} onPress={() => setModalDadosVisivel(true)}>
          <View style={[styles.menuIconConfig, { backgroundColor: '#3498DB' }]}>
            <Ionicons name="person" size={20} color="#fff" />
          </View>
          <Text style={styles.menuText}>{t('perfil.meusDados')}</Text>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>

        {/* ✅ NOVO: BOTÃO DE MINHA EQUIPE */}
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/equipe')}>
            <View style={[styles.menuIconConfig, { backgroundColor: '#8E44AD' }]}>
                <Ionicons name="people" size={20} color="#fff" />
            </View>
            <Text style={styles.menuText}>{t('perfil.minhaEquipe', 'Minha Equipe')}</Text>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>

        {/* Suporte */}
        <TouchableOpacity style={styles.menuItem} onPress={abrirSuporte}>
          <View style={[styles.menuIconConfig, { backgroundColor: '#2ECC71' }]}>
            <Ionicons name="help" size={20} color="#fff" />
          </View>
          <Text style={styles.menuText}>{t('perfil.suporte')}</Text>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>

        {/* Sair da Conta */}
        <TouchableOpacity style={[styles.menuItem, { marginTop: 10 }]} onPress={handleSignOut}>
          <View style={[styles.menuIconConfig, { backgroundColor: '#E74C3C' }]}>
            <Ionicons name="log-out-outline" size={20} color="#fff" />
          </View>
          <Text style={[styles.menuText, { color: '#E74C3C', fontWeight: 'bold' }]}>{t('perfil.sair', 'Sair da Conta')}</Text>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>v1.0.4</Text>

      {/* MODAIS */}
      <ModalDadosPessoais visivel={modalDadosVisivel} fechar={() => setModalDadosVisivel(false)} />
      
      <Modal animationType="slide" transparent={true} visible={modalIdiomaVisivel}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('perfil.idioma')}</Text>
              <TouchableOpacity onPress={() => setModalIdiomaVisivel(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.optionsList}>
              {renderLanguageOption('pt', 'Português', '🇧🇷')}
              {renderLanguageOption('en', 'English', '🇺🇸')}
              {renderLanguageOption('es', 'Español', '🇪🇸')}
              {renderLanguageOption('hi', 'हिन्दी', '🇮🇳')} 
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { alignItems: 'center', paddingVertical: 30, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  avatarContainer: { position: 'relative', marginBottom: 10 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#EEE' },
  badge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#27AE60', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFF' },
  email: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 5 },
  tagRole: { backgroundColor: '#F0F2F5', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 15 },
  roleText: { fontSize: 12, fontWeight: '600', color: '#666' },
  
  section: { marginTop: 25, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#999', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  cardRank: { backgroundColor: '#FFF', borderRadius: 12, padding: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  headerRank: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  iconRankBox: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  labelNivel: { fontSize: 12, color: '#95A5A6', fontWeight: 'bold', textTransform: 'uppercase' },
  txtNivel: { fontSize: 20, fontWeight: 'bold' },
  scoreTotal: { fontSize: 28, fontWeight: 'bold' },
  scoreLabel: { fontSize: 10, color: '#BDC3C7', textTransform: 'uppercase', fontWeight: 'bold', textAlign:'right' },
  
  barraContainer: { height: 8, backgroundColor: '#F0F2F5', borderRadius: 4, overflow: 'hidden', marginBottom: 20 },
  barraFill: { height: '100%', borderRadius: 4 },
  
  gridStats: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F0F2F5', paddingTop: 15 },
  itemStat: { flex: 1, alignItems: 'center' },
  valorStat: { fontSize: 18, fontWeight: 'bold', color: '#34495E' },
  labelStat: { fontSize: 11, color: '#7F8C8D', marginTop: 2 },
  
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#F0F0F0' },
  menuIconConfig: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuText: { flex: 1, fontSize: 15, color: '#333', fontWeight: '500' },
  currentLang: { fontSize: 14, color: '#888', marginRight: 8, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center' },

  version: { textAlign: 'center', color: '#CCC', marginTop: 30, marginBottom: 20, fontSize: 12 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  optionsList: { gap: 12 },
  languageOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#eee', backgroundColor: '#FAFAFA' },
  selectedOption: { borderColor: '#2980B9', backgroundColor: 'rgba(41, 128, 185, 0.1)' },
  flag: { fontSize: 24, marginRight: 12 },
  languageText: { flex: 1, fontSize: 16, color: '#333' },
});
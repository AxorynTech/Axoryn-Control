import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import ModalDadosPessoais from '../../components/ModalDadosPessoais';
import { useAssinatura } from '../../hooks/useAssinatura';
import { supabase } from '../../services/supabase';

// URL DO SEU SITE DE GERENCIAMENTO (Camuflado)
const URL_GERENCIAMENTO = 'https://fantastic-clafoutis-45d812.netlify.app/index.html';

export default function Perfil() {
  const router = useRouter();
  const { loading, isPremium, refresh } = useAssinatura(); 
  const [email, setEmail] = useState('');
  const [modalDadosVisivel, setModalDadosVisivel] = useState(false);

  // --- LÓGICA VISUAL UNIFICADA ---
  const corStatus = isPremium ? '#27AE60' : '#7F8C8D'; 

  // Textos Padrão (Sem Acesso)
  let textoBadge = "Usuário Registrado";
  let textoStatus = "CONTA PADRÃO";
  let textoDescricao = "Acesse o portal para verificar o status da sua licença.";

  // Textos se tiver acesso (Qualquer tipo de acesso)
  if (isPremium) {
      textoBadge = "Conta Verificada";
      textoStatus = "LICENÇA ATIVA";
      textoDescricao = "Sua conta está ativa e operante. Todos os recursos estão liberados para uso.";
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
    });
  }, []);

  const abrirGerenciadorConta = async () => {
    const supported = await Linking.canOpenURL(URL_GERENCIAMENTO);
    if (supported) {
      await Linking.openURL(URL_GERENCIAMENTO);
    } else {
      Alert.alert("Erro", "Não foi possível abrir o navegador.");
    }
  };

  const abrirSuporte = () => {
    const telefone = "5514999999999"; 
    const mensagem = "Olá, preciso de ajuda com o suporte do App.";
    Linking.openURL(`whatsapp://send?phone=${telefone}&text=${mensagem}`);
  };

  return (
    <ScrollView 
      style={styles.container} 
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
    >
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Image 
            source={{ uri: 'https://ui-avatars.com/api/?background=E0E0E0&color=555&size=128&name=' + email }} 
            style={styles.avatar} 
          />
          {/* Badge Unificado: Check Verde se tiver acesso */}
          {isPremium && (
            <View style={styles.badge}>
              <Ionicons name="checkmark" size={14} color="#FFF" />
            </View>
          )}
        </View>
        <Text style={styles.email}>{email}</Text>
        
        {/* Etiqueta do Cargo */}
        <View style={styles.tagRole}>
           <Text style={styles.roleText}>{textoBadge}</Text>
        </View>
      </View>

      {/* ÁREA DE STATUS + LINK EXTERNO */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status da Conta</Text>
        
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons 
              name={isPremium ? "shield-checkmark-outline" : "id-card-outline"} 
              size={24} 
              color={corStatus} 
            />
            <Text style={[styles.statusText, { color: corStatus }]}>
              {textoStatus}
            </Text>
          </View>

          <Text style={styles.cardDesc}>
            {textoDescricao}
          </Text>

          {/* O ÚNICO LUGAR QUE LEVA PRO SITE (Discreto e Funcional) */}
          <TouchableOpacity style={styles.btnManage} onPress={abrirGerenciadorConta}>
            <Text style={styles.txtManage}>Gerenciar Conta Web</Text>
            <Ionicons name="open-outline" size={16} color="#FFF" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
      </View>

      {/* MENU DE AÇÕES (Botão SAIR removido) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Opções</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => setModalDadosVisivel(true)}>
          <Ionicons name="person-outline" size={20} color="#555" />
          <Text style={styles.menuText}>Meus Dados</Text>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={abrirSuporte}>
          <Ionicons name="help-circle-outline" size={20} color="#555" />
          <Text style={styles.menuText}>Suporte Técnico</Text>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>Versão 1.0.0</Text>
      
      <ModalDadosPessoais visivel={modalDadosVisivel} fechar={() => setModalDadosVisivel(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { alignItems: 'center', paddingVertical: 30, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  avatarContainer: { position: 'relative', marginBottom: 10 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#EEE' },
  
  // Badge Padrão (Verde Simples)
  badge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#27AE60', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFF' },
  
  email: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 5 },
  
  tagRole: { backgroundColor: '#F0F2F5', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 15 },
  roleText: { fontSize: 12, fontWeight: '600', color: '#666' },

  section: { marginTop: 25, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#999', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  statusText: { marginLeft: 10, fontWeight: 'bold', fontSize: 15, letterSpacing: 0.5 },
  cardDesc: { color: '#777', fontSize: 14, lineHeight: 20, marginBottom: 20 },
  
  btnManage: { backgroundColor: '#2980B9', paddingVertical: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  txtManage: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#F0F0F0' },
  menuText: { flex: 1, marginLeft: 15, fontSize: 15, color: '#333' },
  
  version: { textAlign: 'center', color: '#CCC', marginTop: 30, marginBottom: 40, fontSize: 12 }
});
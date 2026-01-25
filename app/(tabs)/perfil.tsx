import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
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

export default function Perfil() {
  const router = useRouter();
  const { loading, isPremium, diasRestantes, tipoPlano, refresh } = useAssinatura();
  const [email, setEmail] = useState('');
  const [modalDadosVisivel, setModalDadosVisivel] = useState(false);

  // Define cores baseadas no plano
  const isVitalicio = tipoPlano === 'vitalicio';
  const corStatus = isVitalicio ? '#F1C40F' : (isPremium ? '#27AE60' : '#E74C3C'); // Ouro, Verde ou Vermelho

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
    });
  }, []);

  const abrirSuporte = () => {
    const telefone = "5514999999999"; 
    const mensagem = "Olá, preciso de ajuda com o Axoryn Control.";
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
            source={{ uri: 'https://ui-avatars.com/api/?background=2C3E50&color=fff&size=128&name=' + email }} 
            style={styles.avatar} 
          />
          {/* Badge de Estrela ou Coroa */}
          {isPremium && (
            <View style={[styles.badge, isVitalicio && { backgroundColor: '#F1C40F', borderColor: '#FFF' }]}>
              <Ionicons name={isVitalicio ? "ribbon" : "star"} size={14} color="#FFF" />
            </View>
          )}
        </View>
        <Text style={styles.email}>{email}</Text>
        
        {/* Etiqueta do Cargo */}
        <View style={[styles.tagRole, isVitalicio ? styles.tagVitalicio : (isPremium ? styles.tagPremium : styles.tagFree)]}>
           <Text style={[styles.roleText, isVitalicio && { color: '#8d6e00' }]}>
            {isVitalicio ? "Membro Vitalício 👑" : isPremium ? "Cliente Premium" : "Plano Gratuito"}
           </Text>
        </View>
      </View>

      {/* CARTÃO DE STATUS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sua Assinatura</Text>
        
        <View style={[styles.card, { borderLeftColor: corStatus, borderLeftWidth: 4 }]}>
          <View style={styles.cardHeader}>
            <Ionicons 
              name={isVitalicio ? "trophy" : (isPremium ? "shield-checkmark" : "alert-circle-outline")} 
              size={24} 
              color={corStatus} 
            />
            <Text style={[styles.statusText, { color: corStatus }]}>
              {isVitalicio ? "VITALÍCIO" : isPremium ? "ATIVO" : "EXPIRADO"}
            </Text>
          </View>

          {isPremium ? (
            <View>
               <Text style={styles.cardDesc}>
                {isVitalicio 
                  ? "Você possui acesso ilimitado e vitalício a todos os recursos do Axoryn Control. Obrigado pela parceria!" 
                  : "Você tem acesso total ao Axoryn Control."}
              </Text>
              
              {/* Se for vitalício, mostra infinito, senão mostra dias */}
              <View style={[styles.contadorContainer, isVitalicio && { backgroundColor: '#FFF9C4' }]}>
                {isVitalicio ? (
                   <Ionicons name="infinite" size={24} color="#F1C40F" style={{ marginRight: 8 }} />
                ) : (
                   <Text style={styles.contadorNumero}>{diasRestantes}</Text>
                )}
                <Text style={[styles.contadorTexto, isVitalicio && { color: '#FBC02D' }]}>
                  {isVitalicio ? "sem validade" : "dias restantes"}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.cardDesc}>
              Seu período gratuito acabou. Faça o upgrade para continuar usando todos os recursos.
            </Text>
          )}

          {/* Esconde botão de pagar se for Vitalício ou Premium */}
          {!isPremium && (
            <TouchableOpacity style={styles.btnUpgrade} onPress={() => router.push('/paywall')}>
              <Text style={styles.txtUpgrade}>SEJA PREMIUM AGORA</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* MENU DE AÇÕES */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configurações</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => setModalDadosVisivel(true)}>
          <Ionicons name="person-outline" size={20} color="#333" />
          <Text style={styles.menuText}>Dados Pessoais</Text>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/paywall')}>
          <Ionicons name="card-outline" size={20} color="#333" />
          <Text style={styles.menuText}>Planos e Assinatura</Text>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={abrirSuporte}>
          <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          <Text style={styles.menuText}>Ajuda e Suporte</Text>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>Versão 1.0.0 (Axoryn Tech)</Text>
      
      <ModalDadosPessoais visivel={modalDadosVisivel} fechar={() => setModalDadosVisivel(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F7' },
  header: { alignItems: 'center', paddingVertical: 30, backgroundColor: '#FFF', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, elevation: 2 },
  avatarContainer: { position: 'relative', marginBottom: 10 },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  badge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#27AE60', width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  email: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50' },
  
  // Estilos das Tags de Cargo
  tagRole: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  tagVitalicio: { backgroundColor: '#FFF9C4', borderColor: '#F1C40F' },
  tagPremium: { backgroundColor: '#E8F8F5', borderColor: '#27AE60' },
  tagFree: { backgroundColor: '#F2F3F4', borderColor: '#BDC3C7' },
  roleText: { fontSize: 12, fontWeight: 'bold', color: '#7F8C8D' },

  section: { marginTop: 20, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#95A5A6', marginBottom: 10, textTransform: 'uppercase' },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 20, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  statusText: { marginLeft: 10, fontWeight: 'bold', fontSize: 16 },
  cardDesc: { color: '#666', lineHeight: 20, marginBottom: 15 },
  contadorContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 5, marginBottom: 15, backgroundColor: '#F0F9F4', padding: 10, borderRadius: 8, alignSelf: 'flex-start' },
  contadorNumero: { fontSize: 24, fontWeight: 'bold', color: '#27AE60', marginRight: 5 },
  contadorTexto: { fontSize: 14, color: '#27AE60' },
  btnUpgrade: { backgroundColor: '#2C3E50', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  txtUpgrade: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginBottom: 10 },
  menuText: { flex: 1, marginLeft: 15, fontSize: 16, color: '#333' },
  version: { textAlign: 'center', color: '#BDC3C7', marginTop: 20, marginBottom: 40, fontSize: 12 }
});
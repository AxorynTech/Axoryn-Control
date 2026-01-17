import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Importante para limpar memória
import React from 'react';
import {
  Linking, // Importação adicionada
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../services/supabase';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 48;

export default function Topo({ dados }: any) {
  
  const handleSignOut = async () => {
    try {
      // 1. Tenta avisar o Supabase que saiu
      await supabase.auth.signOut();
    } catch (error) {
      console.log("Erro de rede ao sair, forçando saída local...");
    } finally {
      // 2. GARANTIA: Limpa a memória local forçadamente
      // Isso garante que o app "esqueça" o usuário e o _layout.tsx te jogue para o login
      await AsyncStorage.removeItem('supabase.auth.token'); 
      await AsyncStorage.removeItem('sb-pcbywklgjmampecvgkqf-auth-token'); // Limpeza extra por segurança
    }
  };

  // Nova função para abrir o WhatsApp
  const abrirSuporte = () => {
    const telefone = "5515991189779"; // SUBSTITUA PELO SEU NÚMERO
    const mensagem = "Olá, preciso de ajuda com o Axoryn Control.";
    Linking.openURL(`https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>AXORYN CONTROL</Text>
      
      {/* Container para agrupar os botões */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        
        {/* Botão WhatsApp */}
        <TouchableOpacity 
          style={styles.btnWhats} 
          onPress={abrirSuporte}
          activeOpacity={0.7}
        >
          <Ionicons name="logo-whatsapp" size={20} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.btnSair} 
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Text style={styles.txtSair}>SAIR</Text>
          <Ionicons name="log-out-outline" size={16} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: (STATUSBAR_HEIGHT || 20) + 10, 
    marginBottom: 20,
    paddingHorizontal: 15,
    height: 50,
  },
  logo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2980B9',
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  // Estilo novo para o botão do WhatsApp
  btnWhats: {
    backgroundColor: '#25D366', // Verde oficial do WhatsApp
    width: 36, // Quadrado
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  btnSair: {
    backgroundColor: '#E74C3C',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 36, // Mesma altura do botão do whats para alinhar
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  txtSair: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12
  }
});
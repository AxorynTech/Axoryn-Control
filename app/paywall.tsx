import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAssinatura } from '../hooks/useAssinatura';

// ✅ CORRIGIDO: Aponta para o arquivo de pagamento correto
const URL_GERENCIAMENTO = 'https://axoryntech.com.br/pay.html';

export default function PaywallScreen() {
  const router = useRouter();
  const { refresh, isPremium } = useAssinatura(); 
  const [verificando, setVerificando] = useState(false);

  // 1. Abre o Site
  const abrirSite = async () => {
    const supported = await Linking.canOpenURL(URL_GERENCIAMENTO);
    if (supported) {
      await Linking.openURL(URL_GERENCIAMENTO);
    } else {
      // Fallback: Se der erro, tenta abrir direto sem verificar
      await Linking.openURL(URL_GERENCIAMENTO).catch(() => {
        Alert.alert("Erro", "Não foi possível abrir o portal de pagamento.");
      });
    }
  };

  // 2. Verifica se o usuário já pagou/validou e volta
  const verificarEVoltar = async () => {
    if (verificando) return;
    setVerificando(true);
    
    // Força uma atualização dos dados no Supabase
    await refresh(); 
    
    setTimeout(() => {
      setVerificando(false);
      // Se a assinatura foi detectada, o redirecionamento acontece
      // (O ideal é que o hook useAssinatura gerencie isso, mas aqui forçamos o refresh)
      router.replace('/(tabs)'); 
    }, 1500);
  };

  // 3. Monitoramento Automático
  useEffect(() => {
    // Detecta link de sucesso
    const handleDeepLink = (event: { url: string }) => {
      if (event.url && event.url.includes('payment-success')) {
        verificarEVoltar();
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url && url.includes('payment-success')) {
        verificarEVoltar();
      }
    });

    const linkingSubscription = Linking.addEventListener('url', handleDeepLink);

    // Detecta volta ao app
    const appStateSubscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        refresh(); 
      }
    });

    return () => {
      linkingSubscription.remove();
      appStateSubscription.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      
      <View style={styles.iconContainer}>
        <Ionicons name="shield-half-outline" size={80} color="#2C3E50" />
      </View>

      <Text style={styles.title}>Acesso Restrito</Text>
      
      <Text style={styles.description}>
        Para continuar utilizando todos os recursos, é necessário validar o status da sua conta em nosso portal.
      </Text>

      {/* Card Informativo */}
      <View style={styles.infoCard}>
        <View style={styles.row}>
          <Ionicons name="globe-outline" size={24} color="#555" />
          <Text style={styles.cardText}>Gerenciamento externo</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Ionicons name="lock-closed-outline" size={24} color="#555" />
          <Text style={styles.cardText}>Ambiente seguro</Text>
        </View>
      </View>

      {/* BOTÃO PRINCIPAL: IR PARA O SITE */}
      <TouchableOpacity style={styles.button} onPress={abrirSite}>
        <Text style={styles.buttonText}>Gerenciamento de Conta</Text>
        <Ionicons name="open-outline" size={20} color="#FFF" style={{ marginLeft: 10 }} />
      </TouchableOpacity>

      {/* BOTÃO SECUNDÁRIO: ATUALIZAR */}
      <TouchableOpacity 
        style={[styles.backButton, verificando && { opacity: 0.7 }]} 
        onPress={verificarEVoltar}
        disabled={verificando}
      >
        {verificando ? (
          <View style={{flexDirection: 'row', alignItems:'center'}}>
            <ActivityIndicator size="small" color="#2980B9" style={{marginRight: 8}} />
            <Text style={styles.backText}>Verificando status...</Text>
          </View>
        ) : (
          <Text style={styles.backText}>Já validei meu acesso (Atualizar)</Text>
        )}
      </TouchableOpacity>
      
      <Text style={styles.footer}>
        A gestão de acesso é realizada exclusivamente fora do aplicativo.
      </Text>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  iconContainer: {
    marginBottom: 20,
    backgroundColor: '#EAECEE',
    padding: 20,
    borderRadius: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    width: '100%',
    padding: 15,
    marginBottom: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  cardText: {
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 5,
  },
  button: {
    backgroundColor: '#2980B9',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: 20,
    padding: 15,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BDC3C7',
    borderRadius: 10,
  },
  backText: {
    color: '#2980B9',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    fontSize: 11,
    color: '#BDC3C7',
    textAlign: 'center',
    paddingHorizontal: 20,
  }
});
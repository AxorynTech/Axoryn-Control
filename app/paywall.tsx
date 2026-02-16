import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { useAssinatura } from '../hooks/useAssinatura';

// ID do "Entitlement" configurado no painel da RevenueCat
const ENTITLEMENT_ID = 'premium'; 

export default function PaywallScreen() {
  const router = useRouter();
  const { refresh } = useAssinatura(); 
  const [pacotes, setPacotes] = useState<PurchasesPackage[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);

  // 1. Carrega os Planos do RevenueCat (Google Play)
  useEffect(() => {
    const carregarOfertas = async () => {
      try {
        const offerings = await Purchases.getOfferings();
        if (offerings.current && offerings.current.availablePackages.length > 0) {
          setPacotes(offerings.current.availablePackages);
        }
      } catch (e) {
        console.error('Erro ao carregar ofertas:', e);
        Alert.alert('Erro', 'Não foi possível carregar os planos. Verifique sua conexão.');
      } finally {
        setCarregando(false);
      }
    };

    carregarOfertas();
  }, []);

  // 2. Realiza a Compra Nativa
  const comprarPacote = async (pacote: PurchasesPackage) => {
    if (processando) return;
    setProcessando(true);

    try {
      const { customerInfo } = await Purchases.purchasePackage(pacote);
      
      // Se a compra foi feita com sucesso e o nível 'premium' está ativo
      if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
        await sucessoCompra();
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert("Erro na compra", e.message);
      }
    } finally {
      setProcessando(false);
    }
  };

  // 3. Restaurar Compras (Substitui o "Verificar e Voltar")
  const restaurarCompras = async () => {
    setProcessando(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
        await sucessoCompra();
      } else {
        Alert.alert("Aviso", "Nenhuma assinatura ativa encontrada para este usuário.");
      }
    } catch (e: any) {
      Alert.alert("Erro", "Falha ao restaurar: " + e.message);
    } finally {
      setProcessando(false);
    }
  };

  // Função auxiliar para atualizar o app e redirecionar
  const sucessoCompra = async () => {
    await refresh(); // Atualiza o Supabase/App
    Alert.alert("Sucesso!", "Acesso Premium liberado!");
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.iconContainer}>
          {/* Mantido o ícone original */}
          <Ionicons name="shield-checkmark-outline" size={80} color="#2C3E50" />
        </View>

        <Text style={styles.title}>Acesso Premium</Text>
        
        <Text style={styles.description}>
          Para continuar utilizando todos os recursos sem limites, escolha um dos planos abaixo.
        </Text>

        {/* Card Informativo (Adaptado para mostrar benefícios) */}
        <View style={styles.infoCard}>
          <View style={styles.row}>
            <Ionicons name="infinite-outline" size={24} color="#555" />
            <Text style={styles.cardText}>Cadastros ilimitados</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Ionicons name="cloud-done-outline" size={24} color="#555" />
            <Text style={styles.cardText}>Backup automático na nuvem</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Ionicons name="lock-closed-outline" size={24} color="#555" />
            <Text style={styles.cardText}>Pagamento seguro via Google</Text>
          </View>
        </View>

        {/* LISTA DE BOTÕES DE COMPRA (Substitui o botão de abrir site) */}
        {carregando ? (
          <ActivityIndicator size="large" color="#2980B9" style={{ marginTop: 20 }} />
        ) : (
          <View style={{ width: '100%', gap: 12 }}>
            {pacotes.map((item) => (
              <TouchableOpacity 
                key={item.identifier} 
                style={styles.button} 
                onPress={() => comprarPacote(item)}
                disabled={processando}
              >
                <View style={{flex: 1}}>
                  <Text style={styles.buttonText}>{item.product.title}</Text>
                  <Text style={{color: '#BDC3C7', fontSize: 12}}>{item.product.description}</Text>
                </View>
                <Text style={styles.priceText}>{item.product.priceString}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* BOTÃO SECUNDÁRIO: RESTAURAR (Substitui o "Já validei") */}
        <TouchableOpacity 
          style={[styles.backButton, processando && { opacity: 0.7 }]} 
          onPress={restaurarCompras}
          disabled={processando}
        >
          {processando ? (
            <View style={{flexDirection: 'row', alignItems:'center'}}>
              <ActivityIndicator size="small" color="#2980B9" style={{marginRight: 8}} />
              <Text style={styles.backText}>Processando...</Text>
            </View>
          ) : (
            <Text style={styles.backText}>Já sou assinante? Restaurar compra</Text>
          )}
        </TouchableOpacity>
        
        <Text style={styles.footer}>
          O gerenciamento da assinatura é feito diretamente pela sua conta Google Play.
        </Text>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F7',
  },
  scrollContent: {
    alignItems: 'center',
    padding: 30,
    paddingTop: 60,
    paddingBottom: 40,
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
    textAlign: 'center',
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
  // Estilo do Botão Principal (Agora usado para os pacotes)
  button: {
    backgroundColor: '#2980B9',
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Separa texto do preço
    elevation: 3,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  priceText: {
    color: '#FFF',
    fontSize: 18,
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
    marginTop: 30,
    fontSize: 11,
    color: '#BDC3C7',
    textAlign: 'center',
  }
});
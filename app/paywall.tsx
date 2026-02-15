import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { useAssinatura } from '../hooks/useAssinatura';

// 🔑 SUAS CHAVES DO REVENUECAT (Copie do painel do RevenueCat)
// Se não tiver a da Apple ainda, deixe vazio ou a mesma string por enquanto para não dar erro
const API_KEYS = {
  apple: "appl_SUA_CHAVE_AQUI", 
  google: "goog_eIEPHdCOVMCoYvxMxJwuJqtzqqw" 
};

export default function PaywallScreen() {
  const router = useRouter();
  const { refresh } = useAssinatura(); 
  const [pacotes, setPacotes] = useState<PurchasesPackage[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [processandoCompra, setProcessandoCompra] = useState(false);

  useEffect(() => {
    configurarRevenueCat();
  }, []);

  const configurarRevenueCat = async () => {
    try {
      // 1. Configura a chave correta baseada no sistema (Android/iOS)
      if (Platform.OS === 'android') {
        await Purchases.configure({ apiKey: API_KEYS.google });
      } else {
        await Purchases.configure({ apiKey: API_KEYS.apple });
      }

      // 2. Busca os produtos configurados no painel (Offerings)
      const offerings = await Purchases.getOfferings();
      
      if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
        setPacotes(offerings.current.availablePackages);
      }
    } catch (e) {
      console.log("Erro ao carregar ofertas", e);
      // Não mostramos erro pro usuário logo de cara, deixamos a tela limpa
    } finally {
      setCarregando(false);
    }
  };

  const realizarCompra = async (pacote: PurchasesPackage) => {
    if (processandoCompra) return;
    setProcessandoCompra(true);

    try {
      const { customerInfo } = await Purchases.purchasePackage(pacote);
      
      // Verifica se a compra liberou o acesso (use o identificador que você criou no RevenueCat)
      // DICA: Se no RevenueCat o Entitlement chama "pro", use ["pro"]
      if (customerInfo.entitlements.active["premium"] || customerInfo.entitlements.active["pro"]) {
        await refresh(); // Atualiza o status no seu App
        Alert.alert("Sucesso!", "Sua assinatura está ativa.");
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert("Erro na compra", e.message);
      }
    } finally {
      setProcessandoCompra(false);
    }
  };

  const restaurarCompras = async () => {
    setProcessandoCompra(true);
    try {
      const info = await Purchases.restorePurchases();
      // Verifica os mesmos direitos
      if (info.entitlements.active["premium"] || info.entitlements.active["pro"]) {
        await refresh();
        Alert.alert("Restaurado", "Suas compras foram recuperadas!");
        router.replace('/(tabs)');
      } else {
        Alert.alert("Aviso", "Nenhuma assinatura ativa encontrada para restaurar.");
      }
    } catch (e: any) {
      Alert.alert("Erro", "Não foi possível restaurar: " + e.message);
    } finally {
      setProcessandoCompra(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="diamond-outline" size={60} color="#2980B9" />
          </View>
          <Text style={styles.title}>Axoryn Premium</Text>
          <Text style={styles.subtitle}>Desbloqueie todo o poder do seu controle financeiro.</Text>
        </View>

        {/* Lista de Benefícios */}
        <View style={styles.featuresContainer}>
            <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={20} color="#27ae60" />
                <Text style={styles.featureText}>Clientes e vendas ilimitados</Text>
            </View>
            <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={20} color="#27ae60" />
                <Text style={styles.featureText}>Cobrança automática no WhatsApp</Text>
            </View>
            <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={20} color="#27ae60" />
                <Text style={styles.featureText}>Relatórios avançados</Text>
            </View>
        </View>

        {/* Carregando ou Lista de Planos */}
        {carregando ? (
          <ActivityIndicator size="large" color="#2980B9" style={{ marginTop: 30 }} />
        ) : (
          <View style={styles.planosContainer}>
            {pacotes.map((item) => (
              <TouchableOpacity 
                key={item.identifier} 
                style={styles.cardPlano}
                onPress={() => realizarCompra(item)}
                disabled={processandoCompra}
              >
                <View>
                   {/* Título do produto (ex: Mensal) */}
                  <Text style={styles.planoNome}>{item.product.title}</Text>
                  <Text style={styles.planoDesc}>{item.product.description}</Text>
                </View>
                <Text style={styles.planoPreco}>{item.product.priceString}</Text>
              </TouchableOpacity>
            ))}
            
            {pacotes.length === 0 && (
              <Text style={styles.errorText}>
                Nenhum plano disponível no momento. Verifique sua conexão.
              </Text>
            )}
          </View>
        )}

        {/* Botão Restaurar */}
        <TouchableOpacity 
            style={styles.restoreButton} 
            onPress={restaurarCompras}
            disabled={processandoCompra}
        >
          <Text style={styles.restoreText}>Já sou assinante? Restaurar compras</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F7' },
  scrollContent: { padding: 25, paddingBottom: 50, alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 30, marginTop: 40 },
  iconContainer: {
    backgroundColor: '#EAF2F8', padding: 20, borderRadius: 50, marginBottom: 15
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2C3E50', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#7F8C8D', textAlign: 'center', lineHeight: 22 },
  
  featuresContainer: { alignSelf: 'stretch', marginBottom: 30, backgroundColor: '#FFF', padding: 20, borderRadius: 12, elevation: 1 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  featureText: { marginLeft: 10, fontSize: 16, color: '#34495E' },

  planosContainer: { width: '100%', marginBottom: 20 },
  cardPlano: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: '#BDC3C7'
  },
  planoNome: { fontSize: 18, fontWeight: 'bold', color: '#2980B9', marginBottom: 4 },
  planoDesc: { fontSize: 12, color: '#95A5A6', maxWidth: 180 },
  planoPreco: { fontSize: 20, fontWeight: 'bold', color: '#27ae60' },

  restoreButton: { padding: 15 },
  restoreText: { color: '#7F8C8D', fontSize: 14, textDecorationLine: 'underline' },
  errorText: { color: '#E74C3C', textAlign: 'center', marginTop: 10 }
});
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { useAssinatura } from '../hooks/useAssinatura';
import { supabase } from '../services/supabase'; // <--- IMPORTANTE: Importe seu supabase

// 🔑 SUAS CHAVES DO REVENUECAT
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
      if (Platform.OS === 'android') {
        await Purchases.configure({ apiKey: API_KEYS.google });
      } else {
        await Purchases.configure({ apiKey: API_KEYS.apple });
      }

      // Tenta logar o usuário para vincular a compra ao ID do Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await Purchases.logIn(user.id);
      }

      const offerings = await Purchases.getOfferings();
      if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
        setPacotes(offerings.current.availablePackages);
      }
    } catch (e) {
      console.log("Erro ao carregar ofertas", e);
    } finally {
      setCarregando(false);
    }
  };

  const realizarCompra = async (pacote: PurchasesPackage) => {
    if (processandoCompra) return;
    setProcessandoCompra(true);

    try {
      const { customerInfo } = await Purchases.purchasePackage(pacote);
      
      // === LÓGICA 1: É Recarga do Risk Radar? ===
      if (pacote.product.identifier.includes('radar')) {
        let creditos = 0;
        if (pacote.product.identifier.includes('10')) creditos = 10;
        if (pacote.product.identifier.includes('50')) creditos = 50;
        if (pacote.product.identifier.includes('100')) creditos = 100;

        if (creditos > 0) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Chama a função RPC que criamos no Supabase
            const { error } = await supabase.rpc('adicionar_creditos', {
              user_id: user.id,
              quantidade: creditos
            });

            if (!error) {
              Alert.alert("Sucesso!", `${creditos} consultas foram adicionadas.`);
              // Não sai da tela, pois o usuário pode querer comprar mais
            } else {
              Alert.alert("Atenção", "Pagamento aprovado, mas erro ao somar créditos. Contate o suporte.");
            }
          }
        }
      } 
      // === LÓGICA 2: É Assinatura (Premium)? ===
      else if (customerInfo.entitlements.active["premium"] || customerInfo.entitlements.active["pro"]) {
        await refresh(); 
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
      if (info.entitlements.active["premium"] || info.entitlements.active["pro"]) {
        await refresh();
        Alert.alert("Restaurado", "Suas compras foram recuperadas!");
        router.replace('/(tabs)');
      } else {
        Alert.alert("Aviso", "Nenhuma assinatura ativa encontrada.");
      }
    } catch (e: any) {
      Alert.alert("Erro", "Não foi possível restaurar: " + e.message);
    } finally {
      setProcessandoCompra(false);
    }
  };

  // ... (O RESTO DO SEU RETURN E STYLES CONTINUA IGUAL) ...
  // Apenas certifique-se de que os cards mostrem o nome certo
  
  return (
    <View style={styles.container}>
       {/* ... Seu código de UI anterior ... */}
       {/* Na lista de pacotes, a lógica de exibição continua a mesma */}
       {pacotes.map((item) => (
          <TouchableOpacity 
            key={item.identifier} 
            style={styles.cardPlano}
            onPress={() => realizarCompra(item)}
            disabled={processandoCompra}
          >
            <View>
              <Text style={styles.planoNome}>{item.product.title}</Text>
              <Text style={styles.planoDesc}>{item.product.description}</Text>
              {/* Mostra aviso de Teste Grátis se houver */}
              {item.product.introPrice && (
                 <Text style={{color: '#E67E22', fontSize: 12, fontWeight:'bold'}}>
                   {item.product.introPrice.periodNumberOfUnits} {item.product.introPrice.periodUnit} Grátis!
                 </Text>
              )}
            </View>
            <Text style={styles.planoPreco}>{item.product.priceString}</Text>
          </TouchableOpacity>
        ))}
       {/* ... Resto do código ... */}
    </View>
  );
}

// ... Styles permanecem iguais
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
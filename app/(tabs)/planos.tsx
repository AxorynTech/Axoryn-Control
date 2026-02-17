import { supabase } from '@/services/supabase'; // Ajuste o caminho se necessário (ex: '../../services/supabase')
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router'; // ✅ IMPORTANTE: Hook para detectar foco na aba
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { useAssinatura } from '../../hooks/useAssinatura';

const ENTITLEMENT_ID = 'premium';

export default function PlanosScreen() {
  const { t } = useTranslation();
  
  // Hook de Assinatura (Gerencia Status Premium)
  const { isPremium, diasRestantes, tipoPlano, refresh, loading: loadingStatus } = useAssinatura();
  
  const [pacotes, setPacotes] = useState<PurchasesPackage[]>([]);
  const [loadingPlanos, setLoadingPlanos] = useState(true);
  const [processando, setProcessando] = useState(false);

  // ✅ CORREÇÃO: Usa useFocusEffect para atualizar sempre que a aba abrir
  useFocusEffect(
    useCallback(() => {
      // 1. Atualiza o status da assinatura (recalcula dias)
      refresh();
      
      // 2. Carrega as ofertas da loja
      carregarOfertas();
    }, [])
  );

  const carregarOfertas = async () => {
    try {
      // Pega as ofertas configuradas no painel do RevenueCat
      const offerings = await Purchases.getOfferings();
      
      if (offerings.current && offerings.current.availablePackages.length > 0) {
        setPacotes(offerings.current.availablePackages);
      } else {
        console.log("⚠️ Nenhuma oferta encontrada. Verifique os produtos no RevenueCat.");
      }
    } catch (e) {
      console.log("Erro ao buscar planos:", e);
    } finally {
      setLoadingPlanos(false);
    }
  };

  // --- FUNÇÃO DE COMPRA ---
  const comprar = async (pkg: PurchasesPackage) => {
    if (processando) return;
    setProcessando(true);
    
    try {
      // 1. Identifica se é Recarga ou Assinatura pelo ID exato
      const idProduto = pkg.product.identifier.toLowerCase();
      const ehRecarga = idProduto.includes('radar_creditos') || idProduto.includes('credito');

      // 2. Processa Pagamento na Loja (Google Play)
      const { customerInfo } = await Purchases.purchasePackage(pkg);

      // 3. SE SUCESSO: Decide o que entregar
      if (ehRecarga) {
         // --- LÓGICA DE RECARGA (CONSUMÍVEL) ---
         let qtdParaAdicionar = 0;
         
         if (idProduto === 'radar_creditos_10') {
            qtdParaAdicionar = 10;
         } else if (idProduto.includes('20')) {
            qtdParaAdicionar = 20;
         } else if (idProduto.includes('50')) {
            qtdParaAdicionar = 50;
         } else {
            qtdParaAdicionar = 10; // Fallback
         }

         if (qtdParaAdicionar > 0) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
               // Chama a função RPC que agora aponta para a tabela 'user_credits'
               const { error } = await supabase.rpc('somar_consultas', { 
                  user_uuid: user.id, 
                  qtd: qtdParaAdicionar 
               });
               
               if (!error) {
                  Alert.alert("Recarga Confirmada! 🚀", `Você recebeu +${qtdParaAdicionar} consultas.`);
               } else {
                  console.error("Erro RPC Supabase:", error);
                  Alert.alert("Atenção", "Pagamento aprovado, mas erro ao atualizar user_credits no banco.");
               }
            }
         }

      } else {
         // --- LÓGICA DE ASSINATURA ---
         if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
            await refresh(); // Atualiza o status premium no app
            Alert.alert("Assinatura Ativa! 💎", "Seu plano Premium foi liberado com sucesso.");
         }
      }

    } catch (e: any) {
      if (!e.userCancelled) {
        if (e.code === 'ProductNotAvailableForPurchaseError' || e.message.includes('not available')) {
            Alert.alert(
                "Produto Indisponível", 
                "O Google Play ainda não liberou este item. Verifique o convite de Testador."
            );
        } else {
            Alert.alert("Erro na compra", e.message);
        }
      }
    } finally {
      setProcessando(false);
    }
  };

  // Helpers Visuais
  const obterInfoStatus = () => {
    switch (tipoPlano) {
      case 'teste_gratis': return { label: "Período de Teste", cor: "#E67E22", icone: "time-outline" };
      case 'mensal': return { label: "Plano Mensal", cor: "#2980B9", icone: "calendar-outline" };
      case 'anual': return { label: "Plano Anual", cor: "#8E44AD", icone: "infinite-outline" };
      case 'vitalicio': return { label: "Acesso Vitalício", cor: "#27AE60", icone: "ribbon-outline" };
      case 'equipe': return { label: "Plano Corporativo (Equipe)", cor: "#2ECC71", icone: "people-outline" }; // ✅ Adicionado visual para equipe
      default: return { label: "Plano Grátis / Expirado", cor: "#7F8C8D", icone: "alert-circle-outline" };
    }
  };

  const infoStatus = obterInfoStatus();

  // Filtros de Grupos
  const assinaturas = pacotes.filter(p => p.product.identifier.toLowerCase().includes('axoryn_premium'));
  const recargas = pacotes.filter(p => p.product.identifier.toLowerCase().includes('radar_creditos') || p.product.identifier.toLowerCase().includes('credito'));

  const RenderPacote = ({ pkg, ehRecarga }: { pkg: PurchasesPackage, ehRecarga?: boolean }) => (
    <TouchableOpacity 
      key={pkg.identifier} 
      style={[styles.card, ehRecarga && styles.cardRecarga]} 
      onPress={() => comprar(pkg)}
      disabled={processando}
    >
      <View style={styles.cardInfo}>
        <Text style={styles.pkgTitle}>{pkg.product.title}</Text>
        <Text style={styles.pkgDesc}>{pkg.product.description}</Text>
      </View>
      <View style={styles.priceTag}>
        <Text style={[styles.pkgPrice, ehRecarga && {color: '#27AE60'}]}>{pkg.product.priceString}</Text>
        <Ionicons name={ehRecarga ? "add-circle" : "chevron-forward"} size={20} color={ehRecarga ? "#27AE60" : "#2980B9"} />
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loadingStatus} onRefresh={refresh} />}
    >
      <View style={styles.header}>
        <Ionicons name="diamond" size={40} color="#2980B9" />
        <Text style={styles.title}>{t('tabs.planos', { defaultValue: 'Loja Premium' })}</Text>
      </View>

      <View style={[styles.statusCard, { borderColor: infoStatus.cor }]}>
        <View style={styles.statusRow}>
          <View style={[styles.statusIcon, { backgroundColor: infoStatus.cor }]}>
            <Ionicons name={infoStatus.icone as any} size={24} color="#FFF" />
          </View>
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>Seu Plano Atual:</Text>
            <Text style={[styles.statusValue, { color: infoStatus.cor }]}>{infoStatus.label}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.expirationRow}>
          <Ionicons name="hourglass-outline" size={18} color="#7F8C8D" />
          <Text style={styles.expirationText}>
            {tipoPlano === 'vitalicio' 
              ? "Acesso ilimitado e vitalício" 
              : tipoPlano === 'equipe'
              ? "Gerenciado pelo administrador da equipe"
              : `Acesso válido por mais ${diasRestantes} dias`}
          </Text>
        </View>
      </View>

      {loadingPlanos ? (
        <ActivityIndicator size="large" color="#2980B9" style={{marginTop: 30}} />
      ) : (
        <>
          {assinaturas.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                 {isPremium ? "Alterar Assinatura" : "Desbloqueie o Premium"}
              </Text>
              <View style={styles.list}>
                {assinaturas.map(p => <RenderPacote key={p.identifier} pkg={p} />)}
              </View>
            </View>
          )}

          {recargas.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pacotes de Consultas</Text>
              <View style={styles.list}>
                {recargas.map(p => <RenderPacote key={p.identifier} pkg={p} ehRecarga />)}
              </View>
            </View>
          )}
          
          {assinaturas.length === 0 && recargas.length === 0 && (
             <View style={{padding: 20, alignItems:'center'}}>
                <Text style={{textAlign:'center', color:'#999'}}>
                   Nenhum plano disponível no momento.
                </Text>
             </View>
          )}
        </>
      )}

      <Modal transparent visible={processando}>
        <View style={styles.overlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#2980B9" />
            <Text style={styles.loadingText}>Processando...</Text>
          </View>
        </View>
      </Modal>

      <Text style={styles.footerNote}>
        Pagamentos processados com segurança pela Google Play Store.
      </Text>
      <View style={{height: 40}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, gap: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2C3E50' },
  statusCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16,
    borderWidth: 1, borderLeftWidth: 6, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, marginBottom: 25
  },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  statusInfo: { flex: 1 },
  statusLabel: { fontSize: 11, color: '#95A5A6', textTransform: 'uppercase', fontWeight: 'bold' },
  statusValue: { fontSize: 18, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#F0F2F5', marginVertical: 12 },
  expirationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  expirationText: { fontSize: 13, color: '#7F8C8D', fontWeight: '500' },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#7F8C8D', marginBottom: 12, textTransform: 'uppercase' },
  list: { gap: 12 },
  card: { 
    backgroundColor: '#FFF', padding: 16, borderRadius: 12, 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#EAECEE'
  },
  cardRecarga: { borderColor: '#D5F5E3', backgroundColor: '#EAFAF1' },
  cardInfo: { flex: 1, paddingRight: 10 },
  pkgTitle: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50' },
  pkgDesc: { fontSize: 12, color: '#7F8C8D', marginTop: 2 },
  priceTag: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pkgPrice: { fontSize: 15, fontWeight: 'bold', color: '#2980B9' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  loadingBox: { backgroundColor: '#FFF', padding: 25, borderRadius: 12, alignItems: 'center', width: 200 },
  loadingText: { marginTop: 15, fontSize: 14, color: '#555', fontWeight: '500' },
  footerNote: { textAlign: 'center', color: '#BDC3C7', fontSize: 11, marginTop: 10 }
});
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next'; // <--- Importação da tradução
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// 🔒 IMPORT DA TRAVA DE PERMISSÃO
import { usePermissoes } from '../hooks/usePermissoes';

type Props = {
  abaAtual: string;
  setAba: (novaAba: string) => void;
};

export default function MenuAbas({ abaAtual, setAba }: Props) {
  const { t } = useTranslation(); // <--- Hook de tradução
  
  // 🔒 PUXAR O VERIFICADOR EM TEMPO REAL
  const { loadingPermissoes, verificarPermissaoRealTime } = usePermissoes();
  const [verificando, setVerificando] = useState(false);

  // 🚀 FUNÇÃO QUE INTERCEPTA O CLIQUE NA ABA
  const handleTrocarAba = async (novaAba: string) => {
      // Impede duplo clique
      if (loadingPermissoes || verificando) return;

      // 🔒 SE ELE TENTAR ENTRAR NO CAIXA PESSOAL, VERIFICA A CHAVE PRIMEIRO!
      if (novaAba === 'pessoal') {
          setVerificando(true);
          
          // O 'as any' é só para o TypeScript não reclamar da nova palavra
          const temAcesso = await verificarPermissaoRealTime('acessar_caixa' as any); 
          
          setVerificando(false);
          
          if (!temAcesso) {
              if (Platform.OS === 'web') {
                  window.alert("Acesso Negado\nO seu líder não liberou permissão para acessar o Caixa.");
              } else {
                  Alert.alert("Acesso Negado", "O seu líder não liberou permissão para acessar o Caixa.");
              }
              return; // ⛔ PARALISA AQUI. NÃO DEIXA TROCAR DE ABA!
          }
      }

      // Se for outra aba (ou se o Caixa estiver liberado), troca normalmente
      setAba(novaAba);
  };

  return (
    <View style={styles.tabBar}>
      
      {/* 1. Botão + CLIENTE */}
      <TouchableOpacity 
        onPress={() => handleTrocarAba('cadastro')} 
        style={[styles.tab, abaAtual === 'cadastro' && styles.tabA]}
      >
        <Text style={styles.tabT}>{t('menuAbas.novoCliente')}</Text>
      </TouchableOpacity>

      {/* 2. Botão CARTEIRA */}
      <TouchableOpacity 
        onPress={() => handleTrocarAba('carteira')} 
        style={[styles.tab, abaAtual === 'carteira' && styles.tabA]}
      >
        <Text style={styles.tabT}>{t('menuAbas.carteira')}</Text>
      </TouchableOpacity>

      {/* 3. Botão COBRANÇA */}
      <TouchableOpacity 
        onPress={() => handleTrocarAba('cobranca')} 
        style={[styles.tab, abaAtual === 'cobranca' && styles.tabA]}
      >
        <Text style={[styles.tabT, { color: '#E74C3C' }]}>
          {t('menuAbas.cobranca')}
        </Text>
      </TouchableOpacity>

      {/* 4. Botão CAIXA PESSOAL (Novo) */}
      <TouchableOpacity 
        onPress={() => handleTrocarAba('pessoal')} 
        style={[styles.tab, abaAtual === 'pessoal' && styles.tabA, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
      >
        {/* Mostra um pequeno spinner enquanto vai ao banco consultar */}
        {verificando && <ActivityIndicator size="small" color="#2980B9" />}
        
        <Text style={[styles.tabT, { color: '#2980B9' }]}>
          {t('menuAbas.caixa')}
        </Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  // flexWrap: 'wrap' ajuda a não quebrar se a tela for muito pequena
  tabBar: { flexDirection: 'row', justifyContent: 'center', marginVertical: 10, flexWrap: 'nowrap' },
  // Reduzi um pouco o padding lateral para caber os 4 botões
  tab: { paddingVertical: 12, paddingHorizontal: 8 }, 
  tabA: { borderBottomWidth: 3, borderBottomColor: '#27AE60' },
  // Reduzi levemente a fonte para garantir leitura em uma linha
  tabT: { fontWeight: 'bold', color: '#7F8C8D', fontSize: 11 },
});
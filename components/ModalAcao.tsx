import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next'; // <--- Importação da tradução
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Props = {
  visivel: boolean;
  tipo: string; // 'RENOVAR' ou 'QUITAR'
  fechar: () => void;
  confirmar: (dataInformada: string) => void;
};

export default function ModalAcao({ visivel, tipo, fechar, confirmar }: Props) {
  const { t } = useTranslation(); // <--- Hook de tradução
  
  // Voltamos para string simples para digitação manual
  const [data, setData] = useState('');

  // Toda vez que abrir o modal, reseta a data para hoje (formatada DD/MM/AAAA)
  useEffect(() => {
    if (visivel) {
      const hoje = new Date();
      const dia = String(hoje.getDate()).padStart(2, '0');
      const mes = String(hoje.getMonth() + 1).padStart(2, '0');
      const ano = hoje.getFullYear();
      setData(`${dia}/${mes}/${ano}`);
    }
  }, [visivel]);

  // Define a cor baseada no tipo de ação
  const corPrincipal = tipo === 'QUITAR' ? '#27AE60' : '#2980B9';
  
  // Texto descritivo Traduzido
  const textoDescricao = tipo === 'QUITAR' 
    ? t('modalAcao.descricaoQuitar') 
    : t('modalAcao.descricaoRenovar');

  // Título Traduzido
  const tituloTraduzido = tipo === 'QUITAR'
    ? t('modalAcao.tipoQuitar')
    : t('modalAcao.tipoRenovar');

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={fechar}>
      <View style={styles.fundo}>
        <View style={styles.card}>
          {/* Cabeçalho com cor dinâmica */}
          <View style={[styles.cabecalho, { backgroundColor: corPrincipal }]}>
            <Text style={styles.titulo}>{tituloTraduzido}</Text>
          </View>

          <View style={styles.corpo}>
            <Text style={styles.descricao}>{textoDescricao}</Text>
            
            <Text style={styles.label}>{t('modalAcao.labelData')}</Text>
            
            {/* SUBSTITUIÇÃO: Voltamos com o TextInput para digitação manual */}
            <TextInput 
              style={styles.input} 
              value={data}
              onChangeText={setData}
              placeholder="DD/MM/AAAA"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
            
            <TouchableOpacity 
              style={[styles.botaoConfirmar, { backgroundColor: corPrincipal }]} 
              onPress={() => confirmar(data)}
            >
              <Text style={styles.textoBotao}>
                {t('modalAcao.btnConfirmar')} {tituloTraduzido}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={fechar} style={styles.botaoCancelar}>
              <Text style={styles.textoCancelar}>{t('common.cancelar')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#FFF', width: '85%', borderRadius: 15, overflow: 'hidden', elevation: 5 },
  
  cabecalho: { padding: 15, alignItems: 'center' },
  titulo: { fontSize: 18, fontWeight: 'bold', color: '#FFF', letterSpacing: 1 },
  
  corpo: { padding: 20 },
  descricao: { textAlign: 'center', color: '#666', marginBottom: 20, fontSize: 14 },
  
  label: { fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 5, marginLeft: 2 },
  
  // Estilo do Input Manual
  input: { 
    backgroundColor: '#F1F3F4', 
    padding: 14, 
    borderRadius: 8, 
    marginBottom: 20, 
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    fontWeight: 'bold'
  },
  
  botaoConfirmar: { padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  textoBotao: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  
  botaoCancelar: { alignItems: 'center', padding: 10 },
  textoCancelar: { color: '#999', fontWeight: 'bold' }
});
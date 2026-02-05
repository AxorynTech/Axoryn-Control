import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next'; // <--- Importação da tradução
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../services/supabase';

type Props = {
  visivel: boolean;
  fechar: () => void;
};

export default function ModalDadosPessoais({ visivel, fechar }: Props) {
  const { t } = useTranslation(); // <--- Hook de tradução
  const [dados, setDados] = useState<any>({});

  useEffect(() => {
    if (visivel) {
      carregarDados();
    }
    // Adicionamos 't' para recarregar se o idioma mudar com o modal aberto
  }, [visivel, t]);

  async function carregarDados() {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Pega o formato de data correto (pt-BR, en-US, etc) do arquivo de tradução
    const formatoData = t('common.formatoData', { defaultValue: 'pt-BR' });

    if (user) {
      setDados({
        email: user.email,
        id: user.id,
        // Agora usa o formato de data dinâmico
        criadoEm: new Date(user.created_at).toLocaleDateString(formatoData),
        // Tenta pegar o nome dos metadados ou usa o fallback traduzido
        nome: user.user_metadata?.full_name || user.user_metadata?.nome || t('modalDadosPessoais.usuarioPadrao')
      });
    }
  }

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={fechar}>
      <View style={styles.fundo}>
        <View style={styles.janela}>
          <View style={styles.header}>
            {/* Título traduzido */}
            <Text style={styles.titulo}>{t('modalDadosPessoais.titulo')} 👤</Text>
            <TouchableOpacity onPress={fechar}>
              <Ionicons name="close" size={24} color="#999" />
            </TouchableOpacity>
          </View>

          <View style={styles.linha}>
            <Text style={styles.label}>{t('modalDadosPessoais.nome')}</Text>
            <Text style={styles.valor}>{dados.nome}</Text>
          </View>

          <View style={styles.linha}>
            <Text style={styles.label}>{t('modalDadosPessoais.email')}</Text>
            <Text style={styles.valor}>{dados.email}</Text>
          </View>

          <View style={styles.linha}>
            <Text style={styles.label}>{t('modalDadosPessoais.idUsuario')}</Text>
            <Text style={styles.valorID}>{dados.id}</Text>
          </View>

          <View style={styles.linha}>
            <Text style={styles.label}>{t('modalDadosPessoais.membroDesde')}</Text>
            <Text style={styles.valor}>{dados.criadoEm}</Text>
          </View>

          <View style={styles.avisoSenha}>
            <Ionicons name="lock-closed-outline" size={16} color="#7F8C8D" />
            <Text style={styles.txtAviso}>{t('modalDadosPessoais.avisoSenha')}</Text>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  janela: { backgroundColor: '#FFF', width: '100%', borderRadius: 16, padding: 20, elevation: 5 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  titulo: { fontSize: 20, fontWeight: 'bold', color: '#2C3E50' },
  linha: { marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 8 },
  label: { fontSize: 12, color: '#95A5A6', textTransform: 'uppercase', marginBottom: 4 },
  valor: { fontSize: 16, color: '#333', fontWeight: '500' },
  valorID: { fontSize: 12, color: '#7F8C8D', fontFamily: 'monospace' },
  avisoSenha: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F6F7', padding: 10, borderRadius: 8, marginTop: 10 },
  txtAviso: { color: '#7F8C8D', fontSize: 12, marginLeft: 8 }
});
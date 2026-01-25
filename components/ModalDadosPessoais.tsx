import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../services/supabase';

type Props = {
  visivel: boolean;
  fechar: () => void;
};

export default function ModalDadosPessoais({ visivel, fechar }: Props) {
  const [dados, setDados] = useState<any>({});

  useEffect(() => {
    if (visivel) {
      carregarDados();
    }
  }, [visivel]);

  async function carregarDados() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setDados({
        email: user.email,
        id: user.id,
        criadoEm: new Date(user.created_at).toLocaleDateString('pt-BR'),
        // Tenta pegar o nome dos metadados ou usa "Não informado"
        nome: user.user_metadata?.full_name || user.user_metadata?.nome || "Usuário Axoryn"
      });
    }
  }

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={fechar}>
      <View style={styles.fundo}>
        <View style={styles.janela}>
          <View style={styles.header}>
            <Text style={styles.titulo}>Meus Dados 👤</Text>
            <TouchableOpacity onPress={fechar}>
              <Ionicons name="close" size={24} color="#999" />
            </TouchableOpacity>
          </View>

          <View style={styles.linha}>
            <Text style={styles.label}>Nome</Text>
            <Text style={styles.valor}>{dados.nome}</Text>
          </View>

          <View style={styles.linha}>
            <Text style={styles.label}>E-mail</Text>
            <Text style={styles.valor}>{dados.email}</Text>
          </View>

          <View style={styles.linha}>
            <Text style={styles.label}>ID do Usuário</Text>
            <Text style={styles.valorID}>{dados.id}</Text>
          </View>

          <View style={styles.linha}>
            <Text style={styles.label}>Membro desde</Text>
            <Text style={styles.valor}>{dados.criadoEm}</Text>
          </View>

          <View style={styles.avisoSenha}>
            <Ionicons name="lock-closed-outline" size={16} color="#7F8C8D" />
            <Text style={styles.txtAviso}>Por segurança, sua senha não é exibida.</Text>
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
import React, { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../services/supabase';

type Props = {
  visivel: boolean;
  fechar: () => void;
};

export default function ModalNovaSenha({ visivel, fechar }: Props) {
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  const atualizarSenha = async () => {
    if (!senha) return Alert.alert("Erro", "Digite a nova senha.");
    
    try {
      setLoading(true);
      // Atualiza a senha do usuário logado (o link já logou ele)
      const { error } = await supabase.auth.updateUser({ password: senha });
      
      if (error) throw error;
      
      Alert.alert("Sucesso", "Sua senha foi redefinida! Você já está logado.");
      fechar();
    } catch (e: any) {
      Alert.alert("Erro", "Falha ao atualizar senha: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visivel} transparent animationType="slide">
      <View style={styles.fundo}>
        <View style={styles.janela}>
          <Text style={styles.titulo}>Criar Nova Senha 🔑</Text>
          <Text style={styles.desc}>Digite sua nova senha abaixo.</Text>

          <TextInput 
            style={styles.input} 
            placeholder="Nova Senha" 
            secureTextEntry 
            value={senha}
            onChangeText={setSenha}
          />

          <TouchableOpacity style={styles.btn} onPress={atualizarSenha}>
            <Text style={styles.txtBtn}>{loading ? "Salvando..." : "SALVAR NOVA SENHA"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  janela: { backgroundColor: '#FFF', width: '85%', padding: 20, borderRadius: 10 },
  titulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  desc: { textAlign: 'center', marginBottom: 15, color: '#666' },
  input: { borderWidth: 1, borderColor: '#DDD', padding: 12, borderRadius: 8, marginBottom: 15 },
  btn: { backgroundColor: '#27AE60', padding: 15, borderRadius: 8, alignItems: 'center' },
  txtBtn: { color: '#FFF', fontWeight: 'bold' }
});
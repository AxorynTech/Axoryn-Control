import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../services/supabase';

type Props = {
  visivel: boolean;
  fechar: () => void;
};

export default function ModalNovaSenha({ visivel, fechar }: Props) {
  const [novaSenha, setNovaSenha] = useState('');
  const [loading, setLoading] = useState(false);

  async function atualizarSenha() {
    if (novaSenha.length < 6) {
      Alert.alert("Senha Curta", "A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      // O PULO DO GATO: Como o auth.tsx já validou o token e criou a sessão,
      // agora o usuário está "logado". Basta atualizar os dados dele.
      const { error } = await supabase.auth.updateUser({
        password: novaSenha
      });

      if (error) throw error;

      Alert.alert("Sucesso!", "Sua senha foi alterada. Você já está logado.");
      setNovaSenha(''); // Limpa o campo
      fechar(); // Fecha o modal
      
    } catch (error: any) {
      Alert.alert("Erro ao salvar", error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visivel}
      onRequestClose={fechar} // Para fechar no botão "voltar" do Android
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.titulo}>Criar Nova Senha</Text>
          <Text style={styles.descricao}>
            Seu link foi validado! Digite sua nova senha abaixo para recuperar o acesso.
          </Text>

          <Text style={styles.label}>Nova Senha</Text>
          <TextInput
            style={styles.input}
            placeholder="Mínimo 6 caracteres"
            secureTextEntry
            value={novaSenha}
            onChangeText={setNovaSenha}
            autoCapitalize="none"
          />

          <TouchableOpacity 
            style={[styles.btnSalvar, loading && styles.btnDisabled]} 
            onPress={atualizarSenha}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.txtSalvar}>SALVAR NOVA SENHA</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.btnCancelar} 
            onPress={fechar}
            disabled={loading}
          >
            <Text style={styles.txtCancelar}>Cancelar / Tentar Depois</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)', // Fundo escuro transparente
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 25,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 10
  },
  descricao: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20
  },
  label: {
    fontWeight: 'bold',
    color: '#34495E',
    marginBottom: 5,
    marginLeft: 5
  },
  input: {
    borderWidth: 1,
    borderColor: '#BDC3C7',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#FAFAFA'
  },
  btnSalvar: {
    backgroundColor: '#27AE60', // Verde Sucesso
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10
  },
  btnDisabled: {
    opacity: 0.7
  },
  txtSalvar: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16
  },
  btnCancelar: {
    paddingVertical: 10,
    alignItems: 'center'
  },
  txtCancelar: {
    color: '#95A5A6',
    fontWeight: '600'
  }
});
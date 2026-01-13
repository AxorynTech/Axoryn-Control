import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Props = {
  aoSalvar: (dados: any) => void;
};

export default function TelaCadastro({ aoSalvar }: Props) {
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [endereco, setEndereco] = useState('');
  const [indicacao, setIndicacao] = useState('');
  const [reputacao, setReputacao] = useState('');
  const [segmento, setSegmento] = useState('EMPRESTIMO'); // Padrão

  const handleSalvar = () => {
    if (!nome.trim()) return Alert.alert("Erro", "Nome é obrigatório");
    
    aoSalvar({
      nome: nome.trim().toUpperCase(),
      whatsapp: whatsapp.trim(),
      endereco: endereco.trim(),
      indicacao: indicacao.trim(),
      reputacao: reputacao.trim(),
      segmento // Passa o segmento escolhido
    });

    setNome(''); setWhatsapp(''); setEndereco(''); setIndicacao(''); setReputacao(''); setSegmento('EMPRESTIMO');
    Alert.alert("Sucesso", "Cliente cadastrado!");
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>Novo Cliente</Text>
      
      <View style={styles.form}>
        <Text style={styles.label}>Nome Completo *</Text>
        <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Ex: João da Silva" placeholderTextColor="#999"/>

        {/* SELETOR DE SEGMENTO */}
        <Text style={styles.label}>Segmento</Text>
        <View style={styles.rowSegmento}>
           <TouchableOpacity onPress={() => setSegmento('EMPRESTIMO')} style={[styles.btnSeg, segmento === 'EMPRESTIMO' && styles.btnSegAtivo]}>
             <Text style={[styles.txtSeg, segmento === 'EMPRESTIMO' && styles.txtSegAtivo]}>Empréstimo</Text>
           </TouchableOpacity>
           <TouchableOpacity onPress={() => setSegmento('VENDA')} style={[styles.btnSeg, segmento === 'VENDA' && styles.btnSegAtivo]}>
             <Text style={[styles.txtSeg, segmento === 'VENDA' && styles.txtSegAtivo]}>Venda</Text>
           </TouchableOpacity>
           <TouchableOpacity onPress={() => setSegmento('AMBOS')} style={[styles.btnSeg, segmento === 'AMBOS' && styles.btnSegAtivo]}>
             <Text style={[styles.txtSeg, segmento === 'AMBOS' && styles.txtSegAtivo]}>Ambos</Text>
           </TouchableOpacity>
        </View>

        <Text style={styles.label}>WhatsApp (Apenas números)</Text>
        <TextInput style={styles.input} value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" placeholder="Ex: 11999999999" placeholderTextColor="#999"/>

        <Text style={styles.label}>Endereço</Text>
        <TextInput style={styles.input} value={endereco} onChangeText={setEndereco} placeholder="Rua, Número, Bairro" placeholderTextColor="#999"/>

        <Text style={styles.label}>Indicação</Text>
        <TextInput style={styles.input} value={indicacao} onChangeText={setIndicacao} placeholder="Opcional" placeholderTextColor="#999"/>

        <Text style={styles.label}>Reputação Inicial</Text>
        <TextInput style={styles.input} value={reputacao} onChangeText={setReputacao} placeholder="Ex: Bom pagador, Neutro..." placeholderTextColor="#999"/>

        <TouchableOpacity style={styles.btnSalvar} onPress={handleSalvar}>
          <Text style={styles.txtBtn}>CADASTRAR CLIENTE</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  titulo: { fontSize: 22, fontWeight: 'bold', color: '#2C3E50', marginBottom: 20, textAlign: 'center' },
  form: { backgroundColor: '#FFF', padding: 20, borderRadius: 10, elevation: 2 },
  label: { fontSize: 14, color: '#333', marginBottom: 5, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 16, color: '#333', backgroundColor: '#FAFAFA' },
  
  // Estilos do Segmento
  rowSegmento: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  btnSeg: { flex: 1, padding: 10, borderRadius: 6, backgroundColor: '#F0F0F0', alignItems: 'center', borderWidth: 1, borderColor: '#DDD' },
  btnSegAtivo: { backgroundColor: '#2980B9', borderColor: '#2980B9' },
  txtSeg: { color: '#555', fontWeight: 'bold' },
  txtSegAtivo: { color: '#FFF' },

  btnSalvar: { 
    backgroundColor: '#2980B9',
    padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 
  },
  txtBtn: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});
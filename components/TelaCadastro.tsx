import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Props = {
  aoSalvar: (dados: any) => void;
};

export default function TelaCadastro({ aoSalvar }: Props) {
  const { t } = useTranslation();
  
  // Estados do Formulário
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState(''); // <--- NOVO ESTADO CPF
  const [whatsapp, setWhatsapp] = useState('');
  const [endereco, setEndereco] = useState('');
  const [indicacao, setIndicacao] = useState('');
  const [reputacao, setReputacao] = useState('');
  const [segmento, setSegmento] = useState('EMPRESTIMO');

  // Máscara de CPF (Formatação Profissional)
  const handleCpfChange = (text: string) => {
    let v = text.replace(/\D/g, ''); // Remove tudo que não é número
    if (v.length > 11) v = v.slice(0, 11); // Limita a 11 dígitos
    
    // Aplica a máscara 000.000.000-00
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    
    setCpf(v);
  };

  const handleSalvar = () => {
    if (!nome.trim()) {
       return Alert.alert(t('common.erro'), t('common.preenchaCampos') || "Nome é obrigatório");
    }
    
    aoSalvar({
      nome: nome.trim().toUpperCase(),
      cpf: cpf, // <--- SALVA O CPF (Crucial para o Radar funcionar depois)
      whatsapp: whatsapp.trim(),
      endereco: endereco.trim(),
      indicacao: indicacao.trim(),
      reputacao: reputacao.trim(),
      segmento
    });

    // Limpar campos
    setNome(''); 
    setCpf(''); // Limpa CPF
    setWhatsapp(''); 
    setEndereco(''); 
    setIndicacao(''); 
    setReputacao(''); 
    setSegmento('EMPRESTIMO');
    
    Alert.alert(t('common.sucesso'), "Cliente cadastrado com sucesso!");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>{t('cadastro.titulo')}</Text>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          
          <Text style={styles.label}>{t('cadastro.nome')}</Text>
          <TextInput 
            style={styles.input} 
            value={nome} 
            onChangeText={setNome} 
            placeholder={t('cadastro.nomePlaceholder')} 
            placeholderTextColor="#999"
          />

          {/* --- CAMPO CPF NOVO --- */}
          <Text style={styles.label}>CPF (Para Análise de Risco)</Text>
          <TextInput 
            style={styles.input} 
            value={cpf} 
            onChangeText={handleCpfChange} // Usa a função com máscara
            placeholder="000.000.000-00" 
            placeholderTextColor="#999"
            keyboardType="numeric"
            maxLength={14}
          />
          {/* ---------------------- */}

          <Text style={styles.label}>{t('cadastro.segmento')}</Text>
          <View style={styles.rowSegmento}>
             <TouchableOpacity onPress={() => setSegmento('EMPRESTIMO')} style={[styles.btnSeg, segmento === 'EMPRESTIMO' && styles.btnSegAtivo]}>
               <Text style={[styles.txtSeg, segmento === 'EMPRESTIMO' && styles.txtSegAtivo]}>{t('cadastro.segEmprestimo')}</Text>
             </TouchableOpacity>
             <TouchableOpacity onPress={() => setSegmento('VENDA')} style={[styles.btnSeg, segmento === 'VENDA' && styles.btnSegAtivo]}>
               <Text style={[styles.txtSeg, segmento === 'VENDA' && styles.txtSegAtivo]}>{t('cadastro.segVenda')}</Text>
             </TouchableOpacity>
             <TouchableOpacity onPress={() => setSegmento('AMBOS')} style={[styles.btnSeg, segmento === 'AMBOS' && styles.btnSegAtivo]}>
               <Text style={[styles.txtSeg, segmento === 'AMBOS' && styles.txtSegAtivo]}>{t('cadastro.segAmbos')}</Text>
             </TouchableOpacity>
          </View>

          <Text style={styles.label}>{t('cadastro.whatsapp')}</Text>
          <TextInput 
            style={styles.input} 
            value={whatsapp} 
            onChangeText={setWhatsapp} 
            keyboardType="phone-pad" 
            placeholder="(00) 00000-0000" 
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>{t('cadastro.endereco')}</Text>
          <TextInput 
            style={styles.input} 
            value={endereco} 
            onChangeText={setEndereco} 
            placeholder="Rua, Número, Bairro" 
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>{t('cadastro.indicacao')}</Text>
          <TextInput 
            style={styles.input} 
            value={indicacao} 
            onChangeText={setIndicacao} 
            placeholder="Opcional" 
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>{t('cadastro.reputacao')}</Text>
          <TextInput 
            style={styles.input} 
            value={reputacao} 
            onChangeText={setReputacao} 
            placeholder="Ex: Bom pagador, Neutro..." 
            placeholderTextColor="#999"
          />

          <TouchableOpacity style={styles.btnSalvar} onPress={handleSalvar}>
            <Text style={styles.txtBtn}>{t('cadastro.btnSalvar')}</Text>
          </TouchableOpacity>
        </View>
        
        {/* Espaço extra no final do scroll */}
        <View style={{height: 50}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  titulo: { fontSize: 22, fontWeight: 'bold', color: '#2C3E50', marginBottom: 20, textAlign: 'center' },
  form: { backgroundColor: '#FFF', padding: 20, borderRadius: 10, elevation: 2 },
  label: { fontSize: 14, color: '#333', marginBottom: 5, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 16, color: '#333', backgroundColor: '#FAFAFA' },
  
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
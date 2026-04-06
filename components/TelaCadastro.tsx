import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  // ⬇️ INJETADO: COMPONENTES PARA FOTOS ⬇️
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// ⬇️ INJETADO: BIBLIOTECAS PARA CAPTURA E UPLOAD ⬇️
import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
// ATENÇÃO: Confirme se este é o caminho correto para o seu arquivo supabase!
import { supabase } from '../services/supabase';

type Props = {
  aoSalvar: (dados: any) => void;
};

export default function TelaCadastro({ aoSalvar }: Props) {
  const { t, i18n } = useTranslation();
  
  // Estados do Formulário
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState(''); 
  const [whatsapp, setWhatsapp] = useState('');
  const [endereco, setEndereco] = useState('');
  const [indicacao, setIndicacao] = useState('');
  const [reputacao, setReputacao] = useState('');
  const [segmento, setSegmento] = useState('EMPRESTIMO');

  // ⬇️ INJETADO: ESTADOS PARA AS FOTOS DE SEGURANÇA (KYC) ⬇️
  const [uriFotoComDoc, setUriFotoComDoc] = useState<string | null>(null);
  const [uriFotoApenasDoc, setUriFotoApenasDoc] = useState<string | null>(null);
  const [carregandoUpload, setCarregandoUpload] = useState(false);
  // ⬆️ FIM DA INJEÇÃO ⬆️

  // Verifica se é usuário brasileiro
  const isBrasil = i18n.language.startsWith('pt');

  // Máscara de Documento Inteligente (CPF e CNPJ)
  const handleDocumentoChange = (text: string) => {
    if (isBrasil) {
        // --- LÓGICA BRASIL (Agora com suporte estendido) ---
        let v = text.replace(/\D/g, ''); // Remove tudo que não é número
        
        // AUMENTADO: Permite até 40 dígitos numéricos (antes era 14)
        if (v.length > 40) v = v.slice(0, 40); 
        
        if (v.length <= 11) {
            // --- MÁSCARA CPF (Até 11 números) ---
            v = v.replace(/(\d{3})(\d)/, '$1.$2');
            v = v.replace(/(\d{3})(\d)/, '$1.$2');
            v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        } else {
            // --- MÁSCARA CNPJ + EXTRAS ---
            // Aplica a formatação padrão de CNPJ no início
            // Se tiver mais de 14 dígitos, eles aparecerão normalmente no final
            v = v.replace(/^(\d{2})(\d)/, '$1.$2');
            v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
            v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
            v = v.replace(/(\d{4})(\d)/, '$1-$2');
        }
        
        setCpf(v);
    } else {
        // --- LÓGICA INTERNACIONAL ---
        // Apenas limita o tamanho bruto, sem máscara
        if (text.length > 60) return; // Segurança visual
        setCpf(text);
    }
  };

  // ⬇️ INJETADO: FUNÇÕES PARA ESCOLHER FOTOS ⬇️
  const capturarFoto = async (tipo: 'com_doc' | 'apenas_doc', source: 'camera' | 'galeria') => {
      const permission = source === 'camera' 
          ? await ImagePicker.requestCameraPermissionsAsync() 
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permission.status !== 'granted') {
          Alert.alert(t('radar.atencao'), t('common.erroPermissao', { defaultValue: `Precisamos de permissão para acessar a ${source}.` }));
          return;
      }

      const options: ImagePicker.ImagePickerOptions = {
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.3, // Qualidade baixa para upload rápido
      };

      const result = source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets[0]) {
          if (tipo === 'com_doc') setUriFotoComDoc(result.assets[0].uri);
          else setUriFotoApenasDoc(result.assets[0].uri);
      }
  };

  const escolherFonte = (tipo: 'com_doc' | 'apenas_doc') => {
      Alert.alert(t('cadastro.selecionarFoto', { defaultValue: 'Selecionar Foto' }), t('cadastro.deOndePegar', { defaultValue: 'De onde deseja pegar a imagem?' }), [
          { text: t('cadastro.tirarFoto', { defaultValue: 'Tirar Foto (Câmera)' }), onPress: () => capturarFoto(tipo, 'camera') },
          { text: t('cadastro.escolherGaleria', { defaultValue: 'Escolher da Galeria' }), onPress: () => capturarFoto(tipo, 'galeria') },
          { text: t('common.cancelar'), style: 'cancel' }
      ]);
  };
  // ⬆️ FIM DA INJEÇÃO DE FUNÇÕES DE FOTO ⬆️

  // ⬇️ ALTERADO APENAS PARA "async" PARA PERMITIR UPLOAD ⬇️
  const handleSalvar = async () => {
    if (!nome.trim()) {
       return Alert.alert(t('common.erro'), t('modalEditarCliente.erroNome'));
    }
    
    // ⬇️ INJETADO: LOGICA DE UPLOAD BLINDADA ANTES DE SALVAR ⬇️
    setCarregandoUpload(true);
    let pathFotoComDoc = null;
    let pathFotoApenasDoc = null;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (uriFotoComDoc && user) {
            const ext = uriFotoComDoc.split('.').pop()?.toLowerCase() || 'jpg';
            const path = `${user.id}/rosto_${Date.now()}.${ext}`;
            const base64 = await FileSystem.readAsStringAsync(uriFotoComDoc, { encoding: 'base64' });
            const arrayBuffer = decode(base64);
            const { error } = await supabase.storage.from('documentos_clientes').upload(path, arrayBuffer, { upsert: true, contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}` });
            if (!error) pathFotoComDoc = path;
        }

        if (uriFotoApenasDoc && user) {
            const ext = uriFotoApenasDoc.split('.').pop()?.toLowerCase() || 'jpg';
            const path = `${user.id}/doc_${Date.now()}.${ext}`;
            const base64 = await FileSystem.readAsStringAsync(uriFotoApenasDoc, { encoding: 'base64' });
            const arrayBuffer = decode(base64);
            const { error } = await supabase.storage.from('documentos_clientes').upload(path, arrayBuffer, { upsert: true, contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}` });
            if (!error) pathFotoApenasDoc = path;
        }
    } catch (e) {
        console.log("Erro no upload", e);
        Alert.alert(t('radar.atencao'), t('cadastro.erroUploadAviso', { defaultValue: "Houve um problema ao subir as fotos, mas o cliente será salvo." }));
    }
    setCarregandoUpload(false);
    // ⬆️ FIM DA INJEÇÃO DE UPLOAD ⬆️

    aoSalvar({
      nome: nome.trim().toUpperCase(),
      cpf: cpf, 
      whatsapp: whatsapp.trim(),
      endereco: endereco.trim(),
      indicacao: indicacao.trim(),
      reputacao: reputacao.trim(),
      segmento,
      // ⬇️ INJETADO: Enviando os links das fotos pro hook useClientes ⬇️
      foto_com_documento: pathFotoComDoc,
      foto_apenas_documento: pathFotoApenasDoc
    });

    // Limpar campos
    setNome(''); 
    setCpf(''); 
    setWhatsapp(''); 
    setEndereco(''); 
    setIndicacao(''); 
    setReputacao(''); 
    setSegmento('EMPRESTIMO');
    
    // ⬇️ INJETADO: Limpar as fotos após o sucesso ⬇️
    setUriFotoComDoc(null);
    setUriFotoApenasDoc(null);

    Alert.alert(t('common.sucesso'), t('cadastro.msgSucesso'));
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

          <Text style={styles.label}>
             {t('radar.documentoLabel', 'CPF / CNPJ / Tax ID')}
          </Text>
          <TextInput 
            style={styles.input} 
            value={cpf} 
            onChangeText={handleDocumentoChange} 
            placeholder={t('radar.documentoPlaceholder', '000.000.000-00')} 
            placeholderTextColor="#999"
            keyboardType={isBrasil ? "numeric" : "default"}
            // ATUALIZADO: maxLength 60 garante espaço para 40 números + formatação
            maxLength={60} 
          />

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

          <Text style={styles.label}>{t('radar.telefoneLabel', 'WhatsApp')}</Text>
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
            placeholder={t('cadastro.placeholderEndereco')} 
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>{t('cadastro.indicacao')}</Text>
          <TextInput 
            style={styles.input} 
            value={indicacao} 
            onChangeText={setIndicacao} 
            placeholder={t('cadastro.placeholderIndicacao')} 
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>{t('cadastro.reputacao')}</Text>
          <TextInput 
            style={styles.input} 
            value={reputacao} 
            onChangeText={setReputacao} 
            placeholder={t('cadastro.placeholderReputacao')} 
            placeholderTextColor="#999"
          />

          {/* ⬇️ INJETADO: BOTÕES DE FOTO KYC ⬇️ */}
          <Text style={[styles.label, { marginTop: 10 }]}>{t('cadastro.kycTitulo')}</Text>
          <View style={styles.rowFotos}>
              <TouchableOpacity style={styles.btnFoto} onPress={() => escolherFonte('com_doc')}>
                  <Ionicons name="person-circle-outline" size={32} color="#2980B9" />
                  <Text style={styles.txtBtnFoto}>{t('cadastro.kycFotoDoc')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnFoto} onPress={() => escolherFonte('apenas_doc')}>
                  <Ionicons name="card-outline" size={32} color="#2980B9" />
                  <Text style={styles.txtBtnFoto}>{t('cadastro.kycApenasDoc')}</Text>
              </TouchableOpacity>
          </View>

          {/* PREVIEWS DAS FOTOS ANTES DE SALVAR */}
          {(uriFotoComDoc || uriFotoApenasDoc) && (
              <View style={styles.rowPreviews}>
                  {uriFotoComDoc && (
                      <View style={styles.previewBox}>
                          <Image source={{ uri: uriFotoComDoc }} style={styles.imgPreview} />
                          <TouchableOpacity style={styles.btnRemoverFoto} onPress={() => setUriFotoComDoc(null)}>
                              <Ionicons name="trash" size={16} color="#FFF" />
                          </TouchableOpacity>
                      </View>
                  )}
                  {uriFotoApenasDoc && (
                      <View style={styles.previewBox}>
                          <Image source={{ uri: uriFotoApenasDoc }} style={styles.imgPreview} />
                          <TouchableOpacity style={styles.btnRemoverFoto} onPress={() => setUriFotoApenasDoc(null)}>
                              <Ionicons name="trash" size={16} color="#FFF" />
                          </TouchableOpacity>
                      </View>
                  )}
              </View>
          )}
          {/* ⬆️ FIM DA INJEÇÃO ⬆️ */}

          <TouchableOpacity style={styles.btnSalvar} onPress={handleSalvar} disabled={carregandoUpload}>
            {/* ⬇️ INJETADO: MOSTRAR LOADING QUANDO ESTIVER FAZENDO UPLOAD ⬇️ */}
            {carregandoUpload ? (
                <ActivityIndicator color="#FFF" />
            ) : (
                <Text style={styles.txtBtn}>{t('cadastro.btnSalvar')}</Text>
            )}
          </TouchableOpacity>
        </View>
        
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
  txtBtn: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  // ⬇️ INJETADO: ESTILOS DAS FOTOS KYC ⬇️
  rowFotos: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  btnFoto: { flex: 1, padding: 15, borderRadius: 8, backgroundColor: '#F4F6F7', alignItems: 'center', borderWidth: 1, borderColor: '#BDC3C7', borderStyle: 'dashed' },
  txtBtnFoto: { color: '#2980B9', fontWeight: 'bold', marginTop: 5, fontSize: 12 },
  rowPreviews: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  previewBox: { flex: 1, position: 'relative' },
  imgPreview: { width: '100%', height: 120, borderRadius: 8, borderWidth: 1, borderColor: '#DDD' },
  btnRemoverFoto: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(231, 76, 60, 0.9)', padding: 6, borderRadius: 15 },
  // ⬆️ FIM DOS ESTILOS ⬆️
});
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
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

  // Estados para Fotos
  const [uriFotoComDoc, setUriFotoComDoc] = useState<string | null>(null);
  const [uriFotoApenasDoc, setUriFotoApenasDoc] = useState<string | null>(null);
  const [carregandoUpload, setCarregandoUpload] = useState(false);

  // Verifica se é usuário brasileiro
  const isBrasil = i18n.language.startsWith('pt');

  // Máscara de Documento Inteligente (CPF e CNPJ)
  const handleDocumentoChange = (text: string) => {
    if (isBrasil) {
        let v = text.replace(/\D/g, ''); 
        if (v.length > 40) v = v.slice(0, 40); 
        
        if (v.length <= 11) {
            v = v.replace(/(\d{3})(\d)/, '$1.$2');
            v = v.replace(/(\d{3})(\d)/, '$1.$2');
            v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        } else {
            v = v.replace(/^(\d{2})(\d)/, '$1.$2');
            v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
            v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
            v = v.replace(/(\d{4})(\d)/, '$1-$2');
        }
        setCpf(v);
    } else {
        if (text.length > 60) return; 
        setCpf(text);
    }
  };

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
          quality: 0.3, // Qualidade baixa ajuda na velocidade do upload
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

  // 🚀 ARQUITETURA IOS BLINDADA: Upload via FormData (Streaming Nativo resolve o "Network request failed")
  const realizarUploadArquivo = async (uri: string, prefixo: string, userId: string): Promise<string> => {
      let ext = uri.split('.').pop()?.toLowerCase() || 'jpeg';
      if (ext === 'jpg') ext = 'jpeg'; 
      
      const path = `${userId}/${prefixo}_${Date.now()}.${ext}`;
      
      // Cria um formulário de dados padrão, suportado nativamente pelo motor de rede do iOS/Android
      const formData = new FormData();
      formData.append('file', {
          uri: uri, // O Expo ImagePicker já entrega a URI pronta para uso
          name: `${prefixo}_${Date.now()}.${ext}`,
          type: `image/${ext}`
      } as any); // Cast para 'any' contorna a tipagem restrita do RN para arquivos em FormData
      
      // Enviamos o formData diretamente para o Supabase
      const { error } = await supabase.storage
          .from('documentos_clientes')
          .upload(path, formData); 

      if (error) throw error;
      return path;
  };

  const handleSalvar = async () => {
    if (!nome.trim()) {
       return Alert.alert(t('common.erro'), t('modalEditarCliente.erroNome'));
    }
    
    setCarregandoUpload(true);
    let pathFotoComDoc = null;
    let pathFotoApenasDoc = null;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            // Uploads em Paralelo
            const promessasUpload = [];
            
            if (uriFotoComDoc) {
                promessasUpload.push(
                    realizarUploadArquivo(uriFotoComDoc, 'rosto', user.id)
                        .then(path => { pathFotoComDoc = path; })
                );
            }
            if (uriFotoApenasDoc) {
                promessasUpload.push(
                    realizarUploadArquivo(uriFotoApenasDoc, 'doc', user.id)
                        .then(path => { pathFotoApenasDoc = path; })
                );
            }

            // Aguarda ambos finalizarem
            if (promessasUpload.length > 0) {
                await Promise.all(promessasUpload);
            }
        }
    } catch (e) {
        console.log("Erro no upload", e);
        Alert.alert(t('radar.atencao'), t('cadastro.erroUploadAviso', { defaultValue: "Houve um problema ao subir as fotos, mas o cliente será salvo." }));
    }
    setCarregandoUpload(false);

    aoSalvar({
      nome: nome.trim().toUpperCase(),
      cpf: cpf, 
      whatsapp: whatsapp.trim(),
      endereco: endereco.trim(),
      indicacao: indicacao.trim(),
      reputacao: reputacao.trim(),
      segmento,
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
    
    // Limpar as fotos após o sucesso
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

          <TouchableOpacity style={styles.btnSalvar} onPress={handleSalvar} disabled={carregandoUpload}>
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

  rowFotos: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  btnFoto: { flex: 1, padding: 15, borderRadius: 8, backgroundColor: '#F4F6F7', alignItems: 'center', borderWidth: 1, borderColor: '#BDC3C7', borderStyle: 'dashed' },
  txtBtnFoto: { color: '#2980B9', fontWeight: 'bold', marginTop: 5, fontSize: 12 },
  rowPreviews: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  previewBox: { flex: 1, position: 'relative' },
  imgPreview: { width: '100%', height: 120, borderRadius: 8, borderWidth: 1, borderColor: '#DDD' },
  btnRemoverFoto: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(231, 76, 60, 0.9)', padding: 6, borderRadius: 15 },
});
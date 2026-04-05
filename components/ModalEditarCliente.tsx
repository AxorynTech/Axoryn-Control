import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next'; // <--- Importação da tradução
import {
  ActivityIndicator,
  Alert,
  // ⬇️ INJETADO PARA FOTOS KYC ⬇️
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// ⬇️ INJETADO PARA CAPTURA E UPLOAD KYC ⬇️
import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../services/supabase';

type Props = {
  visivel: boolean;
  clienteOriginal: any;
  fechar: () => void;
  salvar: (dadosAtualizados: any) => void;
};

export default function ModalEditarCliente({ visivel, clienteOriginal, fechar, salvar }: Props) {
  const { t } = useTranslation(); // <--- Hook de tradução
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [endereco, setEndereco] = useState('');
  const [indicacao, setIndicacao] = useState('');
  const [reputacao, setReputacao] = useState('');
  const [segmento, setSegmento] = useState('EMPRESTIMO');

  // ⬇️ INJETADO: ESTADOS DAS FOTOS KYC ⬇️
  // uriLocal é para a foto que acabou de ser tirada/escolhida
  const [uriFotoComDoc, setUriFotoComDoc] = useState<string | null>(null);
  const [uriFotoApenasDoc, setUriFotoApenasDoc] = useState<string | null>(null);
  
  // urlBanco é para mostrar a miniatura do que JÁ ESTÁ no banco
  const [urlBancoRosto, setUrlBancoRosto] = useState<string | null>(null);
  const [urlBancoDoc, setUrlBancoDoc] = useState<string | null>(null);
  
  const [carregandoUpload, setCarregandoUpload] = useState(false);
  // ⬆️ FIM DA INJEÇÃO ⬆️

  useEffect(() => {
    if (clienteOriginal) {
      setNome(clienteOriginal.nome || '');
      setWhatsapp(clienteOriginal.whatsapp || '');
      setEndereco(clienteOriginal.endereco || '');
      setIndicacao(clienteOriginal.indicacao || '');
      setReputacao(clienteOriginal.reputacao || '');
      setSegmento(clienteOriginal.segmento || 'EMPRESTIMO');
      
      // Limpa seleções locais ao abrir
      setUriFotoComDoc(null);
      setUriFotoApenasDoc(null);

      // ⬇️ INJETADO: BUSCA URLS SEGURAS DO BANCO SE JÁ EXISTIREM FOTOS ⬇️
      const carregarFotosAntigas = async () => {
          if (clienteOriginal.foto_com_documento) {
              const { data } = await supabase.storage.from('documentos_clientes').createSignedUrl(clienteOriginal.foto_com_documento, 3600);
              if (data) setUrlBancoRosto(data.signedUrl);
          } else {
              setUrlBancoRosto(null);
          }
          
          if (clienteOriginal.foto_apenas_documento) {
              const { data } = await supabase.storage.from('documentos_clientes').createSignedUrl(clienteOriginal.foto_apenas_documento, 3600);
              if (data) setUrlBancoDoc(data.signedUrl);
          } else {
              setUrlBancoDoc(null);
          }
      };
      
      if (visivel) carregarFotosAntigas();
      // ⬆️ FIM DA INJEÇÃO ⬆️

    } else {
      setNome(''); setWhatsapp(''); setEndereco(''); setIndicacao(''); setReputacao('');
      setUriFotoComDoc(null); setUriFotoApenasDoc(null); setUrlBancoRosto(null); setUrlBancoDoc(null);
    }
  }, [clienteOriginal, visivel]);

  // ⬇️ INJETADO: FUNÇÕES DE CAPTURA KYC ⬇️
  const capturarFoto = async (tipo: 'com_doc' | 'apenas_doc', source: 'camera' | 'galeria') => {
      const permission = source === 'camera' 
          ? await ImagePicker.requestCameraPermissionsAsync() 
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permission.status !== 'granted') {
          Alert.alert('Atenção', `Precisamos de permissão para acessar a ${source}.`);
          return;
      }

      const options: ImagePicker.ImagePickerOptions = {
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.3, 
      };

      const result = source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets[0]) {
          if (tipo === 'com_doc') {
              setUriFotoComDoc(result.assets[0].uri);
              setUrlBancoRosto(null); // Esconde a antiga pra mostrar a nova
          } else {
              setUriFotoApenasDoc(result.assets[0].uri);
              setUrlBancoDoc(null); // Esconde a antiga pra mostrar a nova
          }
      }
  };

  const escolherFonte = (tipo: 'com_doc' | 'apenas_doc') => {
      Alert.alert('Selecionar Foto KYC', 'De onde deseja pegar a imagem do documento?', [
          { text: 'Tirar Foto (Câmera)', onPress: () => capturarFoto(tipo, 'camera') },
          { text: 'Escolher da Galeria', onPress: () => capturarFoto(tipo, 'galeria') },
          { text: 'Cancelar', style: 'cancel' }
      ]);
  };
  // ⬆️ FIM DA INJEÇÃO KYC ⬆️

  // ⬇️ ALTERADO PARA ASYNC PARA PERMITIR UPLOAD ANTES DE SALVAR ⬇️
  const handleSalvar = async () => {
    if (!nome.trim()) return Alert.alert(t('common.erro'), t('modalEditarCliente.erroNome'));
    
    setCarregandoUpload(true);
    let pathFotoComDoc = clienteOriginal.foto_com_documento; // Mantém a antiga se não mudar
    let pathFotoApenasDoc = clienteOriginal.foto_apenas_documento; // Mantém a antiga se não mudar

    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Se escolheu uma FOTO NOVA de ROSTO, faz upload
        if (uriFotoComDoc && user) {
            const ext = uriFotoComDoc.split('.').pop()?.toLowerCase() || 'jpg';
            const path = `${user.id}/rosto_${Date.now()}.${ext}`;
            const base64 = await FileSystem.readAsStringAsync(uriFotoComDoc, { encoding: 'base64' });
            const arrayBuffer = decode(base64);
            const { error } = await supabase.storage.from('documentos_clientes').upload(path, arrayBuffer, { upsert: true, contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}` });
            if (!error) pathFotoComDoc = path;
        }

        // Se escolheu uma FOTO NOVA de DOC, faz upload
        if (uriFotoApenasDoc && user) {
            const ext = uriFotoApenasDoc.split('.').pop()?.toLowerCase() || 'jpg';
            const path = `${user.id}/doc_${Date.now()}.${ext}`;
            const base64 = await FileSystem.readAsStringAsync(uriFotoApenasDoc, { encoding: 'base64' });
            const arrayBuffer = decode(base64);
            const { error } = await supabase.storage.from('documentos_clientes').upload(path, arrayBuffer, { upsert: true, contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}` });
            if (!error) pathFotoApenasDoc = path;
        }
    } catch (e) {
        console.log("Erro no upload ao editar", e);
        Alert.alert("Atenção", "Problema ao atualizar as fotos. Os outros dados serão salvos.");
    }
    setCarregandoUpload(false);

    // Envia tudo pro hook salvar
    salvar({ 
      nome: nome.trim().toUpperCase(), 
      whatsapp, 
      endereco, 
      indicacao, 
      reputacao, 
      segmento,
      foto_com_documento: pathFotoComDoc,
      foto_apenas_documento: pathFotoApenasDoc
    });
  };
  // ⬆️ FIM DA INJEÇÃO NO SALVAR ⬆️

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={fechar}>
      {/* Container principal com KeyboardAvoidingView */}
      <KeyboardAvoidingView 
        style={styles.mF} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.mC}>
          <ScrollView 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.mT}>
                {clienteOriginal ? t('modalEditarCliente.tituloEditar') : t('cadastro.titulo')}
            </Text>
            
            <TextInput 
                placeholder={t('cadastro.nome')} 
                placeholderTextColor="#999" 
                style={styles.input} 
                value={nome} 
                onChangeText={setNome} 
            />
            
            <Text style={{fontWeight:'bold', marginBottom:5, color:'#555'}}>{t('cadastro.segmento')}:</Text>
            <View style={styles.rowSeg}>
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

            <TextInput 
                placeholder={t('cadastro.whatsapp')} 
                placeholderTextColor="#999" 
                style={styles.input} 
                value={whatsapp} 
                onChangeText={setWhatsapp} 
                keyboardType="phone-pad" 
            />
            <TextInput 
                placeholder={t('cadastro.endereco')} 
                placeholderTextColor="#999" 
                style={styles.input} 
                value={endereco} 
                onChangeText={setEndereco} 
            />
            <TextInput 
                placeholder={t('cadastro.indicacao')} 
                placeholderTextColor="#999" 
                style={styles.input} 
                value={indicacao} 
                onChangeText={setIndicacao} 
            />
            <TextInput 
                placeholder={t('cadastro.reputacao')} 
                placeholderTextColor="#999" 
                style={styles.input} 
                value={reputacao} 
                onChangeText={setReputacao} 
            />
            
            {/* ⬇️ INJETADO: BLOCO DE EDIÇÃO DE FOTOS KYC ⬇️ */}
            <View style={styles.kycSection}>
                <Text style={{fontWeight:'bold', marginBottom:10, color:'#555'}}>Documentos de Segurança (KYC)</Text>
                
                <View style={styles.rowFotos}>
                    {/* COLUNA: FOTO COM DOC */}
                    <View style={styles.colFoto}>
                        {(uriFotoComDoc || urlBancoRosto) ? (
                            <View style={styles.previewBox}>
                                <Image source={{ uri: uriFotoComDoc || urlBancoRosto || '' }} style={styles.imgPreview} />
                                <TouchableOpacity style={styles.btnTrocarFoto} onPress={() => escolherFonte('com_doc')}>
                                    <Ionicons name="camera-reverse" size={16} color="#FFF" />
                                    <Text style={{color:'#FFF', fontSize:10, fontWeight:'bold', marginLeft:4}}>Trocar</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.btnFotoVazia} onPress={() => escolherFonte('com_doc')}>
                                <Ionicons name="person-circle-outline" size={32} color="#95A5A6" />
                                <Text style={styles.txtBtnFoto}>Adicionar Foto + Doc</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* COLUNA: APENAS DOC */}
                    <View style={styles.colFoto}>
                        {(uriFotoApenasDoc || urlBancoDoc) ? (
                            <View style={styles.previewBox}>
                                <Image source={{ uri: uriFotoApenasDoc || urlBancoDoc || '' }} style={styles.imgPreview} />
                                <TouchableOpacity style={styles.btnTrocarFoto} onPress={() => escolherFonte('apenas_doc')}>
                                    <Ionicons name="camera-reverse" size={16} color="#FFF" />
                                    <Text style={{color:'#FFF', fontSize:10, fontWeight:'bold', marginLeft:4}}>Trocar</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.btnFotoVazia} onPress={() => escolherFonte('apenas_doc')}>
                                <Ionicons name="card-outline" size={32} color="#95A5A6" />
                                <Text style={styles.txtBtnFoto}>Adicionar Apenas Doc</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
            {/* ⬆️ FIM DA INJEÇÃO ⬆️ */}

            <TouchableOpacity style={styles.btnP} onPress={handleSalvar} disabled={carregandoUpload}>
              {carregandoUpload ? (
                  <ActivityIndicator color="#FFF" />
              ) : (
                  <Text style={styles.btnTxt}>{t('modalEditarCliente.btnSalvarMudancas')}</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity onPress={fechar} style={styles.btnCancel} disabled={carregandoUpload}>
              <Text style={{color:'#999'}}>{t('common.cancelar')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mF: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  mC: { 
    backgroundColor: '#FFF', 
    width: '100%', 
    maxWidth: 400,
    borderRadius: 15, 
    padding: 20,
    maxHeight: '85%', // Limite de altura
    flexShrink: 1, // Permite encolher se o teclado apertar
    elevation: 5
  },
  mT: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#333' },
  input: { backgroundColor: '#F1F3F4', padding: 12, borderRadius: 8, marginBottom: 10, color: '#333', fontSize: 16 },
  
  rowSeg: { flexDirection: 'row', gap: 5, marginBottom: 15 },
  btnSeg: { flex: 1, padding: 8, borderRadius: 6, backgroundColor: '#EEE', alignItems: 'center' },
  btnSegAtivo: { backgroundColor: '#2980B9' },
  txtSeg: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  txtSegAtivo: { color: '#FFF' },

  btnP: { 
    backgroundColor: '#2980B9',
    padding: 12, borderRadius: 8, alignItems: 'center' 
  },
  btnTxt: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  btnCancel: { marginTop: 15, alignItems: 'center', padding: 10 },

  // ⬇️ INJETADO: ESTILOS KYC PARA O MODAL ⬇️
  kycSection: { marginTop: 10, marginBottom: 20, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 15 },
  rowFotos: { flexDirection: 'row', gap: 10 },
  colFoto: { flex: 1 },
  btnFotoVazia: { backgroundColor: '#F4F6F7', padding: 15, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#BDC3C7', borderStyle: 'dashed', height: 100, justifyContent: 'center' },
  txtBtnFoto: { color: '#7F8C8D', marginTop: 5, fontSize: 11, textAlign: 'center' },
  previewBox: { position: 'relative', height: 100, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#DDD' },
  imgPreview: { width: '100%', height: '100%' },
  btnTrocarFoto: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(41, 128, 185, 0.85)', paddingVertical: 6, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  // ⬆️ FIM DOS ESTILOS KYC ⬆️
});
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
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

import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../services/supabase';

// 🔒 IMPORT DA TRAVA DE PERMISSÃO
import { usePermissoes } from '../hooks/usePermissoes';

type Props = {
  visivel: boolean;
  clienteOriginal: any;
  fechar: () => void;
  salvar: (dadosAtualizados: any) => Promise<void> | void;
};

export default function ModalEditarCliente({ visivel, clienteOriginal, fechar, salvar }: Props) {
  const { t } = useTranslation();
  
  // 🔒 PUXAR O VERIFICADOR EM TEMPO REAL
  const { loadingPermissoes, verificarPermissaoRealTime } = usePermissoes();
  
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [endereco, setEndereco] = useState('');
  const [indicacao, setIndicacao] = useState('');
  const [reputacao, setReputacao] = useState('');
  const [segmento, setSegmento] = useState('EMPRESTIMO');

  const [uriFotoComDoc, setUriFotoComDoc] = useState<string | null>(null);
  const [uriFotoApenasDoc, setUriFotoApenasDoc] = useState<string | null>(null);
  
  const [urlBancoRosto, setUrlBancoRosto] = useState<string | null>(null);
  const [urlBancoDoc, setUrlBancoDoc] = useState<string | null>(null);
  
  const [carregandoUpload, setCarregandoUpload] = useState(false);

  useEffect(() => {
    if (clienteOriginal) {
      setNome(clienteOriginal.nome || '');
      setWhatsapp(clienteOriginal.whatsapp || '');
      setEndereco(clienteOriginal.endereco || '');
      setIndicacao(clienteOriginal.indicacao || '');
      setReputacao(clienteOriginal.reputacao || '');
      setSegmento(clienteOriginal.segmento || 'EMPRESTIMO');
      
      setUriFotoComDoc(null);
      setUriFotoApenasDoc(null);

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
      
      if (visivel) {
          carregarFotosAntigas();
      }

    } else {
      setNome(''); setWhatsapp(''); setEndereco(''); setIndicacao(''); setReputacao('');
      setUriFotoComDoc(null); setUriFotoApenasDoc(null); setUrlBancoRosto(null); setUrlBancoDoc(null);
    }
  }, [clienteOriginal, visivel]);

  const capturarFoto = async (tipo: 'com_doc' | 'apenas_doc', source: 'camera' | 'galeria') => {
      const permission = source === 'camera' 
          ? await ImagePicker.requestCameraPermissionsAsync() 
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permission.status !== 'granted') {
          if (Platform.OS === 'web') {
              window.alert(`Atenção\nPrecisamos de permissão para acessar a ${source}.`);
          } else {
              Alert.alert('Atenção', `Precisamos de permissão para acessar a ${source}.`);
          }
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
              setUrlBancoRosto(null);
          } else {
              setUriFotoApenasDoc(result.assets[0].uri);
              setUrlBancoDoc(null);
          }
      }
  };

  const escolherFonte = (tipo: 'com_doc' | 'apenas_doc') => {
      if (Platform.OS === 'web') {
          const usarCamera = window.confirm(`Selecionar Foto KYC\nDe onde deseja pegar a imagem do documento?\n\n[OK] = Tirar Foto (Câmera)\n[Cancelar] = Escolher da Galeria`);
          if (usarCamera) {
              capturarFoto(tipo, 'camera');
          } else {
              capturarFoto(tipo, 'galeria');
          }
      } else {
          Alert.alert('Selecionar Foto KYC', 'De onde deseja pegar a imagem do documento?', [
              { text: 'Tirar Foto (Câmera)', onPress: () => capturarFoto(tipo, 'camera') },
              { text: 'Escolher da Galeria', onPress: () => capturarFoto(tipo, 'galeria') },
              { text: 'Cancelar', style: 'cancel' }
          ]);
      }
  };

  const realizarUploadArquivo = async (uri: string, prefixo: string, userId: string): Promise<string> => {
      let ext = uri.split('.').pop()?.toLowerCase() || 'jpeg';
      if (ext === 'jpg') ext = 'jpeg'; 
      
      const path = `${userId}/${prefixo}_${Date.now()}.${ext}`;
      
      if (Platform.OS === 'web') {
          const response = await fetch(uri);
          const blob = await response.blob();
          
          const { error } = await supabase.storage
              .from('documentos_clientes')
              .upload(path, blob); 

          if (error) throw error;
      } else {
          const formData = new FormData();
          formData.append('file', {
              uri: uri, 
              name: `${prefixo}_${Date.now()}.${ext}`,
              type: `image/${ext}`
          } as any); 
          
          const { error } = await supabase.storage
              .from('documentos_clientes')
              .upload(path, formData); 

          if (error) throw error;
      }
      
      return path;
  };

  const handleSalvar = async () => {
    if (loadingPermissoes) return;

    // 🔥 Gira a bolinha para esconder que está indo confirmar com o banco
    setCarregandoUpload(true);

    // 🔒 CONSULTA EM TEMPO REAL NO SUPABASE
    const temAcesso = await verificarPermissaoRealTime('cadastrar_cliente');
    if (!temAcesso) {
        setCarregandoUpload(false);
        if (Platform.OS === 'web') {
            window.alert("Acesso Negado\nO seu líder não liberou permissão para editar clientes.");
        } else {
            Alert.alert("Acesso Negado", "O seu líder não liberou permissão para editar clientes.");
        }
        return;
    }

    if (!nome.trim()) {
        setCarregandoUpload(false);
        if (Platform.OS === 'web') {
            window.alert(`${t('common.erro')}\n${t('modalEditarCliente.erroNome')}`);
            return;
        } else {
            return Alert.alert(t('common.erro'), t('modalEditarCliente.erroNome'));
        }
    }
    
    let pathFotoComDoc = clienteOriginal.foto_com_documento; 
    let pathFotoApenasDoc = clienteOriginal.foto_apenas_documento; 

    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
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

            if (promessasUpload.length > 0) {
                await Promise.all(promessasUpload);
            }
        }

        // 🔥 ESPERA SALVAR PARA FECHAR
        await salvar({ 
            nome: nome.trim().toUpperCase(), 
            whatsapp, 
            endereco, 
            indicacao, 
            reputacao, 
            segmento,
            foto_com_documento: pathFotoComDoc,
            foto_apenas_documento: pathFotoApenasDoc
        });

    } catch (e) {
        console.log("Erro no upload ao editar", e);
    } finally {
        setCarregandoUpload(false);
    }
  };

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={fechar}>
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

            {/* 🔒 TRAVA: Botão bloqueado enquanto carrega permissões iniciais */}
            <TouchableOpacity style={styles.btnP} onPress={handleSalvar} disabled={carregandoUpload || loadingPermissoes}>
              {carregandoUpload || loadingPermissoes ? (
                  <ActivityIndicator color="#FFF" />
              ) : (
                  <Text style={styles.btnTxt}>{t('modalEditarCliente.btnSalvarMudancas')}</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity onPress={fechar} style={styles.btnCancel} disabled={carregandoUpload || loadingPermissoes}>
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
    maxHeight: '85%', 
    flexShrink: 1, 
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

  kycSection: { marginTop: 10, marginBottom: 20, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 15 },
  rowFotos: { flexDirection: 'row', gap: 10 },
  colFoto: { flex: 1 },
  btnFotoVazia: { backgroundColor: '#F4F6F7', padding: 15, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#BDC3C7', borderStyle: 'dashed', height: 100, justifyContent: 'center' },
  txtBtnFoto: { color: '#7F8C8D', marginTop: 5, fontSize: 11, textAlign: 'center' },
  previewBox: { position: 'relative', height: 100, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#DDD' },
  imgPreview: { width: '100%', height: '100%' },
  btnTrocarFoto: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(41, 128, 185, 0.85)', paddingVertical: 6, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
import { Ionicons } from '@expo/vector-icons';
// import * as Clipboard from 'expo-clipboard'; // Descomente se configurou o native
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking, // ✅ Adicionado para abrir o WhatsApp
    Modal,
    RefreshControl,
    ScrollView,
    Share,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useAssinatura } from '../hooks/useAssinatura';
import { supabase } from '../services/supabase';

export default function EquipeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isPremium } = useAssinatura();
  
  const [loading, setLoading] = useState(true);
  const [minhaEquipe, setMinhaEquipe] = useState<any>(null);
  const [membros, setMembros] = useState<any[]>([]); 
  const [nomeEquipeInput, setNomeEquipeInput] = useState('');
  const [idConviteInput, setIdConviteInput] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // ✅ ESTADOS PARA O MODAL DE PERMISSÕES
  const [modalPermissoesVisivel, setModalPermissoesVisivel] = useState(false);
  const [membroSelecionado, setMembroSelecionado] = useState<any>(null);
  const [permissoesAtuais, setPermissoesAtuais] = useState<string[]>([]);
  const [salvandoPermissoes, setSalvandoPermissoes] = useState(false);

  // 🚀 LISTA DE PERMISSÕES ATUALIZADA COM A ABA DO CAIXA PESSOAL E DASHBOARD
  const OPCOES_PERMISSAO = [
      { id: 'compartilhar_carteira', label: t('equipe.permCarteira', 'Espelhar Visão do Líder (Carteira Compartilhada)') },
      { id: 'cadastrar_cliente', label: t('equipe.permCadastrar', 'Cadastrar e Editar Clientes') },
      { id: 'gerar_contrato', label: t('equipe.permContrato', 'Gerar Contratos') },
      { id: 'cobrar', label: t('equipe.permCobrar', 'Realizar Cobranças e Baixas') },
      { id: 'acessar_caixa', label: t('equipe.permCaixa', 'Acessar Aba do Caixa Pessoal') },
      { id: 'ver_dashboard', label: t('equipe.permDashboard', 'Visualizar Dashboard e Relatórios') } // 🚀 NOVO
  ];

  useEffect(() => {
    carregarEquipe();
  }, [isPremium]);

  async function carregarEquipe() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUserId(user.id);

      console.log("🔍 [1/3] Buscando equipe...");
      let equipeId = null;

      const { data: profile } = await supabase.from('profiles').select('team_id').eq('user_id', user.id).single();
      if (profile?.team_id) {
        equipeId = profile.team_id;
      } else {
        const { data: timeDoDono } = await supabase.from('teams').select('id').eq('owner_id', user.id).limit(1).single();
        if (timeDoDono) {
            console.log("⚠️ Recuperado pelo Dono!");
            equipeId = timeDoDono.id;
            await supabase.from('profiles').update({ team_id: equipeId }).eq('user_id', user.id);
        }
      }

      if (equipeId) {
        const { data: equipe } = await supabase.from('teams').select('*').eq('id', equipeId).single();
        if (equipe) {
            console.log("✅ [2/3] Equipe encontrada:", equipe.name);
            setMinhaEquipe(equipe);

            const { data: listaMembros } = await supabase.from('profiles').select('*').eq('team_id', equipeId);
            setMembros(listaMembros || []);
            console.log("👥 [3/3] Memembros:", listaMembros?.length);

            if (equipe.owner_id === user.id && isPremium && !equipe.is_premium) {
                await supabase.from('teams').update({ is_premium: true }).eq('id', equipe.id);
            }
        }
      } else {
        setMinhaEquipe(null);
        setMembros([]);
      }

    } catch (error) {
      console.log("Erro:", error);
    } finally {
      setLoading(false);
    }
  }

  async function criarEquipe() {
    if (!nomeEquipeInput.trim()) return Alert.alert(t('equipe.alertErro'), t('equipe.erroNome'));
    
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: novaEquipe, error } = await supabase
        .from('teams')
        .insert({ name: nomeEquipeInput, owner_id: user?.id, is_premium: isPremium }) // Novo padrão no banco é 0
        .select()
        .single();

      if (error) throw error;

      await supabase.from('profiles').update({ team_id: novaEquipe.id, email: user?.email }).eq('user_id', user?.id);
      
      Alert.alert(t('equipe.alertSucesso'), t('equipe.alertCriada'));
      setNomeEquipeInput('');
      await carregarEquipe();

    } catch (error: any) {
      Alert.alert(t('equipe.alertErro'), error.message);
    } finally {
      setLoading(false);
    }
  }

  // ✅ TRAVA DE LIMITE INJETADA AQUI (Com fallback para 0)
  async function entrarNaEquipe() {
    const codigoLimpo = idConviteInput.trim();
    if (!codigoLimpo) return Alert.alert(t('equipe.alertErro'), t('equipe.erroCodigo'));
    if (codigoLimpo.length < 10) return Alert.alert(t('equipe.alertErro'), t('equipe.erroCodigoInvalido'));

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      // Busca a equipe junto com a contagem de membros (profiles)
      const { data: equipe, error } = await supabase.from('teams').select('*, profiles(count)').eq('id', codigoLimpo).single();
      
      if (error || !equipe) return Alert.alert(t('equipe.erroNaoEncontrada'), t('equipe.erroVerifique'));

      // Verifica o limite de membros
      const qtdMembrosAtuais = equipe.profiles[0].count - 1; // -1 para não contar o dono
      // ✅ ALTERADO: Se limite for nulo, assume 0
      const limite = equipe.limite_membros || 0;

      if (qtdMembrosAtuais >= limite) {
          return Alert.alert(
              "Equipe Lotada 🚫", 
              "Esta equipe atingiu o limite máximo de funcionários. O gestor precisa liberar vagas via Add-on Corporativo."
          );
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ team_id: equipe.id, email: user?.email })
        .eq('user_id', user?.id);

      if (updateError) throw updateError;
      
      Alert.alert(t('equipe.alertSucesso'), t('equipe.alertEntrou', { nome: equipe.name }));
      setIdConviteInput('');
      await carregarEquipe();

    } catch (error: any) {
      Alert.alert(t('equipe.alertErro'), "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  async function excluirEquipe() {
    Alert.alert(
        t('equipe.alertExcluirTitulo'), 
        t('equipe.alertExcluirMsg'), 
        [
            { text: t('common.cancelar', 'Cancelar'), style: "cancel" },
            { 
                text: t('equipe.excluir'), 
                style: "destructive", 
                onPress: async () => {
                    try {
                        setLoading(true);
                        const { error } = await supabase.from('teams').delete().eq('id', minhaEquipe.id);
                        if (error) throw error;

                        setMinhaEquipe(null);
                        setMembros([]);
                        Alert.alert("Encerrada", t('equipe.alertExcluida'));
                        await carregarEquipe(); 
                    } catch (e: any) { 
                        Alert.alert(t('equipe.alertErro'), "Falha ao excluir equipe: " + e.message);
                    } finally { 
                        setLoading(false); 
                    }
                }
            }
        ]
    );
  }

  async function sairDaEquipe() {
    Alert.alert(t('equipe.alertSairTitulo'), t('equipe.alertSairMsg'), [
        { text: t('common.cancelar', 'Cancelar'), style: "cancel" },
        { text: t('equipe.sair'), style: "destructive", onPress: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('profiles').update({ team_id: null }).eq('user_id', user?.id);
            carregarEquipe();
        }}
    ]);
  }

  const acaoBotaoCopiar = async () => {
    if (minhaEquipe?.id) Alert.alert("Código", minhaEquipe.id);
  };

  const compartilhar = async () => {
    if (minhaEquipe?.id) await Share.share({ message: `Código da Equipe Axoryn: ${minhaEquipe.id}` });
  };

  // 🛡️ MÁGICA DE TRADUÇÃO DE DADOS ATUALIZADA (EVITA O BUG SILENCIOSO)
  function abrirModalPermissoes(membro: any) {
      setMembroSelecionado(membro);
      
      let arrayLimpo: string[] = [];
      const perm = membro.permissoes;

      if (Array.isArray(perm)) {
          arrayLimpo = perm;
      } else if (typeof perm === 'string') {
          try {
              arrayLimpo = JSON.parse(perm);
          } catch (e) {
              // Se o banco mandou como string pura
              if (perm.includes('compartilhar_carteira')) arrayLimpo.push('compartilhar_carteira');
              if (perm.includes('cadastrar_cliente')) arrayLimpo.push('cadastrar_cliente');
              if (perm.includes('gerar_contrato')) arrayLimpo.push('gerar_contrato');
              if (perm.includes('cobrar')) arrayLimpo.push('cobrar');
              if (perm.includes('acessar_caixa')) arrayLimpo.push('acessar_caixa');
              if (perm.includes('ver_dashboard')) arrayLimpo.push('ver_dashboard'); // 🚀 NOVO
          }
      }
      
      setPermissoesAtuais(arrayLimpo); 
      setModalPermissoesVisivel(true);
  }

  function togglePermissao(idPermissao: string) {
      if (permissoesAtuais.includes(idPermissao)) {
          // Remove se já tem
          setPermissoesAtuais(prev => prev.filter(p => p !== idPermissao));
      } else {
          // Adiciona se não tem
          setPermissoesAtuais(prev => [...prev, idPermissao]);
      }
  }

  async function salvarPermissoes() {
      if (!membroSelecionado) return;
      try {
          setSalvandoPermissoes(true);
          const { error } = await supabase
              .from('profiles')
              .update({ permissoes: permissoesAtuais })
              .eq('user_id', membroSelecionado.user_id);
          
          if (error) throw error;

          Alert.alert(t('equipe.alertSucesso', 'Sucesso'), t('equipe.permSalvas', 'Permissões atualizadas com sucesso!'));
          setModalPermissoesVisivel(false);
          await carregarEquipe(); // Recarrega para mostrar visualmente a atualização
      } catch (error: any) {
          Alert.alert(t('equipe.alertErro', 'Erro'), error.message);
      } finally {
          setSalvandoPermissoes(false);
      }
  }

  if (loading && !salvandoPermissoes) return <View style={styles.center}><ActivityIndicator size="large" color="#2980B9" /></View>;

  const isOwner = minhaEquipe?.owner_id === currentUserId;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('equipe.titulo')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={carregarEquipe} />}>
        {minhaEquipe ? (
            <View>
                <View style={styles.card}>
                    <View style={styles.teamHeader}>
                        <View style={styles.iconBox}><Ionicons name="people" size={32} color="#FFF" /></View>
                        <View style={{flex: 1}}>
                            <Text style={styles.label}>{t('equipe.equipeAtual')}</Text>
                            <Text style={styles.teamName}>
                                {minhaEquipe.name ? minhaEquipe.name : t('equipe.carregando')}
                            </Text>
                            {minhaEquipe.is_premium && (
                                <View style={styles.badgePremium}>
                                    <Ionicons name="star" size={10} color="#FFF" />
                                    <Text style={styles.badgeText}>{t('equipe.premium')}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                    
                    <View style={styles.divider} />
                    
                    <Text style={styles.labelCode}>{t('equipe.codigoConvite')}</Text>
                    <TouchableOpacity style={styles.codeBox} onPress={acaoBotaoCopiar}>
                        <Text style={styles.codeText} selectable>{minhaEquipe.id}</Text>
                        <Ionicons name="copy-outline" size={20} color="#666" />
                    </TouchableOpacity>

                    <View style={styles.rowButtons}>
                        <TouchableOpacity style={[styles.actionBtn, {backgroundColor:'#2980B9'}]} onPress={compartilhar}>
                            <Ionicons name="share-social" size={20} color="#FFF" />
                            <Text style={styles.btnTextSmall}>{t('equipe.convidar')}</Text>
                        </TouchableOpacity>

                        {isOwner ? (
                            <TouchableOpacity style={[styles.actionBtn, {backgroundColor:'#C0392B'}]} onPress={excluirEquipe}>
                                <Ionicons name="trash-outline" size={20} color="#FFF" />
                                <Text style={styles.btnTextSmall}>{t('equipe.excluir')}</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={[styles.actionBtn, {backgroundColor:'#E74C3C'}]} onPress={sairDaEquipe}>
                                <Ionicons name="log-out-outline" size={20} color="#FFF" />
                                <Text style={styles.btnTextSmall}>{t('equipe.sair')}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <View style={styles.membersSection}>
                    {/* ✅ BOTÃO DO WHATSAPP INJETADO NO HEADER DA LISTA */}
                    <View style={styles.membersHeader}>
                        <View>
                            <Text style={styles.membersTitle}>{t('equipe.membros')} ({membros.length})</Text>
                            {isOwner && minhaEquipe && (
                                <Text style={{fontSize: 12, color: '#7F8C8D'}}>
                                    {/* ✅ ALTERADO: Fallback para 0 nas vagas */}
                                    Vagas: {membros.length - 1} de {minhaEquipe.limite_membros || 0}
                                </Text>
                            )}
                        </View>
                        
                        <View style={{flexDirection: 'row', gap: 15, alignItems: 'center'}}>
                            {isOwner && (
                                <TouchableOpacity 
                                    style={{backgroundColor: '#27AE60', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6}}
                                    onPress={() => Linking.openURL('https://wa.me/5515996292295?text=Olá!%20Gostaria%20de%20adicionar%20mais%20vagas%20na%20minha%20equipe%20do%20Axoryn%20Control.')}
                                >
                                    <Text style={{color: '#FFF', fontSize: 12, fontWeight: 'bold'}}>+ Vagas</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={carregarEquipe}><Ionicons name="refresh" size={18} color="#2980B9" /></TouchableOpacity>
                        </View>
                    </View>

                    {membros.map((membro, index) => {
                        const isMemberOwner = membro.user_id === minhaEquipe.owner_id;
                        const avatarUrl = `https://ui-avatars.com/api/?background=${isMemberOwner ? 'F1C40F' : 'E0E0E0'}&color=333&name=${membro.email || 'U'}`;
                        const uniqueKey = membro.user_id || index;
                        return (
                            <View key={uniqueKey} style={styles.memberItem}>
                                <Image source={{ uri: avatarUrl }} style={styles.memberAvatar} />
                                <View style={{flex: 1}}>
                                    <Text style={styles.memberEmail} numberOfLines={1}>{membro.email || "Usuário"}</Text>
                                    <Text style={styles.memberRole}>{isMemberOwner ? t('equipe.lider') : t('equipe.membro')}</Text>
                                </View>

                                {/* ✅ NOVO: BOTÃO DE ENGRENAGEM (Visível apenas para o Dono em relação aos membros) */}
                                {isOwner && !isMemberOwner && (
                                    <TouchableOpacity 
                                        style={styles.settingsBtn} 
                                        onPress={() => abrirModalPermissoes(membro)}
                                    >
                                        <Ionicons name="settings-outline" size={22} color="#7F8C8D" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    })}
                </View>
            </View>
        ) : (
            <>
                {isPremium ? (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>{t('equipe.criarEquipe')}</Text>
                        <TextInput 
                            style={styles.input}
                            placeholder={t('equipe.placeholderNome')}
                            value={nomeEquipeInput}
                            onChangeText={setNomeEquipeInput}
                        />
                        <TouchableOpacity style={styles.createBtn} onPress={criarEquipe}>
                            <Text style={styles.btnText}>{t('equipe.btnCriar')}</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                   <View style={styles.infoBox}><Text style={styles.infoText}>{t('equipe.sejaPremium')}</Text></View>
                )}

                <View style={[styles.card, { marginTop: 20 }]}>
                    <Text style={styles.cardTitle}>{t('equipe.entrarEquipe')}</Text>
                    <Text style={styles.cardDesc}>{t('equipe.descEntrar')}</Text>
                    
                    <TextInput 
                        style={styles.input}
                        placeholder={t('equipe.placeholderCodigo')}
                        value={idConviteInput}
                        onChangeText={setIdConviteInput}
                        autoCapitalize="none" 
                        autoCorrect={false}
                    />
                    
                    <TouchableOpacity style={styles.joinBtn} onPress={entrarNaEquipe}>
                        <Text style={styles.joinText}>{t('equipe.btnEntrar')}</Text>
                    </TouchableOpacity>
                </View>
            </>
        )}
      </ScrollView>

      {/* ✅ NOVO: MODAL DE PERMISSÕES */}
      <Modal
          animationType="slide"
          transparent={true}
          visible={modalPermissoesVisivel}
          onRequestClose={() => setModalPermissoesVisivel(false)}
      >
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>{t('equipe.gerirPermissoes', 'Gerir Permissões')}</Text>
                      <TouchableOpacity onPress={() => setModalPermissoesVisivel(false)}>
                          <Ionicons name="close" size={24} color="#7F8C8D" />
                      </TouchableOpacity>
                  </View>

                  <Text style={styles.modalSubtitle}>
                      {t('equipe.perfilDe', 'Acessos de:')} {membroSelecionado?.email}
                  </Text>

                  <View style={styles.permissionsList}>
                      {OPCOES_PERMISSAO.map((permissao) => {
                          const ativo = permissoesAtuais.includes(permissao.id);
                          return (
                              <View key={permissao.id} style={styles.permissionItem}>
                                  <Text style={styles.permissionLabel}>{permissao.label}</Text>
                                  <Switch 
                                      value={ativo} 
                                      onValueChange={() => togglePermissao(permissao.id)}
                                      trackColor={{ false: "#D0D3D4", true: "#27AE60" }}
                                      thumbColor="#FFF"
                                  />
                              </View>
                          )
                      })}
                  </View>

                  <TouchableOpacity 
                      style={styles.savePermBtn} 
                      onPress={salvarPermissoes}
                      disabled={salvandoPermissoes}
                  >
                      {salvandoPermissoes ? (
                          <ActivityIndicator color="#FFF" />
                      ) : (
                          <Text style={styles.savePermText}>{t('common.salvar', 'Salvar Alterações')}</Text>
                      )}
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  backBtn: { marginRight: 15 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#2C3E50' },
  content: { padding: 20 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 10, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  teamHeader: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 5 },
  iconBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#2980B9', justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 12, color: '#95A5A6', textTransform: 'uppercase', fontWeight: 'bold' },
  teamName: { fontSize: 20, fontWeight: 'bold', color: '#2C3E50' },
  badgePremium: { flexDirection: 'row', backgroundColor: '#F1C40F', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, alignSelf: 'flex-start', marginTop: 4, alignItems: 'center', gap: 4 },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: '#FFF' },
  divider: { height: 1, backgroundColor: '#F0F2F5', marginVertical: 20 },
  labelCode: { fontSize: 13, color: '#7F8C8D', marginBottom: 8, fontWeight: '600' },
  codeBox: { backgroundColor: '#F8F9FA', padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#E0E0E0' },
  codeText: { fontFamily: 'monospace', fontSize: 13, color: '#333', fontWeight: 'bold', flex: 1 },
  rowButtons: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', padding: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center', gap: 8 },
  btnTextSmall: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  membersSection: { marginTop: 10 },
  membersHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 5 },
  membersTitle: { fontSize: 16, fontWeight: 'bold', color: '#34495E' },
  memberItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 12, marginBottom: 8, elevation: 1 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: '#EEE' },
  memberEmail: { fontSize: 14, fontWeight: '600', color: '#2C3E50' },
  memberRole: { fontSize: 12, color: '#7F8C8D' },
  settingsBtn: { padding: 8 }, 
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50', marginBottom: 8 },
  cardDesc: { fontSize: 14, color: '#7F8C8D', marginBottom: 20, lineHeight: 20 },
  input: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#D0D3D4', borderRadius: 10, padding: 14, fontSize: 16, marginBottom: 15, color: '#333' },
  createBtn: { backgroundColor: '#27AE60', padding: 16, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  joinBtn: { backgroundColor: '#FFF', borderWidth: 2, borderColor: '#2980B9', padding: 14, borderRadius: 10, alignItems: 'center' },
  joinText: { color: '#2980B9', fontWeight: 'bold', fontSize: 16 },
  infoBox: { flexDirection: 'row', backgroundColor: '#FEF5E7', padding: 20, borderRadius: 12, alignItems: 'center', gap: 15, marginBottom: 20, borderWidth: 1, borderColor: '#FDEBD0' },
  infoText: { flex: 1, color: '#D35400', fontSize: 14, lineHeight: 20 },

  // Estilos do Modal de Permissões
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50' },
  modalSubtitle: { fontSize: 14, color: '#7F8C8D', marginBottom: 20 },
  permissionsList: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 10, marginBottom: 20, borderWidth: 1, borderColor: '#EAECEE' },
  permissionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EAECEE' },
  permissionLabel: { fontSize: 15, color: '#34495E', fontWeight: '500', flex: 1, paddingRight: 10 },
  savePermBtn: { backgroundColor: '#2980B9', padding: 16, borderRadius: 10, alignItems: 'center' },
  savePermText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});
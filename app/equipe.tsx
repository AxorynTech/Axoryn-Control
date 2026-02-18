import { Ionicons } from '@expo/vector-icons';
// import * as Clipboard from 'expo-clipboard'; // Descomente se configurou o native
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next'; // ✅ Importado
import {
    ActivityIndicator,
    Alert,
    Image,
    RefreshControl,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useAssinatura } from '../hooks/useAssinatura';
import { supabase } from '../services/supabase';

export default function EquipeScreen() {
  const { t } = useTranslation(); // ✅ Hook de tradução
  const router = useRouter();
  const { isPremium } = useAssinatura();
  
  const [loading, setLoading] = useState(true);
  const [minhaEquipe, setMinhaEquipe] = useState<any>(null);
  const [membros, setMembros] = useState<any[]>([]); 
  const [nomeEquipeInput, setNomeEquipeInput] = useState('');
  const [idConviteInput, setIdConviteInput] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string>(''); // ✅ Novo: Saber quem eu sou

  useEffect(() => {
    carregarEquipe();
  }, [isPremium]);

  async function carregarEquipe() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUserId(user.id); // ✅ Salva meu ID para comparar depois

      console.log("🔍 [1/3] Buscando equipe...");
      let equipeId = null;

      // 1. Tenta pelo Perfil
      const { data: profile } = await supabase.from('profiles').select('team_id').eq('user_id', user.id).single();
      if (profile?.team_id) {
        equipeId = profile.team_id;
      } else {
        // 2. Tenta pelo Dono
        const { data: timeDoDono } = await supabase.from('teams').select('id').eq('owner_id', user.id).limit(1).single();
        if (timeDoDono) {
            console.log("⚠️ Recuperado pelo Dono!");
            equipeId = timeDoDono.id;
            await supabase.from('profiles').update({ team_id: equipeId }).eq('user_id', user.id);
        }
      }

      if (equipeId) {
        // 3. Busca Dados da Equipe
        const { data: equipe } = await supabase.from('teams').select('*').eq('id', equipeId).single();
        if (equipe) {
            console.log("✅ [2/3] Equipe encontrada:", equipe.name);
            setMinhaEquipe(equipe);

            // 4. Busca Membros
            const { data: listaMembros } = await supabase.from('profiles').select('*').eq('team_id', equipeId);
            setMembros(listaMembros || []);
            console.log("👥 [3/3] Membros:", listaMembros?.length);

            // Validação Premium
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
        .insert({ name: nomeEquipeInput, owner_id: user?.id, is_premium: isPremium })
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

  async function entrarNaEquipe() {
    const codigoLimpo = idConviteInput.trim();
    if (!codigoLimpo) return Alert.alert(t('equipe.alertErro'), t('equipe.erroCodigo'));
    if (codigoLimpo.length < 10) return Alert.alert(t('equipe.alertErro'), t('equipe.erroCodigoInvalido'));

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      console.log("Tentando entrar:", codigoLimpo);

      const { data: equipe, error } = await supabase.from('teams').select('*').eq('id', codigoLimpo).single();
      
      if (error || !equipe) return Alert.alert(t('equipe.erroNaoEncontrada'), t('equipe.erroVerifique'));

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ team_id: equipe.id, email: user?.email })
        .eq('user_id', user?.id);

      if (updateError) throw updateError;
      
      Alert.alert(t('equipe.alertSucesso'), t('equipe.alertEntrou', { nome: equipe.name }));
      setIdConviteInput('');
      await carregarEquipe();

    } catch (error: any) {
      console.log("Erro ao entrar:", error);
      Alert.alert(t('equipe.alertErro'), "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  // ✅ NOVA FUNÇÃO: EXCLUIR EQUIPE (PARA O DONO)
  async function excluirEquipe() {
    Alert.alert(
        t('equipe.alertExcluirTitulo'), 
        t('equipe.alertExcluirMsg'), 
        [
            { text: t('common.cancelar', 'Cancelar'), style: "cancel" },
            { 
                text: t('equipe.excluir'), // Traduzido: "Sim, Excluir"
                style: "destructive", 
                onPress: async () => {
                    try {
                        setLoading(true);
                        // Apaga a equipe (o banco solta os membros automaticamente com o SQL do Passo 1)
                        const { error } = await supabase.from('teams').delete().eq('id', minhaEquipe.id);
                        
                        if (error) throw error;

                        setMinhaEquipe(null);
                        setMembros([]);
                        Alert.alert("Encerrada", t('equipe.alertExcluida'));
                        await carregarEquipe(); // Recarrega para garantir
                    } catch (e: any) { 
                        console.log(e);
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

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2980B9" /></View>;

  const isOwner = minhaEquipe?.owner_id === currentUserId; // ✅ Verifica se sou dono

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

                        {/* ✅ BOTÃO INTELIGENTE: EXCLUIR (DONO) OU SAIR (MEMBRO) */}
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
                    <View style={styles.membersHeader}>
                        <Text style={styles.membersTitle}>{t('equipe.membros')} ({membros.length})</Text>
                        <TouchableOpacity onPress={carregarEquipe}><Ionicons name="refresh" size={18} color="#2980B9" /></TouchableOpacity>
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
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50', marginBottom: 8 },
  cardDesc: { fontSize: 14, color: '#7F8C8D', marginBottom: 20, lineHeight: 20 },
  input: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#D0D3D4', borderRadius: 10, padding: 14, fontSize: 16, marginBottom: 15, color: '#333' },
  createBtn: { backgroundColor: '#27AE60', padding: 16, borderRadius: 10, alignItems: 'center' },
  joinBtn: { backgroundColor: '#FFF', borderWidth: 2, borderColor: '#2980B9', padding: 14, borderRadius: 10, alignItems: 'center' },
  joinText: { color: '#2980B9', fontWeight: 'bold', fontSize: 16 },
  infoBox: { flexDirection: 'row', backgroundColor: '#FEF5E7', padding: 20, borderRadius: 12, alignItems: 'center', gap: 15, marginBottom: 20, borderWidth: 1, borderColor: '#FDEBD0' },
  infoText: { flex: 1, color: '#D35400', fontSize: 14, lineHeight: 20 }
});
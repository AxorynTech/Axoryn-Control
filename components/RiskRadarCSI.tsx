import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next'; // Hook de tradução
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useRiskRadar } from '../hooks/useRiskRadar';

interface Props {
  initialCpf?: string;
  initialTelefone?: string;
  initialNome?: string;
  compacto?: boolean;
}

export default function RiskRadarCSI({ initialCpf, initialTelefone, initialNome, compacto }: Props) {
  const { t, i18n } = useTranslation();
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  
  const { investigar, resultado, loading, consultasRestantes } = useRiskRadar();
  const [detalhesVisiveis, setDetalhesVisiveis] = useState(false);

  const isBrasil = i18n.language.startsWith('pt');

  useEffect(() => {
    if (initialCpf) setCpf(initialCpf);
    if (initialTelefone) setTelefone(initialTelefone);
  }, [initialCpf, initialTelefone]);

  const abrirSiteRecarga = () => {
    Linking.openURL('https://axoryntech.com.br/pay.html');
  };

  const handleInvestigar = async () => {
      if (consultasRestantes === undefined || consultasRestantes <= 0) {
          Alert.alert(
              t('radar.limiteTitulo'),
              t('radar.limiteMsg'),
              [
                  { text: t('common.cancelar'), style: "cancel" },
                  { text: t('radar.irSite'), onPress: abrirSiteRecarga }
              ]
          );
          return;
      }
      await investigar(cpf, telefone, initialNome || '');
  };

  const getCor = (nivel: string) => {
      if (nivel === 'SEGURO') return '#27AE60'; 
      if (nivel === 'ATENCAO') return '#F39C12'; 
      if (nivel === 'PERIGO') return '#C0392B'; 
      return '#34495E'; 
  };

  // --- MÁSCARAS DE PRIVACIDADE ---
  const maskCpfPrivacy = (val: string) => {
    if (!val) return '---';
    // Se não for Brasil, mostra ID genérico
    if (!isBrasil) {
        if (val.length > 4) return `ID ****${val.slice(-4)}`;
        return val;
    }
    // Brasil: Máscara de CPF
    const clean = val.replace(/\D/g, '');
    if (clean.length === 11) return `***.***.***-${clean.slice(9)}`;
    return val;
  };

  const maskPhonePrivacy = (val: string) => {
    if (!val) return '---';
    // Se não for Brasil, mostra telefone internacional
    if (!isBrasil) {
        if (val.length > 4) return `(+) ****-${val.slice(-4)}`;
        return val;
    }
    // Brasil: Máscara de Celular
    const clean = val.replace(/\D/g, '');
    if (clean.length >= 10) return `(**) *****-${clean.slice(-4)}`;
    return val;
  };

  const isSaldoBaixo = (consultasRestantes || 0) <= 3;
  const isZerado = (consultasRestantes || 0) <= 0;
  
  // Texto do botão traduzido dinamicamente
  const textoBotao = isZerado 
    ? t('radar.btnRecarregar') 
    : t('radar.btnConsultar');

  const getStatusText = () => {
      if (resultado.nivel === 'SEGURO') return t('radar.aprovado');
      if (resultado.nivel === 'PERIGO') return t('radar.reprovado');
      return t('radar.atencao');
  };

  // --- CORREÇÃO 1: Tradutor de Mensagens do Backend ---
  const traduzirMensagemBackend = (msg: string) => {
      if (!msg) return "";
      const msgLower = msg.toLowerCase();
      
      // Captura variações de "Cliente Seguro"
      if (msgLower.includes('nada consta') || msgLower.includes('liberado') || msgLower.includes('limpo') || msgLower.includes('safe')) {
          return t('radar.msgLimpo');
      }
      if (msgLower.includes('dupla') || (msgLower.includes('cpf') && msgLower.includes('celular'))) {
          return t('radar.msgRestricaoDupla');
      }
      if (msgLower.includes('cpf') || msgLower.includes('documento')) {
          return t('radar.msgRestricaoDoc');
      }
      if (msgLower.includes('celular') || msgLower.includes('telefone') || msgLower.includes('whatsapp')) {
          return t('radar.msgRestricaoTel');
      }
      return msg;
  };

  // --- CORREÇÃO 2: Tradutor de Critérios (Checklist) ---
  const traduzirCriterio = (criterio: string) => {
      if (!criterio) return "";
      
      // Detecta "Nenhum atraso"
      if (criterio.toLowerCase().includes('nenhum atraso') || criterio.includes('No delays')) {
          const icone = criterio.includes('✅') ? '✅ ' : '';
          return icone + t('radar.criterioSemAtraso');
      }

      // Substituições genéricas
      return criterio
        .replace('Pendência', t('radar.atencao'))
        .replace('Limpo', t('radar.aprovado'))
        .replace('Attention', t('radar.atencao'))
        .replace('Clean', t('radar.aprovado'));
  };

  return (
    <View style={[styles.container, compacto && {marginTop: 5, padding: 10}]}>
      <View style={styles.header}>
        <View style={{flexDirection:'row', alignItems:'center'}}>
            <Ionicons name="shield-checkmark" size={compacto ? 18 : 22} color="#2980B9" />
            <Text style={[styles.title, compacto && {fontSize: 12}]}>AXORYN INTELLIGENCE</Text>
        </View>
        
        <TouchableOpacity 
            onPress={abrirSiteRecarga} 
            style={[
                styles.badgeCreditos, 
                isSaldoBaixo && {borderColor:'#E74C3C', backgroundColor:'#FDEDEC'}
            ]}
        >
            <Ionicons name={!isZerado ? "flash" : "alert-circle"} size={14} color={!isZerado && !isSaldoBaixo ? "#F1C40F" : "#E74C3C"} />
            <Text style={[styles.txtCreditos, isSaldoBaixo ? {color:'#C0392B'} : {color:'#B7950B'}]}>
                {consultasRestantes === undefined || consultasRestantes === null 
                    ? '...' 
                    : (isZerado ? t('radar.acabou') : `${t('radar.restam')}: ${consultasRestantes}`)}
            </Text>
            {isZerado && <Ionicons name="add-circle" size={14} color="#E74C3C" style={{marginLeft: 4}}/>}
        </TouchableOpacity>
      </View>

      {!resultado ? (
          <View>
              {!compacto && <Text style={styles.help}>{t('radar.ajuda')}</Text>}
              <View style={styles.formArea}>
                  <View style={{flexDirection:'row', gap: 5}}>
                      <TextInput style={[styles.input, {flex: 1, color: '#7F8C8D', textAlign: 'center'}]} placeholder={t('radar.documentoLabel')} value={maskCpfPrivacy(cpf)} editable={false} />
                      <TextInput style={[styles.input, {flex: 1, color: '#7F8C8D', textAlign: 'center'}]} placeholder={t('radar.telefoneLabel')} value={maskPhonePrivacy(telefone)} editable={false} />
                  </View>
              </View>
              <TouchableOpacity 
                style={[styles.btnInvestigar, compacto && {padding: 10, marginTop: 10}, isZerado && {backgroundColor: '#E74C3C'}]} 
                onPress={!isZerado ? handleInvestigar : abrirSiteRecarga}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#FFF" size="small" /> : (
                    <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                        <Ionicons name={!isZerado ? "search" : "cart"} size={16} color="#FFF" style={{marginRight:6}}/>
                        <Text style={styles.txtBtn}>{textoBotao}</Text>
                    </View>
                )}
              </TouchableOpacity>
          </View>
      ) : (
          <View style={[styles.resultCard, { borderTopColor: getCor(resultado.nivel) }]}>
              <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 10}}>
                  <View>
                      <Text style={[styles.statusTxt, { color: getCor(resultado.nivel) }]}>{getStatusText()}</Text>
                      <Text style={{fontSize:10, color:'#7F8C8D'}}>{t('radar.scoreLabel')}</Text>
                  </View>
                  <View style={[styles.scoreCircle, {borderColor: getCor(resultado.nivel)}]}>
                      <Text style={[styles.scoreNum, {color: getCor(resultado.nivel)}]}>{resultado.score}</Text>
                  </View>
              </View>

              {/* MENSAGEM DO BACKEND TRADUZIDA */}
              <Text style={styles.msg}>{traduzirMensagemBackend(resultado.mensagem)}</Text>
              
              {resultado.financeiro && (resultado.financeiro.qtd_atrasos > 0) && (
                  <View style={styles.financeBox}>
                      <View style={styles.financeItem}>
                          <Text style={styles.finLabel}>{t('radar.divida')}</Text>
                          <Text style={styles.finValueRed}>
                             {/* MOEDA DINÂMICA (R$ ou $) */}
                             {t('common.moeda')} {resultado.financeiro.divida_total?.toFixed(2)}
                          </Text>
                      </View>
                      <View style={styles.divisorVertical}/>
                      <View style={styles.financeItem}>
                          <Text style={styles.finLabel}>{t('radar.maiorAtraso')}</Text>
                          <Text style={styles.finValueRed}>
                              {resultado.financeiro.maior_atraso} {t('radar.dias')}
                          </Text>
                      </View>
                  </View>
              )}

              <TouchableOpacity onPress={() => setDetalhesVisiveis(!detalhesVisiveis)} style={{marginTop:10}}>
                  <Text style={{color:'#2980B9', fontSize:11, fontWeight:'bold', textAlign:'center'}}>
                      {detalhesVisiveis ? t('radar.ocultar') : t('radar.verDetalhes')}
                  </Text>
              </TouchableOpacity>

              {detalhesVisiveis && resultado.criterios && (
                  <View style={styles.criteriaBox}>
                      {resultado.criterios.map((c: string, i: number) => (
                          <Text key={i} style={[styles.criteriaTxt, c.includes('✅') ? {color:'#27AE60'} : {color:'#C0392B'}]}>
                              {/* APLICA A TRADUÇÃO NOS CRITÉRIOS */}
                              {traduzirCriterio(c)}
                          </Text>
                      ))}
                  </View>
              )}
          </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#F8F9FA', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7E9', marginTop: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontWeight: 'bold', fontSize: 14, color: '#2C3E50', marginLeft: 8 },
  badgeCreditos: { flexDirection: 'row', backgroundColor: '#FEF9E7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 15, borderWidth:1, borderColor:'#F1C40F', alignItems:'center' },
  txtCreditos: { fontSize: 12, fontWeight: 'bold', color: '#B7950B', marginLeft: 4 },
  help: { fontSize: 11, color: '#7F8C8D', marginBottom: 10 },
  formArea: { gap: 8 },
  input: { backgroundColor: '#EAECEE', borderRadius: 6, padding: 8, borderWidth: 1, borderColor: '#D7DBDD', fontSize: 13, color: '#555' },
  btnInvestigar: { backgroundColor: '#2C3E50', borderRadius: 6, padding: 12, alignItems: 'center', marginTop: 10, elevation: 2 },
  txtBtn: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  resultCard: { marginTop: 5, backgroundColor: '#FFF', padding: 15, borderRadius: 8, elevation: 1 },
  statusTxt: { fontSize: 18, fontWeight: 'bold' },
  scoreCircle: { width: 50, height: 50, borderRadius: 25, borderWidth: 4, justifyContent:'center', alignItems:'center' },
  scoreNum: { fontSize: 18, fontWeight: 'bold' },
  msg: { marginTop: 5, color: '#555', fontSize: 13, marginBottom: 10 },
  financeBox: { flexDirection: 'row', backgroundColor: '#FDEDEC', borderRadius: 6, padding: 10, marginTop: 5, justifyContent:'space-around', alignItems:'center' },
  financeItem: { alignItems: 'center' },
  finLabel: { fontSize: 10, color: '#7F8C8D', fontWeight: 'bold', textTransform: 'uppercase' },
  finValueRed: { fontSize: 14, color: '#C0392B', fontWeight: 'bold' },
  divisorVertical: { width: 1, height: '100%', backgroundColor: '#E6B0AA' },
  criteriaBox: { marginTop: 10, backgroundColor: '#F2F4F4', padding: 8, borderRadius: 6 },
  criteriaTxt: { fontSize: 11, marginBottom: 2, fontWeight: 'bold' }
});
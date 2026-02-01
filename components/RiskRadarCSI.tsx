import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import React, { useEffect, useState } from 'react';
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
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  
  const { investigar, resultado, loading, consultasRestantes } = useRiskRadar();
  const [detalhesVisiveis, setDetalhesVisiveis] = useState(false);

  useEffect(() => {
    if (initialCpf) setCpf(initialCpf);
    if (initialTelefone) setTelefone(initialTelefone);
  }, [initialCpf, initialTelefone]);

  const abrirSiteRecarga = () => {
    Linking.openURL('https://fantastic-clafoutis-45d812.netlify.app/index.html');
  };

  const handleInvestigar = async () => {
      // Verifica se é undefined, null ou <= 0
      if (consultasRestantes === undefined || consultasRestantes <= 0) {
          Alert.alert(
              "Limite Atingido",
              "Seus créditos acabaram. Acesse o site para recarregar.",
              [
                  { text: "Cancelar", style: "cancel" },
                  { text: "Ir para o Site", onPress: abrirSiteRecarga }
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

  // Lógica visual
  const isSaldoBaixo = (consultasRestantes || 0) <= 3;
  const isZerado = (consultasRestantes || 0) <= 0;
  const textoBotao = isZerado ? 'RECARREGAR NO SITE' : 'CONSULTAR AGORA';

  return (
    <View style={[styles.container, compacto && {marginTop: 5, padding: 10}]}>
      
      {/* CABEÇALHO */}
      <View style={styles.header}>
        <View style={{flexDirection:'row', alignItems:'center'}}>
            <Ionicons name="shield-checkmark" size={compacto ? 18 : 22} color="#2980B9" />
            <Text style={[styles.title, compacto && {fontSize: 12}]}>AXORYN INTELLIGENCE</Text>
        </View>
        
        {/* CORREÇÃO: Removi a verificação {!compacto && ...} */}
        {/* Agora o badge aparece SEMPRE, independente de onde esteja */}
        <TouchableOpacity 
            onPress={abrirSiteRecarga} 
            style={[
                styles.badgeCreditos, 
                isSaldoBaixo && {borderColor:'#E74C3C', backgroundColor:'#FDEDEC'}
            ]}
        >
            <Ionicons 
                name={!isZerado ? "flash" : "alert-circle"} 
                size={14} 
                color={!isZerado && !isSaldoBaixo ? "#F1C40F" : "#E74C3C"}
            />
            
            <Text style={[
                styles.txtCreditos, 
                isSaldoBaixo ? {color:'#C0392B'} : {color:'#B7950B'}
            ]}>
                {consultasRestantes === undefined || consultasRestantes === null 
                    ? '...' 
                    : (isZerado ? 'Acabou' : `Restam: ${consultasRestantes}`)
                }
            </Text>
            
            {isZerado && <Ionicons name="add-circle" size={14} color="#E74C3C" style={{marginLeft: 4}}/>}
        </TouchableOpacity>
      </View>

      {!resultado ? (
          <View>
              {!compacto && <Text style={styles.help}>Análise de Risco (CPF e Celular).</Text>}
              
              <View style={styles.formArea}>
                  <View style={{flexDirection:'row', gap: 5}}>
                      <TextInput style={[styles.input, {flex: 1}]} placeholder="CPF" value={cpf} editable={false} />
                      <TextInput style={[styles.input, {flex: 1}]} placeholder="WhatsApp" value={telefone} editable={false} />
                  </View>
              </View>

              <TouchableOpacity 
                style={[
                    styles.btnInvestigar, 
                    compacto && {padding: 10, marginTop: 10},
                    isZerado && {backgroundColor: '#E74C3C'}
                ]} 
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
              {/* Resultado Card */}
              <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 10}}>
                  <View>
                      <Text style={[styles.statusTxt, { color: getCor(resultado.nivel) }]}>
                          {resultado.nivel === 'SEGURO' ? 'APROVADO' : (resultado.nivel === 'PERIGO' ? 'REPROVADO' : 'ATENÇÃO')}
                      </Text>
                      <Text style={{fontSize:10, color:'#7F8C8D'}}>Score Calculado</Text>
                  </View>
                  <View style={[styles.scoreCircle, {borderColor: getCor(resultado.nivel)}]}>
                      <Text style={[styles.scoreNum, {color: getCor(resultado.nivel)}]}>{resultado.score}</Text>
                  </View>
              </View>

              <Text style={styles.msg}>{resultado.mensagem}</Text>
              
              {resultado.financeiro && (resultado.financeiro.qtd_atrasos > 0) && (
                  <View style={styles.financeBox}>
                      <View style={styles.financeItem}>
                          <Text style={styles.finLabel}>Dívida Total</Text>
                          <Text style={styles.finValueRed}>R$ {resultado.financeiro.divida_total?.toFixed(2)}</Text>
                      </View>
                      <View style={styles.divisorVertical}/>
                      <View style={styles.financeItem}>
                          <Text style={styles.finLabel}>Maior Atraso</Text>
                          <Text style={styles.finValueRed}>{resultado.financeiro.maior_atraso} Dias</Text>
                      </View>
                  </View>
              )}

              <TouchableOpacity onPress={() => setDetalhesVisiveis(!detalhesVisiveis)} style={{marginTop:10}}>
                  <Text style={{color:'#2980B9', fontSize:11, fontWeight:'bold', textAlign:'center'}}>
                      {detalhesVisiveis ? 'Ocultar Detalhes ▲' : 'Ver Detalhes ▼'}
                  </Text>
              </TouchableOpacity>

              {detalhesVisiveis && resultado.criterios && (
                  <View style={styles.criteriaBox}>
                      {resultado.criterios.map((c: string, i: number) => (
                          <Text key={i} style={[styles.criteriaTxt, c.includes('✅') ? {color:'#27AE60'} : {color:'#C0392B'}]}>
                              {c}
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
  
  // Badge Ajustado
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
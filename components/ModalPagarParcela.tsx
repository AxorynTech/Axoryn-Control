import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Contrato } from '../types';

// 🔒 IMPORT DA TRAVA DE PERMISSÃO
import { usePermissoes } from '../hooks/usePermissoes';

type Props = {
  visivel: boolean;
  contrato: Contrato | null;
  fechar: () => void;
  // 🚀 ADICIONADO: O confirmar agora envia a data E o valor final da multa
  confirmar: (data: string, multaCobrada: number) => Promise<void> | void;
};

export default function ModalPagarParcela({ visivel, contrato, fechar, confirmar }: Props) {
  const { t } = useTranslation(); 
  
  // 🔒 PUXAR O VERIFICADOR EM TEMPO REAL
  const { loadingPermissoes, verificarPermissaoRealTime } = usePermissoes();
  const [salvando, setSalvando] = useState(false);
  
  const moeda = t('common.moeda', { defaultValue: 'R$' });
  const [data, setData] = useState('');
  
  // 🚀 ADICIONADO: Estado para controlar o valor da multa editável na tela
  const [multaEditavel, setMultaEditavel] = useState('0');

  useEffect(() => {
    if (visivel) {
      const hoje = new Date();
      const dia = String(hoje.getDate()).padStart(2, '0');
      const mes = String(hoje.getMonth() + 1).padStart(2, '0');
      const ano = hoje.getFullYear();
      setData(`${dia}/${mes}/${ano}`);
    }
  }, [visivel]);

  // 🚀 ADICIONADO: Recalcula a multa original sempre que a data mudar
  useEffect(() => {
    if (contrato && contrato.valorMultaDiaria && contrato.valorMultaDiaria > 0) {
        let dtPag = new Date();
        const partesData = data.split('/');
        if (partesData.length === 3 && partesData[2].length === 4) {
            dtPag = new Date(Number(partesData[2]), Number(partesData[1]) - 1, Number(partesData[0]));
        }

        let dtVenc = new Date();
        if(contrato.proximoVencimento.includes('-')) {
             const [y, m, d] = contrato.proximoVencimento.split('-');
             dtVenc = new Date(Number(y), Number(m)-1, Number(d));
        } else {
             const pVenc = contrato.proximoVencimento.split('/');
             if (pVenc.length === 3 && pVenc[2].length === 4) {
                 dtVenc = new Date(Number(pVenc[2]), Number(pVenc[1])-1, Number(pVenc[0])); 
             }
        }

        const diff = Math.ceil((dtPag.getTime() - dtVenc.getTime()) / (1000 * 60 * 60 * 24));
        if (diff > 0 && !isNaN(diff)) {
            const m = diff * contrato.valorMultaDiaria;
            setMultaEditavel(m.toFixed(2));
        } else {
            setMultaEditavel('0');
        }
    } else {
        setMultaEditavel('0');
    }
  }, [data, contrato]);

  const handleConfirmar = async () => {
      if (loadingPermissoes) return;
      setSalvando(true);

      // 🔒 CONSULTA EM TEMPO REAL NO SUPABASE PARA COBRAR
      const temAcesso = await verificarPermissaoRealTime('cobrar');
      if (!temAcesso) {
          setSalvando(false);
          if (Platform.OS === 'web') {
              window.alert("Acesso Negado\nO seu líder não liberou permissão para baixar parcelas.");
          } else {
              Alert.alert("Acesso Negado", "O seu líder não liberou permissão para baixar parcelas.");
          }
          return;
      }

      // Pega o valor que o usuário digitou (aceita vírgula ou ponto)
      let m = parseFloat(multaEditavel.replace(',', '.'));
      if (isNaN(m)) m = 0;
      
      try {
          await confirmar(data, m);
      } catch (e) {
          console.log("Erro no pagamento da parcela", e);
      } finally {
          setSalvando(false);
      }
  };

  let valorExibicao = contrato?.valorParcela || 0;
  let isAjuste = false;

  if (contrato) {
      const numParcelaAtual = (contrato.parcelasPagas || 0) + 1;
      const isUltimaParcela = numParcelaAtual >= (contrato.totalParcelas || 1);
      
      const isFracionado = ['PARCELADO', 'SEMANAL', 'QUINZENAL', 'DIARIO'].includes(contrato.frequencia || '') || (contrato.totalParcelas || 0) > 1;

      if (isUltimaParcela && isFracionado) {
          const vUltima = Number((contrato as any).valorUltimaParcela);
          if (vUltima && vUltima > 0) {
              valorExibicao = vUltima;
          } else {
              const lucroParcNormal = Number(contrato.lucroJurosPorParcela || 0);
              valorExibicao = Number((contrato.capital || 0)) + lucroParcNormal;
          }
          if (valorExibicao !== Number(contrato.valorParcela || 0)) isAjuste = true;
      }
  }

  // Calcula o total baseado na multa que está digitada agora
  let valMultaFormatada = parseFloat(multaEditavel.replace(',', '.'));
  if (isNaN(valMultaFormatada)) valMultaFormatada = 0;
  const valorTotal = valorExibicao + valMultaFormatada;

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={fechar}>
      <View style={styles.fundo}>
        <View style={styles.card}>
          <View style={styles.cabecalho}>
            <Text style={styles.titulo}>{t('pagarParcela.titulo')}</Text>
          </View>

          <View style={styles.corpo}>
            {contrato && (
              <Text style={styles.descricao}>
                {t('pagarParcela.confirmarMsg')} <Text style={{fontWeight:'bold'}}>{(contrato.parcelasPagas || 0) + 1}/{contrato.totalParcelas}</Text>?
                {'\n'}{t('pagarParcela.valor')}: <Text style={{fontWeight:'bold', color:'#27AE60'}}>{moeda} {valorExibicao.toFixed(2)}</Text>
              </Text>
            )}

            {/* 🚀 ADICIONADO: Campo editável de multa */}
            {(contrato && contrato.valorMultaDiaria && contrato.valorMultaDiaria > 0) ? (
                <View style={{marginBottom: 15, alignItems: 'center'}}>
                    <Text style={{fontSize: 12, fontWeight: 'bold', color: '#E74C3C', marginBottom: 5}}>Valor da Multa R$</Text>
                    <TextInput 
                      style={[styles.input, { borderColor: '#E74C3C', borderWidth: 1, paddingVertical: 8, marginBottom: 5 }]} 
                      value={multaEditavel} 
                      onChangeText={setMultaEditavel} 
                      keyboardType="numeric"
                    />
                    <Text style={{fontSize: 10, color: '#7f8c8d'}}>(Edite o valor para dar desconto)</Text>
                </View>
            ) : null}

            <Text style={{color: '#2C3E50', fontWeight: 'bold', fontSize: 16, textAlign: 'center', marginBottom: 20}}>
                Total a Receber: {moeda} {valorTotal.toFixed(2)}
            </Text>

            {isAjuste && (
                <Text style={{fontSize: 11, color: '#e67e22', fontWeight: 'bold', textAlign: 'center', marginBottom: 15}}>
                  (Ajuste Final de Centavos na Parcela)
                </Text>
            )}
            
            <Text style={styles.label}>{t('pagarParcela.dataPagamento')}</Text>
            
            <TextInput 
              style={styles.input} 
              value={data} 
              onChangeText={setData} 
              placeholder="DD/MM/AAAA"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
            
            <TouchableOpacity 
              style={styles.botaoConfirmar} 
              onPress={handleConfirmar}
              disabled={salvando || loadingPermissoes}
            >
              {salvando || loadingPermissoes ? (
                  <ActivityIndicator color="#FFF" />
              ) : (
                  <Text style={styles.textoBotao}>{t('pagarParcela.btnReceber')}</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity onPress={fechar} style={styles.botaoCancelar} disabled={salvando}>
              <Text style={styles.textoCancelar}>{t('common.cancelar')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#FFF', width: '85%', borderRadius: 15, overflow: 'hidden', elevation: 5 },
  cabecalho: { backgroundColor: '#8E44AD', padding: 15, alignItems: 'center' },
  titulo: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  corpo: { padding: 20 },
  descricao: { textAlign: 'center', color: '#555', marginBottom: 15, fontSize: 14, lineHeight: 20 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 5, marginLeft: 2 },
  input: { 
    backgroundColor: '#F1F3F4', 
    padding: 14, 
    borderRadius: 8, 
    marginBottom: 15, 
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  botaoConfirmar: { backgroundColor: '#27AE60', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  textoBotao: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  botaoCancelar: { alignItems: 'center', padding: 10 },
  textoCancelar: { color: '#999', fontWeight: 'bold' }
});
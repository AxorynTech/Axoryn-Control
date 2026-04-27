import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Contrato } from '../types';

// 🔒 IMPORT DA TRAVA DE PERMISSÃO
import { usePermissoes } from '../hooks/usePermissoes';

type Props = {
  visivel: boolean;
  contrato: Contrato | null;
  fechar: () => void;
  salvar: (valorPago: number, multaAdicional: number, dataPagamento: string) => Promise<void> | void;
};

export default function ModalAbaterEmprestimo({ visivel, contrato, fechar, salvar }: Props) {
  const { t } = useTranslation();
  
  // 🔒 PUXAR O VERIFICADOR EM TEMPO REAL
  const { loadingPermissoes, verificarPermissaoRealTime } = usePermissoes();
  
  const [valorPago, setValorPago] = useState('');
  const [multaAdicional, setMultaAdicional] = useState('');
  const [dataPagamento, setDataPagamento] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (visivel) {
        setSalvando(false);
        setValorPago('');
        setMultaAdicional('');
        const hoje = new Date();
        const dia = String(hoje.getDate()).padStart(2, '0');
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        setDataPagamento(`${dia}/${mes}/${hoje.getFullYear()}`);
    }
  }, [visivel]);

  // Cálculos visuais
  const jurosAtual = (contrato?.lucroJurosPorParcela && contrato.lucroJurosPorParcela > 0) 
      ? contrato.lucroJurosPorParcela 
      : ((contrato?.capital || 0) * ((contrato?.taxa || 0) / 100));
      
  const dividaTotal = (contrato?.capital || 0) + jurosAtual;

  const handleSalvar = async () => {
    if (salvando || loadingPermissoes) return;
    const valPago = parseFloat(valorPago.replace(',', '.')) || 0;
    const valMulta = parseFloat(multaAdicional.replace(',', '.')) || 0;

    if (valPago <= 0) return Alert.alert(t('radar.atencao'), t('modalAcao.descricaoAbater'));
    
    // Fallback de tradução caso a chave 'alertaQuitar' não exista no JSON
    if (valPago >= dividaTotal) return Alert.alert(t('radar.atencao'), t('modalAcao.alertaQuitar', "Esse valor quita a dívida inteira. Use o botão 'Quitar' na tela anterior."));

    setSalvando(true);
    
    // 🔒 CONSULTA EM TEMPO REAL NO SUPABASE PARA COBRAR
    const temAcesso = await verificarPermissaoRealTime('cobrar');
    if (!temAcesso) {
        setSalvando(false);
        if (Platform.OS === 'web') {
            window.alert("Acesso Negado\nO seu líder não liberou permissão para realizar abatimentos.");
        } else {
            Alert.alert("Acesso Negado", "O seu líder não liberou permissão para realizar abatimentos.");
        }
        return;
    }
    
    try {
      await salvar(valPago, valMulta, dataPagamento);
      // Aqui a função fechar() deve ser chamada lá pelo Pai após o sucesso
    } catch(e) {
      setSalvando(false);
    }
  };

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={fechar}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.mF}>
        <View style={styles.mC}>
          <Text style={styles.mT}>{t('modalAcao.tipoAbater')}</Text>
          
          <View style={styles.boxInfo}>
              <Text style={styles.txtInfo}>Capital: {t('common.moeda')} {contrato?.capital?.toFixed(2)}</Text>
              <Text style={styles.txtInfo}>{t('pastaCliente.juros')}: {t('common.moeda')} {jurosAtual.toFixed(2)}</Text>
              <Text style={styles.txtDestaque}>{t('relatorio.colTotal')}: {t('common.moeda')} {dividaTotal.toFixed(2)}</Text>
          </View>

          <Text style={styles.label}>{t('pagarParcela.valor')} ({t('common.moeda')})</Text>
          <Text style={styles.helper}>{t('modalAcao.novoRecalculo')}</Text>
          <TextInput placeholder="Ex: 500.00" style={[styles.input, { borderColor: '#16A085', borderWidth: 1 }]} keyboardType="numeric" value={valorPago} onChangeText={setValorPago} />

          <Text style={styles.label}>{t('pdf.multaDiaria')} ({t('common.moeda')})</Text>
          <TextInput placeholder="Ex: 50.00" style={styles.input} keyboardType="numeric" value={multaAdicional} onChangeText={setMultaAdicional} />

          <Text style={styles.label}>{t('pagarParcela.dataPagamento')}</Text>
          <TextInput placeholder="DD/MM/YYYY" style={styles.input} value={dataPagamento} onChangeText={setDataPagamento} />

          <TouchableOpacity style={[styles.btnP, (salvando || loadingPermissoes) && { opacity: 0.7 }]} onPress={handleSalvar} disabled={salvando || loadingPermissoes}>
            {salvando || loadingPermissoes ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnTxt}>{t('modalAcao.btnConfirmar')}</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={fechar} style={styles.btnCancel} disabled={salvando || loadingPermissoes}>
            <Text style={{color:'#999'}}>{t('common.cancelar')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mF: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  mC: { backgroundColor: '#FFF', width: '85%', padding: 20, borderRadius: 15 },
  mT: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', color: '#2C3E50', marginBottom: 15 },
  boxInfo: { backgroundColor: '#FDEDEC', padding: 12, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#E74C3C' },
  txtInfo: { fontSize: 12, color: '#555', marginBottom: 2 },
  txtDestaque: { fontSize: 14, fontWeight: 'bold', color: '#C0392B', marginTop: 5 },
  label: { fontSize: 12, color: '#333', marginBottom: 2, marginLeft: 2, fontWeight: 'bold' },
  helper: { fontSize: 10, color: '#7F8C8D', marginBottom: 6, marginLeft: 2 },
  input: { backgroundColor: '#F1F3F4', padding: 12, borderRadius: 8, marginBottom: 15, color: '#333' },
  btnP: { backgroundColor: '#16A085', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 5 },
  btnTxt: { color: '#FFF', fontWeight: 'bold' },
  btnCancel: { marginTop: 15, alignItems: 'center', padding: 10 }
});
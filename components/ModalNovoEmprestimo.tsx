import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
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

type Props = {
  visivel: boolean;
  clientes: any[];
  clientePreSelecionado?: string;
  fechar: () => void;
  salvar: (clienteId: string, dados: any) => void;
};

export default function ModalNovoEmprestimo({ visivel, clientes, clientePreSelecionado, fechar, salvar }: Props) {
  const { t } = useTranslation();
  const [tipoOperacao, setTipoOperacao] = useState<'EMPRESTIMO' | 'VENDA'>('EMPRESTIMO');

  const [clienteId, setClienteId] = useState('');
  const [capital, setCapital] = useState('');
  
  // Agora a data é apenas texto simples
  const [dataInicio, setDataInicio] = useState('');
  
  const [taxa, setTaxa] = useState('20');
  const [frequencia, setFrequencia] = useState('MENSAL'); 
  const [garantia, setGarantia] = useState('');
  const [multa, setMulta] = useState('');
  const [produtos, setProdutos] = useState('');
  
  const [diasDiario, setDiasDiario] = useState('25');
  const [qtdParcelasVenda, setQtdParcelasVenda] = useState('1');
  
  // Controle de Venda (Apenas PRAZO ou MENSAL agora)
  const [modVenda, setModVenda] = useState<'PRAZO' | 'MENSAL'>('PRAZO');

  useEffect(() => {
    if (visivel) {
      if (clientePreSelecionado) {
        const cli = clientes.find(c => c.nome === clientePreSelecionado);
        if (cli) setClienteId(cli.id);
      }
      
      // Preenche automaticamente com a data de hoje formatada (DD/MM/AAAA)
      const hoje = new Date();
      const dia = String(hoje.getDate()).padStart(2, '0');
      const mes = String(hoje.getMonth() + 1).padStart(2, '0');
      const ano = hoje.getFullYear();
      setDataInicio(`${dia}/${mes}/${ano}`);

      setCapital('');
      setGarantia('');
      setProdutos('');
      setMulta('');
      setTipoOperacao('EMPRESTIMO');
      setFrequencia('MENSAL');
      setQtdParcelasVenda('1');
      setModVenda('PRAZO'); 
    }
  }, [visivel, clientePreSelecionado]);

  const trocarAba = (novaAba: 'EMPRESTIMO' | 'VENDA') => {
    setTipoOperacao(novaAba);
    if (novaAba === 'VENDA') {
        setFrequencia('PARCELADO');
        setModVenda('PRAZO');
    } else {
        setFrequencia('MENSAL');
    }
  };

  // Função simples para atualizar o texto da data
  const handleDataChange = (text: string) => {
    setDataInicio(text);
  };

  const handleSalvar = () => {
    if (!clienteId) return Alert.alert(t('common.erro'), t('novoContrato.erroCliente') || "Selecione um cliente.");
    if (!capital) return Alert.alert(t('common.erro'), t('novoContrato.erroValor') || "Digite o valor.");
    
    // Validação básica da data manual
    if (!dataInicio || dataInicio.length < 8) {
        return Alert.alert(t('common.erro'), t('novoContrato.erroData') || "Informe a data corretamente.");
    }

    const valCapital = parseFloat(capital.replace(',', '.') || '0');
    const valTaxa = parseFloat(taxa.replace(',', '.') || '0');
    const valMulta = parseFloat(multa.replace(',', '.') || '0');

    const textoDescritivo = tipoOperacao === 'VENDA' 
      ? `${t('modalNovoEmprestimo.produtoPrefix')}${produtos || t('modalNovoEmprestimo.vendaDiversa')}` 
      : garantia;

    let frequenciaFinal = frequencia;
    let parcelasFinal = null;

    if (tipoOperacao === 'VENDA') {
        if (modVenda === 'MENSAL') {
            frequenciaFinal = 'MENSAL';
            parcelasFinal = null; 
        } else {
            frequenciaFinal = 'PARCELADO';
            const p = parseInt(qtdParcelasVenda);
            parcelasFinal = isNaN(p) || p < 1 ? 1 : p;
        }
    } else {
        frequenciaFinal = frequencia;
        parcelasFinal = null;
    }

    salvar(clienteId, {
      tipo: tipoOperacao,
      capital: valCapital,
      taxa: valTaxa,
      frequencia: frequenciaFinal,
      garantia: textoDescritivo,
      diasDiario: frequencia === 'DIARIO' ? parseInt(diasDiario) : null,
      totalParcelas: parcelasFinal,
      dataInicio, // Envia a string da data diretamente
      valorMultaDiaria: valMulta
    });
  };

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={fechar}>
      <KeyboardAvoidingView 
        style={styles.fundo} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.janela}>
          <Text style={styles.titulo}>{t('novoContrato.titulo')}</Text>

          {/* ABAS */}
          <View style={styles.abas}>
             <TouchableOpacity 
               style={[styles.aba, tipoOperacao === 'EMPRESTIMO' && styles.abaAtiva]} 
               onPress={() => trocarAba('EMPRESTIMO')}
             >
               <Text style={[styles.txtAba, tipoOperacao === 'EMPRESTIMO' && styles.txtAbaAtiva]}>
                 {t('novoContrato.tabEmprestimo')}
               </Text>
             </TouchableOpacity>
             <TouchableOpacity 
               style={[styles.aba, tipoOperacao === 'VENDA' && styles.abaAtiva]} 
               onPress={() => trocarAba('VENDA')}
             >
               <Text style={[styles.txtAba, tipoOperacao === 'VENDA' && styles.txtAbaAtiva]}>
                 {t('novoContrato.tabVenda')}
               </Text>
             </TouchableOpacity>
          </View>

          <ScrollView style={{maxHeight: 400}}>
            <Text style={styles.label}>{t('novoContrato.cliente')}</Text>
            {clientePreSelecionado ? (
              <TextInput style={[styles.input, {backgroundColor:'#EEE'}]} value={clientePreSelecionado} editable={false} />
            ) : (
              <ScrollView style={{height: 100, marginBottom:10, borderWidth:1, borderColor:'#EEE'}} nestedScrollEnabled>
                {clientes.map(c => (
                  <TouchableOpacity key={c.id} onPress={() => setClienteId(c.id)} style={{padding:10, backgroundColor: clienteId === c.id ? '#D6EAF8' : '#FFF'}}>
                    <Text>{c.nome}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* LINHA: VALOR e DATA (Agora manual) */}
            <View style={{flexDirection:'row', gap:10}}>
                <View style={{flex:1.5}}>
                    <Text style={styles.label}>{tipoOperacao === 'VENDA' ? t('novoContrato.valorVenda') : t('novoContrato.valorEmprestimo')}</Text>
                    <TextInput style={styles.input} value={capital} onChangeText={setCapital} keyboardType="numeric" placeholder="0.00" />
                </View>
                
                <View style={{flex:1}}>
                    <Text style={styles.label}>{t('novoContrato.data')}</Text>
                    
                    {/* INPUT MANUAL SUBSTITUINDO O CALENDÁRIO */}
                    <TextInput 
                        style={styles.input} 
                        value={dataInicio} 
                        onChangeText={handleDataChange} 
                        placeholder="DD/MM/AAAA" 
                        keyboardType="numbers-and-punctuation"
                        maxLength={10} 
                    />
                </View>
            </View>

            {tipoOperacao === 'VENDA' ? (
              <>
                <Text style={styles.label}>{t('novoContrato.descricaoProdutos')}</Text>
                <TextInput 
                  style={[styles.input, {height: 60, textAlignVertical:'top'}]} 
                  value={produtos} 
                  onChangeText={setProdutos} 
                  multiline 
                  placeholder={t('novoContrato.placeholderProdutos') || "Ex: 1 Perfume..."} 
                />
                
                <Text style={styles.label}>{t('novoContrato.modalidadeVenda')}</Text>
                <View style={styles.rowRadio}>
                    {/* PARCELADO */}
                    <TouchableOpacity 
                        style={[styles.radioBtn, modVenda === 'PRAZO' && styles.radioBtnAtivo]} 
                        onPress={() => setModVenda('PRAZO')}
                    >
                        <Text style={[styles.radioTxt, modVenda === 'PRAZO' && {color:'#FFF'}]}>
                            {t('novoContrato.freqParcelado', 'PARCELADO')}
                        </Text>
                    </TouchableOpacity>

                    {/* MENSAL */}
                    <TouchableOpacity 
                        style={[styles.radioBtn, modVenda === 'MENSAL' && styles.radioBtnAtivo]} 
                        onPress={() => setModVenda('MENSAL')}
                    >
                        <Text style={[styles.radioTxt, modVenda === 'MENSAL' && {color:'#FFF'}]}>
                            {t('novoContrato.freqMensalRecorrente', 'MENSAL')}
                        </Text>
                    </TouchableOpacity>
                </View>

                <Text style={[styles.label, {marginTop: 15}]}>{t('novoContrato.condicoesRecebimento')}</Text>
                <View style={{flexDirection:'row', gap:10}}>
                    {modVenda === 'PRAZO' && (
                        <View style={{flex:1}}>
                           <Text style={styles.miniLabel}>{t('novoContrato.parcelas')}</Text>
                           <TextInput 
                             style={styles.input} 
                             value={qtdParcelasVenda} 
                             onChangeText={setQtdParcelasVenda} 
                             keyboardType="numeric" 
                             placeholder={t('modalNovoEmprestimo.placeholderParcelas')} 
                           />
                        </View>
                    )}
                    
                    <View style={{flex:1}}>
                       <Text style={styles.miniLabel}>{t('novoContrato.juros')}</Text>
                       <TextInput style={styles.input} value={taxa} onChangeText={setTaxa} keyboardType="numeric" />
                    </View>
                    
                    <View style={{flex:1.2}}>
                       <Text style={styles.miniLabel}>{t('novoContrato.multaDiaria')}</Text>
                       <TextInput style={styles.input} value={multa} onChangeText={setMulta} keyboardType="numeric" placeholder="0.00" />
                    </View>
                </View>
              </>
            ) : (
              // --- EMPRÉSTIMO ---
              <>
                <Text style={styles.label}>{t('novoContrato.garantia')}</Text>
                <TextInput style={styles.input} value={garantia} onChangeText={setGarantia} placeholder={t('novoContrato.placeholderGarantia') || "Ex: Celular..."} />

                <View style={{flexDirection:'row', gap:10}}>
                  <View style={{flex:1}}>
                      <Text style={styles.label}>{t('novoContrato.taxa')}</Text>
                      <TextInput style={styles.input} value={taxa} onChangeText={setTaxa} keyboardType="numeric" />
                  </View>
                  <View style={{flex:1}}>
                      <Text style={styles.label}>{t('novoContrato.multaDiaria')}</Text>
                      <TextInput style={styles.input} value={multa} onChangeText={setMulta} keyboardType="numeric" placeholder="0.00" />
                  </View>
                </View>

                <View style={{marginTop: 10}}>
                      <Text style={styles.label}>{t('novoContrato.modalidade')}</Text>
                      <TouchableOpacity style={styles.btnFreq} onPress={() => setFrequencia(frequencia === 'MENSAL' ? 'SEMANAL' : frequencia === 'SEMANAL' ? 'DIARIO' : 'MENSAL')}>
                        <Text style={{fontWeight:'bold', color:'#333'}}>
                            {t(`novoContrato.freq${frequencia}`)}
                        </Text>
                      </TouchableOpacity>
                </View>
                
                {frequencia === 'DIARIO' && (
                   <View>
                     <Text style={styles.label}>{t('novoContrato.quantosDias')}</Text>
                     <TextInput style={styles.input} value={diasDiario} onChangeText={setDiasDiario} keyboardType="numeric" />
                   </View>
                )}
              </>
            )}

            <TouchableOpacity style={styles.btnSalvar} onPress={handleSalvar}>
              <Text style={styles.txtSalvar}>
                {tipoOperacao === 'VENDA' ? t('novoContrato.btnConfirmarVenda') : t('novoContrato.btnConfirmarEmprestimo')}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <TouchableOpacity style={styles.btnCancelar} onPress={fechar}>
             <Text style={{color:'#999'}}>{t('novoContrato.cancelar')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  janela: { backgroundColor: '#FFF', width: '90%', padding: 20, borderRadius: 12, elevation: 5 },
  titulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#2C3E50' },
  abas: { flexDirection: 'row', marginBottom: 15, borderRadius: 8, backgroundColor: '#F0F2F5', padding: 4 },
  aba: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  abaAtiva: { backgroundColor: '#FFF', elevation: 2 },
  txtAba: { fontWeight: 'bold', color: '#95A5A6', fontSize: 12 },
  txtAbaAtiva: { color: '#2980B9' },
  label: { fontWeight: 'bold', color: '#555', marginBottom: 5, marginTop: 10 },
  miniLabel: { fontSize:12, color:'#555', fontWeight:'bold', marginBottom:2 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, fontSize: 16, backgroundColor: '#FAFAFA' },
  btnFreq: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, alignItems: 'center', backgroundColor: '#EEE', marginTop: 0 },
  btnSalvar: { backgroundColor: '#27AE60', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  txtSalvar: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  btnCancelar: { marginTop: 15, alignItems: 'center', padding: 10 },
  
  rowRadio: { flexDirection: 'row', gap: 5, marginBottom: 5 },
  radioBtn: { flex: 1, flexDirection: 'row', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#DDD', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F9FA' },
  radioBtnAtivo: { backgroundColor: '#2980B9', borderColor: '#2980B9' },
  radioTxt: { fontSize: 11, fontWeight: 'bold', color: '#555', textAlign:'center' }
});
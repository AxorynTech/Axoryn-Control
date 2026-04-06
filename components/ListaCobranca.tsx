import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Linking, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../services/supabase';
import { Cliente } from '../types';

type Props = {
  clientes: Cliente[];
  // ⬇️ INJETADO: A nova função que avisa a tela principal para mudar de aba ⬇️
  aoAbrirCliente?: (clienteNome: string) => void;
};

export default function ListaCobranca({ clientes, aoAbrirCliente }: Props) {
  const { t } = useTranslation();
  const moeda = t('common.moeda', { defaultValue: 'R$' }); // <--- Puxando a moeda correta
  
  const [modalConfig, setModalConfig] = useState(false);
  const [salvando, setSalvando] = useState(false);
  
  // Estados para as configurações
  const [chavePix, setChavePix] = useState('');
  const [textoAtraso, setTextoAtraso] = useState(`Olá {nome}, constou aqui que seu pagamento de ${moeda} {valor} venceu dia {data}. Podemos regularizar hoje?`);
  const [textoHoje, setTextoHoje] = useState(`Olá {nome}, lembrete do vencimento hoje ({data}). Valor: ${moeda} {valor}. Aguardo confirmação!`);

  // BUSCAR CONFIGURAÇÕES DO BANCO AO ABRIR A TELA
  useEffect(() => {
    const carregarConfiguracoes = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('pix_key, msg_atraso, msg_hoje')
        .eq('user_id', user.id)
        .single();

      if (data) {
        if (data.pix_key) setChavePix(data.pix_key);
        if (data.msg_atraso) setTextoAtraso(data.msg_atraso);
        if (data.msg_hoje) setTextoHoje(data.msg_hoje);
      }
    };

    carregarConfiguracoes();
  }, []);

  // SALVAR CONFIGURAÇÕES NO BANCO
  const salvarConfiguracoes = async () => {
    setSalvando(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      Alert.alert(t('common.erro'), "Usuário não autenticado.");
      setSalvando(false);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        pix_key: chavePix,
        msg_atraso: textoAtraso,
        msg_hoje: textoHoje
      })
      .eq('user_id', user.id);

    setSalvando(false);

    if (error) {
      Alert.alert(t('common.erro'), "Não foi possível salvar as configurações.");
      console.error(error);
    } else {
      Alert.alert(t('common.sucesso'), "Configurações salvas com sucesso!");
      setModalConfig(false);
    }
  };

  const converterData = (dataStr: string) => {
    if (!dataStr) return new Date();
    if (dataStr.includes('-')) {
        const [ano, mes, dia] = dataStr.split('-');
        return new Date(Number(ano), Number(mes) - 1, Number(dia));
    }
    const [dia, mes, ano] = dataStr.split('/');
    return new Date(Number(ano), Number(mes) - 1, Number(dia));
  };

  const cobrarNoZap = (nome: string, zap: string, valor: string, data: string, atrasado: boolean) => {
    if (!zap) return Alert.alert(t('common.erro'), t('listaCobranca.semNumero') || "Cliente sem número.");
    const numero = zap.replace(/\D/g, '');
    
    let msg = '';
    if (atrasado) {
        msg = textoAtraso
            .replace('{nome}', nome)
            .replace('{valor}', valor)
            .replace('{data}', data);
    } else {
        msg = textoHoje
            .replace('{nome}', nome)
            .replace('{valor}', valor)
            .replace('{data}', data);
    }
    
    if (chavePix.trim() !== '') {
        msg += `\n\nMinha chave PIX é:\n*${chavePix}*`;
    }
    
    Linking.openURL(`https://wa.me/55${numero}?text=${encodeURIComponent(msg)}`);
  };

  let listaVencidos: any[] = [];
  let listaHoje: any[] = [];
  let totalAtrasado = 0;
  let totalHoje = 0;
  
  const hoje = new Date();
  hoje.setHours(0,0,0,0);

  clientes.forEach(cli => {
    (cli.contratos || []).forEach(con => {
      if (con.status === 'ATIVO' || con.status === 'PARCELADO') {
        const dataVenc = converterData(con.proximoVencimento); 
        dataVenc.setHours(0,0,0,0);

        const diffTime = hoje.getTime() - dataVenc.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        let valor = 0;
        if (con.status === 'PARCELADO') valor = con.valorParcela || 0;
        else valor = con.capital + (con.capital * (con.taxa / 100));

        const item = {
          cliente: cli.nome,
          whatsapp: cli.whatsapp,
          contrato: con,
          diasAtraso: diffDays,
          valorCobrar: valor,
          parcelaAtual: (con.parcelasPagas || 0) + 1 
        };

        if (diffDays > 0) {
          listaVencidos.push(item);
          totalAtrasado += valor;
        } else if (diffDays === 0) {
          listaHoje.push(item);
          totalHoje += valor;
        }
      }
    });
  });

  listaVencidos.sort((a, b) => b.diasAtraso - a.diasAtraso);

  const renderCard = (item: any, corBorda: string, textoStatus: string) => (
    <View key={`${item.contrato.id}`} style={[styles.card, { borderLeftColor: corBorda }]}>
      <View style={styles.linhaTopo}>
        <View>
            <Text style={styles.nomeCliente}>{item.cliente}</Text>
            <Text style={[styles.status, {color: corBorda}]}>{textoStatus}</Text>
        </View>
        <TouchableOpacity 
            style={[styles.btnZapMini, {backgroundColor: corBorda === '#E74C3C' ? '#E74C3C' : '#F1C40F'}]} 
            onPress={() => cobrarNoZap(item.cliente, item.whatsapp, item.valorCobrar.toFixed(2), item.contrato.proximoVencimento, item.diasAtraso > 0)}
        >
            <Ionicons name="logo-whatsapp" size={16} color="#FFF" />
            <Text style={styles.txtZap}> {t('listaCobranca.cobrar')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.detalhes}>
        <Text style={styles.data}>📅 {t('listaCobranca.vencimento')}: {item.contrato.proximoVencimento}</Text>
        
        {item.contrato.status === 'PARCELADO' ? (
            <View style={styles.rowInfo}>
                <Text style={styles.tipo}>{t('listaCobranca.parcela')} {item.parcelaAtual}/{item.contrato.totalParcelas}</Text>
                <Text style={styles.valor}>{moeda} {item.valorCobrar.toFixed(2)}</Text>
            </View>
        ) : (
            <View style={styles.rowInfo}>
                <Text style={styles.tipo}>{t('listaCobranca.quitacaoTotal')}</Text>
                <Text style={styles.valor}>{moeda} {item.valorCobrar.toFixed(2)}</Text>
            </View>
        )}
      </View>

      <View style={{marginTop: 10, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 10}}>
          {/* ⬇️ O NOVO BOTÃO DE TELETRANSPORTE PARA A CARTEIRA ⬇️ */}
          <TouchableOpacity 
              style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EBF5FB', padding: 10, borderRadius: 8}}
              onPress={() => {
                  if (aoAbrirCliente) aoAbrirCliente(item.cliente);
              }}
          >
              <Ionicons name="folder-open" size={18} color="#2980B9" />
              <Text style={{marginLeft: 5, color: '#2980B9', fontWeight: 'bold'}}>{t('listaCobranca.abrirPasta', 'Abrir Pasta na Carteira')}</Text>
          </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      
      <View style={{flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10}}>
          <TouchableOpacity 
              style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECF0F1', padding: 8, borderRadius: 8}}
              onPress={() => setModalConfig(true)}
          >
              <Ionicons name="settings-outline" size={18} color="#2C3E50" />
              <Text style={{marginLeft: 5, color: '#2C3E50', fontWeight: 'bold', fontSize: 12}}>{t('listaCobranca.configurarMensagem', 'Configurar Mensagem')}</Text>
          </TouchableOpacity>
      </View>

      <View style={styles.painelResumo}>
        <View style={styles.boxTotal}>
           <Text style={styles.lblTotal}>{t('listaCobranca.totalAtrasado')}</Text>
           <Text style={[styles.vlrTotal, {color:'#E74C3C'}]}>{moeda} {totalAtrasado.toFixed(2)}</Text>
        </View>
        <View style={styles.divisor} />
        <View style={styles.boxTotal}>
           <Text style={styles.lblTotal}>{t('listaCobranca.venceHoje')}</Text>
           <Text style={[styles.vlrTotal, {color:'#F1C40F'}]}>{moeda} {totalHoje.toFixed(2)}</Text>
        </View>
      </View>

      {listaVencidos.length > 0 ? (
        <View style={styles.secao}>
          <Text style={styles.tituloSecao}>🚨 {t('listaCobranca.vencidos')} ({listaVencidos.length})</Text>
          {listaVencidos.map((item) => renderCard(item, '#E74C3C', `${item.diasAtraso} ${t('listaCobranca.diasAtraso')}`))}
        </View>
      ) : null}

      {listaHoje.length > 0 ? (
        <View style={styles.secao}>
          <Text style={styles.tituloSecao}>⚠️ {t('listaCobranca.venceHoje')} ({listaHoje.length})</Text>
          {listaHoje.map((item) => renderCard(item, '#F1C40F', t('listaCobranca.venceHojeStatus') || 'Vence Hoje!'))}
        </View>
      ) : null}

      {listaVencidos.length === 0 && listaHoje.length === 0 ? (
        <View style={{alignItems:'center', marginTop: 50}}>
            <Ionicons name="checkmark-circle-outline" size={60} color="#27AE60" />
            <Text style={{color:'#7F8C8D', marginTop:10, fontSize: 16}}>{t('listaCobranca.tudoEmDia')}</Text>
        </View>
      ) : null}

      <View style={{height: 40}} />

      <Modal visible={modalConfig} transparent animationType="slide">
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15}}>
                      <Text style={styles.modalTitulo}>{t('listaCobranca.configurarMensagem', 'Configurar Mensagem')}</Text>
                      <TouchableOpacity onPress={() => setModalConfig(false)} disabled={salvando}>
                          <Ionicons name="close" size={24} color="#7F8C8D" />
                      </TouchableOpacity>
                  </View>

                  <ScrollView style={{maxHeight: 400}}>
                      <Text style={styles.label}>Sua Chave PIX:</Text>
                      <TextInput 
                          style={styles.input}
                          placeholder="Ex: 123.456.789-00 ou email@pix.com"
                          value={chavePix}
                          onChangeText={setChavePix}
                      />

                      <Text style={styles.infoText}>
                          A chave PIX será enviada em destaque no final da mensagem para facilitar que o cliente copie. Use <Text style={{fontWeight: 'bold'}}>{'{nome}'}</Text>, <Text style={{fontWeight: 'bold'}}>{'{valor}'}</Text> e <Text style={{fontWeight: 'bold'}}>{'{data}'}</Text> nos textos abaixo para preencher automaticamente.
                      </Text>

                      <Text style={styles.label}>Mensagem para Atrasados:</Text>
                      <TextInput 
                          style={[styles.input, {height: 80, textAlignVertical: 'top'}]}
                          multiline
                          value={textoAtraso}
                          onChangeText={setTextoAtraso}
                      />

                      <Text style={styles.label}>Mensagem para quem Vence Hoje:</Text>
                      <TextInput 
                          style={[styles.input, {height: 80, textAlignVertical: 'top'}]}
                          multiline
                          value={textoHoje}
                          onChangeText={setTextoHoje}
                      />
                  </ScrollView>

                  <TouchableOpacity 
                      style={[styles.btnSalvarConfig, salvando && {opacity: 0.7}]} 
                      onPress={salvarConfiguracoes}
                      disabled={salvando}
                  >
                      {salvando ? (
                          <ActivityIndicator color="#FFF" />
                      ) : (
                          <Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 16}}>{t('common.salvar', 'Salvar Configurações')}</Text>
                      )}
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  painelResumo: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 10, padding: 15, marginBottom: 20, elevation: 3 },
  boxTotal: { flex: 1, alignItems: 'center' },
  divisor: { width: 1, backgroundColor: '#EEE', marginHorizontal: 10 },
  lblTotal: { fontSize: 12, fontWeight: 'bold', color: '#7F8C8D' },
  vlrTotal: { fontSize: 18, fontWeight: 'bold', marginTop: 5 },
  secao: { marginBottom: 20 },
  tituloSecao: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50', marginBottom: 10, marginLeft: 5 },
  card: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginBottom: 10, borderLeftWidth: 5, elevation: 2 },
  linhaTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  nomeCliente: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  status: { fontSize: 12, fontWeight: 'bold' },
  btnZapMini: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  txtZap: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  detalhes: { marginTop: 5, backgroundColor: '#F9F9F9', padding: 10, borderRadius: 5 },
  data: { fontSize: 14, color: '#555', marginBottom: 8, fontWeight: '600' },
  rowInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tipo: { fontSize: 12, color: '#7F8C8D', fontWeight: 'bold' },
  valor: { fontSize: 16, color: '#2C3E50', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 10, padding: 20 },
  modalTitulo: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#34495E', marginBottom: 5, marginTop: 10 },
  infoText: { fontSize: 11, color: '#7F8C8D', marginBottom: 10, backgroundColor: '#F4F6F6', padding: 8, borderRadius: 5 },
  input: { backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, color: '#333' },
  btnSalvarConfig: { backgroundColor: '#27AE60', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 15 }
});
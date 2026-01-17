import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ModalTermos({ visivel, fechar, aceitar }: any) {
  return (
    <Modal visible={visivel} animationType="slide" transparent={true} onRequestClose={fechar}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.titulo}>Termos de Uso e Isenção de Responsabilidade</Text>
          
          <ScrollView style={styles.scrollView}>
            <Text style={styles.texto}>
              <Text style={styles.bold}>1. NATUREZA DO SERVIÇO:</Text>{'\n'}
              O AXORYN CONTROL é estritamente um software de <Text style={styles.bold}>gestão de dados e organização financeira pessoal</Text>. O aplicativo funciona como uma ferramenta passiva para armazenamento de informações inseridas exclusivamente pelo USUÁRIO. O AXORYN CONTROL NÃO é uma instituição financeira, não realiza empréstimos, não intermediar transações bancárias e não fornece aconselhamento legal ou financeiro.
              {'\n\n'}
              <Text style={styles.bold}>2. RESPONSABILIDADE DO USUÁRIO:</Text>{'\n'}
              O USUÁRIO declara estar ciente de que é o único e exclusivo responsável pela legalidade das transações, taxas de juros, prazos e contratos que gerencia através da plataforma. O USUÁRIO compromete-se a utilizar o software em estrita conformidade com as leis vigentes no Brasil, incluindo, mas não se limitando ao Código Civil e à legislação tributária.
              {'\n\n'}
              <Text style={styles.bold}>3. VEDAÇÃO A PRÁTICAS ILÍCITAS:</Text>{'\n'}
              É estritamente proibido o uso desta plataforma para a prática de usura pecuniária (agiotagem), lavagem de dinheiro ou qualquer atividade que viole o Decreto nº 22.626/33 ou o Sistema Financeiro Nacional. O AXORYN CONTROL não monitora o conteúdo inserido, mas reserva-se o direito de banir sumariamente qualquer conta mediante ordem judicial ou evidência de uso criminoso, colaborando integralmente com as autoridades competentes.
              {'\n\n'}
              <Text style={styles.bold}>4. ISENÇÃO DE RESPONSABILIDADE:</Text>{'\n'}
              Os desenvolvedores do AXORYN CONTROL não se responsabilizam por:
              a) Perdas financeiras decorrentes do uso do sistema;
              b) Inadimplência de terceiros cadastrados pelo USUÁRIO;
              c) Cálculo de juros que excedam os limites legais (o software apenas executa a matemática baseada nos inputs do usuário).
              {'\n\n'}
              <Text style={styles.bold}>5. PRIVACIDADE DE DADOS:</Text>{'\n'}
              Nós respeitamos sua privacidade e armazenamos seus dados de forma segura. Não compartilhamos suas informações financeiras com terceiros, exceto quando exigido por lei.
              {'\n\n'}
              Ao clicar em "ACEITAR", o USUÁRIO confirma que leu, compreendeu e concorda com todos os termos acima, assumindo total responsabilidade civil e criminal pelos seus atos.
            </Text>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity onPress={fechar} style={styles.btnRecusar}>
              <Text style={[styles.txtBtn, styles.txtRecusar]}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={aceitar} style={styles.btnAceitar}>
              <Text style={[styles.txtBtn, styles.txtAceitar]}>LI E ACEITO</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 10, maxHeight: '80%', padding: 20 },
  titulo: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#2C3E50' },
  scrollView: { marginBottom: 20 },
  texto: { fontSize: 14, color: '#333', lineHeight: 22, textAlign: 'justify' },
  bold: { fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  btnRecusar: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#E74C3C' },
  btnAceitar: { flex: 1, backgroundColor: '#27AE60', padding: 12, borderRadius: 8, alignItems: 'center' },
  txtBtn: { fontWeight: 'bold', fontSize: 14 },
  txtRecusar: { color: '#E74C3C' }, // Texto vermelho para o botão cancelar
  txtAceitar: { color: '#FFF' }      // Texto branco para o botão aceitar
});
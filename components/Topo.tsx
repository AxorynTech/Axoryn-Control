import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../services/supabase';

type Props = {
  dados?: any[];
};

export default function Topo({ dados }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>AXORYN CONTROL</Text>
      
      <TouchableOpacity 
        style={styles.btnSair} 
        onPress={async () => await supabase.auth.signOut()}
      >
        <Text style={styles.txtSair}>SAIR</Text>
        <Ionicons name="log-out-outline" size={16} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 15,
    paddingHorizontal: 10,
    height: 50,
  },
  logo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2980B9', // AZUL AXORYN
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  btnSair: {
    backgroundColor: '#E74C3C',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  txtSair: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12
  }
});
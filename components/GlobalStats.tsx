import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { supabase } from '../services/supabase';

export function GlobalStats() {
  const [valor, setValor] = useState(0);

  useEffect(() => {
    // 1. Pega o valor inicial
    const fetchInitial = async () => {
      const { data } = await supabase.from('global_stats').select('valor').eq('id', 1).single();
      if (data) setValor(data.valor);
    };
    fetchInitial();

    // 2. Escuta mudanças em tempo real (Realtime)
    const subscription = supabase
      .channel('stats_live')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'global_stats' }, (payload) => {
        setValor(payload.new.valor);
      })
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, []);

  const formatado = (valor / 1000000).toFixed(1);

  return (
    <View style={styles.container}>
      <View style={styles.dot} />
      <Text style={styles.text}>
        AXORYN ECOSYSTEM: <Text style={styles.bold}>+ R$ {formatado} MILHÕES</Text> GERENCIADOS
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4ade80', // Verde Neon
    alignSelf: 'center',
    marginBottom: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ade80',
    marginRight: 8,
    shadowColor: '#4ade80',
    shadowRadius: 4,
    elevation: 5,
  },
  text: { color: '#ccc', fontSize: 10, letterSpacing: 1 },
  bold: { color: '#fff', fontWeight: 'bold' }
});
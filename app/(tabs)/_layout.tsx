import { FontAwesome } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: '#2C3E50', // Azul Escuro
      tabBarInactiveTintColor: '#999999', // Cinza
      tabBarStyle: { 
        // Mantida sua lógica de correção de altura e área segura
        height: 60 + (Platform.OS === 'ios' ? insets.bottom : insets.bottom + 10), 
        paddingBottom: insets.bottom + (Platform.OS === 'ios' ? 0 : 10), 
        paddingTop: 10,
        backgroundColor: '#FFF' 
      },
      tabBarLabelStyle: {
        marginBottom: 5,
        fontSize: 10,
        fontWeight: 'bold'
      }
    }}>
      
      {/* 1. CARTEIRA */}
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.carteira', { defaultValue: 'Carteira' }),
          tabBarIcon: ({ color }) => <FontAwesome name="money" size={24} color={color} />,
        }}
      />

      {/* 2. RESUMO */}
      <Tabs.Screen
        name="resumo"
        options={{
          // Garante que o título seja 'Resumo' se a tradução falhar
          title: t('tabs.resumo', { defaultValue: 'Resumo' }), 
          tabBarIcon: ({ color }) => <FontAwesome name="bar-chart" size={24} color={color} />,
        }}
      />

      {/* 3. PERFIL */}
      <Tabs.Screen
        name="perfil"
        options={{
          title: t('tabs.perfil', { defaultValue: 'Perfil' }),
          tabBarIcon: ({ color }) => <FontAwesome name="user" size={24} color={color} />,
        }}
      />

      {/* 4. PLANOS (Agora após o Perfil) */}
      <Tabs.Screen
        name="planos"
        options={{
          title: t('tabs.planos', { defaultValue: 'Premium' }),
          tabBarIcon: ({ color }) => <FontAwesome name="diamond" size={24} color={color} />,
        }}
      />

      {/* TELAS OCULTAS */}
      <Tabs.Screen 
        name="explore" 
        options={{ 
          href: null,
        }} 
      />

    </Tabs>
  );
}
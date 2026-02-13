import { FontAwesome } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next'; // <--- Importação da tradução mantida
import { Platform } from 'react-native'; // <--- Adicionado para verificar se é Android ou iOS
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // <--- Adicionado para medir a área segura

export default function TabLayout() {
  const { t } = useTranslation(); // <--- Hook de tradução mantido
  const insets = useSafeAreaInsets(); // <--- Hook para calcular o espaço seguro

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: '#2C3E50', // Azul Escuro
      tabBarInactiveTintColor: '#999999', // Cinza
      tabBarStyle: { 
        // LÓGICA DE CORREÇÃO:
        // Altura: 60px base + o espaço da barra de navegação do sistema
        height: 60 + (Platform.OS === 'ios' ? insets.bottom : insets.bottom + 10), 
        
        // Padding: Empurra os ícones para cima da barra do sistema
        paddingBottom: insets.bottom + (Platform.OS === 'ios' ? 0 : 10), 
        
        paddingTop: 10, // Adicionado para dar respiro superior aos ícones
        backgroundColor: '#FFF' 
      },
      // Estilo extra para garantir que os textos fiquem bonitos e não cortem
      tabBarLabelStyle: {
        marginBottom: 5,
        fontSize: 10,
        fontWeight: 'bold'
      }
    }}>
      
      {/* 1. TELA PRINCIPAL (Carteira) */}
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.carteira'), // <--- Traduzido
          tabBarIcon: ({ color }) => <FontAwesome name="money" size={24} color={color} />,
        }}
      />

      {/* 2. TELA DE RESUMO */}
      <Tabs.Screen
        name="resumo"
        options={{
          title: t('tabs.resumo'), // <--- Traduzido
          tabBarIcon: ({ color }) => <FontAwesome name="bar-chart" size={24} color={color} />,
        }}
      />

      {/* 3. TELA DE PERFIL */}
      <Tabs.Screen
        name="perfil"
        options={{
          title: t('tabs.perfil'), // <--- Traduzido
          tabBarIcon: ({ color }) => <FontAwesome name="user" size={24} color={color} />,
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
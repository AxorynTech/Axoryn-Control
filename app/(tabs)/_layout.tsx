import { FontAwesome } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: '#2C3E50', // Azul Escuro
      tabBarInactiveTintColor: '#999999', // Cinza
      tabBarStyle: { 
        height: 60, 
        paddingBottom: 10, 
        backgroundColor: '#FFF' 
      },
    }}>
      
      {/* 1. TELA PRINCIPAL (Carteira) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Carteira', 
          tabBarIcon: ({ color }) => <FontAwesome name="money" size={24} color={color} />,
        }}
      />

      {/* 2. TELA DE RESUMO */}
      <Tabs.Screen
        name="resumo"
        options={{
          title: 'Resumo',
          tabBarIcon: ({ color }) => <FontAwesome name="bar-chart" size={24} color={color} />,
        }}
      />

      {/* 3. TELA DE PERFIL (NOVA) */}
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
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
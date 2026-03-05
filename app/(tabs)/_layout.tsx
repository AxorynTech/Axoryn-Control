import { FontAwesome, Ionicons } from '@expo/vector-icons';
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
        backgroundColor: '#FFF',
        ...(Platform.OS === 'web' 
          ? {
              // ✅ REGRAS EXCLUSIVAS PARA A WEB (COMPUTADOR)
              height: 70,             // Altura fixa e segura
              paddingBottom: 5,       // Margem inferior pequena para não espremer o texto
              paddingTop: 5,          // Margem superior pequena
              alignSelf: 'center',
              width: '100%',
              maxWidth: 600,
              borderTopWidth: 1,
              borderColor: '#EEE',
            } 
          : {
              // 📱 REGRAS ORIGINAIS PARA O MOBILE (ANDROID E IOS INTACTOS)
              height: 60 + (Platform.OS === 'ios' ? insets.bottom : insets.bottom + 10), 
              paddingBottom: insets.bottom + (Platform.OS === 'ios' ? 0 : 10), 
              paddingTop: 10,
            }
        )
      },
      tabBarItemStyle: {
        // Centraliza os itens na Web para evitar que fiquem colados ao fundo e sejam cortados
        ...(Platform.OS === 'web' ? { justifyContent: 'center', paddingBottom: 5 } : {})
      },
      tabBarLabelStyle: {
        // Na Web tiramos a margem inferior para o texto não ser empurrado para fora
        marginBottom: Platform.OS === 'web' ? 0 : 5,
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

      {/* 2. RESUMO (Agora em segundo lugar) */}
      <Tabs.Screen
        name="resumo"
        options={{
          // Garante que o título seja 'Resumo' se a tradução falhar
          title: t('tabs.resumo', { defaultValue: 'Resumo' }), 
          tabBarIcon: ({ color }) => <FontAwesome name="bar-chart" size={24} color={color} />,
        }}
      />

      {/* 3. PRODUTOS / MEU COMÉRCIO (Agora em terceiro lugar) */}
      <Tabs.Screen
        name="produtos"
        options={{
          title: t('tabs.produtos', { defaultValue: 'Estoque' }),
          tabBarIcon: ({ color }) => <Ionicons name="storefront" size={24} color={color} />,
        }}
      />

      {/* 4. PERFIL */}
      <Tabs.Screen
        name="perfil"
        options={{
          title: t('tabs.perfil', { defaultValue: 'Perfil' }),
          tabBarIcon: ({ color }) => <FontAwesome name="user" size={24} color={color} />,
        }}
      />

      {/* 5. PLANOS */}
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
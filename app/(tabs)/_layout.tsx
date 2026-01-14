import { FontAwesome } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

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
      
      {/* 1. TELA ESQUERDA (Dashboard) -> Vira "CARTEIRA" */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Carteira', // Mudado de 'Resumo' para 'Carteira'
          tabBarIcon: ({ color }) => <FontAwesome name="money" size={24} color={color} />,
        }}
      />

      {/* 2. TELA DO MEIO (Arquivo resumo.tsx) -> Vira "RESUMO" */}
      <Tabs.Screen
        name="resumo"
        options={{
          title: 'Resumo',
          tabBarIcon: ({ color }) => <FontAwesome name="bar-chart" size={24} color={color} />,
        }}
      />

      {/* --- ITENS REMOVIDOS --- */}

      {/* Remove o Explore */}
      <Tabs.Screen name="explore" options={{ href: null }} />

      {/* Garante que outros não apareçam */}
      <Tabs.Screen name="financeiro" options={{ href: null }} />
      <Tabs.Screen name="auth" options={{ href: null }} />
      <Tabs.Screen name="modal" options={{ href: null }} />
      <Tabs.Screen name="tabs" options={{ href: null }} />
      <Tabs.Screen name="(tabs)" options={{ href: null }} />

    </Tabs>
  );
}
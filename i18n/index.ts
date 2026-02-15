import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Platform } from 'react-native';

import en from './en.json';
import es from './es.json';
import hi from './hi.json';
import pt from './pt.json';

const RESOURCES = {
  pt: { translation: pt },
  en: { translation: en },
  es: { translation: es },
  hi: { translation: hi },
};

// 1. Inicializa o i18n IMEDIATAMENTE (Síncrono)
// Isso evita que o app carregue sem as traduções prontas
i18n.use(initReactI18next).init({
  compatibilityJSON: 'v3', // <--- CORREÇÃO DO ERRO (v3 não exige Intl)
  resources: RESOURCES,
  lng: 'pt', // Idioma inicial padrão (evita tela em branco)
  fallbackLng: 'pt',
  interpolation: {
    escapeValue: false,
  },
});

// 2. Função Assíncrona para buscar o idioma salvo ou do dispositivo
// Ela roda em segundo plano e atualiza o idioma assim que possível
const loadLanguageAsync = async () => {
  // Só executa se não estiver na web (proteção)
  if (Platform.OS === 'web' && typeof window === 'undefined') return;

  try {
    // Tenta pegar do armazenamento do usuário
    const languageFromStorage = await AsyncStorage.getItem('user-language');
    
    if (languageFromStorage) {
      i18n.changeLanguage(languageFromStorage);
      return;
    }

    // Se não tiver salvo, tenta pegar a configuração do celular
    const deviceLanguage = Localization.getLocales()[0]?.languageCode;
    if (deviceLanguage) {
      i18n.changeLanguage(deviceLanguage);
    }

  } catch (error) {
    console.log('Erro ao recuperar idioma:', error);
  }
};

// Chama a função de carregamento (não precisa de await aqui no top-level)
loadLanguageAsync();

export default i18n;
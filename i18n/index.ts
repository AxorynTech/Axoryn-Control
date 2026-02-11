import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Platform } from 'react-native';

import en from './en.json';
import es from './es.json';
import hi from './hi.json'; // <--- Importação do Hindi adicionada
import pt from './pt.json';

const RESOURCES = {
  pt: { translation: pt },
  en: { translation: en },
  es: { translation: es },
  hi: { translation: hi }, // <--- Adicionado aos recursos
};

const initI18n = async () => {
  let savedLanguage = 'pt'; // Valor padrão seguro para o build

  // Só executa a busca de idioma se NÃO estiver no servidor de build (proteção)
  if (Platform.OS !== 'web' || typeof window !== 'undefined') {
    try {
      const languageFromStorage = await AsyncStorage.getItem('user-language');
      
      if (languageFromStorage) {
        savedLanguage = languageFromStorage;
      } else {
        // Se não achou no storage, pega do dispositivo
        const deviceLanguage = Localization.getLocales()[0]?.languageCode;
        if (deviceLanguage) {
          savedLanguage = deviceLanguage;
        }
      }
    } catch (error) {
      console.log('Erro ao recuperar idioma:', error);
    }
  }

  i18n.use(initReactI18next).init({
    compatibilityJSON: 'v4', // Mantido v4 como você pediu
    resources: RESOURCES,
    lng: savedLanguage,
    fallbackLng: 'pt',
    interpolation: {
      escapeValue: false,
    },
  });
};

initI18n();

export default i18n;
import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, getTranslation } from './translations';

const I18nContext = createContext();

export const I18nProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Try to load from localStorage
    const saved = localStorage.getItem('i18n_language');
    if (saved && translations[saved]) {
      return saved;
    }
    
    // Auto-detect from browser
    const browserLang = navigator.language.split('-')[0].toLowerCase();
    if (translations[browserLang]) {
      return browserLang;
    }
    
    // Default to English
    return 'en';
  });

  useEffect(() => {
    localStorage.setItem('i18n_language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key) => getTranslation(language, key);

  const changeLanguage = (lang) => {
    if (translations[lang]) {
      setLanguage(lang);
    }
  };

  const getAvailableLanguages = () => {
    return Object.keys(translations).sort();
  };

  const value = {
    language,
    t,
    changeLanguage,
    getAvailableLanguages,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};

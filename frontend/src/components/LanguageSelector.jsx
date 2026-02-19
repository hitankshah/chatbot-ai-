import React from 'react';
import { useI18n } from '../i18n/I18nProvider';

const LanguageSelector = () => {
  const { language, changeLanguage, getAvailableLanguages } = useI18n();
  const languages = getAvailableLanguages();

  const getLanguageName = (code) => {
    const names = {
      en: 'English',
      es: 'Español',
      fr: 'Français',
      de: 'Deutsch',
      it: 'Italiano',
      pt: 'Português',
      ru: 'Русский',
      ja: '日本語',
      zh: '中文',
      ko: '한국어',
      ar: 'العربية',
      hi: 'हिन्दी',
      tr: 'Türkçe',
      pl: 'Polski',
      nl: 'Nederlands',
    };
    return names[code] || code.toUpperCase();
  };

  return (
    <select
      value={language}
      onChange={(e) => changeLanguage(e.target.value)}
      className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      title="Select Language"
    >
      {languages.map((lang) => (
        <option key={lang} value={lang}>
          {getLanguageName(lang)}
        </option>
      ))}
    </select>
  );
};

export default LanguageSelector;

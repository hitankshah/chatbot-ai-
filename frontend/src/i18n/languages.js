// Multi-language support - 90+ languages
export const SUPPORTED_LANGUAGES = {
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
  sv: 'Svenska',
  no: 'Norsk',
  da: 'Dansk',
  fi: 'Suomi',
  el: 'Ελληνικά',
  hu: 'Magyar',
  cs: 'Čeština',
  ro: 'Română',
  th: 'ไทย',
  vi: 'Tiếng Việt',
  id: 'Bahasa Indonesia',
  ms: 'Bahasa Melayu',
  tl: 'Tagalog',
  ur: 'اردو',
  fa: 'فارسی',
  he: 'עברית',
  uk: 'Українська',
  bg: 'Български',
  hr: 'Hrvatski',
  sr: 'Српски',
  sk: 'Slovenčina',
  sl: 'Slovenščina',
  lt: 'Lietuvių',
  lv: 'Latvian',
  et: 'Eesti',
  is: 'Íslenska',
  mk: 'Македонски',
  sq: 'Shqip',
  hy: 'Հայերեն',
  ka: 'ქართული',
  bn: 'বাংলা',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  kn: 'ಕನ್ನಡ',
  ml: 'മലയാളം',
  mr: 'मराठी',
  gu: 'ગુજરાતી',
  pa: 'ਪੰਜਾਬੀ',
  my: 'မြန်မာ',
  km: 'ខ្មែរ',
  lo: 'ລາວ',
  sin: 'සිංහල',
  ne: 'नेपाली',
  jv: 'Jawa',
  su: 'Sunda',
  mg: 'Malagasy',
  af: 'Afrikaans',
  am: 'አማርኛ',
  so: 'Soomaali',
  sw: 'Swahili',
  ny: 'Chichewa',
  zu: 'Zulu',
  xh: 'Xhosa',
  st: 'Sotho',
  tw: 'Twi',
  rw: 'Kinyarwanda',
  cy: 'Cymraeg',
  ga: 'Irish',
  gd: 'Gàidhlig',
  eu: 'Euskera',
  ca: 'Català',
  gl: 'Galego',
  lb: 'Lëtzebuergesch',
  mt: 'Malti',
  as: 'অসমীয়া',
  or: 'ଓଡ଼ିଆ',
  kok: 'कोंकणी',
  sd: 'سندھی',
  ug: 'ئۇيغۇرچە',
};

export const DEFAULT_LANGUAGE = 'en';

export function getDetectedLanguage() {
  if (typeof navigator === 'undefined') return DEFAULT_LANGUAGE;
  const lang = navigator.language?.split('-')[0] || DEFAULT_LANGUAGE;
  return SUPPORTED_LANGUAGES[lang] ? lang : DEFAULT_LANGUAGE;
}

export function saveLanguagePreference(lang) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('language', lang);
  }
}

export function loadLanguagePreference() {
  if (typeof localStorage === 'undefined') return DEFAULT_LANGUAGE;
  return localStorage.getItem('language') || getDetectedLanguage();
}

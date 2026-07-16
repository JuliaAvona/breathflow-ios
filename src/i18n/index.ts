import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

// Non-English locales still use nested format; cast loosely until migrated
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LocaleModule = any;

// Lazy loaders, one per locale file. Metro still bundles every locale into the
// single app binary (there's no network chunk-loading for a standalone RN app),
// but wrapping each in a function means the object literal is only constructed
// when actually called — and since the app has no in-app language switcher
// (locale is auto-detected once at startup from the OS), only the detected
// locale + the English fallback are ever built and held in memory, instead of
// eagerly constructing and retaining all 52 for the life of the app.
const LOCALE_LOADERS: Record<string, () => LocaleModule> = {
  en: () => require('./locales/en').default,
  ar: () => require('./locales/ar').default,
  am: () => require('./locales/am').default,
  bg: () => require('./locales/bg').default,
  bn: () => require('./locales/bn').default,
  ca: () => require('./locales/ca').default,
  cs: () => require('./locales/cs').default,
  da: () => require('./locales/da').default,
  de: () => require('./locales/de').default,
  el: () => require('./locales/el').default,
  es: () => require('./locales/es').default,
  'es-419': () => require('./locales/es_419').default,
  et: () => require('./locales/et').default,
  fa: () => require('./locales/fa').default,
  fi: () => require('./locales/fi').default,
  fil: () => require('./locales/fil').default,
  fr: () => require('./locales/fr').default,
  gu: () => require('./locales/gu').default,
  he: () => require('./locales/he').default,
  hi: () => require('./locales/hi').default,
  hr: () => require('./locales/hr').default,
  hu: () => require('./locales/hu').default,
  id: () => require('./locales/id').default,
  it: () => require('./locales/it').default,
  ja: () => require('./locales/ja').default,
  kn: () => require('./locales/kn').default,
  ko: () => require('./locales/ko').default,
  lt: () => require('./locales/lt').default,
  lv: () => require('./locales/lv').default,
  ml: () => require('./locales/ml').default,
  mr: () => require('./locales/mr').default,
  ms: () => require('./locales/ms').default,
  nl: () => require('./locales/nl').default,
  no: () => require('./locales/no').default,
  pl: () => require('./locales/pl').default,
  'pt-BR': () => require('./locales/pt_BR').default,
  'pt-PT': () => require('./locales/pt_PT').default,
  ro: () => require('./locales/ro').default,
  ru: () => require('./locales/ru').default,
  sk: () => require('./locales/sk').default,
  sl: () => require('./locales/sl').default,
  sr: () => require('./locales/sr').default,
  sv: () => require('./locales/sv').default,
  sw: () => require('./locales/sw').default,
  ta: () => require('./locales/ta').default,
  te: () => require('./locales/te').default,
  th: () => require('./locales/th').default,
  tr: () => require('./locales/tr').default,
  uk: () => require('./locales/uk').default,
  vi: () => require('./locales/vi').default,
  'zh-CN': () => require('./locales/zh_CN').default,
  'zh-TW': () => require('./locales/zh_TW').default,
};

function detectLanguage(): string {
  const locale = getLocales()[0];
  if (!locale) return 'en';

  const tag = locale.languageTag?.replace('_', '-');
  const code = locale.languageCode ?? 'en';

  // Exact tag match (e.g. pt-BR, es-419)
  if (tag && tag in LOCALE_LOADERS) return tag;

  // Chinese: distinguish Simplified vs Traditional
  if (code === 'zh') {
    if (tag?.includes('Hant') || tag?.includes('TW') || tag?.includes('HK')) {
      return 'zh-TW';
    }
    return 'zh-CN';
  }

  // Portuguese: distinguish Brazil vs Portugal
  if (code === 'pt') {
    if (tag?.includes('BR')) return 'pt-BR';
    return 'pt-PT';
  }

  // Spanish: distinguish Spain vs Latin America
  if (code === 'es') {
    if (tag && /419|MX|AR|CO|CL|PE|VE|EC|GT|CU|BO|DO|HN|PY|SV|NI|CR|PA|UY/.test(tag)) {
      return 'es-419';
    }
    return 'es';
  }

  // Base language code match
  if (code in LOCALE_LOADERS) return code;

  return 'en';
}

const activeLng = detectLanguage();

// Only the detected locale + English fallback are ever loaded.
const resources: Record<string, { translation: LocaleModule }> = {
  en: { translation: LOCALE_LOADERS.en() },
};
if (activeLng !== 'en') {
  resources[activeLng] = { translation: LOCALE_LOADERS[activeLng]() };
}
// Bare-language aliases (no dedicated file) so a base-code lookup inside
// i18next still resolves to the right regional variant if it's ever hit.
if (activeLng === 'pt-PT' || activeLng === 'pt-BR') resources.pt = resources[activeLng];
if (activeLng === 'zh-CN' || activeLng === 'zh-TW') resources.zh = resources[activeLng];

i18n.use(initReactI18next).init({
  resources,
  lng: activeLng,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  showSupportNotice: false,
} as Parameters<typeof i18n.init>[0]);

export default i18n;

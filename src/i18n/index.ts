import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import en from './locales/en';
import ar from './locales/ar';
import am from './locales/am';
import bg from './locales/bg';
import bn from './locales/bn';
import ca from './locales/ca';
import cs from './locales/cs';
import da from './locales/da';
import de from './locales/de';
import el from './locales/el';
import es from './locales/es';
import es419 from './locales/es_419';
import et from './locales/et';
import fa from './locales/fa';
import fi from './locales/fi';
import fil from './locales/fil';
import fr from './locales/fr';
import gu from './locales/gu';
import he from './locales/he';
import hi from './locales/hi';
import hr from './locales/hr';
import hu from './locales/hu';
import id from './locales/id';
import it from './locales/it';
import ja from './locales/ja';
import kn from './locales/kn';
import ko from './locales/ko';
import lt from './locales/lt';
import lv from './locales/lv';
import ml from './locales/ml';
import mr from './locales/mr';
import ms from './locales/ms';
import nl from './locales/nl';
import no from './locales/no';
import pl from './locales/pl';
import ptBR from './locales/pt_BR';
import ptPT from './locales/pt_PT';
import ro from './locales/ro';
import ru from './locales/ru';
import sk from './locales/sk';
import sl from './locales/sl';
import sr from './locales/sr';
import sv from './locales/sv';
import sw from './locales/sw';
import ta from './locales/ta';
import te from './locales/te';
import th from './locales/th';
import tr from './locales/tr';
import uk from './locales/uk';
import vi from './locales/vi';
import zhCN from './locales/zh_CN';
import zhTW from './locales/zh_TW';

// Non-English locales may have partial translations; i18next falls back to English
type DeepPartial<T> = { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P] };
type Translation = typeof en | DeepPartial<typeof en>;

const resources: Record<string, { translation: Translation }> = {
  en: { translation: en },
  ar: { translation: ar },
  am: { translation: am },
  bg: { translation: bg },
  bn: { translation: bn },
  ca: { translation: ca },
  cs: { translation: cs },
  da: { translation: da },
  de: { translation: de },
  el: { translation: el },
  es: { translation: es },
  'es-419': { translation: es419 },
  et: { translation: et },
  fa: { translation: fa },
  fi: { translation: fi },
  fil: { translation: fil },
  fr: { translation: fr },
  gu: { translation: gu },
  he: { translation: he },
  hi: { translation: hi },
  hr: { translation: hr },
  hu: { translation: hu },
  id: { translation: id },
  it: { translation: it },
  ja: { translation: ja },
  kn: { translation: kn },
  ko: { translation: ko },
  lt: { translation: lt },
  lv: { translation: lv },
  ml: { translation: ml },
  mr: { translation: mr },
  ms: { translation: ms },
  nl: { translation: nl },
  no: { translation: no },
  pl: { translation: pl },
  'pt-BR': { translation: ptBR },
  'pt-PT': { translation: ptPT },
  pt: { translation: ptPT },
  ro: { translation: ro },
  ru: { translation: ru },
  sk: { translation: sk },
  sl: { translation: sl },
  sr: { translation: sr },
  sv: { translation: sv },
  sw: { translation: sw },
  ta: { translation: ta },
  te: { translation: te },
  th: { translation: th },
  tr: { translation: tr },
  uk: { translation: uk },
  vi: { translation: vi },
  'zh-CN': { translation: zhCN },
  'zh-TW': { translation: zhTW },
  zh: { translation: zhCN },
};

function detectLanguage(): string {
  const locale = getLocales()[0];
  if (!locale) return 'en';

  const tag = locale.languageTag?.replace('_', '-');
  const code = locale.languageCode ?? 'en';

  // Exact tag match (e.g. pt-BR, es-419)
  if (tag && tag in resources) return tag;

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
  if (code in resources) return code;

  return 'en';
}

i18n.use(initReactI18next).init({
  resources,
  lng: detectLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  showSupportNotice: false,
} as Parameters<typeof i18n.init>[0]);

export default i18n;

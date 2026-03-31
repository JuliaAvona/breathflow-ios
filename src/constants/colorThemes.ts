export interface ThemePalette {
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
}

export interface ColorTheme {
  id: string;
  nameKey: string;
  primary: string;
  primaryLight: string;
  accent: string;
  accentLight: string;
  fast: string;
  slow: string;
  isPro: boolean;
  light: ThemePalette;
  dark: ThemePalette;
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: 'ocean',
    nameKey: 'settings.themeOcean',
    primary: '#4A90D9',
    primaryLight: '#6BAAE8',
    accent: '#7BC4A8',
    accentLight: '#99D6BE',
    fast: '#4A90D9',
    slow: '#7BC4A8',
    isPro: false,
    light: {
      background: '#F0F4F8',
      surface: '#FFFFFF',
      card: '#F7FAFC',
      text: '#1A2332',
      textSecondary: '#6B7B8F',
      border: '#D6DEE8',
    },
    dark: {
      background: '#0a0f1a',
      surface: '#111827',
      card: '#161e2e',
      text: '#FFFFFF',
      textSecondary: 'rgba(255,255,255,0.5)',
      border: 'rgba(255,255,255,0.08)',
    },
  },
  {
    id: 'forest',
    nameKey: 'settings.themeForest',
    primary: '#4CAF50',
    primaryLight: '#6EC472',
    accent: '#8D6E63',
    accentLight: '#A98E84',
    fast: '#4CAF50',
    slow: '#8D6E63',
    isPro: true,
    light: {
      background: '#EDF5ED',
      surface: '#F5FAF5',
      card: '#FAFDF9',
      text: '#1B2E1B',
      textSecondary: '#5E7A5E',
      border: '#C4D9C4',
    },
    dark: {
      background: '#0E1A0E',
      surface: '#1A2C1A',
      card: '#263D26',
      text: '#E8F5E8',
      textSecondary: '#8FAF8F',
      border: '#2E4D2E',
    },
  },
  {
    id: 'twilight',
    nameKey: 'settings.themeTwilight',
    primary: '#7B68AE',
    primaryLight: '#9D8DC5',
    accent: '#5C6BC0',
    accentLight: '#7986CB',
    fast: '#7B68AE',
    slow: '#5C6BC0',
    isPro: true,
    light: {
      background: '#F0EDF5',
      surface: '#F8F5FC',
      card: '#FDFBFF',
      text: '#2A2340',
      textSecondary: '#7A6F96',
      border: '#D4CCE2',
    },
    dark: {
      background: '#12101A',
      surface: '#1E1A2C',
      card: '#2C2740',
      text: '#F0ECF8',
      textSecondary: '#A89EC0',
      border: '#3A3450',
    },
  },
  {
    id: 'sunrise',
    nameKey: 'settings.themeSunrise',
    primary: '#F5A623',
    primaryLight: '#F7BC55',
    accent: '#E8735A',
    accentLight: '#EE9580',
    fast: '#F5A623',
    slow: '#E8735A',
    isPro: true,
    light: {
      background: '#FDF6EC',
      surface: '#FFFBF5',
      card: '#FFFDF9',
      text: '#332510',
      textSecondary: '#9A7D55',
      border: '#EADBC4',
    },
    dark: {
      background: '#1A1408',
      surface: '#2C2212',
      card: '#3D3020',
      text: '#FDF6EC',
      textSecondary: '#BFA87A',
      border: '#4D3E28',
    },
  },
  {
    id: 'midnight',
    nameKey: 'settings.themeMidnight',
    primary: '#1A2332',
    primaryLight: '#2E3D52',
    accent: '#94A3B8',
    accentLight: '#B0BEC5',
    fast: '#4A6FA5',
    slow: '#94A3B8',
    isPro: true,
    light: {
      background: '#0D1117',
      surface: '#161B22',
      card: '#1C2333',
      text: '#E6EDF3',
      textSecondary: '#8B949E',
      border: '#30363D',
    },
    dark: {
      background: '#010409',
      surface: '#0D1117',
      card: '#161B22',
      text: '#F0F6FC',
      textSecondary: '#8B949E',
      border: '#21262D',
    },
  },
  {
    id: 'sakura',
    nameKey: 'settings.themeSakura',
    primary: '#E8A0BF',
    primaryLight: '#F0BDD4',
    accent: '#D4789C',
    accentLight: '#E09AB5',
    fast: '#E8A0BF',
    slow: '#D4789C',
    isPro: true,
    light: {
      background: '#FDF0F5',
      surface: '#FFF7FA',
      card: '#FFFBFD',
      text: '#3A1F2B',
      textSecondary: '#A06880',
      border: '#F0D4E0',
    },
    dark: {
      background: '#1A0F14',
      surface: '#2C1A22',
      card: '#3D2630',
      text: '#FDF0F5',
      textSecondary: '#C08FA5',
      border: '#4D303E',
    },
  },
  {
    id: 'zen',
    nameKey: 'settings.themeZen',
    primary: '#8B9E8B',
    primaryLight: '#A5B5A5',
    accent: '#A09888',
    accentLight: '#B8B0A2',
    fast: '#8B9E8B',
    slow: '#A09888',
    isPro: true,
    light: {
      background: '#F2F4F0',
      surface: '#F9FAF7',
      card: '#FDFDF9',
      text: '#2A2E28',
      textSecondary: '#70796E',
      border: '#D4DAD0',
    },
    dark: {
      background: '#111410',
      surface: '#1C201A',
      card: '#282E26',
      text: '#F2F4F0',
      textSecondary: '#96A094',
      border: '#363D34',
    },
  },
];

export function getThemeById(id: string): ColorTheme {
  return COLOR_THEMES.find((t) => t.id === id) ?? COLOR_THEMES[0];
}

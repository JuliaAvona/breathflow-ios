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
  light: ThemePalette;
  dark: ThemePalette;
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: 'default',
    nameKey: 'settings.themeDefault',
    primary: '#D85E43',
    primaryLight: '#E88B73',
    accent: '#5BA4C8',
    accentLight: '#6BB9D3',
    fast: '#D85E43',
    slow: '#5BA4C8',
    light: {
      background: '#EDE5DD',
      surface: '#F5F0EA',
      card: '#F8F4EE',
      text: '#2A2421',
      textSecondary: '#8B7F73',
      border: '#D8CEC2',
    },
    dark: {
      background: '#1A1512',
      surface: '#2A2421',
      card: '#3A342F',
      text: '#F5F0EA',
      textSecondary: '#B8AEA5',
      border: '#4A433D',
    },
  },
  {
    id: 'forest',
    nameKey: 'settings.themeForest',
    primary: '#4A7C59',
    primaryLight: '#6FA07E',
    accent: '#C49344',
    accentLight: '#D4AD6A',
    fast: '#4A7C59',
    slow: '#C49344',
    light: {
      background: '#E5EBE3',
      surface: '#EFF4ED',
      card: '#F4F8F2',
      text: '#253025',
      textSecondary: '#6E816E',
      border: '#C5D1C3',
    },
    dark: {
      background: '#141A13',
      surface: '#222B21',
      card: '#303A2F',
      text: '#EFF4ED',
      textSecondary: '#A0AFA0',
      border: '#3E4A3D',
    },
  },
  {
    id: 'lavender',
    nameKey: 'settings.themeLavender',
    primary: '#7B68AE',
    primaryLight: '#9D8DC5',
    accent: '#E088A8',
    accentLight: '#EAA5BE',
    fast: '#7B68AE',
    slow: '#E088A8',
    light: {
      background: '#E9E3EF',
      surface: '#F2ECF6',
      card: '#F6F2F9',
      text: '#28232E',
      textSecondary: '#807590',
      border: '#D0C8DA',
    },
    dark: {
      background: '#18141D',
      surface: '#26212C',
      card: '#35303C',
      text: '#F2ECF6',
      textSecondary: '#B0A5BF',
      border: '#443D50',
    },
  },
  {
    id: 'midnight',
    nameKey: 'settings.themeMidnight',
    primary: '#4FC3F7',
    primaryLight: '#81D4FA',
    accent: '#CE93D8',
    accentLight: '#E1BEE7',
    fast: '#4FC3F7',
    slow: '#CE93D8',
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
    id: 'noir',
    nameKey: 'settings.themeNoir',
    primary: '#E53935',
    primaryLight: '#EF5350',
    accent: '#FFB300',
    accentLight: '#FFD54F',
    fast: '#E53935',
    slow: '#FFB300',
    light: {
      background: '#121212',
      surface: '#1E1E1E',
      card: '#252525',
      text: '#EBEBEB',
      textSecondary: '#9E9E9E',
      border: '#333333',
    },
    dark: {
      background: '#000000',
      surface: '#0A0A0A',
      card: '#1A1A1A',
      text: '#F5F5F5',
      textSecondary: '#9E9E9E',
      border: '#2A2A2A',
    },
  },
];

export function getThemeById(id: string): ColorTheme {
  return COLOR_THEMES.find((t) => t.id === id) ?? COLOR_THEMES[0];
}

import { useColorScheme as useRNColorScheme } from 'react-native';
import { FONT_SIZE } from '../constants';
import { useSettingsStore } from '../store';
import { getThemeById } from '../constants/colorThemes';

export function useFontSize() {
  return FONT_SIZE;
}

export function useThemeColors() {
  const scheme = useRNColorScheme();
  const isDark = scheme === 'dark';
  const colorThemeId = useSettingsStore((s) => s.colorThemeId);
  const colorTheme = getThemeById(colorThemeId);

  const palette = isDark ? colorTheme.dark : colorTheme.light;

  return {
    isDark,
    background: palette.background,
    surface: palette.surface,
    card: palette.card,
    text: palette.text,
    textSecondary: palette.textSecondary,
    border: palette.border,
    primary: colorTheme.primary,
    primaryLight: colorTheme.primaryLight,
    accent: colorTheme.accent,
    accentLight: colorTheme.accentLight,
    fast: colorTheme.fast,
    slow: colorTheme.slow,
  };
}

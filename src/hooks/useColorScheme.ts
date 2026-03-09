import { useColorScheme as useRNColorScheme } from 'react-native';
import { COLORS, FONT_SIZE } from '../constants';
import { useSettingsStore } from '../store';
import { getThemeById } from '../constants/colorThemes';

export function useFontSize() {
  return FONT_SIZE;
}

export function useThemeColors() {
  const scheme = useRNColorScheme();
  const isDark = scheme === 'dark';
  const highContrast = useSettingsStore((s) => s.highContrastMode);
  const colorThemeId = useSettingsStore((s) => s.colorThemeId);
  const colorTheme = getThemeById(colorThemeId);

  if (highContrast) {
    return {
      isDark,
      background: isDark ? '#000000' : COLORS.backgroundHighContrast,
      surface: isDark ? '#000000' : '#FFFFFF',
      card: isDark ? '#1A1A1A' : '#FFFFFF',
      text: isDark ? '#FFFFFF' : COLORS.textHighContrast,
      textSecondary: isDark ? '#E0E0E0' : COLORS.textSecondaryHighContrast,
      border: isDark ? '#FFFFFF' : '#000000',
      primary: colorTheme.primary,
      primaryLight: colorTheme.primaryLight,
      accent: colorTheme.accent,
      accentLight: colorTheme.accentLight,
      fast: colorTheme.fast,
      slow: colorTheme.slow,
    };
  }

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

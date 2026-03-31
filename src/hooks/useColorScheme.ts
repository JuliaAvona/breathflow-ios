import { useColorScheme as useRNColorScheme } from 'react-native';
import { FONT_SIZE } from '../constants';
import { useSettingsStore } from '../store';

// ─── Design tokens (shared across both themes) ─────────────────────────────
const PRIMARY   = '#4A90D9';   // calm blue
const ACCENT    = '#7BC4A8';   // soft green
const FAST      = '#4A90D9';
const SLOW      = '#7BC4A8';

// ─── Dark palette ──────────────────────────────────────────────────────────
const DARK = {
  background:    '#09111f',
  surface:       '#111d30',
  card:          '#16243a',
  text:          '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.45)',
  border:        'rgba(255,255,255,0.07)',
};

// ─── Light palette ─────────────────────────────────────────────────────────
const LIGHT = {
  background:    '#F2F5F9',
  surface:       '#FFFFFF',
  card:          '#FFFFFF',
  text:          '#1A2332',
  textSecondary: '#64748B',
  border:        '#E2E8F0',
};

export function useFontSize() {
  return FONT_SIZE;
}

export function useThemeColors() {
  const scheme    = useRNColorScheme();
  const darkMode  = useSettingsStore((s) => s.darkMode);

  const isDark = darkMode === 'dark' || (darkMode === 'system' && scheme === 'dark');
  const palette = isDark ? DARK : LIGHT;

  return {
    isDark,
    background:    palette.background,
    surface:       palette.surface,
    card:          palette.card,
    text:          palette.text,
    textSecondary: palette.textSecondary,
    border:        palette.border,
    primary:       PRIMARY,
    primaryLight:  '#6BAAE8',
    accent:        ACCENT,
    accentLight:   '#99D6BE',
    fast:          FAST,
    slow:          SLOW,
  };
}

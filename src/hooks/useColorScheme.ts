import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme, Dimensions, PixelRatio } from 'react-native';
import { FONT_SIZE } from '../constants';
import { useSettingsStore } from '../store';

// Clamp so the OS "Larger Text" accessibility setting scales our type without
// blowing up fixed-size layouts (countdown circle, chip rows, etc.) at extreme values.
const MIN_FONT_SCALE = 0.85;
const MAX_FONT_SCALE = 1.3;

function getClampedFontScale(): number {
  return Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, PixelRatio.getFontScale()));
}

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
  const [scale, setScale] = useState(getClampedFontScale);

  useEffect(() => {
    // PixelRatio has no dedicated change event; a Dynamic Type change is
    // typically accompanied by a Dimensions change, so re-read the font
    // scale then as a best-effort way to react without an app restart.
    const sub = Dimensions.addEventListener('change', () => setScale(getClampedFontScale()));
    return () => sub.remove();
  }, []);

  return {
    xs: Math.round(FONT_SIZE.xs * scale),
    sm: Math.round(FONT_SIZE.sm * scale),
    md: Math.round(FONT_SIZE.md * scale),
    lg: Math.round(FONT_SIZE.lg * scale),
    xl: Math.round(FONT_SIZE.xl * scale),
    xxl: Math.round(FONT_SIZE.xxl * scale),
    xxxl: Math.round(FONT_SIZE.xxxl * scale),
    timer: Math.round(FONT_SIZE.timer * scale),
  };
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

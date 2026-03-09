import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// ─── Color Palette ─────────────────────────────────────────────────────────

export const COLORS = {
  // Primary - Calm blue
  primary: '#4A90D9',
  primaryLight: '#6BA8E8',
  primaryDark: '#3A73B0',

  // Accent - Soft green
  accent: '#7BC4A8',
  accentLight: '#9AD6BE',
  accentDark: '#5BAD8A',

  // Breathing phase colors
  inhale: '#4A90D9',     // blue — breathe in
  holdIn: '#7B68AE',     // purple — hold after inhale
  exhale: '#7BC4A8',     // green — breathe out
  holdOut: '#F5A623',    // amber — hold after exhale
  retention: '#1A2332',  // near-black — Power Breathing retention
  recovery: '#5BAD7A',   // sage — Power Breathing recovery breath

  // Neutrals
  white: '#FFFFFF',
  black: '#1A2332',
  background: '#F0F4F8',
  backgroundDark: '#0F1419',
  surface: '#FFFFFF',
  surfaceDark: '#1A2332',
  card: '#F8FAFC',
  cardDark: '#243040',

  // Text
  text: '#1A2332',
  textDark: '#F0F4F8',
  textSecondary: '#64748B',
  textSecondaryDark: '#94A3B8',

  // High contrast overrides
  textHighContrast: '#000000',
  textSecondaryHighContrast: '#333333',
  backgroundHighContrast: '#FFFFFF',

  // Status
  success: '#7BC4A8',
  warning: '#F5A623',
  error: '#E85D4A',

  // PRO / Paywall
  proGradientStart: '#FFD700',
  proGradientEnd: '#FF8C00',
  proBadge: '#FFD700',

  // Border
  border: '#E2E8F0',
  borderDark: '#334155',
} as const;

// ─── Spacing & Typography ──────────────────────────────────────────────────

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const FONT_SIZE = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  timer: 72,
} as const;

export const FONT_WEIGHT = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const SCREEN = {
  width,
  height,
} as const;

// Responsive scaling based on iPhone 16 (393pt) as reference
const BASE_WIDTH = 393;
export const scale = (size: number): number =>
  Math.round((width / BASE_WIDTH) * size);

// ─── Breathing Defaults ────────────────────────────────────────────────────

export const BREATHING_DEFAULTS = {
  defaultCycles: 6,
  defaultDuration: 300,       // 5 minutes in seconds
  minPhaseDuration: 1,        // seconds
  maxPhaseDuration: 15,       // seconds
  minCycles: 1,
  maxCycles: 20,
  minRounds: 1,               // Power Breathing rounds
  maxRounds: 10,
  minBreathsPerRound: 20,     // Power Breathing breaths
  maxBreathsPerRound: 50,
  countdownBeepSeconds: 3,
} as const;

// ─── Badge Categories & Colors ─────────────────────────────────────────────

export type BadgeCategory =
  | 'sessions'
  | 'streak'
  | 'minutes'
  | 'retention'
  | 'exploration'
  | 'special';

export const BADGE_CATEGORY_COLORS: Record<
  BadgeCategory,
  {
    color: string;
    iconBg: string;
    iconBgDark: string;
    cardTint: string;
    cardTintDark: string;
  }
> = {
  sessions: {
    color: '#4A90D9',
    iconBg: '#4A90D930',
    iconBgDark: '#4A90D940',
    cardTint: '#4A90D910',
    cardTintDark: '#4A90D918',
  },
  streak: {
    color: '#F5A623',
    iconBg: '#F5A62330',
    iconBgDark: '#F5A62340',
    cardTint: '#F5A62310',
    cardTintDark: '#F5A62318',
  },
  minutes: {
    color: '#7BC4A8',
    iconBg: '#7BC4A830',
    iconBgDark: '#7BC4A840',
    cardTint: '#7BC4A810',
    cardTintDark: '#7BC4A818',
  },
  retention: {
    color: '#7B68AE',
    iconBg: '#7B68AE30',
    iconBgDark: '#7B68AE40',
    cardTint: '#7B68AE10',
    cardTintDark: '#7B68AE18',
  },
  exploration: {
    color: '#5BA4C8',
    iconBg: '#5BA4C830',
    iconBgDark: '#5BA4C840',
    cardTint: '#5BA4C810',
    cardTintDark: '#5BA4C818',
  },
  special: {
    color: '#5BAD7A',
    iconBg: '#5BAD7A30',
    iconBgDark: '#5BAD7A40',
    cardTint: '#5BAD7A10',
    cardTintDark: '#5BAD7A18',
  },
} as const;

// ─── Badge Definitions ─────────────────────────────────────────────────────

export const BADGE_DEFINITIONS = [
  // Sessions — first steps in breathwork
  {
    id: 'first_breath',
    nameKey: 'badges.first_breath.name',
    descriptionKey: 'badges.first_breath.description',
    icon: 'leaf-outline',
    category: 'sessions' as BadgeCategory,
    isPro: false,
  },
  {
    id: 'explorer',
    nameKey: 'badges.explorer.name',
    descriptionKey: 'badges.explorer.description',
    icon: 'compass-outline',
    category: 'exploration' as BadgeCategory,
    isPro: false,
  },
  {
    id: 'technique_master',
    nameKey: 'badges.technique_master.name',
    descriptionKey: 'badges.technique_master.description',
    icon: 'school-outline',
    category: 'exploration' as BadgeCategory,
    isPro: false,
  },

  // Minutes / retention progress
  {
    id: 'breathe_easy',
    nameKey: 'badges.breathe_easy.name',
    descriptionKey: 'badges.breathe_easy.description',
    icon: 'cloud-outline',
    category: 'minutes' as BadgeCategory,
    isPro: false,
  },
  {
    id: 'iron_lungs',
    nameKey: 'badges.iron_lungs.name',
    descriptionKey: 'badges.iron_lungs.description',
    icon: 'fitness-outline',
    category: 'retention' as BadgeCategory,
    isPro: false,
  },
  {
    id: 'superhuman',
    nameKey: 'badges.superhuman.name',
    descriptionKey: 'badges.superhuman.description',
    icon: 'flash-outline',
    category: 'retention' as BadgeCategory,
    isPro: false,
  },

  // Streaks
  {
    id: 'week_warrior',
    nameKey: 'badges.week_warrior.name',
    descriptionKey: 'badges.week_warrior.description',
    icon: 'flame-outline',
    category: 'streak' as BadgeCategory,
    isPro: false,
  },
  {
    id: 'month_master',
    nameKey: 'badges.month_master.name',
    descriptionKey: 'badges.month_master.description',
    icon: 'calendar-outline',
    category: 'streak' as BadgeCategory,
    isPro: false,
  },
  {
    id: 'century',
    nameKey: 'badges.century.name',
    descriptionKey: 'badges.century.description',
    icon: 'trophy-outline',
    category: 'sessions' as BadgeCategory,
    isPro: false,
  },
  {
    id: 'zen_master',
    nameKey: 'badges.zen_master.name',
    descriptionKey: 'badges.zen_master.description',
    icon: 'flower-outline',
    category: 'minutes' as BadgeCategory,
    isPro: false,
  },

  // Special — time-of-day & features
  {
    id: 'early_bird',
    nameKey: 'badges.early_bird.name',
    descriptionKey: 'badges.early_bird.description',
    icon: 'sunny-outline',
    category: 'special' as BadgeCategory,
    isPro: false,
  },
  {
    id: 'night_owl',
    nameKey: 'badges.night_owl.name',
    descriptionKey: 'badges.night_owl.description',
    icon: 'moon-outline',
    category: 'special' as BadgeCategory,
    isPro: false,
  },
  {
    id: 'custom_creator',
    nameKey: 'badges.custom_creator.name',
    descriptionKey: 'badges.custom_creator.description',
    icon: 'construct-outline',
    category: 'exploration' as BadgeCategory,
    isPro: true,
  },
  {
    id: 'mood_tracker',
    nameKey: 'badges.mood_tracker.name',
    descriptionKey: 'badges.mood_tracker.description',
    icon: 'happy-outline',
    category: 'special' as BadgeCategory,
    isPro: false,
  },
] as const;

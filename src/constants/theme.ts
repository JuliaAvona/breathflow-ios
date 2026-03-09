import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const COLORS = {
  // Primary - Japanese terracotta/burnt orange inspired by reference
  primary: '#D85E43',
  primaryLight: '#E88B73',
  primaryDark: '#B84E36',

  // Accent - Soft blue inspired by reference
  accent: '#5BA4C8',
  accentLight: '#89BFDA',
  accentDark: '#4487A8',

  // Fast interval - Keep terracotta tones
  fastStart: '#D85E43',
  fastEnd: '#E88B73',

  // Slow interval - Soft blue/teal tones
  slowStart: '#5BA4C8',
  slowEnd: '#6BB9D3',

  // Warm-up / Cool-down
  warmUp: '#89BFDA',
  coolDown: '#9DC8D9',

  // Neutrals - Warm beige/cream inspired by reference
  white: '#FFFFFF',
  black: '#2A2421',
  background: '#EDE5DD',  // Warm beige background like reference
  backgroundDark: '#1A1512',
  surface: '#F5F0EA',  // Warmer cream surface
  surfaceDark: '#2A2421',
  card: '#F8F4EE',  // Warm card background
  cardDark: '#3A342F',

  // Text - Warmer dark tones
  text: '#2A2421',  // Warm dark brown instead of pure black
  textDark: '#F5F0EA',
  textSecondary: '#8B7F73',  // Warm gray-brown
  textSecondaryDark: '#B8AEA5',

  // High contrast overrides
  textHighContrast: '#000000',
  textSecondaryHighContrast: '#333333',
  backgroundHighContrast: '#FFFFFF',

  // Status - Japanese-inspired colors
  success: '#6BB9D3',  // Soft blue for success
  warning: '#E88B73',  // Soft terracotta for warning
  error: '#D85E43',  // Terracotta for error

  // PRO / Paywall
  proGradientStart: '#FFD700',
  proGradientEnd: '#FF8C00',
  proBadge: '#FFD700',

  // Border - Subtle warm borders
  border: '#D8CEC2',  // Warm border matching the aesthetic
  borderDark: '#4A433D',
} as const;

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

// Timer defaults
export const TIMER_DEFAULTS = {
  fastDuration: 180, // 3 minutes in seconds
  slowDuration: 180, // 3 minutes in seconds
  totalRounds: 5,
  warmUpDuration: 120, // 2 minutes
  coolDownDuration: 120, // 2 minutes
  countdownBeepSeconds: 3,
  caloriesPerMinuteFast: 6.5,
  caloriesPerMinuteSlow: 3.5,
  caloriesPerMinuteWarmUp: 2.5,
} as const;

// MET values for calorie calculation
export const MET_VALUES = {
  fastWalking: 4.3,
  slowWalking: 2.5,
  warmUpCoolDown: 2.0,
  defaultWeightKg: 65,
} as const;

// Badge category colors - Japanese-inspired palette
export const BADGE_CATEGORY_COLORS = {
  sessions: {
    color: '#D85E43',  // Terracotta
    iconBg: '#D85E4330',
    iconBgDark: '#D85E4340',
    cardTint: '#D85E4310',
    cardTintDark: '#D85E4318',
  },
  streak: {
    color: '#E88B73',  // Light terracotta
    iconBg: '#E88B7330',
    iconBgDark: '#E88B7340',
    cardTint: '#E88B7310',
    cardTintDark: '#E88B7318',
  },
  minutes: {
    color: '#5BA4C8',  // Soft blue
    iconBg: '#5BA4C830',
    iconBgDark: '#5BA4C840',
    cardTint: '#5BA4C810',
    cardTintDark: '#5BA4C818',
  },
  calories: {
    color: '#D85E43',  // Terracotta
    iconBg: '#D85E4330',
    iconBgDark: '#D85E4340',
    cardTint: '#D85E4310',
    cardTintDark: '#D85E4318',
  },
  special: {
    color: '#6BB9D3',  // Lighter blue
    iconBg: '#6BB9D330',
    iconBgDark: '#6BB9D340',
    cardTint: '#6BB9D310',
    cardTintDark: '#6BB9D318',
  },
} as const;

// Badge definitions - PNG images
export const BADGE_DEFINITIONS = [
  // Sessions (walks) badges - Progressive journey through Japan
  { id: 'first_walk', condition: { type: 'sessions' as const, value: 1 }, icon: require('../../assets/badge_walks_first.png') },
  { id: 'walks_10', condition: { type: 'sessions' as const, value: 10 }, icon: require('../../assets/badge_walks_10.png') },
  { id: 'walks_25', condition: { type: 'sessions' as const, value: 25 }, icon: require('../../assets/badge_walks_25.png') },
  { id: 'walks_50', condition: { type: 'sessions' as const, value: 50 }, icon: require('../../assets/badge_walks_50.png') },
  { id: 'walks_75', condition: { type: 'sessions' as const, value: 75 }, icon: require('../../assets/badge_walks_75.png') },
  { id: 'walks_100', condition: { type: 'sessions' as const, value: 100 }, icon: require('../../assets/badge_walks_100.png') },
  { id: 'walks_250', condition: { type: 'sessions' as const, value: 250 }, icon: require('../../assets/badge_walks_250.png') },
  { id: 'walks_500', condition: { type: 'sessions' as const, value: 500 }, icon: require('../../assets/badge_walks_500.png') },

  // Streak badges - Elements of nature and perseverance
  { id: 'streak_3', condition: { type: 'streak' as const, value: 3 }, icon: require('../../assets/badge_streak_3.png') },
  { id: 'streak_7', condition: { type: 'streak' as const, value: 7 }, icon: require('../../assets/badge_streak_7.png') },
  { id: 'streak_14', condition: { type: 'streak' as const, value: 14 }, icon: require('../../assets/badge_streak_14.png') },
  { id: 'streak_30', condition: { type: 'streak' as const, value: 30 }, icon: require('../../assets/badge_streak_30.png') },
  { id: 'streak_45', condition: { type: 'streak' as const, value: 45 }, icon: require('../../assets/badge_streak_45.png') },
  { id: 'streak_60', condition: { type: 'streak' as const, value: 60 }, icon: require('../../assets/badge_streak_60.png') },
  { id: 'streak_90', condition: { type: 'streak' as const, value: 90 }, icon: require('../../assets/badge_streak_90.png') },
  { id: 'streak_365', condition: { type: 'streak' as const, value: 365 }, icon: require('../../assets/badge_streak_365.png') },

  // Minutes badges - Time and meditation
  { id: 'minutes_60', condition: { type: 'minutes' as const, value: 60 }, icon: require('../../assets/badge_minutes_60.png') },
  { id: 'minutes_300', condition: { type: 'minutes' as const, value: 300 }, icon: require('../../assets/badge_minutes_300.png') },
  { id: 'minutes_600', condition: { type: 'minutes' as const, value: 600 }, icon: require('../../assets/badge_minutes_600.png') },
  { id: 'minutes_1200', condition: { type: 'minutes' as const, value: 1200 }, icon: require('../../assets/badge_minutes_1200.png') },
  { id: 'minutes_3000', condition: { type: 'minutes' as const, value: 3000 }, icon: require('../../assets/badge_minutes_3000.png') },

  // Calories badges - Energy and movement
  { id: 'cal_1000', condition: { type: 'calories' as const, value: 1000 }, icon: require('../../assets/badge_cal_1000.png') },
  { id: 'cal_5000', condition: { type: 'calories' as const, value: 5000 }, icon: require('../../assets/badge_cal_5000.png') },
  { id: 'cal_10000', condition: { type: 'calories' as const, value: 10000 }, icon: require('../../assets/badge_cal_10000.png') },
] as const;

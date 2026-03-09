export type TimerPhase = 'READY' | 'WARM_UP' | 'FAST' | 'SLOW' | 'COOL_DOWN' | 'PAUSED' | 'DONE';

export interface Session {
  id: string;
  date: string;
  startedAt: number;
  completedAt: number;
  rounds: number;
  totalRounds: number;
  fastDuration: number;
  slowDuration: number;
  totalDuration: number;
  estimatedCalories: number;
  completed: boolean;
  warmUp: boolean;
  coolDown: boolean;
  steps?: number;
  distance?: number;
}

export interface UserStats {
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  totalMinutes: number;
  totalCalories: number;
  lastSessionDate: string | null;
}

export interface Settings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  soundType: 'beep' | 'chime' | 'voice';
  healthIntegration: boolean;
  isPro: boolean;
  onboardingCompleted: boolean;
  warmUpEnabled: boolean;
  coolDownEnabled: boolean;
  warmUpDuration: number;
  coolDownDuration: number;
  highContrastMode: boolean;
  // PRO
  fastInterval: number;
  slowInterval: number;
  roundCount: number;
  reminderEnabled: boolean;
  reminderTime: string;
  dailyStepGoal: number;
  colorThemeId: string;
  startingPhase: 'fast' | 'slow';
}

export interface UserProfile {
  weight?: number;
  age?: number;
  height?: number;
  walkingFrequency: 'never' | 'occasional' | 'daily';
}

export type BadgeIconType =
  | 'koi-fish'
  | 'crane'
  | 'cherry-blossom'
  | 'mount-fuji'
  | 'torii-gate'
  | 'bamboo'
  | 'rising-sun'
  | 'lotus'
  | 'wave'
  | 'maple-leaf'
  | 'lantern';

export interface Badge {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: BadgeIconType | number; // Japanese-inspired SVG icon type or require() image
  unlockedAt: number | null;
  condition: {
    type: 'sessions' | 'streak' | 'minutes' | 'calories' | 'special';
    value: number;
  };
  category?: 'sessions' | 'streak' | 'minutes' | 'calories' | 'special';
}

export interface Program {
  id: string;
  titleKey: string;
  descriptionKey: string;
  durationWeeks: number;
  sessionsPerWeek: number;
  schedule: ProgramDay[];
}

export interface ProgramDay {
  week: number;
  day: number;
  fastDuration: number;
  slowDuration: number;
  rounds: number;
  warmUp: boolean;
  coolDown: boolean;
}

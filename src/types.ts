// Timer phases for standard breathing techniques
export type TimerPhase =
  | 'READY'
  | 'INHALE'
  | 'HOLD_IN'
  | 'EXHALE'
  | 'HOLD_OUT'
  | 'PAUSED'
  | 'DONE';

// Timer phases for Power Breathing
export type PowerBreathingPhase =
  | 'READY'
  | 'BREATHING'    // rapid deep breaths
  | 'RETENTION'    // exhale hold (user-controlled)
  | 'RECOVERY'     // recovery breath
  | 'PAUSED'
  | 'DONE';

// Timer phases for Kapalabhati
export type KapalabhatiPhase =
  | 'READY'
  | 'RAPID_SET'    // rapid exhales
  | 'REST'         // rest between sets
  | 'PAUSED'
  | 'DONE';

// Unified timer mode
export type TimerMode = 'standard' | 'power' | 'kapalabhati';

// Breathing technique category
export type TechniqueCategory = 'calm' | 'sleep' | 'focus' | 'energy';

// Visual shape for breathing animation
export type BreathingShape = 'square' | 'triangle' | 'circle' | 'wave' | 'burst' | 'oval';

// Phase type within a breathing pattern
export type PhaseType = 'inhale' | 'exhale' | 'holdIn' | 'holdOut';

// Single phase in a breathing pattern
export interface BreathPhase {
  type: PhaseType;
  duration: number;           // seconds (decimal ok: 5.5)
  instructionKey: string;     // i18n key: "breatheIn", "hold", "breatheOut"
}

// Breathing technique definition
export interface BreathingTechnique {
  id: string;
  nameKey: string;              // i18n key
  descriptionKey: string;       // i18n key — short benefit description
  category: TechniqueCategory;

  // Pattern definition
  phases: BreathPhase[];        // one cycle of the pattern
  defaultCycles: number;        // how many cycles (0 = until user stops)
  defaultDuration?: number;     // optional fixed duration in seconds (overrides cycles)
  adjustable: boolean;          // can user change phase durations?

  // For Power Breathing only
  hasRetention?: boolean;       // enables breath hold after breathing phase
  hasRecovery?: boolean;        // enables recovery breath between rounds
  breathCount?: number;         // number of breaths per round
  roundCount?: number;          // number of rounds with retention

  // For Kapalabhati only
  setCount?: number;            // number of rapid sets
  setDuration?: number;         // duration of each set in seconds
  restDuration?: number;        // rest between sets in seconds

  // Visual
  shape: BreathingShape;
  color: string;                // accent color for this technique
  icon: string;                 // Ionicons name

  // Timer mode
  mode: TimerMode;

  isPro: boolean;
}

// Completed breathing session
export interface BreathingSession {
  id: string;
  userId: string;
  date: string;                  // ISO date (YYYY-MM-DD)
  startedAt: string;             // ISO datetime
  completedAt: string;           // ISO datetime
  completed: boolean;            // finished all cycles/rounds

  techniqueId: string;           // which technique was used

  // Standard technique data
  cyclesCompleted: number;
  totalDuration: number;         // seconds

  // Power Breathing specific
  roundsCompleted?: number;
  retentionTimes?: number[];     // seconds per round [83, 105, 130]
  bestRetention?: number;
  avgRetention?: number;
  breathsPerRound?: number;

  // Optional mood tracking
  moodAfter?: 'calm' | 'energized' | 'focused' | 'sleepy' | null;
}

// Aggregated user stats
export interface UserStats {
  totalSessions: number;
  totalMinutes: number;
  totalBreaths: number;
  currentStreak: number;
  longestStreak: number;
  bestRetention: number;         // Power Breathing all-time best (seconds)
  avgRetention: number;
  lastSessionDate: string;
  favoriteTechniqueId: string;   // most used
  sessionsPerTechnique: Record<string, number>;
}

// User settings
export interface UserSettings {
  // Per-technique overrides
  techniqueOverrides: Record<string, {
    cycles?: number;
    phaseDurations?: number[];   // override default durations
    rounds?: number;             // Power Breathing
    breathsPerRound?: number;    // Power Breathing
    recoveryDuration?: number;   // Power Breathing
  }>;

  // Feedback
  soundEnabled: boolean;
  soundStyle: 'tone' | 'nature' | 'voice' | 'off';
  hapticsEnabled: boolean;

  // Appearance
  darkMode: 'system' | 'light' | 'dark';
  textSize: 'default' | 'large';

  // Apple Health
  healthSyncEnabled: boolean;

  // Reminder
  reminderEnabled: boolean;
  reminderTime: string;          // "08:00"
  reminderDays: number[];        // [0,1,2,3,4,5,6]

  // General
  onboardingCompleted: boolean;
  safetyAccepted: boolean;       // safety warning acknowledged
  selectedGoal?: TechniqueCategory;          // from onboarding
  recommendedTechniqueId?: string;           // technique suggested by onboarding plan
  dailyGoalMinutes: number;                  // from onboarding commitment screen

  isPro: boolean;
}

// User profile
export interface UserProfile {
  weight: number;   // kg
  age: number;
  height: number;   // cm
}

// Badge definition
export interface Badge {
  id: string;
  nameKey: string;         // i18n key
  descriptionKey: string;  // i18n key
  icon: string;            // Ionicons name
  category: 'sessions' | 'streak' | 'minutes' | 'retention' | 'exploration' | 'special';
  condition?: (stats: UserStats, settings: UserSettings) => boolean;
  isPro: boolean;
}

// Unlocked badge record
export interface UnlockedBadge {
  badgeId: string;
  unlockedAt: string;  // ISO datetime
}

// Mood type
export type Mood = 'calm' | 'energized' | 'focused' | 'sleepy';

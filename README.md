# WalkPace — Japanese Interval Walking Timer

A specialized timer app for **Japanese Interval Walking Training (IWT)** — alternating 3 min fast / 3 min slow walking, 5 rounds = 30 min. Built with React Native (Expo).

---

## Getting Started

### Prerequisites

- **Node.js** >= 18 (recommended: 22)
- **npm** >= 9
- **Expo CLI** (installed automatically via `npx`)
- **Xcode** (for iOS simulator / device builds)
- **Expo Go** app on a physical device (optional, for quick testing)

### Installation

```bash
# Switch to the correct Node version
nvm use 22

# Install dependencies
npm install

# Start the Expo dev server
npx expo start
```

### Running on Platforms

```bash
npx expo start --ios       # iOS simulator
npx expo start --android   # Android emulator
npx expo start             # Opens interactive menu
```

Press `i` for iOS or `a` for Android in the interactive menu. Scan the QR code with **Expo Go** to run on a physical device.

---

## Project Structure

```
walkpace/
├── app/                            # Expo Router screens (file-based routing)
│   ├── _layout.tsx                 # Root layout — audio config, auth hydrate, sync
│   ├── index.tsx                   # Entry — routes to onboarding or tabs
│   ├── summary.tsx                 # Session summary (modal)
│   ├── paywall.tsx                 # PRO subscription paywall
│   ├── terms.tsx                   # Terms of Service
│   ├── privacy.tsx                 # Privacy Policy
│   ├── (tabs)/                     # Bottom tab navigator
│   │   ├── _layout.tsx             # Tab bar config (Timer, History, Settings)
│   │   ├── index.tsx               # Timer screen — core feature
│   │   ├── history.tsx             # Stats overview + calendar heatmap + badges
│   │   └── settings.tsx            # Settings + Account (Sign in with Apple)
│   └── onboarding/                 # Onboarding flow
│       ├── _layout.tsx             # Onboarding stack
│       └── index.tsx               # Multi-page carousel with calibration
│
├── src/                            # Shared source code
│   ├── components/                 # Reusable React components
│   │   ├── ProgressRing.tsx        # Animated SVG circular progress
│   │   ├── CalendarHeatmap.tsx     # Monthly calendar with active days
│   │   ├── SessionCard.tsx         # Session history card
│   │   ├── BadgeGrid.tsx           # Badge achievements grid
│   │   └── BadgeUnlockModal.tsx    # Badge unlock celebration modal
│   ├── constants/
│   │   ├── theme.ts                # Colors, spacing, font sizes, timer defaults, badge definitions
│   │   └── index.ts                # Barrel export
│   ├── hooks/
│   │   ├── useIntervalFeedback.ts  # Audio beep + haptic vibration
│   │   ├── useColorScheme.ts       # Dark/light theme helper
│   │   └── useSync.ts             # Cloud sync hook (foreground + initial)
│   ├── services/
│   │   └── syncService.ts         # Push/pull sync engine (Supabase)
│   ├── store/                      # Zustand state management
│   │   ├── timerStore.ts           # Timer state machine
│   │   ├── sessionsStore.ts        # Walk history + streak tracking
│   │   ├── settingsStore.ts        # User preferences (persisted)
│   │   ├── badgesStore.ts          # Achievement badges
│   │   ├── profileStore.ts         # User profile (weight, age, height)
│   │   ├── authStore.ts            # Auth state (Supabase anonymous + Apple)
│   │   └── index.ts                # Barrel export
│   ├── utils/
│   │   ├── time.ts                 # Time formatting, streak helpers
│   │   ├── calories.ts             # Calorie estimation (MET-based)
│   │   ├── healthKit.ts            # Apple Health integration
│   │   ├── notifications.ts        # Push notification helpers
│   │   ├── supabase.ts             # Supabase client (SecureStore + AsyncStorage fallback)
│   │   ├── appleAuth.ts            # Sign in with Apple helper
│   │   ├── sentry.ts               # Crash reporting setup
│   │   └── seedTestData.ts         # Dev-only test data seeder
│   ├── i18n/
│   │   ├── index.ts                # i18next configuration
│   │   └── locales/                # 54 language files
│   └── types.ts                    # TypeScript interfaces
│
├── assets/                         # Static assets
│   ├── icon.png                    # App icon
│   ├── splash-icon.png             # Splash screen icon
│   ├── adaptive-icon.png           # Android adaptive icon
│   ├── badge_*.png                 # Badge achievement images (25 badges)
│   ├── beep.mp3                    # Interval switch sound
│   └── complete.mp3                # Session complete sound
│
├── app.json                        # Expo configuration
├── tsconfig.json                   # TypeScript configuration
├── jest.config.js                  # Jest test configuration
├── jest.setup.js                   # Test mocks setup
├── package.json                    # Dependencies & scripts
└── index.ts                        # Entry point (expo-router)
```

---

## Tech Stack

| Layer              | Technology                                  |
|--------------------|---------------------------------------------|
| Framework          | React Native (Expo SDK 54)                  |
| Routing            | Expo Router v6 (file-based)                 |
| State Management   | Zustand 5                                   |
| Local Storage      | AsyncStorage (offline-first)                |
| Auth               | Supabase Auth (anonymous + Sign in with Apple) |
| Cloud Sync         | Supabase PostgreSQL (offline-first, background sync) |
| Token Storage      | expo-secure-store (iOS Keychain)            |
| Audio              | expo-audio (background audio enabled)       |
| Haptics            | expo-haptics                                |
| SVG                | react-native-svg                            |
| i18n               | i18next + react-i18next (54 locales)        |
| Crash Reporting    | Sentry (@sentry/react-native)               |
| Testing            | Jest + React Native Testing Library         |
| Language           | TypeScript (strict mode)                    |

---

## Architecture

### Auth Flow

```
App Launch
    │
    ▼
Restore session from SecureStore/AsyncStorage
    │
    ├── Session exists → use existing user
    └── No session → signInAnonymously()
                           │
                           ▼
                    Anonymous user created (invisible to user)
                           │
                           ▼
                    App works normally, data syncs to cloud
                           │
        User taps "Sign in with Apple" in Settings
                           │
                           ▼
                    Link Apple account to anonymous user
                    (all data preserved, now has email)
```

### Sync Architecture

```
                    ┌──────────────┐
                    │  Local State  │  ← Source of truth
                    │  (Zustand +   │
                    │  AsyncStorage) │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         Push on       Pull on      Pull on
         write      app launch    foreground
              │            │            │
              └────────────┼────────────┘
                           ▼
                    ┌──────────────┐
                    │   Supabase   │  ← Cloud backup
                    │  PostgreSQL  │
                    │  (RLS)       │
                    └──────────────┘
```

**Merge strategies:**
- Sessions: union by ID (append-only)
- Stats: max() of each numeric field
- Settings: remote wins (except isPro — never downgrade)
- Badges: union, keep earliest unlockedAt
- Profile: remote wins

### Timer State Machine

```
         ┌─────────┐
         │  READY   │
         └────┬─────┘
              │ press START
              ▼
         ┌─────────────┐
         │  WARM-UP     │ (optional)
         └──────┬───────┘
                ▼
         ┌─────────┐
    ┌───▶│  FAST    │ (3:00 countdown)
    │    └────┬─────┘
    │         │ timer ends → beep + vibration
    │         ▼
    │    ┌─────────┐
    │    │  SLOW    │ (3:00 countdown)
    │    └────┬─────┘
    │         │ timer ends → beep + vibration
    │    round < 5?
    │    ├── YES ──┘ (back to FAST, round++)
    │    └── NO
    │         ▼
    │    ┌─────────────┐
    │    │  COOL-DOWN   │ (optional)
    │    └──────┬───────┘
    │           ▼
    │    ┌─────────┐
    │    │  DONE    │ → Session Summary
    │    └─────────┘
    │
    │  PAUSE / RESUME available during active states
    │  STOP → confirmation alert → READY
    └──────────────────────────────────
```

### State Management

Six Zustand stores handle all app state:

- **timerStore** — phase, round, time remaining, elapsed counters
- **sessionsStore** — completed walks, streak calculation, stats aggregation
- **settingsStore** — sound/vibration/health toggles, timer config, persisted via AsyncStorage
- **badgesStore** — 25 achievement badges with unlock conditions
- **profileStore** — user weight, age, height, walking frequency
- **authStore** — Supabase auth (user, session, anonymous/Apple state)

---

## Features

### Implemented

- **Interval Timer** — full state machine with FAST/SLOW phases, warm-up/cool-down, pause/resume/stop
- **Animated Progress Ring** — SVG circle with smooth countdown animation
- **Color-Coded Phases** — orange for fast walking, green for slow walking
- **Breathing Animation** — subtle scale pulse during slow intervals
- **Audio Feedback** — beep on interval switch (works with locked screen)
- **Haptic Feedback** — vibration on interval switch
- **Session Summary** — duration, rounds, calories, current streak
- **History & Stats** — total walks, total time, calories, streak counter
- **Calendar Heatmap** — monthly view highlighting active walk days
- **25 Achievement Badges** — walks, streaks, minutes, calories milestones
- **Badge Unlock Celebrations** — modal with animation on new badge
- **Settings** — sound, vibration, warm-up/cool-down, accessibility options
- **Auth: Anonymous Sign-In** — automatic, invisible to user
- **Auth: Sign in with Apple** — links to anonymous account, preserves data
- **Cloud Sync** — offline-first, push on write, pull on app open/foreground
- **Onboarding** — multi-page carousel with walking frequency calibration
- **Dark Mode** — follows system preference automatically
- **i18n** — 54 languages with auto-detection
- **Crash Reporting** — Sentry integration
- **Data Persistence** — AsyncStorage (local) + Supabase (cloud)

### Planned

- RevenueCat paywall + PRO subscription
- Custom intervals and round counts (PRO)
- Progressive training programs (PRO)
- Extended stats with weekly/monthly charts (PRO)
- Walk reminder push notifications
- Apple Health write integration
- Share session result as image
- Voice prompts (female voice coaching)
- Apple Watch companion app

---

## Supabase Setup

The app uses Supabase for auth and cloud sync. Tables:

| Table | Purpose |
|---|---|
| `user_sessions` | Walking sessions (PK: user_id, id) |
| `user_stats` | Aggregated stats (PK: user_id) |
| `user_settings` | All settings fields (PK: user_id) |
| `user_profile` | Weight/age/height/frequency (PK: user_id) |
| `user_badges` | Badge unlock tracking (PK: user_id, badge_id) |
| `sync_meta` | Last sync timestamp per table |

All tables have Row Level Security (RLS) with `auth.uid() = user_id` policy.

---

## Design System

| Token         | Value                                    |
|---------------|------------------------------------------|
| Primary       | `#4CAF50` (green)                        |
| Accent        | `#FF9800` (orange)                       |
| Fast Phase    | `#FF6B35` → `#FF9800` gradient           |
| Slow Phase    | `#26A69A` → `#4CAF50` gradient           |
| Error         | `#EF4444`                                |
| Background    | `#F5F7FA` (light) / `#121212` (dark)     |
| Surface       | `#FFFFFF` (light) / `#1E1E1E` (dark)     |
| Text          | `#1A1A2E` (light) / `#F5F5F5` (dark)     |
| Timer Font    | 72px, weight 800, tabular-nums           |

---

## Scripts

| Command                | Description              |
|------------------------|--------------------------|
| `npm start`            | Start Expo dev server    |
| `npm run ios`          | Start on iOS simulator   |
| `npm run android`      | Start on Android emulator|
| `npm test`             | Run tests                |
| `npm run test:watch`   | Run tests in watch mode  |
| `npm run test:coverage`| Run tests with coverage  |
| `npx tsc --noEmit`     | TypeScript type check    |

---

## License

Private — All rights reserved.

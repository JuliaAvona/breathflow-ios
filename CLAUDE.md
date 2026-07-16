# BreathFlow — Breathing Exercises & Breathwork Timer

## Project Context

This project is scaffolded from WalkPace (Japanese interval walking timer). The codebase contains WalkPace code that must be **transformed** into BreathFlow — a breathing exercises app with 10 science-backed techniques.

**Read `MVP.md` first** — it contains the full product specification, all 10 techniques with patterns, data models, screen designs, competitive analysis, and architecture decisions.

## What Needs to Be Done

### Phase 1: Clean & Rename (scaffold to BreathFlow)

1. **Rename the app** everywhere:
   - `app.config.ts`: name "BreathFlow — Breathing Exercises", slug "breathflow", iOS bundleIdentifier "com.izbrodin90.breathflow", Android package "com.breathflow.app"
   - Update iOS project files (Xcode project name, schemes, Info.plist display name)
   - Update `package.json` name field

2. **Remove WalkPace-specific code:**
   - Delete walking-specific components: `ProgressRing.tsx` (replace with breathing shapes), `SessionCard.tsx` (rewrite for breathing sessions), `WeeklyBarChart.tsx` (adapt for retention times)
   - Delete walking-specific utils: `calories.ts`, `foodEquivalents.ts`, `healthKit.ts` (rewrite for Mindful Minutes only), `liveActivity.ts`
   - Delete walking-specific hooks: `useIntervalFeedback.ts` (replace with breathing feedback), `useStepCount.ts`
   - Delete walking-specific assets: `badge_cal_*`, `badge_walks_*`, `badge_streak_*` (replace with breathing badges)
   - Clean `src/constants/theme.ts` — remove walking timer defaults, add breathing defaults
   - Clean `src/constants/motivationalQuotes.ts` — replace with breathing/mindfulness quotes
   - Remove `app/summary.tsx` sakura confetti and walking-specific summary — rewrite for breathing session summary

3. **Keep and adapt:**
   - Zustand store pattern (rewrite stores for breathing data models from MVP.md)
   - Supabase client + auth flow (100% reuse, new Supabase project later)
   - Sync service structure (adapt table names)
   - i18n setup + 53 locale file structure (replace all translation keys)
   - Color theme system (new default palette from MVP.md Design System)
   - Badge system structure (new badge definitions from MVP.md)
   - RevenueCat integration (Pro entitlement: Weekly/Annual subscriptions with free trials + Lifetime one-time IAP)
   - Background audio keepalive (reuse for breathing sounds)
   - Notification system (adapt content)
   - Onboarding flow structure (new screens)

### Phase 2: Core — Technique Engine

1. **Create `src/constants/techniques.ts`** — define all 10 techniques using the `BreathingTechnique` interface from MVP.md. Each technique has phases (inhale/exhale/holdIn/holdOut), durations, shape, category, and color.

2. **Create `src/store/timerStore.ts`** — universal breathing timer state machine:
   - Standard techniques: `READY -> INHALE -> [HOLD_IN ->] EXHALE -> [HOLD_OUT ->] -> repeat cycles -> DONE`
   - Power Breathing: `READY -> BREATHING (rapid) -> RETENTION (user-controlled) -> RECOVERY -> repeat rounds -> DONE`
   - Kapalabhati: `READY -> RAPID_SET -> REST -> repeat sets -> DONE`
   - Support pause/resume/stop in all modes

3. **Create `src/store/sessionsStore.ts`** — save completed sessions with technique ID, cycles/rounds, retention times (for Power Breathing), optional mood rating.

4. **Create `src/store/settingsStore.ts`** — per-technique overrides, custom techniques, sound/haptics/appearance settings.

### Phase 3: UI — Screens

1. **Home screen (`app/(tabs)/index.tsx`)** — technique cards grouped by category (calm/sleep/focus/energy/advanced). Tap card opens technique detail then start session.

2. **Active session screen** — the main breathing UI:
   - Animated breathing shapes: square (box), triangle, circle (coherence), wave (sigh), burst (power/kapalabhati), oval
   - Phase label ("Breathe In" / "Hold" / "Breathe Out")
   - Phase countdown timer
   - Cycle/round counter
   - Pause/Stop buttons
   - Power Breathing special: retention timer with swipe-to-exhale, recovery countdown

3. **Summary screen (`app/summary.tsx`)** — technique used, duration, cycles completed, retention times chart (Power Breathing), mood check, personal best celebration.

4. **History screen (`app/(tabs)/history.tsx`)** — calendar view (reuse CalendarHeatmap), daily sessions with technique colored dots, streaks, progress charts.

5. **Settings screen (`app/(tabs)/settings.tsx`)** — sound style, haptics, voice guidance, appearance, reminders, Apple Health toggle, language.

6. **Onboarding (`app/onboarding/`)** — welcome, goal selection (calm/sleep/focus/energy), safety warning, quick first session.

### Phase 4: Visual — Breathing Animations

Create animated breathing shape components in `src/components/`:
- `BreathingSquare.tsx` — 4 sides expand sequentially for box breathing
- `BreathingTriangle.tsx` — 3 sides for triangle/4-7-8
- `BreathingCircle.tsx` — smooth expand/contract for coherence
- `BreathingWave.tsx` — sine wave for physiological sigh / cyclic sighing
- `BreathingBurst.tsx` — rapid pulse for power breathing / kapalabhati
- `BreathingOval.tsx` — asymmetric for 2-to-1, 4-4-6-2

All shapes use React Native Animated API with `useNativeDriver: true`.

### Phase 5: Polish

- Sound assets for inhale/exhale/hold cues (tone, bell, nature, tibetan bowl)
- Apple Health: write Mindful Minutes after each session
- RevenueCat: "BreathFlow Pro" entitlement — Weekly ($2.99, 3-day trial) / Annual ($14.99, 7-day trial, default) / Lifetime ($19.99 one-time) unlocks all Pro features
- i18n: translate all 53 locale files
- Badges: implement all badge definitions from MVP.md
- Lock screen widget for quick technique launch

---

## Quick Reference

- **Stack**: React Native 0.81 + Expo SDK 54 + TypeScript (strict)
- **State**: Zustand 5 + AsyncStorage (offline-first)
- **Backend**: Supabase (Auth + PostgreSQL with RLS)
- **Routing**: Expo Router v6 (file-based, `app/` directory)
- **Bundle ID**: `com.izbrodin90.breathflow` (iOS) / `com.breathflow.app` (Android package)
- **Min iOS**: 15.1
- **Node**: >= 18 (recommended 22)
- **Full spec**: See `MVP.md`

## Environment Variables

Config is loaded via `.env` -> `app.config.ts` -> `Constants.expoConfig.extra`.

| Variable | Where | Purpose |
|----------|-------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | `.env` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `.env` | Supabase publishable anon key |
| `EXPO_PUBLIC_SENTRY_DSN` | `.env` | Sentry crash reporting DSN |

## Commands

```bash
npm start                  # Expo dev server
npm run ios                # iOS simulator
npm test                   # Jest tests
npm run test:watch         # Jest watch mode
npm run test:coverage      # Coverage report
npx tsc --noEmit           # TypeScript type check
make check                 # typecheck + test (CI equivalent)
```

## Architecture

### Core Principle: Offline-First

Local state (Zustand + AsyncStorage) is the **source of truth**. Supabase is a cloud backup.
All features must work without internet. Sync is push-on-write + pull-on-foreground.

### Timer State Machines

**Standard techniques (Box, 4-7-8, Coherence, etc.):**
```
READY -> INHALE -> [HOLD_IN ->] EXHALE -> [HOLD_OUT ->] -> repeat cycles -> DONE
          PAUSE / RESUME available
          STOP -> READY
```

**Power Breathing:**
```
READY -> BREATHING (rapid) -> RETENTION (user-controlled) -> RECOVERY -> repeat rounds -> DONE
          PAUSE                 swipe to end
          STOP -> READY
```

**Kapalabhati:**
```
READY -> RAPID_SET -> REST -> repeat sets -> DONE
          PAUSE
          STOP -> READY
```

### State Management (Zustand stores)

| Store | File | Persisted | Synced |
|-------|------|-----------|--------|
| timerStore | `src/store/timerStore.ts` | No | No |
| sessionsStore | `src/store/sessionsStore.ts` | AsyncStorage | Yes |
| settingsStore | `src/store/settingsStore.ts` | AsyncStorage | Yes |
| badgesStore | `src/store/badgesStore.ts` | AsyncStorage | Yes |
| authStore | `src/store/authStore.ts` | SecureStore | No |

### Auth Flow

1. App launch -> restore session from SecureStore
2. No session -> `signInAnonymously()` (invisible to user)
3. User can optionally "Sign in with Apple" -> links to anonymous account
4. All data preserved across auth upgrade

### 10 Breathing Techniques

| # | Technique | Pattern | Category | Shape | Free |
|---|-----------|---------|----------|-------|------|
| 1 | Box Breathing | 4-4-4-4 | focus | square | Yes |
| 2 | 4-7-8 Relaxing | 4-7-8 | sleep | triangle | Yes |
| 3 | Physiological Sigh | 2+1-6 | calm | wave | Pro |
| 4 | Coherence Breathing | 5.5-5.5 | calm | circle | Yes |
| 5 | Triangle Breathing | 4-4-4 | calm | triangle | Yes |
| 6 | Power Breathing | 30 breaths + hold | advanced | burst | Pro |
| 7 | 4-4-6-2 Calm | 4-4-6-2 | calm | oval | Pro |
| 8 | Energizing (Kapalabhati) | rapid exhales | energy | burst | Pro |
| 9 | 2-to-1 Relaxing | 4-8 | sleep | oval | Pro |
| 10 | Cyclic Sighing | 3+1.5-8 | calm | wave | Pro |

## Project Structure

```
app/                       # Screens (Expo Router file-based routing)
  (tabs)/                  # Bottom tab navigator (Home, History, Settings)
    index.tsx              # Home: technique cards by category
    history.tsx            # Session history + calendar + stats
    settings.tsx           # App settings
  onboarding/              # Onboarding flow (welcome, goal, safety, first session)
  session.tsx              # Active breathing session screen
  summary.tsx              # Post-session summary
  paywall.tsx              # Pro purchase screen
src/
  components/              # Reusable React components
    BreathingSquare.tsx    # Animated square shape (box breathing)
    BreathingTriangle.tsx  # Animated triangle shape
    BreathingCircle.tsx    # Animated circle shape (coherence)
    BreathingWave.tsx      # Animated wave shape (sighing)
    BreathingBurst.tsx     # Animated burst shape (power/kapalabhati)
    BreathingOval.tsx      # Animated oval shape (2-to-1)
    TechniqueCard.tsx      # Technique card for home screen
    RetentionTimer.tsx     # Power Breathing retention with swipe-to-exhale
    BadgeGrid.tsx          # Badge display (adapt from WalkPace)
    CalendarHeatmap.tsx    # Calendar view (reuse from WalkPace)
  constants/
    techniques.ts          # 10 technique definitions (BreathingTechnique[])
    theme.ts               # Design tokens, defaults
    colorThemes.ts         # Color theme palettes
  hooks/
    useBreathingEngine.ts  # Universal breathing timer hook
    useHaptics.ts          # Haptic feedback (reuse)
    useSync.ts             # Sync hook (reuse)
    useColorScheme.ts      # Color scheme hook (reuse)
  services/
    syncService.ts         # Push/pull sync engine (adapt)
  store/                   # Zustand stores
    timerStore.ts          # Breathing timer state machine
    sessionsStore.ts       # Session history
    settingsStore.ts       # User settings + custom techniques
    badgesStore.ts         # Achievements
    authStore.ts           # Auth state (reuse)
  utils/
    time.ts                # Time formatting (reuse)
    supabase.ts            # Supabase client (reuse)
    sentry.ts              # Sentry setup (reuse)
    revenueCat.ts          # RevenueCat — "BreathFlow Pro" (subscriptions + lifetime IAP)
    appleAuth.ts           # Apple Sign-In (reuse)
    backgroundAudio.ts     # Background audio keepalive (reuse)
    notifications.ts       # Notifications (adapt)
    healthKit.ts           # Apple Health — Mindful Minutes only
  i18n/locales/            # 53 language files
  types.ts                 # TypeScript interfaces
```

## Design System

| Token | Light | Dark |
|-------|-------|------|
| Primary | `#4A90D9` (calm blue) | same |
| Accent | `#7BC4A8` (soft green) | same |
| Background | `#F0F4F8` (cool gray) | `#0F1419` |
| Surface | `#FFFFFF` | `#1A2332` |
| Card | `#F8FAFC` | `#243040` |
| Text | `#1A2332` (dark navy) | `#F0F4F8` |
| TextSecondary | `#64748B` | `#94A3B8` |

### Phase Colors

| Phase | Color |
|-------|-------|
| Inhale | `#4A90D9` (blue) |
| Hold In | `#7B68AE` (purple) |
| Exhale | `#7BC4A8` (green) |
| Hold Out | `#F5A623` (amber) |
| Retention | `#1A2332` (near black) |

## Supabase Tables

| Table | PK | Purpose |
|-------|-----|---------|
| `user_sessions` | `(user_id, id)` | Breathing sessions |
| `user_stats` | `user_id` | Aggregated stats |
| `user_settings` | `user_id` | Settings + custom techniques |
| `user_badges` | `(user_id, badge_id)` | Badge unlock tracking |

All tables have RLS: `auth.uid() = user_id`.

## Monetization

**Free (no ads):** 4 techniques (Box, 4-7-8, Coherence, Triangle), unlimited sessions, 7-day history, streaks, Apple Health.

**Pro — `BreathFlow Pro` entitlement (RevenueCat `current` offering).** Three packages:
- **Weekly** — 3-day free trial, then $2.99/week
- **Annual** — 7-day free trial, then $14.99/year (default selection)
- **Lifetime** — $19.99 one-time purchase

Unlocks: all 10 techniques, custom technique builder, full history + charts, all color themes, all badges, mood tracking, data export. Prices are set in App Store Connect / RevenueCat; the values above are the in-code fallback strings in `app/paywall.tsx`. `logStartTrial` fires for weekly/annual; the auto-renewal disclaimer (Apple 3.1.2c) shows for those two plans.

## Conventions

### Code Style
- TypeScript strict mode, no `any`
- Functional components only (no class components)
- Zustand stores: `create<StoreInterface>((set, get) => ({...}))`
- File naming: `camelCase.ts` for utils/hooks, `PascalCase.tsx` for components
- Barrel exports via `index.ts` in each directory
- All UI strings go through i18next (`t('key')`)

### Testing
- Framework: Jest + React Native Testing Library
- Test location: `__tests__/` directories next to source
- Naming: `*.test.ts(x)`
- Coverage goals: 80% line, 70% branch

### Git
- Branch: `main`
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- Always run `make check` before committing

## Do NOT

- Do not use Redux, MobX or other state managers — Zustand only
- Do not add class components
- Do not write to Supabase without checking `userId` first
- Do not set `isPro` without checking RevenueCat — it is the source of truth
- Do not import from `react-native` for audio/haptics — use expo-* packages
- Do not hardcode strings — use i18next translation keys
- Do not modify `ios/Pods/` or `ios/build/` — these are generated
- Do not commit `.env` or Supabase keys to git
- Do not change the monetization model without also updating App Store Connect + RevenueCat — Pro ships as Weekly/Annual auto-renewing subscriptions (with free trials) **and** a Lifetime one-time purchase
- Do not add ads — the app is ad-free by design
- Do not keep WalkPace-specific code — remove all walking references

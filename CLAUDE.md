# WalkPace — Japanese Interval Walking Timer

## Quick Reference

- **Stack**: React Native 0.81 + Expo SDK 54 + TypeScript (strict)
- **State**: Zustand 5 + AsyncStorage (offline-first)
- **Backend**: Supabase (Auth + PostgreSQL with RLS)
- **Routing**: Expo Router v6 (file-based, `app/` directory)
- **Bundle ID**: `com.walkpace.app`
- **Min iOS**: 15.1
- **Node**: >= 18 (recommended 22)

## Environment Variables

Config is loaded via `.env` → `app.config.ts` → `Constants.expoConfig.extra`.

```bash
cp .env.example .env       # Create local env file
# Edit .env with your actual values
```

| Variable | Where | Purpose |
|----------|-------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | `.env` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `.env` | Supabase publishable anon key |
| `EXPO_PUBLIC_SENTRY_DSN` | `.env` | Sentry crash reporting DSN |

Access in code: `Constants.expoConfig?.extra?.supabaseUrl`

## Commands

```bash
npm start                  # Expo dev server
npm run ios                # iOS simulator
npm test                   # Jest tests
npm run test:watch         # Jest watch mode
npm run test:coverage      # Coverage report
npx tsc --noEmit           # TypeScript type check
make check                 # typecheck + test (CI equivalent)
make docs                  # Regenerate architecture diagrams
```

## Architecture

### Core Principle: Offline-First

Local state (Zustand + AsyncStorage) is the **source of truth**. Supabase is a cloud backup.
All features must work without internet. Sync is push-on-write + pull-on-foreground.

### Timer State Machine

```
READY → [WARM_UP →] FAST ↔ SLOW (×5 rounds) [→ COOL_DOWN] → DONE
                     PAUSE / RESUME available in active states
                     STOP → READY
```

### State Management (6 Zustand stores)

| Store | File | Persisted | Synced |
|-------|------|-----------|--------|
| timerStore | `src/store/timerStore.ts` | No | No |
| sessionsStore | `src/store/sessionsStore.ts` | AsyncStorage | Yes |
| settingsStore | `src/store/settingsStore.ts` | AsyncStorage | Yes |
| badgesStore | `src/store/badgesStore.ts` | AsyncStorage | Yes |
| profileStore | `src/store/profileStore.ts` | AsyncStorage | Yes |
| authStore | `src/store/authStore.ts` | SecureStore | No |

### Auth Flow

1. App launch → restore session from SecureStore
2. No session → `signInAnonymously()` (invisible to user)
3. User can optionally "Sign in with Apple" → links to anonymous account
4. All data preserved across auth upgrade

### Sync Merge Strategies

- **Sessions**: union by ID (append-only)
- **Stats**: `max()` of each numeric field
- **Settings**: remote wins (`isPro` is authoritative from RevenueCat on app launch)
- **Badges**: union, keep earliest `unlockedAt`
- **Profile**: remote wins

## Project Structure

```
app/                       # Screens (Expo Router file-based routing)
  (tabs)/                  # Bottom tab navigator (Timer, History, Settings)
  onboarding/              # Onboarding flow
src/
  components/              # Reusable React components
  constants/theme.ts       # Design tokens, timer defaults, badge definitions
  hooks/                   # Custom hooks (useIntervalFeedback, useSync, useColorScheme)
  services/syncService.ts  # Push/pull sync engine
  store/                   # 6 Zustand stores
  utils/                   # Helpers (time, calories, healthKit, supabase, sentry)
  i18n/locales/            # 53 language files
  types.ts                 # TypeScript interfaces
docs/                      # Architecture as Code
  architecture/            # C4 PlantUML diagrams
  decisions/               # ADR (Architecture Decision Records)
```

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
- Mock setup: `jest.setup.js` (expo-audio, haptics, notifications, AsyncStorage)
- Coverage goals: 80% line, 70% branch

### Git
- Branch: `release/1.0.0` (current), `main` (production)
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- Always run `make check` before committing

## Supabase Tables

| Table | PK | Purpose |
|-------|-----|---------|
| `user_sessions` | `(user_id, id)` | Walking sessions |
| `user_stats` | `user_id` | Aggregated stats |
| `user_settings` | `user_id` | All settings fields |
| `user_profile` | `user_id` | Weight/age/height |
| `user_badges` | `(user_id, badge_id)` | Badge unlock tracking |

All tables have RLS: `auth.uid() = user_id`.

## Design System

| Token | Light | Dark |
|-------|-------|------|
| Primary | `#D85E43` (terracotta) | same |
| Accent | `#5BA4C8` (soft blue) | same |
| Background | `#EDE5DD` (warm beige) | `#1A1512` |
| Surface | `#F5F0EA` (cream) | `#2A2421` |
| Text | `#2A2421` (warm brown) | `#F5F0EA` |
| Fast phase | `#D85E43` → `#E88B73` | same |
| Slow phase | `#5BA4C8` → `#6BB9D3` | same |

## Do NOT

- Do not use Redux, MobX or other state managers — Zustand only
- Do not add class components
- Do not write to Supabase without checking `userId` first
- Do not set `isPro` without checking RevenueCat — it is the source of truth for subscriptions
- Do not import from `react-native` for audio/haptics — use expo-* packages
- Do not hardcode strings — use i18next translation keys
- Do not modify `ios/Pods/` or `ios/build/` — these are generated
- Do not commit `.env` or Supabase keys to git

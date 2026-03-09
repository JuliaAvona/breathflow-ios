# WalkPace — MVP Plan

## Japanese Interval Walking Timer (React Native)

---

## 1. Product Overview

**Concept:** Specialized timer app for Japanese Interval Walking Training (IWT) — alternating 3 min fast / 3 min slow walking, 5 rounds = 30 min.

**Target audience:** Women 30–60, not into running, looking for simple science-backed fitness.

**Key differentiator:** The only polished, dedicated IWT app on the market. Clean design, works with locked screen, streak tracking.

**Architecture:** Offline-first. All features work without internet. Timer, history, stats — everything stored locally. Data syncs to cloud (if added) only when connectivity is available. Critical for users walking in parks without cell service.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native (Expo SDK 54) |
| Navigation | Expo Router v6 (file-based) |
| State management | Zustand |
| Local storage | AsyncStorage (offline-first) |
| Notifications | expo-notifications |
| Background audio | expo-audio (interval beeps with locked screen) |
| Haptics | expo-haptics |
| Health integration | expo-apple-healthkit (iOS, graceful degradation in Expo Go) |
| Analytics | PostHog or Amplitude (free tier) |
| Crash reporting | Sentry (crash reporting + error tracking, critical for background audio edge cases) |
| Payments | RevenueCat (in-app subscriptions + A/B testing paywall) |
| Animations | React Native Animated API + lottie-react-native |
| i18n | i18next + react-i18next + expo-localization (54 locales, auto-detect device language) |
| SVG | react-native-svg (progress ring) |
| Deep links | expo-linking / Branch (for TikTok → App Store tracking) |

---

## 3. MVP Scope (v1.0)

### 3.1 FREE Features

#### Timer Screen (core)
- Start/Pause/Stop buttons
- Visual display: current interval (FAST / SLOW), round number (1–5), time remaining
- Animated circle/progress ring showing interval progress (clockwise)
- Color change: orange/red for FAST, green for SLOW
- Audio beep on interval switch (works with locked screen via background audio)
- Vibration on interval switch
- Total session time countdown (30 min)
- **5-second countdown** before each interval switch (beep-beep-beep-beep-BEEEP)
- **Warm-up / Cool-down** (optional): 2–3 min light walking before and after main session

#### Sound Design (core experience)
- **Interval switch:** Clear, distinct sound (beep / chime / voice options)
- **Voice prompts:** "Switch to fast walking!" / "Slow down, recover" — female voice, calm & motivating
- **Countdown beeps:** Last 5 seconds before each interval switch
- **Session start:** Energizing sound
- **Session complete:** Celebration chime
- Sound types: `beep` (minimal), `chime` (pleasant), `voice` (full voice coaching)
- Voice language follows app locale

#### Session Summary Screen
- After completing a walk: duration, rounds completed, estimated calories
- Option to save to Apple Health
- Share result as image (for social media)
- **Rate & Review prompt** after 5th and 10th completed session (native SKStoreReviewController)

#### History / Stats Screen
- Current streak (days in a row)
- Total walks completed
- Total time walked
- Calendar heatmap showing active days
- **Milestone badges** (10 walks, 50 walks, 7-day streak, 30-day streak, 100km total)
- **Weekly summary** push notification ("This week: 4 walks — 2 more than last week!")

#### Settings Screen
- Sound on/off + sound type selector
- Vibration on/off
- Apple Health toggle
- Warm-up / Cool-down toggle
- **Accessibility settings:** Large text mode, high contrast mode

#### Onboarding (4 screens)
1. What is Japanese Interval Walking (with science reference)
2. How it works (3 min fast + 3 min slow x 5)
3. **Quick calibration:** "How often do you walk?" (Never / 1-2x week / Daily) + optional age & weight for accurate calorie calculation
4. Benefits + CTA "Start your first walk"

#### Accessibility (target audience: women 30-60)
- **Large touch targets** (minimum 44pt)
- **VoiceOver support** on all screens with meaningful labels
- **Dynamic Type** support (respects iOS text size settings)
- **High contrast mode** option in settings
- **Voice prompts** for interval changes (not just beeps) — even in free version
- All colors meet WCAG AA contrast ratio (4.5:1 for text)

### 3.2 PRO Features (paywall)

- Custom intervals: 2/2, 4/4, 5/5 min (or custom)
- Custom round count: 3–10 rounds
- Progressive programs (4-week beginner, 8-week advanced)
- Extended stats: weekly/monthly charts, avg pace trend
- Home screen widget (streak)
- Walk reminders (push notifications by schedule)
- Custom warm-up / cool-down duration
- **Detailed calorie tracking** with personalized MET formula
- Apple Watch companion (phase 2, post-MVP)

### 3.3 NOT in MVP (later)

- Apple Watch standalone app
- GPS route tracking / map
- Social features / leaderboards
- Music integration (Spotify/Apple Music)
- ~~Cloud sync / backup~~ ✅ Implemented (Supabase)
- Android (start iOS-only for faster launch)

---

## 4. Monetization

| Plan | Price | Details |
|------|-------|---------|
| Free | $0 | Basic 3/3 timer, 5 rounds, basic stats, voice prompts |
| PRO Weekly | $3.99/week | Full access, 3-day free trial |
| PRO Annual | $24.99/year | Full access, 7-day free trial |

**Paywall placement:**
- Soft paywall after 3rd completed walk ("Unlock custom intervals")
- Settings → "Upgrade to PRO"
- When tapping any PRO feature
- **A/B testing:** Test paywall after 3rd vs. 5th session, different designs (RevenueCat Experiments)

**Implementation:** RevenueCat SDK for subscription management, paywall A/B testing, and analytics.

---

## 5. Calorie Calculation

### Formula: MET-based estimation

```
Calories = MET × weight(kg) × time(hours)

MET values:
- Fast walking (5.5–6.5 km/h): MET = 4.3
- Slow walking (3.5–4.5 km/h): MET = 2.5
- Warm-up/Cool-down: MET = 2.0

Default weight: 65 kg (if user hasn't set weight)
```

**How it works:**
- If user provided weight during onboarding → use their weight
- If not → use 65 kg default with disclaimer "Set your weight in settings for accurate calories"
- PRO users get age + weight + height based formula (Harris-Benedict + activity factor)

---

## 6. Retention Mechanics

### Free tier retention
- **Streak tracking** with fire emoji and motivational messages
- **Streak protection push:** "You're on a 5-day streak! Don't break it!" (evening if no walk today)
- **Milestone badges:** visual achievements that feel rewarding
  - First Walk, 10 Walks, 50 Walks, 100 Walks
  - 3-Day Streak, 7-Day Streak, 30-Day Streak
  - 1 Hour Total, 10 Hours Total
- **Weekly summary notification:** "This week: 4 walks, 120 cal burned — 2 more walks than last week!"
- **Rate & Review prompt** at session 5 and 10 (SKStoreReviewController)

### PRO retention
- Progressive programs with daily goals
- Walk reminders at user's preferred time
- Extended charts showing progress over time

---

## 7. Screen Map

```
Onboarding (4 screens, includes calibration)
  └── Main Tab Navigator
        ├── Timer Tab
        │     ├── Timer Ready Screen (big "START" button)
        │     ├── Timer Active Screen (countdown, intervals)
        │     │     ├── Optional Warm-up (2-3 min)
        │     │     ├── FAST/SLOW intervals (5 rounds)
        │     │     └── Optional Cool-down (2-3 min)
        │     └── Session Summary Screen
        │           └── Rate & Review (after 5th/10th session)
        ├── History Tab
        │     ├── Streak Banner
        │     ├── Stats Overview (walks, time, calories)
        │     ├── Calendar Heatmap
        │     ├── Milestone Badges
        │     └── Recent Sessions List
        ├── Programs Tab [PRO]
        │     ├── Program List
        │     └── Program Detail
        └── Settings Tab
              ├── Sound / Vibration / Voice
              ├── Warm-up / Cool-down
              ├── Health Integration
              ├── Accessibility
              ├── Subscription Management
              └── About / Privacy / Terms
```

---

## 8. Implementation Phases

### Phase 1 — Project Setup ✅
- [x] Init Expo project (managed workflow, SDK 54)
- [x] Configure Expo Router (tab navigator + stacks)
- [x] Set up Zustand stores (timer, sessions, settings) with AsyncStorage persistence
- [x] Design system: colors, typography, spacing tokens
- [x] Dark mode support (follows system setting)
- [x] Set up i18n architecture (i18next + react-i18next, 54 locales, all strings extracted)
- [x] Configure Sentry for crash reporting (@sentry/react-native, placeholder DSN)

### Phase 2 — Timer (Core Feature) ✅
- [x] Timer logic: interval state machine (READY → FAST → SLOW → ... → DONE)
- [x] Timer UI: progress ring animation (clockwise)
- [x] Audio playback for interval switch (expo-audio, background mode)
- [x] Haptic feedback on interval switch
- [x] Pause / Resume / Stop functionality
- [x] Breathing animation during SLOW phase
- [x] Session summary screen with stats
- [x] Warm-up / Cool-down optional intervals
- [ ] 5-second countdown beeps before interval switch
- [ ] Real sound design (replace placeholder audio)

### Phase 3 — Stats & History ✅
- [x] Persist completed sessions (AsyncStorage)
- [x] Streak calculation logic
- [x] Calendar heatmap component with month navigation
- [x] Stats overview: total walks, total time, calories
- [x] Session cards with status indicators
- [x] Apple Health write integration (graceful degradation)
- [x] Milestone badges system (25 badges: walks, streaks, minutes, calories)
- [x] Badge unlock modal with celebration UI
- [ ] Weekly summary notification

### Phase 4 — Paywall & Monetization
- [ ] RevenueCat SDK setup + products configuration
- [ ] Paywall screen design (min 2 variants for A/B test)
- [ ] PRO gating logic (custom intervals, programs, reminders)
- [ ] Restore purchases
- [ ] A/B test: paywall after 3rd vs. 5th session
- [ ] Rate & Review prompt (after 5th/10th session)

### Phase 5 — PRO Features
- [ ] Custom interval duration picker
- [ ] Custom round count picker
- [ ] Walk reminder notifications (expo-notifications)
- [ ] Progressive programs data model + UI
- [ ] Extended stats charts (weekly/monthly)
- [ ] Detailed calorie calculation with user weight

### Phase 6 — Accessibility & Sound Polish (partially done)
- [ ] VoiceOver labels on all interactive elements
- [ ] Dynamic Type support
- [x] High contrast mode option
- [x] Large text mode option
- [ ] Voice prompts: record/source female voice ("Switch to fast!", "Great job!")
- [ ] Multiple sound packs (beep, chime, voice)
- [ ] 5-second countdown audio sequence
- [ ] Test with screen readers

### Phase 7 — Onboarding & Calibration ✅
- [x] Update onboarding: add calibration screen (walking frequency, optional weight/age)
- [x] MET-based calorie formula with user weight
- [x] Store user profile data for personalized stats (profileStore)

### Phase 8 — Retention & Engagement (partially done)
- [x] Milestone badges UI (grid of achievements with BadgeGrid component)
- [x] Badge unlock modal (BadgeUnlockModal with celebration UI)
- [ ] Badge unlock animations (Lottie)
- [ ] Streak protection push notifications
- [ ] Weekly summary push notification
- [ ] Deep links setup (expo-linking + Branch)
- [ ] Smart App Banner on landing page

### Phase 9 — Legal & Launch Prep
- [ ] Privacy Policy page (required for App Store, especially Health data)
- [ ] Terms of Service page
- [ ] App icon & splash screen
- [ ] Animations (Lottie for walking character)
- [ ] Share session result as image
- [ ] Landing page (one-pager): ASO backlinks, social redirect, privacy policy host, email collection
- [ ] ASO: title, subtitle, keywords, screenshots

### Phase 10 — Testing & Launch
- [ ] Test with locked screen (timer + audio continues)
- [ ] Test during incoming phone call
- [ ] Test Bluetooth disconnect (headphones)
- [ ] Test battery drain over 30-min session
- [ ] Test background → foreground transitions
- [ ] Test notification permissions flow
- [ ] TestFlight beta with real walks
- [ ] App Store submission
- [x] Localization: 54 languages (all strings extracted, auto-detects device language)

---

## 9. Timer State Machine

```
         ┌─────────┐
         │  READY   │
         └────┬─────┘
              │ press START
              ▼
         ┌─────────────┐
         │  WARM-UP     │ (optional, 2-3 min)
         └──────┬───────┘
                │ timer ends
                ▼
         ┌─────────┐
    ┌───▶│  FAST    │ (3:00 countdown)
    │    └────┬─────┘
    │         │ 5-sec countdown beeps → timer ends
    │         ▼
    │    ┌─────────┐
    │    │  SLOW    │ (3:00 countdown)
    │    └────┬─────┘
    │         │ 5-sec countdown beeps → timer ends
    │         │
    │    round < 5?
    │    ├── YES ──┘ (back to FAST, round++)
    │    └── NO
    │         │
    │         ▼
    │    ┌─────────────┐
    │    │  COOL-DOWN   │ (optional, 2-3 min)
    │    └──────┬───────┘
    │           │ timer ends
    │           ▼
    │    ┌─────────┐
    │    │  DONE    │ → Session Summary
    │    └─────────┘
    │
    │  PAUSE/RESUME available in all active states
    │  STOP → confirmation → READY
    └──────────────────────────────
```

---

## 10. Data Models

### Session
```typescript
interface Session {
  id: string;
  date: string;              // ISO date
  startedAt: number;         // timestamp
  completedAt: number;       // timestamp
  rounds: number;            // completed rounds
  totalRounds: number;       // target rounds
  fastDuration: number;      // seconds in fast intervals
  slowDuration: number;      // seconds in slow intervals
  totalDuration: number;     // actual seconds walked
  estimatedCalories: number;
  completed: boolean;        // finished all rounds
  warmUp: boolean;           // had warm-up
  coolDown: boolean;         // had cool-down
}
```

### UserStats
```typescript
interface UserStats {
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  totalMinutes: number;
  totalCalories: number;
  lastSessionDate: string | null;
}
```

### UserProfile
```typescript
interface UserProfile {
  weight?: number;           // kg, optional (for calorie accuracy)
  age?: number;              // optional
  walkingFrequency: 'never' | 'occasional' | 'daily'; // from onboarding
}
```

### Settings
```typescript
interface Settings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  soundType: 'beep' | 'chime' | 'voice';
  healthIntegration: boolean;
  isPro: boolean;
  warmUpEnabled: boolean;    // default false
  coolDownEnabled: boolean;  // default false
  largeTextMode: boolean;    // accessibility
  highContrastMode: boolean; // accessibility
  // PRO
  fastInterval: number;     // default 180 (3 min)
  slowInterval: number;     // default 180 (3 min)
  roundCount: number;       // default 5
  reminderEnabled: boolean;
  reminderTime: string;     // "08:00"
}
```

### Badge
```typescript
interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;              // emoji or asset name
  unlockedAt: number | null; // timestamp or null if locked
  condition: {
    type: 'sessions' | 'streak' | 'minutes' | 'calories';
    value: number;
  };
}
```

---

## 11. Design Direction

- **Style:** Minimal, clean, nature-inspired
- **Primary palette:** Soft green (#4CAF50) + warm orange (#FF9800)
- **Fast interval:** Orange/red gradient background
- **Slow interval:** Green gradient background
- **Typography:** SF Pro (iOS), large bold numbers for timer
- **Animations:** Smooth clockwise progress ring, subtle breathing animation during slow intervals
- **Dark mode:** Support from day one (follows system setting)
- **Accessibility:** Large touch targets (44pt+), VoiceOver labels, Dynamic Type, high contrast option

---

## 12. ASO Strategy

| Field | Value |
|-------|-------|
| Title | Interval Walking Timer - WalkPace |
| Subtitle | Japanese Walking Method & Tracker |
| Keywords | interval walking, japanese walking, walking timer, IWT, fitness walking, walk tracker, step counter, walking exercise, health walking, interval training |
| Category | Health & Fitness |
| Screenshots | Timer in action, stats screen, streak calendar, before/after science stats |

---

## 13. Marketing & Distribution

### TikTok Launch Plan
1. **Pre-launch (2 weeks before):** Post TikToks about Japanese walking method (no app mention), build audience
2. **Launch week:** "I built an app for this" reveal, show the timer working during real walks
3. **Ongoing:** Daily walk content with app visible, user testimonials, science facts
4. **ASO:** Target "japanese walking" and "interval walking" keywords — low competition, high trend

### Deep Links & Attribution
- **Branch / Firebase Dynamic Links** for TikTok → App Store tracking
- Each TikTok video gets unique link for attribution
- **Smart App Banner** on landing page for mobile Safari visitors

### Landing Page (required before launch)
- One-page site: app description, screenshots, App Store badge
- Hosts Privacy Policy and Terms of Service (App Store requirement)
- Email collection for pre-launch list
- SEO backlinks for ASO boost

### Localization (54 languages — done)
All UI strings extracted to locale files with i18next. Smart language detection for regional variants (zh-CN/zh-TW, pt-BR/pt-PT, es/es-419).

**Languages:** en, ar, am, bg, bn, ca, cs, da, de, el, es, es-419, et, fa, fi, fil, fr, gu, he, hi, hr, hu, id, it, ja, kn, ko, lt, lv, ml, mr, ms, nl, no, pl, pt-BR, pt-PT, ro, ru, sk, sl, sr, sv, sw, ta, te, th, tr, uk, vi, zh-CN, zh-TW

---

## 14. Success Metrics (Target: $1K MRR)

| Metric | Target |
|--------|--------|
| Free downloads | 5,000+ / month |
| Free → Trial | 15% |
| Trial → Paid | 40% |
| Weekly sub ($3.99) | ~65 active subscribers = $1K MRR |
| Annual sub ($24.99) | ~40 annual = $1K MRR equivalent |
| D1 Retention | > 40% |
| D7 Retention | > 20% |
| App Store Rating | > 4.5 stars |
| Crash-free rate | > 99.5% |

---

## 15. Key Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Trend fades | Method is science-backed (Mayo Clinic), position as health tool not trend |
| Platform builds it in | Too niche for Apple/Google to prioritize |
| Copycat apps flood market | First-mover with quality + ASO + TikTok audience = moat |
| Low conversion rate | A/B test paywall timing and design via RevenueCat Experiments |
| Background audio issues | Test on locked screen, incoming calls, Bluetooth disconnect. Sentry for crash monitoring |
| Inaccurate calories | MET-based formula + prompt user for weight. Show disclaimer if using default |
| Poor accessibility | Test with VoiceOver, Dynamic Type. Target audience includes 50-60 age group |
| App Store rejection | Privacy Policy ready, Health data usage justified, proper entitlements |
| No internet in park | Offline-first architecture — everything works without connectivity |

---

## 16. Legal Requirements

- **Privacy Policy** (required): Hosted on landing page, linked in Settings and App Store listing. Must cover Health data collection and storage.
- **Terms of Service** (required): Subscription terms, refund policy reference to Apple.
- **Health data disclaimer**: "Calorie estimates are approximate and should not be used for medical purposes."
- **HealthKit usage description**: Required Info.plist string explaining why the app accesses Health data.

---

## Current Implementation Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1 — Project Setup | ✅ Done | Expo SDK 54, Expo Router, Zustand + AsyncStorage, i18n (54 locales), Sentry |
| Phase 2 — Timer | ✅ Done | Timer state machine, progress ring, audio, haptics, warm-up/cool-down. Pending: countdown beeps, real audio |
| Phase 3 — Stats & History | ✅ Done | Calendar, streaks, session cards, Apple Health, 25 badges with unlock modal. Pending: weekly notification |
| Phase 4 — Paywall | ⬜ Not started | |
| Phase 5 — PRO Features | ⬜ Not started | |
| Phase 6 — Accessibility | 🟡 Partial | High contrast mode, large text mode done. Pending: VoiceOver, Dynamic Type, voice prompts |
| Phase 7 — Onboarding Update | ✅ Done | Calibration screen, MET calories, profile store |
| Phase 8 — Retention | 🟡 Partial | Badge grid + unlock modal done. Pending: Lottie animations, push notifications |
| Phase 9 — Legal & Launch Prep | ⬜ Not started | |
| Phase 10 — Testing & Launch | ⬜ Not started | |

### Auth & Cloud Sync (added post-plan) ✅

| Feature | Status |
|---------|--------|
| Supabase client + SecureStore | ✅ Done |
| Anonymous auth (auto on first launch) | ✅ Done |
| Sign in with Apple | ✅ Done |
| Cloud sync (push on write, pull on open) | ✅ Done |
| 6 Supabase tables with RLS | ✅ Done |
| Account UI in Settings | ✅ Done |
| Offline-first architecture | ✅ Done |

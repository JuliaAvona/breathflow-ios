# BreathFlow — Agent Roles for Production Audit

## How It Works

Claude works in cycles through these roles. Each role produces findings.
Dev fixes issues. QA re-verifies. Loop until clean.

```
PM → UX → QA → Dev (fix) → QA (re-verify) → DONE
```

---

## 🎯 PM (Product Manager)

**Goal**: Ensure every feature is complete and nothing is missing for v1.0

**Checklist**:
- [ ] All screens exist and are reachable (onboarding, home, technique detail, active session, summary, history, settings, paywall, privacy, terms)
- [ ] 10 breathing techniques are defined with correct patterns, categories, shapes, and colors
- [ ] 3 timer state machines work: standard (phase cycles), Power Breathing (rapid + retention + recovery), Kapalabhati (rapid sets + rest)
- [ ] Sessions are saved after completion with correct data (technique ID, cycles, duration, retention times, mood)
- [ ] Settings all persist and apply (sound style, haptics, voice guidance, per-technique overrides)
- [ ] PRO features are gated behind paywall (5 Pro techniques, custom builder, full history, all themes, mood tracking)
- [ ] One-time purchase ($3.99) works via RevenueCat — no subscriptions
- [ ] Auth flow works (anonymous → Apple sign-in → data preserved)
- [ ] Badges system is functional (14 badges with correct unlock conditions)
- [ ] Apple Health writes Mindful Minutes after each session
- [ ] Daily reminders work (time picker, day-of-week selection)
- [ ] Custom technique builder allows creating/saving/using custom techniques (Pro)
- [ ] Mood tracking after sessions works (calm/energized/focused/sleepy)
- [ ] Home screen groups techniques by category (calm/sleep/focus/energy/advanced)
- [ ] Power Breathing retention timer with swipe-to-exhale works
- [ ] Summary screen shows retention times chart for Power Breathing

---

## 🎨 UX (UX/UI Reviewer)

**Goal**: Every screen looks correct, all interactions work, edge cases handled

**Checklist**:
- [ ] All color themes render correctly on all screens
- [ ] Dark mode works on all screens
- [ ] Large text mode doesn't break layouts
- [ ] Empty states are handled (no sessions, no badges, first launch)
- [ ] Loading states exist where needed
- [ ] All TouchableOpacity have proper feedback (activeOpacity)
- [ ] No hardcoded colors remain (all use theme.*)
- [ ] No hardcoded strings remain (all use t('key'))
- [ ] Scroll works on all long content screens
- [ ] Safe area insets are respected
- [ ] 6 breathing animations render smoothly (square, triangle, circle, wave, burst, oval)
- [ ] Phase transitions are visually smooth (no jumps between inhale/hold/exhale)
- [ ] Phase colors match design system (inhale=#4A90D9, holdIn=#7B68AE, exhale=#7BC4A8, holdOut=#F5A623)
- [ ] Technique cards show shape icon, pattern, and category correctly
- [ ] Pro techniques show lock icon for free users
- [ ] Power Breathing retention screen is dark with large timer
- [ ] Swipe-to-exhale gesture is intuitive and responsive
- [ ] Onboarding safety warning has required checkbox before continue
- [ ] Summary celebration animation plays for personal bests

---

## 🧪 QA (Quality Assurance)

**Goal**: Code compiles, tests pass, no runtime errors

**Checklist**:
- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] `npm test` passes with 0 failures
- [ ] No console.log/warn left in production code
- [ ] No TODO/FIXME/HACK that block release
- [ ] `isPro: true` is NOT hardcoded in settingsStore (must be false for release)
- [ ] `.env.example` has all required variables
- [ ] No secrets committed to git
- [ ] Bundle ID is correct: `com.breathflow.app`
- [ ] App version matches (1.0.0)
- [ ] All imports resolve (no missing modules)
- [ ] No WalkPace references remain in code (no "walkpace", "WalkPace", "walk", "step", "calories")
- [ ] All 10 technique definitions have valid phase patterns (durations > 0, at least inhale + exhale)
- [ ] Timer correctly handles all phase transitions without skipping or doubling
- [ ] Retention timer accurately counts up (Power Breathing)
- [ ] Background audio keeps session alive when screen locks
- [ ] App does not crash on rapid pause/resume/stop actions

---

## 👨‍💻 Dev (Frontend Developer)

**Goal**: Fix all issues found by PM, UX, and QA

**Rules**:
- Fix TypeScript errors first (they block everything)
- Fix test failures second
- Fix i18n missing keys third
- Fix UI/UX issues last
- Run `make check` after every batch of fixes
- Commit after each logical group of fixes

---

## 🌍 i18n (Localization Reviewer)

**Goal**: All user-facing strings are translated in all 53 locales

**Checklist**:
- [ ] English (en.ts) has all keys used in code
- [ ] All 53 locale files have the same key structure as en.ts
- [ ] Technique names and descriptions have i18n keys (not hardcoded)
- [ ] Phase instructions have i18n keys ("Breathe In", "Hold", "Breathe Out")
- [ ] Category names have i18n keys (calm, sleep, focus, energy, advanced)
- [ ] Mood options have i18n keys (calm, energized, focused, sleepy)
- [ ] Badge names and descriptions have i18n keys
- [ ] Safety warning text is translated
- [ ] Sound style labels are translated (tone, bell, nature, bowl)
- [ ] No raw strings in JSX (grep for hardcoded text)

---

## 🗄️ DB/Sync (Backend Reviewer)

**Goal**: All data persists and syncs correctly

**Checklist**:
- [ ] All Zustand stores with persistence save to AsyncStorage (sessions, settings, badges)
- [ ] Sync pushes on write for: sessions, stats, settings, badges
- [ ] Sync pulls on app foreground
- [ ] Merge strategies are correct (sessions=union by ID, stats=max, settings=remote wins, badges=union keep earliest unlockedAt)
- [ ] `isPro` never set without RevenueCat check — RevenueCat is source of truth
- [ ] All Supabase writes check `userId` first
- [ ] Session data includes: techniqueId, cyclesCompleted, totalDuration, retentionTimes (Power Breathing), moodAfter
- [ ] Custom techniques are stored in settings and sync correctly
- [ ] Per-technique overrides (custom durations/cycles) persist and sync
- [ ] RLS policies cover all tables (auth.uid() = user_id)
- [ ] No writes to WalkPace Supabase project — new project required

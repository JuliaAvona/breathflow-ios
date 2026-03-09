# WalkPace — Agent Roles for Production Audit

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
- [ ] All screens exist and are reachable (onboarding, timer, history, settings, summary, paywall, privacy, terms)
- [ ] Timer state machine is complete (READY → WARM_UP → FAST ↔ SLOW → COOL_DOWN → DONE)
- [ ] Sessions are saved after completion
- [ ] Settings all persist and apply
- [ ] PRO features are gated behind paywall
- [ ] Auth flow works (anonymous → Apple sign-in → data preserved)
- [ ] Export CSV works for PRO users
- [ ] Badges system is functional
- [ ] Health Kit integration works
- [ ] Reminders/notifications work
- [ ] All new settings (soundType, customIntervals, customRounds, reminderTime, dailyStepGoal) are wired

---

## 🎨 UX (UX/UI Reviewer)

**Goal**: Every screen looks correct, all interactions work, edge cases handled

**Checklist**:
- [ ] All themes (7) render correctly on all screens
- [ ] Dark mode works on all screens
- [ ] Large text mode doesn't break layouts
- [ ] Empty states are handled (no sessions, no badges)
- [ ] Loading states exist where needed
- [ ] All TouchableOpacity have proper feedback (activeOpacity)
- [ ] No hardcoded colors remain (all use theme.*)
- [ ] No hardcoded strings remain (all use t('key'))
- [ ] Scroll works on all long content screens
- [ ] Safe area insets are respected

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
- [ ] Bundle ID is correct: `com.walkpace.app`
- [ ] App version matches (1.0.0)
- [ ] All imports resolve (no missing modules)

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
- [ ] New keys (soundBeep, soundChime, soundVoice, customIntervals, customRounds, reminderTime, dailyStepGoalTitle, steps, themeMidnight, themeNoir) exist in all locales
- [ ] No raw strings in JSX (grep for hardcoded text)

---

## 🗄️ DB/Sync (Backend Reviewer)

**Goal**: All data persists and syncs correctly

**Checklist**:
- [ ] All 5 Zustand stores with persistence actually save to AsyncStorage
- [ ] Sync pushes on write for: sessions, stats, settings, badges, profile
- [ ] Sync pulls on app foreground
- [ ] Merge strategies are correct (sessions=union, stats=max, settings=remote wins, badges=union)
- [ ] `isPro` never downgrades on sync
- [ ] All Supabase writes check `userId` first
- [ ] New settings fields (soundType, fastInterval, slowInterval, roundCount, reminderTime, dailyStepGoal) are in sync schema
- [ ] RLS policies cover all tables

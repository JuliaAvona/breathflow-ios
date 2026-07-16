# BreathFlow — Breathwork & Breathing Timer MVP

## Positioning

**One-liner:** 10 science-backed breathing techniques with visual guides — no subscriptions, no bloat, no ads.

**Target audience:** People seeking stress relief, better sleep, focus, or energy through breathwork. From beginners to experienced practitioners frustrated with overloaded apps.

**Key differentiators:**
- 10 ready-made techniques categorized by goal (calm, sleep, focus, energy, advanced)
- Visual breathing shapes (square, triangle, circle, wave) — not just a timer
- Power Breathing with retention timer (WHM-style without the brand)
- One-time purchase ($3.99) — no subscription, no ads
- Custom technique builder
- Works with locked screen
- Offline-first, lightweight (<30MB)
- Apple Health (Mindful Minutes)

---

## Competitive Analysis

### Direct Competitors

| Feature | WHM Official | Breathwrk | iBreathe | Awesome Breathing | **BreathFlow** |
|---------|-------------|-----------|----------|-------------------|---------------|
| Techniques | WHM only | 100+ (bloated) | 2-3 presets | Box + 4-7-8 | **10 curated** |
| Categories (sleep/calm/focus) | No | Yes | No | No | **Yes** |
| Visual shapes | No | Partial | No | Circle only | **Yes (5 shapes)** |
| Custom builder | No | No | Yes | No | **Yes** |
| Power Breathing + retention | Yes (complex) | No | No | No | **Yes (simple)** |
| Progress tracking | Basic | Yes | No | Basic | **Yes** |
| Streaks & badges | No | No | No | No | **Yes** |
| Apple Health | No | Yes | Yes (Mindful Min) | No | **Yes** |
| Lock screen widget | No | No | Yes | No | **Yes** |
| Ads | No | Yes (free) | Yes (free) | Yes (free) | **No** |
| Price | Subscription | Subscription | Free+ads | Free+ads | **One-time $3.99** |
| Size | 168 MB | Large | Small | Small | **<30 MB** |

### Key Competitor Pain Points (= our opportunities)

1. **WHM Official** — forced subscription, overloaded with videos/courses, 3 taps to start breathing
2. **Breathwrk** — too many techniques (overwhelming), subscription model
3. **iBreathe** — only 2-3 presets, no categories, no progress tracking, no visual shapes
4. **Awesome Breathing** — only circle animation, limited techniques, no retention timer

---

## Tech Stack (same as WalkPace)

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.81 + Expo SDK 54 |
| Language | TypeScript (strict) |
| State | Zustand 5 + AsyncStorage |
| Backend | Supabase (Auth + PostgreSQL with RLS) |
| Routing | Expo Router v6 (file-based) |
| Audio | expo-audio (background breathing cues) |
| Haptics | expo-haptics |
| Notifications | expo-notifications |
| Payments | RevenueCat (one-time purchase) |
| Crash reporting | Sentry |
| i18n | i18next (53 languages) |
| Min iOS | 15.1 |

---

## 10 Breathing Techniques

### Technique Architecture

```typescript
interface BreathingTechnique {
  id: string;
  nameKey: string;              // i18n key
  descriptionKey: string;       // i18n key — short benefit description
  category: 'calm' | 'sleep' | 'focus' | 'energy' | 'advanced';

  // Pattern definition
  phases: BreathPhase[];        // one cycle of the pattern
  defaultCycles: number;        // how many cycles (0 = until user stops)
  defaultDuration?: number;     // optional fixed duration in seconds (overrides cycles)
  adjustable: boolean;          // can user change phase durations?

  // For Power Breathing only
  hasRetention?: boolean;       // enables breath hold after breathing phase
  hasRecovery?: boolean;        // enables recovery breath between rounds
  breathCount?: number;         // number of breaths instead of cycles
  roundCount?: number;          // number of rounds with retention

  // Visual
  shape: 'square' | 'triangle' | 'circle' | 'wave' | 'burst' | 'oval';
  color: string;                // accent color for this technique
  icon: string;                 // Ionicons name

  isPro: boolean;
}

interface BreathPhase {
  type: 'inhale' | 'exhale' | 'holdIn' | 'holdOut';
  duration: number;             // seconds (decimal ok: 5.5)
  instruction: string;          // i18n key: "Breathe in", "Hold", etc.
}
```

### The 10 Techniques

#### FREE (4 techniques)

**1. Box Breathing** — Focus & Calm
```
Category: focus | Shape: square | Color: #4A90D9 (blue)
Pattern: 4s inhale → 4s hold → 4s exhale → 4s hold
Cycles: 6 (~1.5 min) | Adjustable: yes (3-8s per phase)
Used by: Navy SEALs, first responders
Best for: Focus before meetings, calming anxiety
```

**2. 4-7-8 Relaxing** — Sleep & Anxiety
```
Category: sleep | Shape: triangle | Color: #7B68AE (lavender)
Pattern: 4s inhale → 7s hold → 8s exhale
Cycles: 4 (~1.5 min) | Adjustable: yes (proportional)
Developed by: Dr. Andrew Weil
Best for: Falling asleep, panic attacks
```

**3. Physiological Sigh** — Instant Stress Relief (Pro — shipped as a Pro technique, not free)
```
Category: calm | Shape: wave | Color: #7BC4A8 (green)
Pattern: 2s inhale nose → 1s second inhale (top-up) → 6s slow exhale mouth
Cycles: 10 (~1.5 min) | Adjustable: no (fixed pattern)
Research: Stanford 2023 — most effective for mood improvement
Best for: Quick stress relief in the moment
```

**4. Coherence Breathing** — Balance & HRV
```
Category: calm | Shape: circle | Color: #5BA4C8 (teal)
Pattern: 5.5s inhale → 5.5s exhale (no holds)
Duration: 5 min (default) | Adjustable: yes (4-7s per phase)
Research: Optimizes heart rate variability at ~5.5 breaths/min
Best for: Daily practice, nervous system balance
```

**5. Triangle Breathing** — Beginner Calm
```
Category: calm | Shape: triangle | Color: #4ECDC4 (mint)
Pattern: 4s inhale → 4s hold → 4s exhale (no bottom hold)
Cycles: 8 (~1.5 min) | Adjustable: yes (3-6s)
Best for: Beginners, gentle introduction to breathwork
```

#### PRO (6 techniques, including #3 above)

**6. Power Breathing** — Energy & Cold Tolerance
```
Category: advanced | Shape: burst | Color: #E85D4A (red-orange)
Pattern: 30 rapid deep breaths → exhale hold (user-controlled) → 15s recovery
Rounds: 3 | Adjustable: yes (20-50 breaths, 1-10 rounds)
Style: WHM-inspired cyclic hyperventilation
Best for: Energy boost, cold exposure prep, breath retention training
Special: retention timer with swipe-to-exhale, tracks hold times
```

**7. 4-4-6-2 Calm** — Extended Exhale Relaxation
```
Category: calm | Shape: rectangle/oval | Color: #6B9BD2 (soft blue)
Pattern: 4s inhale → 4s hold → 6s exhale → 2s hold
Cycles: 6 (~1.5 min) | Adjustable: yes
Best for: Deep relaxation, longer exhale activates parasympathetic
```

**8. Energizing Breath (Kapalabhati)** — Wake Up
```
Category: energy | Shape: burst | Color: #F5A623 (amber)
Pattern: 0.5s sharp exhale → 0.5s passive inhale (rapid cycles)
Duration: 30 sec per set, 3 sets with 30s rest | Adjustable: yes
Best for: Morning energy, clearing mind, pre-workout
```

**9. 2-to-1 Relaxing** — Deep Relaxation
```
Category: sleep | Shape: oval | Color: #9B7FBD (purple)
Pattern: 4s inhale → 8s exhale (exhale is 2x inhale)
Cycles: 8 (~1.5 min) | Adjustable: yes (proportional)
Best for: Deep relaxation, pre-sleep wind-down
```

**10. Cyclic Sighing** — Best Mood Boost
```
Category: calm | Shape: wave | Color: #5BAD7A (sage green)
Pattern: 3s inhale nose → 1.5s second inhale (top-up) → 8s slow exhale mouth
Duration: 5 min | Adjustable: no (research protocol)
Research: Stanford 2023 — greatest mood improvement vs box breathing & meditation
Best for: Daily mood enhancement, anxiety reduction
```

### Custom Technique Builder (PRO)

Users can create their own technique:
- Name it
- Set phases: inhale / hold-in / exhale / hold-out (any combination)
- Set duration per phase (1-15 seconds)
- Set number of cycles or total duration
- Choose visual shape
- Choose color
- Save to library

---

## Timer State Machine

### Universal Timer (for techniques 1-5, 7, 9)
```
READY → INHALE → [HOLD_IN →] EXHALE → [HOLD_OUT →] → repeat cycles → DONE
         ↕ PAUSE
         STOP → READY
```

### Power Breathing Timer (technique 6)
```
READY → BREATHING (rapid) → RETENTION (user-controlled) → RECOVERY → [repeat rounds] → DONE
         ↕ PAUSE              swipe to end
         STOP → READY
```

### Kapalabhati Timer (technique 8)
```
READY → RAPID_SET (30s) → REST (30s) → repeat sets → DONE
         ↕ PAUSE
         STOP → READY
```

---

## Screens

### 1. Onboarding (first launch only)

**Screen 1 — Welcome**
- App name + animated breathing shape morphing (square → circle → triangle)
- "10 breathing techniques for every moment"
- "Get Started" button

**Screen 2 — Choose Your Goal**
- 4 cards: Calm / Sleep / Focus / Energy
- User picks primary goal → we highlight recommended technique
- Skip option

**Screen 3 — Safety Warning**
- "Always practice sitting or lying down"
- "Never practice in water, while driving, or standing"
- "Stop immediately if you feel dizzy or unwell"
- "Power Breathing is for experienced practitioners"
- Checkbox: "I understand" → enables Continue
- Required by Apple for breathing/health apps

**Screen 4 — Try It**
- Launch recommended technique immediately (1 min quick session)
- Or "Skip to app"

### 2. Home / Techniques (main tab)

**Layout: technique cards grouped by category**

```
[Search / Filter bar]

CALM                          [see all →]
┌─────────┐ ┌─────────┐ ┌─────────┐
│ ■ Box    │ │ △ Tri   │ │ ○ Coher │
│ 4-4-4-4  │ │ 4-4-4   │ │ 5.5-5.5 │
│ Focus    │ │ Beginner│ │ Balance │
└─────────┘ └─────────┘ └─────────┘

SLEEP                         [see all →]
┌─────────┐ ┌─────────┐
│ △ 4-7-8  │ │ ◯ 2:1   │  🔒
│ Sleep    │ │ Relax   │
└─────────┘ └─────────┘

FOCUS                         [see all →]
┌─────────┐
│ ■ Box    │
│ 4-4-4-4  │
└─────────┘

ENERGY                        [see all →]
┌─────────┐
│ ⚡ Kapal  │  🔒
│ Wake up  │
└─────────┘

ADVANCED                      [see all →]
┌─────────┐ ┌─────────┐
│ 💨 Power │ │ 〰 Cyclic│  🔒
│ Retain   │ │ Sighing │
└─────────┘ └─────────┘

[+ Custom]  🔒
```

**Technique card tap → Technique Detail → Start**

### 3. Technique Detail (pre-session)

- Technique name + description
- Visual shape preview (animated)
- Pattern breakdown: "Inhale 4s → Hold 4s → Exhale 4s → Hold 4s"
- Duration: "~1:30 (6 cycles)"
- Adjust settings (cycles, phase durations if adjustable)
- "Start" button
- "Learn more" expandable: science behind the technique

### 4. Active Session Screen

**Standard techniques (box, 4-7-8, coherence, etc.):**

- Large animated shape (square expands sides, triangle grows, circle pulses)
- Current phase label: "Breathe In" / "Hold" / "Breathe Out"
- Phase timer countdown: "3..."
- Cycle counter: "4 / 6"
- Total elapsed time
- Pause / Stop buttons (bottom)

**Power Breathing:**

- **Breathing phase:** Expanding/contracting bubble + breath counter "12 / 30"
- **Retention phase:** Full-screen dark, large timer counting up, "Swipe up to exhale"
- **Recovery phase:** "Breathe in deeply and hold" + 15s countdown
- Round indicator: "Round 1 of 3"

**Kapalabhati:**

- Rapid pulse animation
- Set counter: "Set 2 of 3"
- Breath counter within set
- Rest period countdown between sets

### 5. Summary (after session)

- Technique used + shape icon
- Duration
- Cycles / rounds completed
- For Power Breathing: retention times per round (bar chart), best/avg
- Personal best indicator
- Mood check: "How do you feel?" → Calm / Energized / Focused / Sleepy (optional, 1 tap)
- "Done" / "Repeat" buttons
- Share button
- Celebration animation for personal bests

### 6. History (tab)

**Free tier: last 7 days**
**Pro tier: full history**

- Calendar view (reuse from WalkPace)
- Each day shows: session count, techniques used (colored dots)
- Streak counter (days in a row)
- Tap day → session list for that day

**Today Stats (top):**
- Total minutes today
- Sessions today
- Current streak

**Progress (Pro):**
- Line graph: best retention over time (Power Breathing)
- Sessions per week bar chart
- Most used technique
- Mood trends (if tracked)

### 7. Settings (tab)

**Feedback**
- Sound: On/Off
- Sound style: Tone / Bell / Nature / Tibetan Bowl
- Haptics: On/Off
- Voice guidance: Off / Phase names / Countdown

**Appearance**
- Color theme (reuse WalkPace theme system)
- Dark mode: System / Light / Dark
- Text size: Default / Large

**Reminders**
- Daily reminder: On/Off
- Time picker
- Days of week
- Custom message

**Apple Health**
- Sync Mindful Minutes: On/Off

**General**
- Language (53 languages)
- About / Privacy Policy / Terms
- Restore purchases
- Rate app
- Contact support

---

## Data Models

### BreathingSession
```typescript
interface BreathingSession {
  id: string;                    // uuid
  userId: string;
  date: string;                  // ISO date
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
```

### UserSettings
```typescript
interface UserSettings {
  // Per-technique overrides
  techniqueOverrides: Record<string, {
    cycles?: number;
    phaseDurations?: number[];   // override default durations
    rounds?: number;             // Power Breathing
    breathsPerRound?: number;    // Power Breathing
    recoveryDuration?: number;   // Power Breathing
  }>;

  // Custom techniques
  customTechniques: BreathingTechnique[];

  // Feedback
  soundEnabled: boolean;
  soundStyle: 'tone' | 'bell' | 'nature' | 'bowl';
  hapticsEnabled: boolean;
  voiceGuidance: 'off' | 'phases' | 'countdown';

  // Appearance
  colorThemeId: string;
  darkMode: 'system' | 'light' | 'dark';
  textSize: 'default' | 'large';

  // Apple Health
  healthSyncEnabled: boolean;

  // Reminder
  reminderEnabled: boolean;
  reminderTime: string;          // "08:00"
  reminderDays: number[];        // [0,1,2,3,4,5,6]

  isPro: boolean;
}
```

### UserStats
```typescript
interface UserStats {
  totalSessions: number;
  totalMinutes: number;
  totalBreaths: number;
  currentStreak: number;
  longestStreak: number;
  bestRetention: number;         // Power Breathing all-time best
  avgRetention: number;
  lastSessionDate: string;
  favoritesTechniqueId: string;  // most used
  sessionsPerTechnique: Record<string, number>;
}
```

---

## Supabase Tables

| Table | PK | Purpose |
|-------|-----|---------|
| `user_sessions` | `(user_id, id)` | Breathing sessions |
| `user_stats` | `user_id` | Aggregated stats |
| `user_settings` | `user_id` | All settings + custom techniques |
| `user_badges` | `(user_id, badge_id)` | Badge unlock tracking |

All tables have RLS: `auth.uid() = user_id`.

---

## Badges / Achievements

| Badge | Condition | Icon |
|-------|-----------|------|
| First Breath | Complete first session | Wind |
| Explorer | Try 5 different techniques | Compass |
| Technique Master | Try all 10 techniques | Trophy |
| Breathe Easy | 1 min retention (Power Breathing) | Feather |
| Iron Lungs | 2 min retention | Shield |
| Superhuman | 3 min retention | Lightning |
| Week Warrior | 7-day streak | Fire |
| Month Master | 30-day streak | Crown |
| Century | 100 total sessions | Star |
| Zen Master | 1000 total minutes | Lotus |
| Early Bird | Session before 7 AM | Sun |
| Night Owl | Session after 10 PM | Moon |
| Custom Creator | Create a custom technique | Wrench |
| Mood Tracker | Log mood for 7 sessions | Heart |

---

## Monetization

### Free (generous — no ads)
- 4 techniques (Box, 4-7-8, Coherence, Triangle)
- Unlimited sessions & cycles
- 7 days history
- Streaks
- Basic stats
- 1 color theme
- Apple Health sync

### Pro — "BreathFlow Pro" entitlement (RevenueCat)
Shipped as: **Weekly** ($2.99, 3-day trial) / **Annual** ($14.99, 7-day trial, default) /
**Lifetime** ($19.99 one-time). See `CLAUDE.md` → Monetization for the current source of truth
— pricing lives in App Store Connect / RevenueCat, not here.
- All 10 techniques (including Physiological Sigh, #3 above)
- Custom technique builder
- Full history + progress charts
- All color themes
- All badges
- Mood tracking
- Export data

---

## Design System

Calm, focused, breathable. Cool tones contrast with WalkPace's warm palette.

| Token | Light | Dark |
|-------|-------|------|
| Primary | `#4A90D9` (calm blue) | same |
| Accent | `#7BC4A8` (soft green) | same |
| Background | `#F0F4F8` (cool gray) | `#0F1419` |
| Surface | `#FFFFFF` | `#1A2332` |
| Card | `#F8FAFC` | `#243040` |
| Text | `#1A2332` (dark navy) | `#F0F4F8` |
| TextSecondary | `#64748B` | `#94A3B8` |
| Border | `#E2E8F0` | `#334155` |

### Phase Colors
| Phase | Color |
|-------|-------|
| Inhale | `#4A90D9` (blue) |
| Hold In | `#7B68AE` (purple) |
| Exhale | `#7BC4A8` (green) |
| Hold Out | `#F5A623` (amber) |
| Retention | `#1A2332` (near black) |
| Recovery | `#5BAD7A` (sage) |

### Visual Shapes
- **Square** (Box Breathing): 4 sides expand sequentially, current side highlighted
- **Triangle**: 3 sides, current side glows
- **Circle** (Coherence): smooth expansion/contraction, glowing ring
- **Wave** (Sighing): sine wave animation flowing left to right
- **Burst** (Power/Kapalabhati): rapid pulsing sun-like shape
- **Oval** (2-to-1, 4-4-6-2): elongated circle, asymmetric breathing

### Typography
- Timer numbers: SF Mono or system monospace, large
- Phase label: SF Pro Display, medium weight
- Body: SF Pro Text

---

## Reuse from WalkPace

| Component/Module | Reuse level | Changes needed |
|-----------------|-------------|----------------|
| Project scaffold (Expo + Router) | 100% | New app name/bundle |
| Zustand store pattern | 90% | New fields, same structure |
| AsyncStorage persistence | 100% | None |
| Supabase client + auth flow | 100% | New Supabase project |
| Anonymous → Apple Sign-In upgrade | 100% | None |
| Sync service (push/pull) | 90% | Adapt table names |
| i18n setup + 53 locale files | 80% | New translation keys |
| Settings screen structure | 70% | Different options |
| History screen + calendar | 70% | Technique dots instead of walk data |
| Badge system | 80% | New badge definitions |
| Color theme system | 100% | New default palette |
| Notification system | 90% | Different notification content |
| Background audio keepalive | 100% | Breathing sounds |
| RevenueCat integration | 90% | One-time purchase config |
| Sentry integration | 100% | New DSN |
| App config / build scripts | 90% | New bundle ID |
| Privacy policy template | 80% | Update for breathing app |
| Onboarding flow structure | 70% | New content + goal selection |
| Summary/confetti screen | 60% | Technique-specific stats |

**Estimated reuse: ~65% | New code: ~35%**

### New code needed:
- Technique engine (universal phase timer)
- Breathing shape animations (square, triangle, circle, wave, burst, oval)
- Power Breathing retention timer (swipe-to-exhale)
- Kapalabhati rapid breathing mode
- Technique cards & detail screen
- Custom technique builder UI
- Retention time bar chart
- Progress line chart
- Mood tracking UI
- Sound assets (inhale/exhale tones, bells, bowls)

---

## ASO Strategy

**App Name:** BreathFlow — Breathing Exercises

**Subtitle:** Box Breathing, 4-7-8 & More

**Keywords:** box breathing, breathing exercises, breathwork timer, 4-7-8 breathing, breath hold, anxiety relief, stress relief, meditation breathing, sleep breathing, Navy SEAL breathing

**Category:** Health & Fitness

**Screenshots (5):**
1. Home screen with technique cards categorized by goal
2. Box Breathing with animated square shape
3. Power Breathing retention timer (dark, dramatic)
4. Session summary with retention chart
5. "No subscription. No ads. Just breathe." badge

**App Store Description highlights:**
- "10 science-backed breathing techniques"
- "Box Breathing (used by Navy SEALs)"
- "4-7-8 method (recommended by Dr. Andrew Weil)"
- "Physiological Sigh (Stanford research)"
- "No subscription. One-time purchase."

---

## MVP Phases

| Phase | Scope | Priority |
|-------|-------|----------|
| 1 | Project setup, scaffold from WalkPace, new Supabase | P0 |
| 2 | Technique data model + 10 technique definitions | P0 |
| 3 | Universal phase timer engine | P0 |
| 4 | Home screen: technique cards by category | P0 |
| 5 | Active session: breathing animations (circle first, then others) | P0 |
| 6 | Power Breathing: rapid breathing + retention + recovery | P0 |
| 7 | Summary screen | P0 |
| 8 | History + calendar + stats | P1 |
| 9 | Settings (sound, haptics, appearance) | P1 |
| 10 | Onboarding + safety screen | P1 |
| 11 | Sound assets + background audio | P1 |
| 12 | RevenueCat (one-time purchase) | P1 |
| 13 | Badges | P2 |
| 14 | Custom technique builder | P2 |
| 15 | Mood tracking | P2 |
| 16 | Apple Health (Mindful Minutes) | P2 |
| 17 | Lock screen widget | P2 |
| 18 | i18n (53 languages) | P1 |
| 19 | Polish, test, submit to App Store | P0 |

---

## Open Questions

1. **App name** — BreathFlow? Need to verify no App Store conflicts
2. **Apple Watch** — v2 feature? Retention timer on wrist would be great
3. **Sound design** — custom sounds or royalty-free? Tibetan bowl popular in reviews
4. **Haptic patterns** — per-phase or per-breath? Different per technique?
5. **Apple Health** — write Mindful Minutes only, or also read heart rate?
6. **Landscape mode** — useful for bedtime techniques?

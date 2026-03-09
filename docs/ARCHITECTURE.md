# WalkPace Architecture

> This document is the **single source of truth** for WalkPace system architecture.
> C4 diagrams are maintained as PlantUML code in `docs/architecture/` and rendered via `make docs`.

## C4 Model

### Level 1 — System Context

Shows WalkPace and its external dependencies.

**Diagram**: [context.puml](architecture/context.puml) | [Rendered SVG](rendered/context.svg)

| System | Role | Protocol |
|--------|------|----------|
| Supabase | Auth + cloud sync (PostgreSQL + RLS) | HTTPS / REST |
| Apple HealthKit | Write workout sessions | Native API |
| Apple ID | Sign in with Apple (optional) | OAuth / ID Token |
| Sentry | Crash reporting | HTTPS |

### Level 2 — Containers

Shows the internal building blocks of the mobile app.

**Diagram**: [containers.puml](architecture/containers.puml) | [Rendered SVG](rendered/containers.svg)

| Container | Technology | Responsibility |
|-----------|-----------|----------------|
| Screens | Expo Router v6 | File-based routing: Timer, History, Settings, Onboarding, Summary, Paywall |
| UI Components | React Native + SVG | ProgressRing, CalendarHeatmap, BadgeGrid, SessionCard, BadgeUnlockModal |
| State Layer | Zustand 5 | 6 stores: timer, sessions, settings, badges, profile, auth |
| Local Persistence | AsyncStorage + SecureStore | Offline-first data; auth tokens in iOS Keychain |
| Sync Engine | syncService.ts | Push-on-write, pull-on-foreground, entity-specific merge |
| Hooks & Services | React Hooks | Audio/haptic feedback, sync triggers, color scheme |
| i18n | i18next | 53 locales with device language auto-detection |

### Level 3 — Components (State & Sync)

Detailed view of state stores and sync engine interactions.

**Diagram**: [components.puml](architecture/components.puml) | [Rendered SVG](rendered/components.svg)

## Key Architecture Decisions

All decisions are documented as ADRs in [docs/decisions/](decisions/):

| ADR | Decision | Status |
|-----|----------|--------|
| [001](decisions/001-zustand-over-redux.md) | Zustand over Redux | Accepted |
| [002](decisions/002-offline-first-sync.md) | Offline-first with Supabase backup | Accepted |
| [003](decisions/003-anonymous-auth-first.md) | Anonymous auth first, optional Apple | Accepted |
| [004](decisions/004-expo-router-file-based.md) | Expo Router file-based routing | Accepted |

## Data Flow

```
User Action
    │
    ▼
Screen (app/*.tsx)
    │
    ├─ dispatch ──→ Zustand Store ──→ AsyncStorage (persist)
    │                    │
    │                    └──→ syncService.push*() ──→ Supabase (fire & forget)
    │
    └─ useSync() hook
         │
         ├─ onForeground ──→ syncService.pullAndMerge() ──→ Supabase
         │                         │
         │                         └──→ Merge into Zustand stores
         └─ onLaunch ──→ same
```

## Sync Merge Strategies

| Entity | Strategy | Rationale |
|--------|----------|-----------|
| Sessions | Union by ID | Append-only, no edits |
| Stats | `max()` per field | Monotonically increasing |
| Settings | Remote wins | Except `isPro` (never downgrade) |
| Badges | Union, earliest `unlockedAt` | Achievement timestamps are immutable |
| Profile | Remote wins | Last device wins |

## Timer State Machine

```
READY ──[START]──→ WARM_UP? ──→ FAST ──→ SLOW ──→ (round < 5?) ──→ FAST
                                                         │
                                                    (round = 5)
                                                         │
                                                         ▼
                                                    COOL_DOWN? ──→ DONE
```

- **PAUSE / RESUME**: available during FAST, SLOW, WARM_UP, COOL_DOWN
- **STOP**: confirmation alert → READY (resets all counters)
- **Countdown beeps**: last 5 seconds of each phase
- **Audio + Haptics**: on every phase transition

## Updating This Document

When making architectural changes:

1. Update the relevant `.puml` file in `docs/architecture/`
2. Run `make docs` to re-render SVGs
3. Update this file if containers or data flow changed
4. Create a new ADR in `docs/decisions/` for significant decisions
5. Update `CLAUDE.md` if the change affects AI agent context

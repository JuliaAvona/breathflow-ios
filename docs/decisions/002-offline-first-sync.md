# ADR-002: Offline-First Architecture with Supabase Cloud Backup

## Status
Accepted

## Context
Walking sessions happen outdoors where connectivity is unreliable. The app must:
1. Work fully offline (timer, history, badges)
2. Sync data across devices when connectivity is available
3. Handle conflict resolution when the same user has data on multiple devices

Options considered:
- **Online-first with cache** — requires connectivity for core features (rejected)
- **Firebase Realtime / Firestore** — offline support built-in, but vendor lock-in and pricing concerns
- **Supabase + local-first** — open source, PostgreSQL, manual sync (chosen)

## Decision
Use **AsyncStorage as source of truth** with Supabase as cloud backup.

Sync strategy:
- **Push**: after every local write (fire-and-forget, non-blocking)
- **Pull**: on app launch and on foreground resume
- **Merge strategies** per entity type:
  - Sessions: union by ID (append-only, no edits)
  - Stats: `max()` of each numeric field
  - Settings: remote wins (`isPro` is authoritative from RevenueCat on app launch)
  - Badges: union, keep earliest `unlockedAt`
  - Profile: remote wins

## Consequences

### Positive
- App works instantly on launch, no loading spinners waiting for network
- Zero data loss during walks (timer state is local)
- Simple merge: sessions are append-only, stats are monotonic
- Supabase free tier is sufficient for MVP scale

### Negative
- Manual sync code in `syncService.ts` (~300 lines) needs maintenance
- No real-time collaboration (not needed for single-user app)
- Edge case: if user walks on two devices offline simultaneously, stats may double-count (acceptable for MVP)

### Risks
- Supabase schema changes require coordinated migration of sync code

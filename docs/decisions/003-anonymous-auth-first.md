# ADR-003: Anonymous Auth First, Optional Apple Sign-In

## Status
Accepted

## Context
The app needs authentication for cloud sync (Supabase RLS requires `auth.uid()`). However, forcing sign-up before first use creates friction and kills conversion — especially for a health/fitness app where users want to try the timer immediately.

Options considered:
- **No auth, device-only** — no cloud sync possible (rejected)
- **Required sign-up** — high friction, low conversion (rejected)
- **Anonymous-first with optional upgrade** — zero friction, data preserved on upgrade (chosen)

## Decision
1. On first launch, silently call `supabase.auth.signInAnonymously()`
2. User sees no auth UI — the app just works
3. In Settings, user can optionally "Sign in with Apple"
4. Apple sign-in **links** to the existing anonymous account via `linkIdentity()`
5. All data (sessions, badges, stats) is preserved — same `user_id`
6. If link fails, fall back to direct sign-in (new user, data stays local)

## Consequences

### Positive
- Zero friction: user starts walking within seconds of install
- Cloud sync works immediately (anonymous user has a real `user_id`)
- Seamless upgrade: "Sign in with Apple" preserves all progress
- Supabase RLS works identically for anonymous and identified users

### Negative
- Anonymous users who uninstall lose cloud access (no way to recover without Apple sign-in)
- Supabase accumulates anonymous user rows that may never be claimed
- Token management: anonymous session tokens stored in SecureStore must survive app updates

### Risks
- Supabase may rate-limit anonymous sign-ups if app goes viral (mitigated: one per install)

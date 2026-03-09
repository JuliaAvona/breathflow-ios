# ADR-004: Expo Router with File-Based Routing

## Status
Accepted

## Context
The app needs navigation between screens: onboarding flow, bottom tabs (Timer, History, Settings), modal screens (Summary, Paywall), and static pages (Terms, Privacy).

Options considered:
- **React Navigation (manual)** — imperative API, manual route definitions
- **Expo Router v6** — file-based routing (like Next.js), built on React Navigation
- **Custom navigation** — too much work (rejected)

## Decision
Use **Expo Router v6** with file-based routing in the `app/` directory.

Route structure:
```
app/
├── _layout.tsx          # Root layout (audio config, auth hydration, sync)
├── index.tsx            # Entry → redirect to onboarding or tabs
├── summary.tsx          # Modal: session summary
├── paywall.tsx          # Modal: PRO subscription
├── terms.tsx            # Static: terms of service
├── privacy.tsx          # Static: privacy policy
├── (tabs)/
│   ├── _layout.tsx      # Tab navigator config
│   ├── index.tsx        # Timer screen
│   ├── history.tsx      # Stats + calendar + badges
│   └── settings.tsx     # Settings + account
└── onboarding/
    ├── _layout.tsx      # Onboarding stack
    └── index.tsx        # Multi-page carousel
```

## Consequences

### Positive
- Route structure is visible in the file tree — AI agents can navigate instantly
- Convention over configuration: adding a screen = adding a file
- Deep linking works out of the box (via `scheme: walkpace` in app.json)
- Typed routes via TypeScript

### Negative
- Less flexible than manual React Navigation for complex navigation patterns
- Layout files (`_layout.tsx`) can accumulate initialization logic (auth, audio, sync)
- Harder to unit test navigation (need to mock Expo Router)

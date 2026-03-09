# ADR-001: Zustand over Redux for State Management

## Status
Accepted

## Context
The app needs client-side state management for 6 domains: timer, sessions, settings, badges, profile, auth. Options considered:
- **Redux Toolkit** — industry standard, verbose, large boilerplate
- **MobX** — observable-based, magic re-renders
- **Zustand** — minimal API, hook-based, no providers, no boilerplate
- **React Context** — built-in, but re-renders entire tree on any change

The app is a solo-developer project managed by AI agents. Minimizing boilerplate and cognitive overhead is critical.

## Decision
Use **Zustand 5** for all state management. Each domain gets its own store (`create<T>((set, get) => ({...}))`). Stores are independent — no single root store.

## Consequences

### Positive
- Zero boilerplate: no providers, no reducers, no action creators
- Each store is ~50-100 lines, easy for AI agents to understand and modify
- Direct `get()` access from outside React (e.g., `syncService.ts`)
- Built-in `persist` middleware compatible with AsyncStorage
- Bundle size: ~2KB vs ~40KB for Redux Toolkit

### Negative
- No Redux DevTools (acceptable for mobile — use React Native Debugger instead)
- Less ecosystem tooling compared to Redux
- Team members unfamiliar with Zustand need to learn the API (mitigated: API is minimal)

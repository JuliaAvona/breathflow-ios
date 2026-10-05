// Safe wrapper for expo-store-review
// Works in production builds; no-op in Expo Go where native module is unavailable

import { AppState } from 'react-native';

let StoreReview: typeof import('expo-store-review') | null = null;

try {
  StoreReview = require('expo-store-review');
} catch {
  // Native module not available (Expo Go / dev)
}

export async function requestStoreReview(): Promise<void> {
  // iOS can't present the prompt without a foreground window scene; the
  // caller fires on a delay, so the user may have left the app by now.
  if (AppState.currentState !== 'active') return;
  try {
    if (StoreReview && (await StoreReview.isAvailableAsync())) {
      // Awaited so a rejection lands in the catch below instead of
      // escaping as an unhandled promise rejection.
      await StoreReview.requestReview();
    }
  } catch {
    // silently ignore
  }
}

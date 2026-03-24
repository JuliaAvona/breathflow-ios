// Safe wrapper for expo-store-review
// Works in production builds; no-op in Expo Go where native module is unavailable

let StoreReview: typeof import('expo-store-review') | null = null;

try {
  StoreReview = require('expo-store-review');
} catch {
  // Native module not available (Expo Go / dev)
}

export async function requestStoreReview(): Promise<void> {
  try {
    if (StoreReview && (await StoreReview.isAvailableAsync())) {
      StoreReview.requestReview();
    }
  } catch {
    // silently ignore
  }
}

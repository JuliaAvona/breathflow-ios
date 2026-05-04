/**
 * Meta (Facebook) App Events for ad campaign optimization.
 * Initializes the SDK, requests ATT permission on iOS, and exposes
 * helpers to log key events that drive Meta ad delivery and bidding.
 */

import { Platform } from 'react-native';
import {
  requestTrackingPermissionsAsync,
  getTrackingPermissionsAsync,
} from 'expo-tracking-transparency';

let Settings: any = null;
let AppEventsLogger: any = null;

try {
  const fbsdk = require('react-native-fbsdk-next');
  Settings = fbsdk.Settings;
  AppEventsLogger = fbsdk.AppEventsLogger;
} catch {
  // SDK not available (e.g. Expo Go) — events become no-ops.
}

let initialized = false;

/**
 * Initialize Meta SDK and request App Tracking Transparency permission.
 * Must be called after the first frame is shown so the ATT prompt
 * doesn't appear over a black launch screen. Auto-init is disabled in
 * Info.plist; we drive initialization manually here only after the user
 * has answered the ATT prompt, to comply with Apple's policy.
 */
export async function initFacebookSdk(): Promise<void> {
  if (initialized || !Settings) return;
  initialized = true;

  try {
    if (Platform.OS === 'ios') {
      const current = await getTrackingPermissionsAsync();
      let status = current.status;
      if (status === 'undetermined') {
        const result = await requestTrackingPermissionsAsync();
        status = result.status;
      }
      Settings.setAdvertiserTrackingEnabled(status === 'granted');
    } else {
      Settings.setAdvertiserTrackingEnabled(true);
    }

    Settings.setAutoLogAppEventsEnabled(true);
    Settings.setAdvertiserIDCollectionEnabled(true);
    Settings.initializeSDK();
    AppEventsLogger?.logEvent('app_launched');
  } catch {
    // Swallow — SDK init must never crash the app.
  }
}

/** User completed onboarding (Meta standard event). */
export function logCompletedRegistration(method?: string): void {
  AppEventsLogger?.logEvent('fb_mobile_complete_registration', {
    fb_registration_method: method ?? 'onboarding',
  });
}

/** User started a breathing session. */
export function logSessionStarted(techniqueId: string): void {
  AppEventsLogger?.logEvent('session_started', { technique: techniqueId });
}

/** User completed a breathing session. */
export function logSessionCompleted(techniqueId: string, durationSec: number): void {
  AppEventsLogger?.logEvent('session_completed', {
    technique: techniqueId,
    duration: durationSec,
  });
}

/** User opened paywall / picked a plan. */
export function logInitiatedCheckout(plan: string, price: number, currency = 'USD'): void {
  AppEventsLogger?.logEvent('fb_mobile_initiated_checkout', price, {
    fb_content_type: plan,
    fb_currency: currency,
  });
}

/** User completed purchase (Meta standard purchase event). */
export function logPurchase(price: number, plan: string, currency = 'USD'): void {
  if (!AppEventsLogger) return;
  AppEventsLogger.logPurchase(price, currency, {
    fb_content_id: plan,
    fb_content_type: plan,
  });
}

/** User started a free trial. */
export function logStartTrial(plan: string, price: number, currency = 'USD'): void {
  AppEventsLogger?.logEvent('StartTrial', price, {
    fb_content_id: plan,
    fb_currency: currency,
  });
}

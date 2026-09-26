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
 * Initialize Meta SDK without prompting for ATT. We init with previously
 * granted state (if any) so events can flow immediately; the ATT prompt
 * is deferred to `requestAttPermission()` after the user has seen the
 * app's value (post-onboarding) to maximize opt-in rate.
 */
export async function initFacebookSdk(): Promise<void> {
  if (initialized || !Settings) return;
  initialized = true;

  try {
    if (Platform.OS === 'ios') {
      const current = await getTrackingPermissionsAsync();
      Settings.setAdvertiserTrackingEnabled(current.status === 'granted');
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

/**
 * Request App Tracking Transparency permission. Should be called after
 * onboarding so the user has context for why we ask.
 */
export async function requestAttPermission(): Promise<void> {
  if (Platform.OS !== 'ios' || !Settings) return;
  try {
    const current = await getTrackingPermissionsAsync();
    if (current.status !== 'undetermined') return;
    const result = await requestTrackingPermissionsAsync();
    Settings.setAdvertiserTrackingEnabled(result.status === 'granted');
  } catch {
    // Non-critical.
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

/** User completed purchase (Meta standard purchase event + custom event for redundancy). */
export function logPurchase(price: number, plan: string, currency = 'USD'): void {
  if (!AppEventsLogger) return;
  AppEventsLogger.logPurchase(price, currency, {
    fb_content_id: plan,
    fb_content_type: plan,
  });
  AppEventsLogger.logEvent(plan === 'lifetime' ? 'Purchase' : 'Subscribe', price, {
    fb_content_id: plan,
    fb_currency: currency,
  });
}

/** User started a free trial. */
export function logStartTrial(plan: string, price: number, currency = 'USD'): void {
  AppEventsLogger?.logEvent('StartTrial', price, {
    fb_content_id: plan,
    fb_currency: currency,
  });
}

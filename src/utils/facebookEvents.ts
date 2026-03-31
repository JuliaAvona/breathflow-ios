/**
 * Facebook App Events for ad campaign optimization.
 * Tracks key events so Facebook can optimize ad delivery.
 */

let AppEventsLogger: any = null;

try {
  const fbsdk = require('react-native-fbsdk-next');
  AppEventsLogger = fbsdk.AppEventsLogger;
} catch {
  // Not available
}

/** User completed onboarding */
export function logCompletedRegistration(): void {
  AppEventsLogger?.logEvent('fb_mobile_complete_registration');
}

/** User started a breathing session */
export function logSessionStarted(techniqueId: string): void {
  AppEventsLogger?.logEvent('session_started', { technique: techniqueId });
}

/** User completed a breathing session */
export function logSessionCompleted(techniqueId: string, durationSec: number): void {
  AppEventsLogger?.logEvent('session_completed', {
    technique: techniqueId,
    duration: durationSec,
  });
}

/** User initiated purchase */
export function logInitiatedCheckout(plan: string, price: number): void {
  AppEventsLogger?.logEvent('fb_mobile_initiated_checkout', price, {
    fb_content_type: plan,
    fb_currency: 'USD',
  });
}

/** User completed purchase */
export function logPurchase(price: number, plan: string): void {
  AppEventsLogger?.logPurchase(price, 'USD', { plan });
}

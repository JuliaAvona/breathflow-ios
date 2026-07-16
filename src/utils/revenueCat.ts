import Purchases, {
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
} from 'react-native-purchases';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_KEY = Constants.expoConfig?.extra?.revenueCatApiKey ?? '';
const ENTITLEMENT_ID = 'BreathFlow Pro';

let isConfigured = false;

export async function initRevenueCat(): Promise<void> {
  if (!API_KEY || isConfigured) return;
  try {
    Purchases.configure({
      apiKey: API_KEY,
      appUserID: null, // anonymous until identified
    });
    isConfigured = true;
  } catch {
    // Config failures (e.g. no network) should not crash the app.
  }
}

/** Link RevenueCat user to Supabase user ID for cross-device restore */
export async function identifyUser(userId: string): Promise<void> {
  if (!isConfigured) return;
  await Purchases.logIn(userId);
}

/** Reset to anonymous after sign-out */
export async function logOutRevenueCat(): Promise<void> {
  if (!isConfigured) return;
  await Purchases.logOut();
}

/** Fetch available offerings (packages) */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  if (!isConfigured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch {
    return null;
  }
}

/** Purchase a specific package */
export async function purchasePackage(
  pkg: PurchasesPackage,
): Promise<{ isPro: boolean }> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return { isPro: checkProEntitlement(customerInfo) };
}

/** Restore previous purchases */
export async function restorePurchases(): Promise<{ isPro: boolean }> {
  const customerInfo = await Purchases.restorePurchases();
  return { isPro: checkProEntitlement(customerInfo) };
}

/**
 * Check if the user has an active Pro entitlement.
 * Returns `null` (not `false`) when the check couldn't actually be performed
 * (RevenueCat not configured, network error) — callers must treat that as
 * "unknown, leave local Pro state alone", not as "confirmed not Pro", or a
 * transient network blip would strip Pro access from a paying subscriber.
 */
export async function checkSubscriptionStatus(): Promise<boolean | null> {
  if (!isConfigured) return null;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return checkProEntitlement(customerInfo);
  } catch {
    return null;
  }
}

function checkProEntitlement(info: CustomerInfo): boolean {
  return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

export { Purchases, type PurchasesPackage, type PurchasesOffering };

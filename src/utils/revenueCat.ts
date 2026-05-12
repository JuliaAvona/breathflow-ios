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

/** Check if user has active pro entitlement */
export async function checkSubscriptionStatus(): Promise<boolean> {
  if (!isConfigured) return false;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return checkProEntitlement(customerInfo);
  } catch {
    return false;
  }
}

function checkProEntitlement(info: CustomerInfo): boolean {
  if (info.entitlements.active[ENTITLEMENT_ID] !== undefined) return true;
  return Object.keys(info.entitlements.active).length > 0;
}

export { Purchases, type PurchasesPackage, type PurchasesOffering };

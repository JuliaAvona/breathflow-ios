import Purchases from 'react-native-purchases';
import type { PurchasesPackage } from '../revenueCat';
import {
  initRevenueCat,
  checkSubscriptionStatus,
  purchasePackage,
  restorePurchases,
} from '../revenueCat';

const mockedConfigure = Purchases.configure as jest.Mock;
const mockedGetCustomerInfo = Purchases.getCustomerInfo as jest.Mock;
const mockedPurchasePackage = Purchases.purchasePackage as jest.Mock;
const mockedRestorePurchases = Purchases.restorePurchases as jest.Mock;

const withActiveEntitlement = (id: string) => ({
  entitlements: { active: { [id]: { identifier: id } } },
});

describe('revenueCat', () => {
  it('configures Purchases with the API key from app config on init', async () => {
    await initRevenueCat();
    expect(mockedConfigure).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'test-revenuecat-key' }),
    );
  });

  describe('entitlement checks (after init)', () => {
    it('grants Pro when the "BreathFlow Pro" entitlement is active', async () => {
      mockedGetCustomerInfo.mockResolvedValueOnce(withActiveEntitlement('BreathFlow Pro'));
      expect(await checkSubscriptionStatus()).toBe(true);
    });

    it('does not grant Pro for an unrelated active entitlement', async () => {
      // Regression test: checkProEntitlement used to fall back to "any active
      // entitlement grants Pro", which would make this incorrectly resolve true.
      mockedGetCustomerInfo.mockResolvedValueOnce(withActiveEntitlement('some_other_entitlement'));
      expect(await checkSubscriptionStatus()).toBe(false);
    });

    it('does not grant Pro when there are no active entitlements', async () => {
      mockedGetCustomerInfo.mockResolvedValueOnce({ entitlements: { active: {} } });
      expect(await checkSubscriptionStatus()).toBe(false);
    });

    it('returns false when getCustomerInfo rejects', async () => {
      mockedGetCustomerInfo.mockRejectedValueOnce(new Error('network error'));
      expect(await checkSubscriptionStatus()).toBe(false);
    });

    it('purchasePackage resolves isPro from the purchase result', async () => {
      mockedPurchasePackage.mockResolvedValueOnce({
        customerInfo: withActiveEntitlement('BreathFlow Pro'),
      });
      const result = await purchasePackage({} as PurchasesPackage);
      expect(result).toEqual({ isPro: true });
    });

    it('restorePurchases resolves isPro from the restored entitlements', async () => {
      mockedRestorePurchases.mockResolvedValueOnce(withActiveEntitlement('some_other_entitlement'));
      const result = await restorePurchases();
      expect(result).toEqual({ isPro: false });
    });
  });
});

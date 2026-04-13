import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../src/hooks/useColorScheme';
import { SPACING, FONT_SIZE, FONTS } from '../src/constants';
import { useSettingsStore } from '../src/store';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  type PurchasesOffering,
  type PurchasesPackage,
} from '../src/utils/revenueCat';

type PlanType = 'weekly' | 'annual' | 'lifetime';

const FEATURES = [
  { icon: 'flash' as const, color: '#FF6B6B', bg: 'rgba(255,107,107,0.15)', labelKey: 'paywall.feature1' },
  { icon: 'musical-notes' as const, color: '#A78BFA', bg: 'rgba(167,139,250,0.15)', labelKey: 'paywall.feature2' },
  { icon: 'trophy' as const, color: '#F5A623', bg: 'rgba(245,166,35,0.15)', labelKey: 'paywall.feature3' },
  { icon: 'stats-chart' as const, color: '#34D399', bg: 'rgba(52,211,153,0.15)', labelKey: 'paywall.feature4' },
];

export default function PaywallScreen() {
  const { t } = useTranslation();
  useThemeColors(); // keep hook for status bar
  const insets = useSafeAreaInsets();
  const grantPro = useSettingsStore((s) => s.grantPro);
  const [loading, setLoading] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('lifetime');
  const { fromOnboarding } = useLocalSearchParams<{ fromOnboarding?: string }>();
  const isFromOnboarding = fromOnboarding === '1';

  const handleClose = () => {
    if (isFromOnboarding) {
      router.replace('/(tabs)');
    } else {
      router.canGoBack() ? router.back() : router.replace('/(tabs)');
    }
  };

  useEffect(() => {
    getOfferings().then(setOffering);
  }, []);

  const weeklyPkg: PurchasesPackage | null = offering?.weekly ?? null;
  const annualPkg: PurchasesPackage | null = offering?.annual ?? null;
  const lifetimePkg: PurchasesPackage | null = offering?.lifetime ?? null;

  const weeklyPrice = weeklyPkg?.product.priceString ?? '$2.99';
  const annualPrice = annualPkg?.product.priceString ?? '$14.99';
  const lifetimePrice = lifetimePkg?.product.priceString ?? '$19.99';

  const getSelectedPkg = (): PurchasesPackage | null => {
    if (selectedPlan === 'weekly') return weeklyPkg;
    if (selectedPlan === 'annual') return annualPkg;
    return lifetimePkg;
  };

  const onPurchase = async () => {
    const pkg = getSelectedPkg();
    if (!pkg) {
      Alert.alert(t('paywall.errorTitle'), t('paywall.errorNoProduct'));
      return;
    }
    setLoading(true);
    try {
      const { isPro } = await purchasePackage(pkg);
      if (isPro) {
        grantPro();
        if (isFromOnboarding) {
          router.replace('/(tabs)');
        } else {
          router.canGoBack() ? router.back() : router.replace('/(tabs)');
        }
      }
    } catch (e: any) {
      if (e.userCancelled) return;
      Alert.alert(t('paywall.errorTitle'), e.message);
    } finally {
      setLoading(false);
    }
  };

  const onRestore = async () => {
    setLoading(true);
    try {
      const { isPro } = await restorePurchases();
      if (isPro) {
        grantPro();
        Alert.alert(t('paywall.restoreSuccessTitle'), t('paywall.restoreSuccessMessage'));
        if (isFromOnboarding) {
          router.replace('/(tabs)');
        } else {
          router.canGoBack() ? router.back() : router.replace('/(tabs)');
        }
      } else {
        Alert.alert(t('paywall.restoreTitle'), t('paywall.restoreNoPurchases'));
      }
    } catch (e: any) {
      Alert.alert(t('paywall.errorTitle'), e.message);
    } finally {
      setLoading(false);
    }
  };

  const ctaLabel = selectedPlan === 'lifetime'
    ? t('paywall.unlockForever', { defaultValue: 'Unlock Forever' })
    : selectedPlan === 'annual'
      ? t('paywall.startAnnual', { defaultValue: 'Start Annual Plan' })
      : t('paywall.startWeekly', { defaultValue: 'Start Weekly' });

  return (
    <ImageBackground
      source={require('../assets/bg_coherence.webp')}
      style={styles.container}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(15,20,25,0.85)', 'rgba(15,20,25,0.95)', '#0F1419']}
        locations={[0, 0.4, 0.7]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Close button */}
        <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            onPress={handleClose}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <View style={styles.headerBtn}>
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={onRestore} activeOpacity={0.7} disabled={loading}>
            <Text style={styles.restoreText}>{t('paywall.restore')}</Text>
          </TouchableOpacity>
        </View>

        {/* Title */}
        <View style={styles.titleArea}>
          <Text style={styles.title}>BreathFlow</Text>
          <View style={styles.proBadge}>
            <Ionicons name="diamond" size={12} color="#FFF" />
            <Text style={styles.proBadgeText}>PRO</Text>
          </View>
        </View>

        {/* Features */}
        <View style={styles.featureList}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: f.bg }]}>
                <Ionicons name={f.icon} size={20} color={f.color} />
              </View>
              <Text style={styles.featureText}>
                {t(f.labelKey)}
              </Text>
            </View>
          ))}
        </View>

        {/* Plan cards */}
        <View style={styles.plansArea}>
          {/* Weekly */}
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'weekly' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('weekly')}
            activeOpacity={0.8}
          >
            <View style={styles.planLeft}>
              <View style={[styles.planRadio, selectedPlan === 'weekly' && styles.planRadioSelected]}>
                {selectedPlan === 'weekly' && <View style={styles.planRadioDot} />}
              </View>
              <View>
                <Text style={styles.planTitle}>WEEKLY</Text>
                <Text style={styles.planSub}>{t('paywall.weeklyTrial', { defaultValue: '3-day free trial' })}</Text>
              </View>
            </View>
            <View style={styles.planRight}>
              <Text style={styles.planPriceLabel}>{t('paywall.then', { defaultValue: 'then' })} {weeklyPrice}</Text>
              <Text style={styles.planPeriod}>{t('paywall.perWeek', { defaultValue: 'per week' })}</Text>
            </View>
          </TouchableOpacity>

          {/* Annual */}
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'annual' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('annual')}
            activeOpacity={0.8}
          >
            <View style={styles.planLeft}>
              <View style={[styles.planRadio, selectedPlan === 'annual' && styles.planRadioSelected]}>
                {selectedPlan === 'annual' && <View style={styles.planRadioDot} />}
              </View>
              <View>
                <Text style={styles.planTitle}>ANNUAL</Text>
                <Text style={styles.planSub}>{t('paywall.annualTrial', { defaultValue: '7-day free trial' })}</Text>
              </View>
            </View>
            <View style={styles.planRight}>
              <Text style={styles.planPriceLabel}>{t('paywall.then', { defaultValue: 'then' })} {annualPrice}</Text>
              <Text style={styles.planPeriod}>{t('paywall.perYear', { defaultValue: 'per year' })}</Text>
            </View>
          </TouchableOpacity>

          {/* Lifetime */}
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'lifetime' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('lifetime')}
            activeOpacity={0.8}
          >
            <View style={styles.planLeft}>
              <View style={[styles.planRadio, selectedPlan === 'lifetime' && styles.planRadioSelected]}>
                {selectedPlan === 'lifetime' && <View style={styles.planRadioDot} />}
              </View>
              <View>
                <Text style={styles.planTitle}>LIFETIME</Text>
                <Text style={styles.planSub}>{t('paywall.oneTimePay', { defaultValue: 'one-time purchase' })}</Text>
              </View>
            </View>
            <View style={styles.planRight}>
              <Text style={styles.planPriceOnce}>{lifetimePrice}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaButton, loading && { opacity: 0.7 }]}
          onPress={onPurchase}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.ctaText}>{ctaLabel}</Text>
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>

        {/* Subscription auto-renewal disclaimer (Apple Guideline 3.1.2c) */}
        {(selectedPlan === 'weekly' || selectedPlan === 'annual') && (
          <Text style={styles.subscriptionDisclaimer}>
            {t('paywall.subscriptionDisclaimer', {
              defaultValue:
                'Payment will be charged to your Apple ID account at confirmation of purchase. Subscription automatically renews unless canceled at least 24 hours before the end of the current period. Manage subscriptions in App Store settings.',
            })}
          </Text>
        )}

        {/* Legal */}
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => router.push('/terms')} activeOpacity={0.7}>
            <Text style={styles.legalText}>{t('paywall.terms')}</Text>
          </TouchableOpacity>
          <Text style={styles.legalSep}>{' \u2022 '}</Text>
          <TouchableOpacity onPress={() => router.push('/privacy')} activeOpacity={0.7}>
            <Text style={styles.legalText}>{t('paywall.privacy')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleClose} activeOpacity={0.7} style={styles.hideOptions}>
          <Text style={styles.hideOptionsText}>{t('paywall.hideOptions', { defaultValue: 'Hide Options' })}</Text>
        </TouchableOpacity>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  restoreText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONTS.medium,
    color: '#FFFFFF',
  },

  titleArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
    gap: 8,
  },
  title: {
    fontSize: 36,
    fontFamily: FONTS.heavy,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(155,89,182,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  proBadgeText: {
    fontSize: 13,
    fontFamily: FONTS.heavy,
    color: '#FFF',
    letterSpacing: 1,
  },

  // Features
  featureList: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 20,
    fontFamily: FONTS.heavy,
    color: '#FFFFFF',
    flex: 1,
  },

  // Plans
  plansArea: {
    paddingHorizontal: SPACING.lg,
    gap: 10,
    marginBottom: SPACING.lg,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
    overflow: 'hidden',
  },
  planCardSelected: {
    borderColor: '#4A90D9',
    backgroundColor: 'rgba(155,89,182,0.1)',
  },
  planLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planRadioSelected: {
    borderColor: '#4A90D9',
  },
  planRadioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4A90D9',
  },
  planTitle: {
    fontSize: 16,
    fontFamily: FONTS.heavy,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  planSub: {
    fontSize: 14,
    fontFamily: FONTS.semibold,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  planRight: {
    alignItems: 'flex-end',
  },
  planPriceLabel: {
    fontSize: 16,
    fontFamily: FONTS.heavy,
    color: '#FFFFFF',
  },
  planPeriod: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
  },
  planPriceOnce: {
    fontSize: 18,
    fontFamily: FONTS.heavy,
    color: '#4A90D9',
  },
  saveBadge: {
    position: 'absolute',
    top: -12,
    right: 12,
    backgroundColor: '#34D399',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    zIndex: 1,
  },
  saveBadgeText: {
    fontSize: 11,
    fontFamily: FONTS.heavy,
    color: '#000',
    letterSpacing: 0.5,
  },

  // CTA
  ctaButton: {
    marginHorizontal: SPACING.lg,
    backgroundColor: '#4A90D9',
    borderRadius: 14,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: SPACING.md,
    shadowColor: '#4A90D9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  ctaText: {
    fontSize: 22,
    fontFamily: FONTS.heavy,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Subscription disclaimer
  subscriptionDisclaimer: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
    lineHeight: 15,
  },

  // Legal
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  legalText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONTS.medium,
    color: 'rgba(255,255,255,0.85)',
  },
  legalSep: {
    fontSize: FONT_SIZE.xs,
    color: 'rgba(255,255,255,0.85)',
  },
  hideOptions: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  hideOptionsText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONTS.medium,
    color: 'rgba(255,255,255,0.85)',
    textDecorationLine: 'underline',
  },
});

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
  Modal,
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
import {
  logInitiatedCheckout,
  logPurchase,
  logStartTrial,
} from '../src/utils/facebookEvents';

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
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual');
  const [showWelcome, setShowWelcome] = useState(false);
  const { fromOnboarding } = useLocalSearchParams<{ fromOnboarding?: string }>();
  const isFromOnboarding = fromOnboarding === '1';

  const handleClose = () => {
    if (isFromOnboarding) {
      router.replace('/(tabs)');
    } else {
      router.canGoBack() ? router.back() : router.replace('/(tabs)');
    }
  };

  const handleWelcomeContinue = () => {
    setShowWelcome(false);
    if (isFromOnboarding) {
      router.replace('/(tabs)');
    } else {
      router.canGoBack() ? router.back() : router.replace('/(tabs)');
    }
  };

  useEffect(() => {
    getOfferings().then(setOffering).catch(() => setOffering(null));
  }, []);

  const weeklyPkg: PurchasesPackage | null = offering?.weekly ?? null;
  const annualPkg: PurchasesPackage | null = offering?.annual ?? null;
  const lifetimePkg: PurchasesPackage | null = offering?.lifetime ?? null;

  const weeklyPrice = weeklyPkg?.product.priceString ?? '$2.99';
  const annualPrice = annualPkg?.product.priceString ?? '$14.99';
  const lifetimePrice = lifetimePkg?.product.priceString ?? '$19.99';

  // Numeric prices (not the pre-formatted priceString) so we can derive the
  // weekly-equivalent and savings-vs-weekly figures below, formatted through
  // the package's own currency so this works correctly outside the US too.
  const weeklyPriceNum = weeklyPkg?.product.price ?? 2.99;
  const annualPriceNum = annualPkg?.product.price ?? 14.99;
  const currencyCode = annualPkg?.product.currencyCode ?? weeklyPkg?.product.currencyCode ?? 'USD';
  const formatCurrency = (amount: number): string => {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode }).format(amount);
    } catch {
      return `$${amount.toFixed(2)}`;
    }
  };
  const annualWeeklyEquivalent = formatCurrency(annualPriceNum / 52);
  const annualSavingsPercent = Math.max(
    0,
    Math.round((1 - annualPriceNum / (weeklyPriceNum * 52)) * 100),
  );

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
    const price = pkg.product.price ?? 0;
    const currency = pkg.product.currencyCode ?? 'USD';
    logInitiatedCheckout(selectedPlan, price, currency);
    try {
      const { isPro } = await purchasePackage(pkg);
      if (isPro) {
        grantPro();
        logPurchase(price, selectedPlan, currency);
        if (selectedPlan === 'weekly' || selectedPlan === 'annual') {
          logStartTrial(selectedPlan, price, currency);
        }
        setShowWelcome(true);
      }
    } catch (e: unknown) {
      const err = e as { userCancelled?: boolean; message?: string } | null | undefined;
      if (err?.userCancelled) return;
      Alert.alert(t('paywall.errorTitle'), err?.message || t('paywall.errorGeneric', { defaultValue: 'Something went wrong. Please try again.' }));
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
    } catch (e: unknown) {
      const err = e as { message?: string } | null | undefined;
      Alert.alert(t('paywall.errorTitle'), err?.message || t('paywall.errorGeneric', { defaultValue: 'Something went wrong. Please try again.' }));
    } finally {
      setLoading(false);
    }
  };

  const ctaLabel = selectedPlan === 'lifetime'
    ? t('paywall.unlockForever', { defaultValue: 'Unlock Forever' })
    : selectedPlan === 'annual'
      ? t('paywall.startTrialAnnual')
      : t('paywall.startTrialWeekly');

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

          {/* Annual — featured: permanently accented border (not just on
              selection) + a "SAVE X%" ribbon, so it reads as the recommended
              plan even if the user taps over to Weekly/Lifetime first. */}
          <View style={styles.annualCardWrap}>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>
                {t('paywall.saveBadge', { percent: annualSavingsPercent })}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.planCard,
                styles.planCardFeatured,
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
                <Text style={styles.planPerWeek}>
                  {t('paywall.perWeekApprox', { price: annualWeeklyEquivalent })}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

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

        {(selectedPlan === 'weekly' || selectedPlan === 'annual') && (
          <Text style={styles.cancelAnytime}>{t('paywall.cancelAnytime')}</Text>
        )}

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

        {/* Dev/test only: preview the success modal without a real purchase */}
        {__DEV__ && (
          <TouchableOpacity
            onPress={() => setShowWelcome(true)}
            activeOpacity={0.7}
            style={styles.devPreviewBtn}
          >
            <Text style={styles.devPreviewBtnText}>DEV: Preview Success Modal</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Purchase success — the moment that actually tells them they're Pro now */}
      <Modal visible={showWelcome} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.welcomeOverlay}>
          <LinearGradient
            colors={['#232B3D', '#171E2A', '#12171F']}
            style={styles.welcomeCard}
          >
            <View style={styles.welcomeIconWrap}>
              <View style={styles.welcomeGlowOuter} />
              <View style={styles.welcomeGlowInner} />
              <View style={styles.welcomeRing1} />
              <View style={styles.welcomeRing2} />
              <View style={styles.welcomeRing3} />

              <LinearGradient
                colors={['#FFE066', '#FFC940', '#F5A623']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.welcomeIconBadge}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.welcomeIconShine}
                />
                <Ionicons name="diamond" size={30} color="#1A2332" />
              </LinearGradient>
            </View>

            <Text style={styles.welcomeTitle}>{t('paywall.welcomeTitle')}</Text>
            <Text style={styles.welcomeMessage}>{t('paywall.welcomeMessage')}</Text>

            <TouchableOpacity
              onPress={handleWelcomeContinue}
              activeOpacity={0.85}
              style={styles.welcomeCtaWrapper}
            >
              <LinearGradient
                colors={['#FFE066', '#FFC940', '#F5A623']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.welcomeCta}
              >
                <Text style={styles.welcomeCtaText}>{t('paywall.welcomeCta')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>
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
  // Annual stays visually "featured" (warm accent border) even when the user
  // taps over to another plan — the selected-state blue border above still
  // takes precedence when it IS selected, since style arrays merge in order.
  annualCardWrap: {
    position: 'relative',
    marginTop: 14,
  },
  planCardFeatured: {
    borderColor: 'rgba(245,166,35,0.6)',
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
  planPerWeek: {
    fontSize: 12,
    fontFamily: FONTS.semibold,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  saveBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: '#F5A623',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 2,
    shadowColor: '#F5A623',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBadgeText: {
    fontSize: 12,
    fontFamily: FONTS.heavy,
    color: '#1A1200',
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
  cancelAnytime: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONTS.medium,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginBottom: SPACING.sm,
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
  devPreviewBtn: {
    alignSelf: 'center',
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,201,64,0.5)',
  },
  devPreviewBtnText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONTS.medium,
    color: '#FFC940',
  },

  // Purchase success modal
  welcomeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,20,25,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  welcomeCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 28,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,201,64,0.22)',
    shadowColor: '#F5A623',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 10,
  },
  welcomeIconWrap: {
    width: 128,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  welcomeGlowOuter: {
    position: 'absolute',
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  welcomeGlowInner: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(255,201,64,0.12)',
  },
  welcomeRing1: {
    position: 'absolute',
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  welcomeRing2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  welcomeRing3: {
    position: 'absolute',
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 1.5,
    borderColor: 'rgba(255,201,64,0.45)',
  },
  welcomeIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#F5A623',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  welcomeIconShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  welcomeTitle: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: FONTS.heavy,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  welcomeMessage: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONTS.medium,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  welcomeCtaWrapper: {
    width: '100%',
    borderRadius: 14,
    shadowColor: '#F5A623',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
  },
  welcomeCta: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeCtaText: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONTS.heavy,
    color: '#1A2332',
    letterSpacing: 0.3,
  },
});

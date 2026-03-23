import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeColors, useFontSize } from '../src/hooks/useColorScheme';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, FONTS, scale } from '../src/constants';
import { useSettingsStore } from '../src/store';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  type PurchasesOffering,
  type PurchasesPackage,
} from '../src/utils/revenueCat';

type PlanType = 'weekly' | 'lifetime';

export default function PaywallScreen() {
  const { t } = useTranslation();
  const theme = useThemeColors();
  const fontSize = useFontSize();
  const insets = useSafeAreaInsets();
  const grantPro = useSettingsStore((s) => s.grantPro);
  const [loading, setLoading] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('weekly');
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
  const lifetimePkg: PurchasesPackage | null = offering?.lifetime ?? null;

  const weeklyPrice = weeklyPkg?.product.priceString ?? '$2.99';
  const lifetimePrice = lifetimePkg?.product.priceString ?? '$9.99';

  const features = [
    { icon: 'flash-outline' as const, text: t('paywall.feature1') },
    { icon: 'construct-outline' as const, text: t('paywall.feature2') },
    { icon: 'bar-chart-outline' as const, text: t('paywall.feature3') },
    { icon: 'color-palette-outline' as const, text: t('paywall.feature4') },
    { icon: 'happy-outline' as const, text: t('paywall.feature5') },
    { icon: 'trophy-outline' as const, text: t('paywall.feature6') },
  ];

  const onPurchase = async () => {
    const pkg = selectedPlan === 'weekly' ? weeklyPkg : lifetimePkg;
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
          goToTrialSession();
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
          goToTrialSession();
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

  const ctaPrice = selectedPlan === 'weekly' ? weeklyPrice : lifetimePrice;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Gradient hero */}
        <LinearGradient
          colors={[COLORS.primary, '#5BA0E8', theme.background]}
          locations={[0, 0.65, 1]}
          style={[styles.hero, { paddingTop: insets.top + 12 }]}
        >
          {/* Close / Restore row */}
          <View style={styles.headerRow}>
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

          {/* Diamond icon */}
          <View style={styles.diamondCircle}>
            <Ionicons name="diamond" size={scale(40)} color="#FFFFFF" />
          </View>

          <Text style={styles.heroTitle}>{t('paywall.title')}</Text>
          <Text style={styles.heroSubtitle}>{t('paywall.subtitle')}</Text>
        </LinearGradient>

        {/* Feature list */}
        <View style={[styles.featureCard, { backgroundColor: theme.card }]}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={[styles.featureIconBg, { backgroundColor: COLORS.primary + '15' }]}>
                <Ionicons name={feature.icon} size={18} color={COLORS.primary} />
              </View>
              <Text style={[styles.featureText, { color: theme.text, fontSize: fontSize.md }]} numberOfLines={2}>
                {feature.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Plan selector */}
        <View style={styles.planRow}>
          {/* Weekly plan */}
          <TouchableOpacity
            style={[
              styles.planCard,
              { backgroundColor: theme.card, borderColor: selectedPlan === 'weekly' ? COLORS.primary : 'transparent' },
            ]}
            activeOpacity={0.85}
            onPress={() => setSelectedPlan('weekly')}
          >
            {selectedPlan === 'weekly' && (
              <View style={[styles.planBadge, { backgroundColor: COLORS.primary }]}>
                <Text style={styles.planBadgeText}>Popular</Text>
              </View>
            )}
            <Text style={[styles.planTitle, { color: theme.text }]}>{t('paywall.weekly')}</Text>
            <Text style={[styles.planPrice, { color: selectedPlan === 'weekly' ? COLORS.primary : theme.text }]}>
              {weeklyPrice}
            </Text>
            <Text style={[styles.planPeriod, { color: theme.textSecondary }]}>{t('paywall.perWeek')}</Text>
            {selectedPlan === 'weekly' && (
              <View style={[styles.planCheck, { backgroundColor: COLORS.primary }]}>
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>

          {/* Lifetime plan */}
          <TouchableOpacity
            style={[
              styles.planCard,
              { backgroundColor: theme.card, borderColor: selectedPlan === 'lifetime' ? COLORS.primary : 'transparent' },
            ]}
            activeOpacity={0.85}
            onPress={() => setSelectedPlan('lifetime')}
          >
            {selectedPlan === 'lifetime' && (
              <View style={[styles.planBadge, { backgroundColor: '#F5A623' }]}>
                <Text style={styles.planBadgeText}>{t('paywall.bestValue')}</Text>
              </View>
            )}
            <Text style={[styles.planTitle, { color: theme.text }]}>{t('paywall.lifetime')}</Text>
            <Text style={[styles.planPrice, { color: selectedPlan === 'lifetime' ? COLORS.primary : theme.text }]}>
              {lifetimePrice}
            </Text>
            <Text style={[styles.planPeriod, { color: theme.textSecondary }]}>{t('paywall.oneTimePay')}</Text>
            {selectedPlan === 'lifetime' && (
              <View style={[styles.planCheck, { backgroundColor: COLORS.primary }]}>
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Weekly disclaimer */}
        {selectedPlan === 'weekly' && (
          <Text style={[styles.weeklyNote, { color: theme.textSecondary }]}>
            {t('paywall.weeklyNote', { price: weeklyPrice })}
          </Text>
        )}

        {/* CTA Button */}
        <TouchableOpacity
          style={[styles.ctaButton, loading && styles.ctaDisabled]}
          onPress={onPurchase}
          activeOpacity={0.85}
          disabled={loading}
        >
          <LinearGradient
            colors={[COLORS.primary, '#3A7BC8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="lock-open-outline" size={20} color="#FFFFFF" />
                <Text style={styles.ctaText}>
                  {t('paywall.purchase', { price: ctaPrice })}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Legal links */}
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => router.push('/terms')} activeOpacity={0.7}>
            <Text style={[styles.legalText, { color: theme.textSecondary }]}>
              {t('paywall.terms')}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.legalSep, { color: theme.textSecondary }]}>{' \u2022 '}</Text>
          <TouchableOpacity onPress={() => router.push('/privacy')} activeOpacity={0.7}>
            <Text style={[styles.legalText, { color: theme.textSecondary }]}>
              {t('paywall.privacy')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  hero: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl + SPACING.md,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: SPACING.lg,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  restoreText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONTS.medium,
    color: 'rgba(255,255,255,0.85)',
  },
  diamondCircle: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: FONTS.heavy,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONTS.medium,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 4,
  },

  featureCard: {
    marginHorizontal: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: SPACING.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  featureIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureText: {
    fontFamily: FONTS.medium,
    flex: 1,
  },

  // Plan selector
  planRow: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  planCard: {
    flex: 1,
    borderRadius: 16,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
    minHeight: 110,
    justifyContent: 'center',
  },
  planBadge: {
    position: 'absolute',
    top: -10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
  },
  planBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  planTitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONTS.semibold,
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 22,
    fontFamily: FONTS.heavy,
    letterSpacing: -0.5,
  },
  planPeriod: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    marginTop: 2,
  },
  planCheck: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  weeklyNote: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    textAlign: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    lineHeight: 16,
  },

  ctaButton: {
    marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  ctaDisabled: { opacity: 0.7 },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md + 2,
    gap: 8,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.lg,
    fontFamily: FONTS.bold,
    letterSpacing: 0.3,
  },

  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  legalText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONTS.medium,
  },
  legalSep: {
    fontSize: FONT_SIZE.xs,
  },
});

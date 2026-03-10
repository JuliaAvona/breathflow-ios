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
import { router } from 'expo-router';
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
} from '../src/utils/revenueCat';

export default function PaywallScreen() {
  const { t } = useTranslation();
  const theme = useThemeColors();
  const fontSize = useFontSize();
  const insets = useSafeAreaInsets();
  const setSetting = useSettingsStore((s) => s.setSetting);
  const [loading, setLoading] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);

  useEffect(() => {
    getOfferings().then(setOffering);
  }, []);

  const features = [
    { icon: 'flash-outline' as const, text: t('paywall.feature1') },
    { icon: 'construct-outline' as const, text: t('paywall.feature2') },
    { icon: 'bar-chart-outline' as const, text: t('paywall.feature3') },
    { icon: 'color-palette-outline' as const, text: t('paywall.feature4') },
    { icon: 'happy-outline' as const, text: t('paywall.feature5') },
    { icon: 'trophy-outline' as const, text: t('paywall.feature6') },
  ];

  const onPurchase = async () => {
    // Try lifetime package first, then fall back to annual
    const pkg = offering?.lifetime ?? offering?.annual ?? undefined;
    if (!pkg) {
      Alert.alert(t('paywall.errorTitle'), t('paywall.errorNoProduct'));
      return;
    }

    setLoading(true);
    try {
      const { isPro } = await purchasePackage(pkg);
      if (isPro) {
        setSetting('isPro', true);
        router.canGoBack() ? router.back() : router.replace('/(tabs)');
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
        setSetting('isPro', true);
        Alert.alert(t('paywall.restoreSuccessTitle'), t('paywall.restoreSuccessMessage'));
        router.canGoBack() ? router.back() : router.replace('/(tabs)');
      } else {
        Alert.alert(t('paywall.restoreTitle'), t('paywall.restoreNoPurchases'));
      }
    } catch (e: any) {
      Alert.alert(t('paywall.errorTitle'), e.message);
    } finally {
      setLoading(false);
    }
  };

  const priceStr = offering?.lifetime?.product.priceString
    ?? offering?.annual?.product.priceString
    ?? '$3.99';

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
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
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

          {/* Title */}
          <Text style={styles.heroTitle}>{t('paywall.title')}</Text>
          <Text style={styles.heroSubtitle}>{t('paywall.subtitle')}</Text>
        </LinearGradient>

        {/* Feature list card */}
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

        {/* Price highlight */}
        <View style={[styles.priceCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>
            {t('paywall.oneTimePayment')}
          </Text>
          <Text style={[styles.priceValue, { color: theme.text }]}>
            {priceStr}
          </Text>
          <Text style={[styles.priceNote, { color: theme.textSecondary }]}>
            {t('paywall.foreverAccess')}
          </Text>
        </View>

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
                  {t('paywall.purchase', { price: priceStr })}
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

  // Hero
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

  // Feature card
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
    fontSize: FONT_SIZE.md,
    fontFamily: FONTS.medium,
    flex: 1,
  },

  // Price card
  priceCard: {
    marginHorizontal: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: SPACING.lg,
  },
  priceLabel: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONTS.medium,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 36,
    fontFamily: FONTS.heavy,
    letterSpacing: -1,
  },
  priceNote: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONTS.medium,
    marginTop: 2,
  },

  // CTA
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

  // Legal
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

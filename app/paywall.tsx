import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeColors, useFontSize } from '../src/hooks/useColorScheme';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, scale } from '../src/constants';
import { useSettingsStore } from '../src/store';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  type PurchasesPackage,
  type PurchasesOffering,
} from '../src/utils/revenueCat';

type Plan = 'annual' | 'weekly';

export default function PaywallScreen() {
  const { t } = useTranslation();
  const theme = useThemeColors();
  const fontSize = useFontSize();
  const setSetting = useSettingsStore((s) => s.setSetting);
  const [selectedPlan, setSelectedPlan] = useState<Plan>('weekly');
  const [loading, setLoading] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [trialEnabled, setTrialEnabled] = useState(true);

  useEffect(() => {
    getOfferings().then(setOffering);
  }, []);

  const getPackage = (): PurchasesPackage | undefined => {
    if (!offering) return undefined;
    if (selectedPlan === 'annual') return offering.annual ?? undefined;
    return offering.weekly ?? undefined;
  };

  const features = [
    { emoji: '\u{1F3AF}', text: t('paywall.feature1') },
    { emoji: '\u{1F504}', text: t('paywall.feature2') },
    { emoji: '\u{1F4E4}', text: t('paywall.feature3') },
    { emoji: '\u{1F514}', text: t('paywall.feature4') },
    { emoji: '\u{1F525}', text: t('paywall.feature5') },
    { emoji: '\u{1F3A8}', text: t('paywall.feature6') },
  ];


  const onSubscribe = async () => {
    const pkg = getPackage();
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

  // Dynamic prices from RevenueCat (fallback to translation keys)
  const annualPrice = offering?.annual?.product.priceString ?? t('paywall.annualPrice');
  const weeklyPrice = offering?.weekly?.product.priceString ?? t('paywall.weeklyPrice');

  // Calculate per-week cost from annual price, preserving locale currency symbol
  const annualPerWeek = (() => {
    const product = offering?.annual?.product;
    if (!product) return '';
    const perWeek = (product.price / 52).toFixed(2);
    // Extract currency symbol from priceString (e.g. "$24.99" → "$", "₹299" → "₹")
    const symbol = product.priceString.replace(/[\d.,\s]/g, '').trim();
    return `${symbol}${perWeek}/wk`;
  })();

  const RadioCircle = ({ selected }: { selected: boolean }) => (
    <View style={[styles.radio, { borderColor: selected ? theme.primary : theme.border }]}>
      {selected && <View style={[styles.radioInner, { backgroundColor: theme.primary }]} />}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header row: close + restore */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={28} color={theme.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onRestore}
          activeOpacity={0.7}
          disabled={loading}
        >
          <Ionicons name="refresh" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <View style={[styles.iconCircle, { backgroundColor: theme.primary + '15' }]}>
          <Ionicons name="diamond" size={scale(36)} color={theme.primary} />
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: theme.text, fontSize: fontSize.xxl + 4 }]} numberOfLines={2} adjustsFontSizeToFit>
          {t('paywall.title')}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary, fontSize: fontSize.md }]}>
          {t('paywall.subtitle')}
        </Text>

        {/* Feature list */}
        <View style={styles.featureList}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Text style={styles.featureEmoji}>{feature.emoji}</Text>
              <Text style={[styles.featureText, { color: theme.text, fontSize: fontSize.md }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
                {feature.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Plan cards */}
        <View style={styles.plansColumn}>
          {/* Weekly plan */}
          <TouchableOpacity
            style={[
              styles.planCard,
              {
                backgroundColor: selectedPlan === 'weekly' ? theme.primary + '10' : theme.card,
                borderColor: selectedPlan === 'weekly' ? theme.primary : theme.border,
                borderWidth: selectedPlan === 'weekly' ? 2 : 1,
              },
            ]}
            onPress={() => setSelectedPlan('weekly')}
            activeOpacity={0.8}
          >
            <RadioCircle selected={selectedPlan === 'weekly'} />
            <View style={styles.planInfo}>
              <Text style={[styles.planName, { color: theme.text, fontSize: fontSize.lg }]} numberOfLines={1} adjustsFontSizeToFit>
                {t('paywall.weeklyPlan')}
              </Text>
              <Text style={[styles.planTrial, { color: theme.textSecondary, fontSize: fontSize.sm }]} numberOfLines={1} adjustsFontSizeToFit>
                {t('paywall.weeklyTrial')}
              </Text>
            </View>
            <View style={styles.planPriceBlock}>
              <Text style={[styles.planPriceMain, { color: theme.text, fontSize: fontSize.md }]}>
                {weeklyPrice}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Annual plan */}
          <TouchableOpacity
            style={[
              styles.planCard,
              {
                backgroundColor: selectedPlan === 'annual' ? theme.primary + '10' : theme.card,
                borderColor: selectedPlan === 'annual' ? theme.primary : theme.border,
                borderWidth: selectedPlan === 'annual' ? 2 : 1,
              },
            ]}
            onPress={() => setSelectedPlan('annual')}
            activeOpacity={0.8}
          >
            <RadioCircle selected={selectedPlan === 'annual'} />
            <View style={styles.planInfo}>
              <View style={styles.planNameRow}>
                <Text style={[styles.planName, { color: theme.text, fontSize: fontSize.lg }]} numberOfLines={1} adjustsFontSizeToFit>
                  {t('paywall.annualPlan')}
                </Text>
                <View style={[styles.saveBadge, { backgroundColor: theme.primary + '15' }]}>
                  <Text style={[styles.saveBadgeText, { color: theme.primary }]} numberOfLines={1}>{t('paywall.annualSave')}</Text>
                </View>
              </View>
              <Text style={[styles.planTrial, { color: theme.textSecondary, fontSize: fontSize.sm }]} numberOfLines={1} adjustsFontSizeToFit>
                {t('paywall.annualTrial')}
              </Text>
            </View>
            <View style={styles.planPriceBlock}>
              <Text style={[styles.planPriceMain, { color: theme.text, fontSize: fontSize.md }]}>
                {annualPerWeek}
              </Text>
              <Text style={[styles.planPriceTotal, { color: theme.textSecondary, fontSize: fontSize.sm }]}>
                {annualPrice}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Free trial toggle */}
        <View style={[styles.trialToggleRow, { borderColor: theme.border }]}>
            <Text style={[styles.trialToggleText, { color: theme.text, fontSize: fontSize.md }]}>
              {t('paywall.freeTrialEnabled')}
            </Text>
            <Switch
              value={trialEnabled}
              onValueChange={setTrialEnabled}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={COLORS.white}
            />
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: theme.primary }, loading && styles.ctaButtonDisabled]}
          onPress={onSubscribe}
          activeOpacity={0.8}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={[styles.ctaButtonText, { fontSize: fontSize.lg }]} numberOfLines={1} adjustsFontSizeToFit>
              {trialEnabled
                ? t('paywall.tryForFree')
                : t('paywall.subscribe')}
            </Text>
          )}
        </TouchableOpacity>

        {/* No payment now */}
        {trialEnabled && (
          <View style={styles.noPaymentRow}>
            <Ionicons name="shield-checkmark" size={16} color={theme.textSecondary} />
            <Text style={[styles.noPaymentText, { color: theme.textSecondary, fontSize: fontSize.sm }]}>
              {t('paywall.noPaymentNow')}
            </Text>
          </View>
        )}

        {/* Legal links */}
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => router.push('/terms')} activeOpacity={0.7}>
            <Text style={[styles.legalLinkText, { color: theme.textSecondary }]}>
              {t('paywall.terms')}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.legalSeparator, { color: theme.textSecondary }]}>{'  \u2022  '}</Text>
          <TouchableOpacity onPress={() => router.push('/privacy')} activeOpacity={0.7}>
            <Text style={[styles.legalLinkText, { color: theme.textSecondary }]}>
              {t('paywall.privacy')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Disclaimer */}
        <Text style={[styles.disclaimer, { color: theme.textSecondary + '80', fontSize: fontSize.xs }]}>
          {t('paywall.disclaimer')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const RADIO_SIZE = 24;
const RADIO_INNER = 14;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    alignItems: 'center',
  },
  iconCircle: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  featureList: {
    alignSelf: 'stretch',
    marginBottom: SPACING.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm + 2,
  },
  featureEmoji: {
    fontSize: FONT_SIZE.lg,
    marginRight: SPACING.sm + 2,
    width: 28,
    textAlign: 'center',
  },
  featureText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
    flex: 1,
  },

  // Plans
  plansColumn: {
    alignSelf: 'stretch',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    paddingVertical: SPACING.md + 4,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  planInfo: {
    flex: 1,
    marginLeft: SPACING.sm + 2,
  },
  planName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  planTrial: {
    fontSize: FONT_SIZE.sm,
  },
  planPriceBlock: {
    alignItems: 'flex-end',
    marginLeft: SPACING.xs,
    flexShrink: 0,
  },
  planPrice: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  planPriceMain: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  planPriceTotal: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
    marginTop: 2,
  },
  planNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: 2,
  },
  saveBadge: {
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Radio
  radio: {
    width: RADIO_SIZE,
    height: RADIO_SIZE,
    borderRadius: RADIO_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: RADIO_INNER,
    height: RADIO_INNER,
    borderRadius: RADIO_INNER / 2,
  },

  // Trial toggle
  trialToggleRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.lg,
  },
  trialToggleText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
  },

  // CTA
  ctaButton: {
    alignSelf: 'stretch',
    paddingVertical: SPACING.md + 2,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  ctaButtonDisabled: {
    opacity: 0.7,
  },
  ctaButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // No payment
  noPaymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
    marginTop: SPACING.xs,
  },
  noPaymentText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
  },

  // Legal
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  legalLinkText: {
    fontSize: FONT_SIZE.xs,
  },
  legalSeparator: {
    fontSize: FONT_SIZE.xs,
  },
  disclaimer: {
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: SPACING.sm,
  },
});

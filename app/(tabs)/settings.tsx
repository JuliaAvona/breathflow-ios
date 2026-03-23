import React, { useState } from 'react';
import {
  View,
  Text,
  Switch,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useSettingsStore, useAuthStore } from '../../src/store';
import { useThemeColors, useFontSize } from '../../src/hooks/useColorScheme';
import { requestHealthPermissions, isHealthKitAvailable } from '../../src/utils/healthKit';
import { performAppleSignIn } from '../../src/utils/appleAuth';
import { pushAll, pullAndMerge } from '../../src/services/syncService';
import { useHaptics } from '../../src/hooks/useHaptics';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, FONTS } from '../../src/constants';
import { PickerModal } from '../../src/components/PickerModal';
import { WheelPickerModal, WheelColumn } from '../../src/components/WheelPickerModal';

// ─── Shared row components ─────────────────────────────────────────────────

interface ToggleRowProps {
  label: string;
  value: boolean;
  onToggle: (val: boolean) => void;
  theme: ReturnType<typeof useThemeColors>;
  badge?: string;
  onHaptic?: () => void;
  labelSize?: number;
}

function ToggleRow({ label, value, onToggle, theme, badge, onHaptic, labelSize }: ToggleRowProps) {
  return (
    <View
      style={[styles.settingRow, { borderBottomColor: theme.border }]}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
    >
      <View style={styles.settingLabelRow}>
        <Text style={[styles.settingLabel, { color: theme.text }, labelSize != null && { fontSize: labelSize }]}>
          {label}
        </Text>
        {badge && (
          <View style={styles.proBadge}>
            <Ionicons name="diamond" size={10} color={COLORS.white} />
          </View>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={(val) => {
          onHaptic?.();
          onToggle(val);
        }}
        trackColor={{ false: theme.border, true: theme.primaryLight }}
        thumbColor={value ? theme.primary : '#f4f3f4'}
      />
    </View>
  );
}

// ─── Picker types & constants ──────────────────────────────────────────────

type PickerType =
  | 'soundStyle'
  | 'darkMode'
  | 'reminderTime'
  | 'reminderDays'
  | null;

const SOUND_STYLE_OPTIONS = [
  { labelKey: 'settings.soundNature', value: 'nature' as const },
  { labelKey: 'settings.soundVoice', value: 'voice' as const },
  { labelKey: 'settings.soundTone', value: 'tone' as const },
  { labelKey: 'settings.soundOff', value: 'off' as const },
];

const DARK_MODE_OPTIONS = [
  { labelKey: 'settings.darkModeSystem', value: 'system' as const },
  { labelKey: 'settings.darkModeLight', value: 'light' as const },
  { labelKey: 'settings.darkModeDark', value: 'dark' as const },
];

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

const TIME_COLUMNS: WheelColumn[] = [
  { min: 0, max: 23, step: 1, pad: 2 },
  { min: 0, max: 55, step: 5, pad: 2 },
];

const SUPPORT_EMAIL = 'support@breathflow.app';
const APP_VERSION = '1.0.0';

// ─── Main Screen ───────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useThemeColors();
  const fontSize = useFontSize();
  const settings = useSettingsStore();
  const haptics = useHaptics();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activePicker, setActivePicker] = useState<PickerType>(null);
  const user = useAuthStore((s) => s.user);
  const isAnonymous = useAuthStore((s) => s.isAnonymous);
  const displayName = useAuthStore((s) => s.displayName);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleSignInWithApple = async () => {
    setIsSigningIn(true);
    try {
      const { idToken, nonce, authorizationCode, givenName } = await performAppleSignIn();
      if (isAnonymous && user) {
        await useAuthStore.getState().linkAppleAccount(idToken, nonce, authorizationCode, givenName);
      } else {
        await useAuthStore.getState().signInWithApple(idToken, nonce, authorizationCode, givenName);
      }
      await pullAndMerge();
      await pushAll();
      Alert.alert(t('auth.signInSuccess'), t('auth.dataSynced'));
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert(t('common.error'), err.message ?? '');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(t('auth.signOutTitle'), t('auth.signOutMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.signOut'),
        style: 'destructive',
        onPress: async () => {
          await useAuthStore.getState().signOut();
          await useAuthStore.getState().signInAnonymously();
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(t('auth.deleteAccountTitle'), t('auth.deleteAccountMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.deleteAccountConfirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            await useAuthStore.getState().deleteAccount();
            await useAuthStore.getState().signInAnonymously();
            Alert.alert(t('common.ok'), t('auth.deleteAccountSuccess'));
          } catch (e: unknown) {
            const err = e as { message?: string };
            Alert.alert(t('common.error'), err.message ?? '');
          }
        },
      },
    ]);
  };

  const handleSyncData = async () => {
    setIsSyncing(true);
    try {
      await pushAll();
      await pullAndMerge();
      Alert.alert(t('common.ok'), t('auth.dataSynced'));
    } catch {
      Alert.alert(t('common.error'), t('settings.syncFailed'));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleHealthToggle = async (val: boolean) => {
    if (val) {
      if (!isHealthKitAvailable()) {
        settings.setSetting('healthSyncEnabled', false);
        return;
      }
      const granted = await requestHealthPermissions();
      settings.setSetting('healthSyncEnabled', granted);
    } else {
      settings.setSetting('healthSyncEnabled', false);
    }
  };

  const handleProFeatureTap = () => {
    if (!settings.isPro) {
      router.push('/paywall');
    }
  };

  const handleReminderToggle = async (val: boolean) => {
    const { scheduleBreatheReminder, cancelNotification, requestNotificationPermissions } =
      await import('../../src/utils/notifications');
    if (val) {
      const granted = await requestNotificationPermissions();
      if (!granted) return;
      settings.setSetting('reminderEnabled', true);
      const [h, m] = settings.reminderTime.split(':').map(Number);
      await scheduleBreatheReminder(h, m);
    } else {
      settings.setSetting('reminderEnabled', false);
      // Fall back to default 10:00 AM reminder
      await scheduleBreatheReminder(10, 0);
    }
  };

  const toggleReminderDay = (day: number) => {
    const current = settings.reminderDays;
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort();
    if (updated.length === 0) return; // must have at least 1 day
    settings.setSetting('reminderDays', updated);
  };

  const handleRestorePurchases = async () => {
    try {
      const { restorePurchases } = await import('../../src/utils/revenueCat');
      const { isPro } = await restorePurchases();
      if (isPro) {
        settings.grantPro();
        Alert.alert(t('common.ok'), t('settings.restoreSuccess'));
      } else {
        Alert.alert(t('common.ok'), t('settings.restoreNone'));
      }
    } catch {
      Alert.alert(t('common.error'), t('settings.restoreFailed'));
    }
  };

  const handleRateApp = async () => {
    // expo-store-review is not installed; open App Store directly
    const appStoreUrl = 'https://apps.apple.com/app/id0000000000'; // TODO: replace with actual App Store ID
    try {
      await Linking.openURL(appStoreUrl);
    } catch {
      // silent fail
    }
  };

  const handleContactSupport = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
  };

  // ── Picker value display helpers ───────────────────────────────────────

  const soundStyleLabel = (style: string): string => {
    const opt = SOUND_STYLE_OPTIONS.find((o) => o.value === style);
    return opt ? t(opt.labelKey) : style;
  };


  const darkModeLabel = (val: string): string => {
    const opt = DARK_MODE_OPTIONS.find((o) => o.value === val);
    return opt ? t(opt.labelKey) : val;
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.titleRow}>
          {!isAnonymous && displayName ? (
            <Text style={[styles.greeting, { color: theme.text }]}>
              Hi, {displayName}
            </Text>
          ) : (
            <View />
          )}
          {settings.isPro && (
            <View style={[styles.proStatusBadge, { backgroundColor: theme.accent }]}>
              <Ionicons name="diamond" size={12} color={COLORS.white} />
              <Text style={styles.proStatusText}>PRO</Text>
            </View>
          )}
        </View>

        {/* PRO upgrade card */}
        {!settings.isPro && (
          <TouchableOpacity
            style={[styles.proCard, { backgroundColor: theme.accent }]}
            activeOpacity={0.8}
            onPress={() => router.push('/paywall')}
            accessibilityLabel={t('settings.upgradePro')}
            accessibilityRole="button"
          >
            <View style={styles.proTitleRow}>
              <Ionicons name="diamond" size={16} color={COLORS.white} />
              <Text style={styles.proTitle}>{t('settings.upgradePro')}</Text>
            </View>
            <Text style={styles.proSubtitle}>{t('settings.proSubtitle')}</Text>
          </TouchableOpacity>
        )}

        {/* ── Feedback ─────────────────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontSize: fontSize.xs }]}>
            {t('settings.feedback')}
          </Text>

          {/* Sound toggle */}
          <ToggleRow
            label={t('settings.sound')}
            value={settings.soundEnabled}
            onToggle={(val) => settings.setSetting('soundEnabled', val)}
            theme={theme}
            onHaptic={haptics.light}
            labelSize={fontSize.md}
          />

          {/* Sound style picker */}
          {settings.soundEnabled && (
            <TouchableOpacity
              style={[styles.settingRow, { borderBottomColor: theme.border }]}
              onPress={() => { haptics.selection(); setActivePicker('soundStyle'); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.settingLabel, { color: theme.text, fontSize: fontSize.md }]}>
                {t('settings.soundStyle')}
              </Text>
              <View style={styles.pickerValueRow}>
                <Text style={[styles.pickerValueText, { color: theme.primary }]}>
                  {soundStyleLabel(settings.soundStyle)}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
              </View>
            </TouchableOpacity>
          )}

          {/* Haptics toggle */}
          <ToggleRow
            label={t('settings.haptics')}
            value={settings.hapticsEnabled}
            onToggle={(val) => settings.setSetting('hapticsEnabled', val)}
            theme={theme}
            onHaptic={haptics.light}
            labelSize={fontSize.md}
          />

        </View>

        {/* ── Appearance ───────────────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontSize: fontSize.xs }]}>
            {t('settings.appearance')}
          </Text>

          {/* Dark mode picker */}
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: theme.border }]}
            onPress={() => { haptics.selection(); setActivePicker('darkMode'); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.settingLabel, { color: theme.text, fontSize: fontSize.md }]}>
              {t('settings.darkMode')}
            </Text>
            <View style={styles.pickerValueRow}>
              <Text style={[styles.pickerValueText, { color: theme.primary }]}>
                {darkModeLabel(settings.darkMode)}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </View>
          </TouchableOpacity>

        </View>

        {/* ── Reminders ────────────────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontSize: fontSize.xs }]}>
            {t('settings.reminders')}
          </Text>
          <ToggleRow
            label={t('settings.dailyReminder')}
            value={settings.reminderEnabled}
            onToggle={handleReminderToggle}
            theme={theme}
            onHaptic={haptics.light}
            labelSize={fontSize.md}
          />

          {settings.reminderEnabled && (
            <>
              {/* Reminder time */}
              <TouchableOpacity
                style={[styles.settingRow, { borderBottomColor: theme.border }]}
                onPress={() => { haptics.selection(); setActivePicker('reminderTime'); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.settingLabel, { color: theme.text, fontSize: fontSize.md }]}>
                  {t('settings.reminderTime')}
                </Text>
                <View style={styles.pickerValueRow}>
                  <Text style={[styles.pickerValueText, { color: theme.primary }]}>
                    {settings.reminderTime}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                </View>
              </TouchableOpacity>

              {/* Reminder days */}
              <View style={[styles.settingRow, { borderBottomColor: 'transparent' }]}>
                <Text style={[styles.settingLabel, { color: theme.text, fontSize: fontSize.md }]}>
                  {t('settings.reminderDays')}
                </Text>
              </View>
              <View style={styles.daysRow}>
                {DAY_KEYS.map((dayKey, index) => {
                  const isActive = settings.reminderDays.includes(index);
                  return (
                    <TouchableOpacity
                      key={dayKey}
                      style={[
                        styles.dayChip,
                        {
                          backgroundColor: isActive ? theme.primary : 'transparent',
                          borderColor: theme.primary,
                        },
                      ]}
                      onPress={() => {
                        haptics.selection();
                        toggleReminderDay(index);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dayChipText,
                          { color: isActive ? COLORS.white : theme.text },
                        ]}
                      >
                        {t(`settings.day${dayKey.charAt(0).toUpperCase() + dayKey.slice(1)}`)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </View>

        {/* ── Apple Health ─────────────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontSize: fontSize.xs }]}>
            {t('settings.appleHealth')}
          </Text>
          <ToggleRow
            label={t('settings.syncMindfulMinutes')}
            value={settings.healthSyncEnabled}
            onToggle={handleHealthToggle}
            theme={theme}
            onHaptic={haptics.light}
            labelSize={fontSize.md}
          />
        </View>

        {/* ── Account ──────────────────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontSize: fontSize.xs }]}>
            {t('auth.account')}
          </Text>
          {isAnonymous ? (
            <View style={styles.appleButtonContainer}>
              {isSigningIn ? (
                <ActivityIndicator size="small" color={theme.textSecondary} />
              ) : (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={BORDER_RADIUS.sm}
                  style={styles.appleButton}
                  onPress={handleSignInWithApple}
                />
              )}
            </View>
          ) : (
            <>
              <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
                <Text style={[styles.settingLabel, { color: theme.text, fontSize: fontSize.md }]}>
                  {t('auth.signedInAs')}
                </Text>
                <Text style={[styles.settingValue, { color: theme.textSecondary }]}>
                  {user?.email ?? t('auth.appleUser')}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.settingRow, { borderBottomColor: theme.border }]}
                onPress={handleSignOut}
              >
                <Text style={[styles.settingLabel, { color: COLORS.error }]}>
                  {t('auth.signOut')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.settingRow, { borderBottomColor: 'transparent' }]}
                accessibilityRole="button"
                onPress={handleDeleteAccount}
              >
                <Text style={[styles.settingLabel, { color: COLORS.error, fontSize: fontSize.md }]}>
                  {t('auth.deleteAccount')}
                </Text>
                <Ionicons name="trash-outline" size={18} color={COLORS.error} />
              </TouchableOpacity>
            </>
          )}

          {/* Sync data */}
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: 'transparent' }]}
            onPress={handleSyncData}
            activeOpacity={0.7}
          >
            <Text style={[styles.settingLabel, { color: theme.text, fontSize: fontSize.md }]}>
              {t('settings.syncData')}
            </Text>
            {isSyncing ? (
              <ActivityIndicator size="small" color={theme.textSecondary} />
            ) : (
              <Ionicons name="sync-outline" size={20} color={theme.textSecondary} />
            )}
          </TouchableOpacity>
        </View>

        {/* ── General ──────────────────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontSize: fontSize.xs }]}>
            {t('settings.general')}
          </Text>

          {/* About */}
          <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.settingLabel, { color: theme.text, fontSize: fontSize.md }]}>
              {t('settings.version')}
            </Text>
            <Text style={[styles.settingValue, { color: theme.textSecondary }]}>
              {APP_VERSION}
            </Text>
          </View>

          {/* Privacy Policy */}
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: theme.border }]}
            onPress={() => router.push('/privacy')}
            accessibilityRole="link"
          >
            <Text style={[styles.settingLabel, { color: theme.text, fontSize: fontSize.md }]}>
              {t('settings.privacyPolicy')}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
          </TouchableOpacity>

          {/* Terms of Service */}
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: theme.border }]}
            onPress={() => router.push('/terms')}
            accessibilityRole="link"
          >
            <Text style={[styles.settingLabel, { color: theme.text, fontSize: fontSize.md }]}>
              {t('settings.termsOfService')}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
          </TouchableOpacity>

          {/* Restore purchases */}
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: theme.border }]}
            onPress={handleRestorePurchases}
            accessibilityRole="button"
          >
            <Text style={[styles.settingLabel, { color: theme.text, fontSize: fontSize.md }]}>
              {t('settings.restorePurchases')}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
          </TouchableOpacity>

          {/* Rate app */}
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: theme.border }]}
            onPress={handleRateApp}
            accessibilityRole="button"
          >
            <Text style={[styles.settingLabel, { color: theme.text, fontSize: fontSize.md }]}>
              {t('settings.rateApp')}
            </Text>
            <Ionicons name="star-outline" size={18} color={theme.textSecondary} />
          </TouchableOpacity>

          {/* Contact support */}
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: theme.border }]}
            onPress={handleContactSupport}
            accessibilityRole="link"
          >
            <Text style={[styles.settingLabel, { color: theme.text, fontSize: fontSize.md }]}>
              {t('settings.contactSupport')}
            </Text>
            <Ionicons name="mail-outline" size={18} color={theme.textSecondary} />
          </TouchableOpacity>

          {/* Reset onboarding (dev/testing) */}
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: 'transparent' }]}
            onPress={() => {
              settings.setSetting('onboardingCompleted', false);
              settings.setSetting('selectedGoal', undefined);
              router.replace('/onboarding');
            }}
            accessibilityRole="button"
          >
            <Text style={[styles.settingLabel, { color: theme.textSecondary, fontSize: fontSize.md }]}>
              View Onboarding
            </Text>
            <Ionicons name="play-outline" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Picker Modals ──────────────────────────────────────────────── */}

      {/* Sound style */}
      <PickerModal<'tone' | 'bell' | 'nature' | 'bowl'>
        visible={activePicker === 'soundStyle'}
        title={t('settings.soundStyle')}
        options={SOUND_STYLE_OPTIONS.map((o) => ({ label: t(o.labelKey), value: o.value }))}
        selectedValue={settings.soundStyle}
        onSelect={(val) => settings.setSetting('soundStyle', val)}
        onClose={() => setActivePicker(null)}
      />

      {/* Dark mode */}
      <PickerModal<'system' | 'light' | 'dark'>
        visible={activePicker === 'darkMode'}
        title={t('settings.darkMode')}
        options={DARK_MODE_OPTIONS.map((o) => ({ label: t(o.labelKey), value: o.value }))}
        selectedValue={settings.darkMode}
        onSelect={(val) => settings.setSetting('darkMode', val)}
        onClose={() => setActivePicker(null)}
      />


      {/* Reminder time */}
      <WheelPickerModal
        visible={activePicker === 'reminderTime'}
        title={t('settings.reminderTime')}
        columns={TIME_COLUMNS}
        values={settings.reminderTime.split(':').map(Number)}
        onConfirm={async ([h, m]) => {
          const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          settings.setSetting('reminderTime', time);
          if (settings.reminderEnabled) {
            const { scheduleBreatheReminder } = await import('../../src/utils/notifications');
            await scheduleBreatheReminder(h, m);
          }
        }}
        onClose={() => setActivePicker(null)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  screenTitle: {
    fontSize: 30,
    fontFamily: FONTS.bold,
    letterSpacing: -0.5,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  greeting: {
    fontSize: FONT_SIZE.xl,
    fontFamily: FONTS.bold,
  },
  proStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.md,
  },
  proStatusText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  proCard: {
    marginHorizontal: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  proTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  proTitle: {
    fontSize: FONT_SIZE.xl,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  proSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: 'rgba(255,255,255,0.9)',
  },
  section: {
    marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONTS.semibold,
    letterSpacing: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  settingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
    flexShrink: 1,
  },
  settingLabel: {
    fontSize: FONT_SIZE.md,
    flexShrink: 1,
  },
  settingValue: {
    fontSize: FONT_SIZE.md,
  },
  proBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.proBadge,
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  pickerValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pickerValueText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONTS.semibold,
  },
  appleButtonContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    alignItems: 'center' as const,
  },
  appleButton: {
    width: '100%' as unknown as number,
    height: 44,
  },
  // Day-of-week selector
  daysRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    justifyContent: 'space-between',
  },
  dayChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONTS.semibold,
  },
});

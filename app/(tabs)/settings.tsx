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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSettingsStore, useAuthStore, useSessionsStore } from '../../src/store';
import { useThemeColors, useFontSize } from '../../src/hooks/useColorScheme';
import { requestHealthPermissions, isHealthKitAvailable } from '../../src/utils/healthKit';
import { performAppleSignIn } from '../../src/utils/appleAuth';
import { pushAll, pullAndMerge } from '../../src/services/syncService';
import { exportSessionsAsCSV } from '../../src/utils/csvExport';
import { COLOR_THEMES } from '../../src/constants/colorThemes';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useHaptics } from '../../src/hooks/useHaptics';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../../src/constants';
import { PickerModal } from '../../src/components/PickerModal';
import { WheelPickerModal, WheelColumn } from '../../src/components/WheelPickerModal';

interface SettingRowProps {
  label: string;
  value: boolean;
  onToggle: (val: boolean) => void;
  theme: ReturnType<typeof useThemeColors>;
  badge?: string;
  onHaptic?: () => void;
  labelSize?: number;
}

function SettingRow({ label, value, onToggle, theme, badge, onHaptic, labelSize }: SettingRowProps) {
  return (
    <View
      style={[styles.settingRow, { borderBottomColor: theme.border }]}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
    >
      <View style={styles.settingLabelRow}>
        <Text style={[styles.settingLabel, { color: theme.text }, labelSize != null && { fontSize: labelSize }]}>{label}</Text>
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

type PickerType = 'fastInterval' | 'slowInterval' | 'rounds' | 'reminderTime' | 'stepGoal' | null;

const ROUND_COLUMNS: WheelColumn[] = [
  { min: 1, max: 15, step: 1, pad: 1 },
];
const STEP_GOAL_OPTIONS = [5000, 7500, 10000, 12500, 15000, 20000];

const INTERVAL_COLUMNS: WheelColumn[] = [
  { min: 1, max: 5, step: 1, pad: 1 },   // minutes
  { min: 0, max: 55, step: 5, pad: 2 },   // seconds
];
const TIME_COLUMNS: WheelColumn[] = [
  { min: 0, max: 23, step: 1, pad: 2 },  // hours
  { min: 0, max: 55, step: 5, pad: 2 },  // minutes
];

function formatInterval(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function formatStepGoal(goal: number): string {
  return goal >= 1000 ? `${goal / 1000}k` : String(goal);
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useThemeColors();
  const fontSize = useFontSize();
  const settings = useSettingsStore();
  const haptics = useHaptics();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [activePicker, setActivePicker] = useState<PickerType>(null);
  const sessions = useSessionsStore((s) => s.sessions);
  const user = useAuthStore((s) => s.user);
  const isAnonymous = useAuthStore((s) => s.isAnonymous);

  const handleSignInWithApple = async () => {
    setIsSigningIn(true);
    try {
      const { idToken, nonce, authorizationCode } = await performAppleSignIn();

      if (isAnonymous && user) {
        await useAuthStore.getState().linkAppleAccount(idToken, nonce, authorizationCode);
      } else {
        await useAuthStore.getState().signInWithApple(idToken, nonce, authorizationCode);
      }

      await pullAndMerge();
      await pushAll();

      Alert.alert(t('auth.signInSuccess'), t('auth.dataSynced'));
    } catch (error: any) {
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert(t('common.error'), error.message);
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
          } catch (e: any) {
            Alert.alert(t('common.error'), e.message);
          }
        },
      },
    ]);
  };

  const handleHealthToggle = async (val: boolean) => {
    if (val) {
      if (!isHealthKitAvailable()) {
        settings.update({ healthIntegration: false });
        return;
      }
      const granted = await requestHealthPermissions();
      settings.update({ healthIntegration: granted });
    } else {
      settings.update({ healthIntegration: false });
    }
  };

  const handleProFeatureTap = () => {
    if (!settings.isPro) {
      router.push('/paywall');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.titleRow}>
          <Text style={[styles.screenTitle, { color: theme.text, fontSize: fontSize.xxl }]}>{t('settings.title')}</Text>
          {settings.isPro && (
            <View style={[styles.proStatusBadge, { backgroundColor: theme.accent }]}>
              <Ionicons name="diamond" size={12} color={COLORS.white} />
              <Text style={styles.proStatusText}>PRO</Text>
            </View>
          )}
        </View>

        {/* Sound & Haptics */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontSize: fontSize.xs }]}>
            {t('settings.feedback')}
          </Text>
          <SettingRow
            label={t('settings.sound')}
            value={settings.soundEnabled}
            onToggle={(val) => settings.update({ soundEnabled: val })}
            theme={theme}
            onHaptic={haptics.light}
            labelSize={fontSize.md}
          />
          <SettingRow
            label={t('settings.vibration')}
            value={settings.vibrationEnabled}
            onToggle={(val) => settings.update({ vibrationEnabled: val })}
            theme={theme}
            onHaptic={haptics.light}
            labelSize={fontSize.md}
          />
          {settings.soundEnabled && (
            <View style={styles.soundTypeRow}>
              {(['beep', 'chime', 'voice'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.soundTypeOption,
                    {
                      backgroundColor: settings.soundType === type ? theme.primary : 'transparent',
                      borderColor: theme.primary,
                    },
                  ]}
                  onPress={() => {
                    haptics.selection();
                    settings.update({ soundType: type });
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.soundTypeText, { color: settings.soundType === type ? COLORS.white : theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
                    {t(`settings.sound${type.charAt(0).toUpperCase() + type.slice(1)}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Timer */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontSize: fontSize.xs }]}>
            {t('settings.timer')}
          </Text>

          {/* Fast Interval (PRO) */}
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: theme.border }]}
            onPress={() => { haptics.selection(); if (!settings.isPro) { handleProFeatureTap(); return; } setActivePicker('fastInterval'); }}
            activeOpacity={0.7}
          >
            <View style={styles.settingLabelRow}>
              <Text style={[styles.settingLabel, { color: theme.text, fontSize: fontSize.md }]}>
                {t('sessionCard.fastInterval')}
              </Text>
              {!settings.isPro && (
                <View style={styles.proBadge}>
                  <Ionicons name="diamond" size={10} color={COLORS.white} />
                </View>
              )}
            </View>
            <View style={styles.pickerValueRow}>
              <Text style={[styles.pickerValueText, { color: theme.primary }]}>
                {formatInterval(settings.fastInterval)}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Slow Interval (PRO) */}
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: theme.border }]}
            onPress={() => { haptics.selection(); if (!settings.isPro) { handleProFeatureTap(); return; } setActivePicker('slowInterval'); }}
            activeOpacity={0.7}
          >
            <View style={styles.settingLabelRow}>
              <Text style={[styles.settingLabel, { color: theme.text, fontSize: fontSize.md }]}>
                {t('sessionCard.slowInterval')}
              </Text>
              {!settings.isPro && (
                <View style={styles.proBadge}>
                  <Ionicons name="diamond" size={10} color={COLORS.white} />
                </View>
              )}
            </View>
            <View style={styles.pickerValueRow}>
              <Text style={[styles.pickerValueText, { color: theme.accent }]}>
                {formatInterval(settings.slowInterval)}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Rounds (PRO) */}
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: theme.border }]}
            onPress={() => { haptics.selection(); if (!settings.isPro) { handleProFeatureTap(); return; } setActivePicker('rounds'); }}
            activeOpacity={0.7}
          >
            <View style={styles.settingLabelRow}>
              <Text style={[styles.settingLabel, { color: theme.text, fontSize: fontSize.md }]}>
                {t('settings.customRounds')}
              </Text>
              {!settings.isPro && (
                <View style={styles.proBadge}>
                  <Ionicons name="diamond" size={10} color={COLORS.white} />
                </View>
              )}
            </View>
            <View style={styles.pickerValueRow}>
              <Text style={[styles.pickerValueText, { color: theme.primary }]}>
                {settings.roundCount}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </View>
          </TouchableOpacity>

          <SettingRow
            label={t('settings.warmUp')}
            value={settings.warmUpEnabled}
            onToggle={(val) => settings.update({ warmUpEnabled: val })}
            theme={theme}
            onHaptic={haptics.light}
            labelSize={fontSize.md}
          />
          <SettingRow
            label={t('settings.coolDown')}
            value={settings.coolDownEnabled}
            onToggle={(val) => settings.update({ coolDownEnabled: val })}
            theme={theme}
            onHaptic={haptics.light}
            labelSize={fontSize.md}
          />
        </View>

        {/* Health */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontSize: fontSize.xs }]}>
            {t('settings.health')}
          </Text>
          <SettingRow
            label={t('settings.appleHealth')}
            value={settings.healthIntegration}
            onToggle={handleHealthToggle}
            theme={theme}
            onHaptic={haptics.light}
            labelSize={fontSize.md}
          />
          {settings.healthIntegration && (
            <TouchableOpacity
              style={[styles.settingRow, { borderBottomColor: 'transparent' }]}
              onPress={() => { haptics.selection(); setActivePicker('stepGoal'); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.settingLabel, { color: theme.text, fontSize: fontSize.md }]}>
                {t('settings.dailyStepGoalTitle')}
              </Text>
              <View style={styles.pickerValueRow}>
                <Text style={[styles.pickerValueText, { color: theme.primary }]}>
                  {formatStepGoal(settings.dailyStepGoal)}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Accessibility */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontSize: fontSize.xs }]}>
            {t('settings.accessibility')}
          </Text>
          <SettingRow
            label={t('settings.highContrast')}
            value={settings.highContrastMode}
            onToggle={(val) => settings.update({ highContrastMode: val })}
            theme={theme}
            onHaptic={haptics.light}
            labelSize={fontSize.md}
          />
        </View>

        {/* Account */}
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
                style={[styles.settingRow, { borderBottomColor: 'transparent' }]}
                onPress={handleSignOut}
              >
                <Text style={[styles.settingLabel, { color: COLORS.error }]}>
                  {t('auth.signOut')}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* PRO */}
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
            <Text style={styles.proSubtitle}>
              {t('settings.proSubtitle')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Reminders (PRO) */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontSize: fontSize.xs }]}>
            {t('settings.reminders')}
          </Text>
          <TouchableOpacity
            onPress={settings.isPro ? undefined : handleProFeatureTap}
            activeOpacity={settings.isPro ? 1 : 0.7}
          >
            <SettingRow
              label={t('settings.walkReminder')}
              value={settings.reminderEnabled}
              onToggle={async (val) => {
                if (!settings.isPro) {
                  handleProFeatureTap();
                  return;
                }
                const { scheduleWalkReminder, cancelNotification, requestNotificationPermissions } = await import('../../src/utils/notifications');
                if (val) {
                  const granted = await requestNotificationPermissions();
                  if (!granted) return;
                  settings.update({ reminderEnabled: true });
                  const [h, m] = settings.reminderTime.split(':').map(Number);
                  await scheduleWalkReminder(h, m, t('notifications.reminderTitle'), t('notifications.reminderBody'));
                } else {
                  settings.update({ reminderEnabled: false });
                  await cancelNotification('walk-reminder');
                }
              }}
              theme={theme}
              badge={settings.isPro ? undefined : t('settings.proFeature')}
              onHaptic={haptics.light}
              labelSize={fontSize.md}
            />
          </TouchableOpacity>
          {settings.isPro && settings.reminderEnabled && (
            <TouchableOpacity
              style={[styles.settingRow, { borderBottomColor: 'transparent' }]}
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
          )}
        </View>

        {/* Color Theme (PRO) */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <View style={styles.settingLabelRow}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontSize: fontSize.xs }]}>
              {t('settings.colorTheme')}
            </Text>
            {!settings.isPro && (
              <View style={styles.proBadge}>
                <Ionicons name="diamond" size={10} color={COLORS.white} />
              </View>
            )}
          </View>
          <View style={styles.themeGrid}>
            {COLOR_THEMES.map((ct) => {
              const isSelected = settings.colorThemeId === ct.id;
              const preview = theme.isDark ? ct.dark : ct.light;
              return (
                <TouchableOpacity
                  key={ct.id}
                  style={[
                    styles.themePreviewCard,
                    {
                      backgroundColor: preview.card,
                      borderWidth: isSelected ? 2.5 : 1,
                      borderColor: isSelected ? ct.primary : preview.border,
                    },
                  ]}
                  onPress={() => {
                    haptics.selection();
                    if (!settings.isPro) {
                      handleProFeatureTap();
                      return;
                    }
                    settings.update({ colorThemeId: ct.id });
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.themePreviewStripe, { backgroundColor: ct.primary }]} />
                  <View style={styles.themePreviewBody}>
                    <View style={[styles.themePreviewDot, { backgroundColor: ct.accent }]} />
                    <View style={[styles.themePreviewLine, { backgroundColor: preview.textSecondary + '40' }]} />
                    <View style={[styles.themePreviewLine, styles.themePreviewLineShort, { backgroundColor: preview.textSecondary + '25' }]} />
                  </View>
                  {isSelected && (
                    <View style={[styles.themeCheckmark, { backgroundColor: ct.primary }]}>
                      <Ionicons name="checkmark" size={8} color={COLORS.white} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Starting Phase (PRO) */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <View style={styles.settingLabelRow}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontSize: fontSize.xs }]}>
              {t('settings.startingPhaseTitle')}
            </Text>
            {!settings.isPro && (
              <View style={styles.proBadge}>
                <Ionicons name="diamond" size={10} color={COLORS.white} />
              </View>
            )}
          </View>
          <View style={styles.phaseToggleRow}>
            <TouchableOpacity
              style={[
                styles.phaseOption,
                {
                  backgroundColor: settings.startingPhase === 'fast' ? theme.primary : 'transparent',
                  borderColor: theme.primary,
                },
              ]}
              onPress={() => {
                haptics.selection();
                if (!settings.isPro) { handleProFeatureTap(); return; }
                settings.update({ startingPhase: 'fast' });
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.phaseOptionText, { color: settings.startingPhase === 'fast' ? COLORS.white : theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
                {t('settings.startFast')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.phaseOption,
                {
                  backgroundColor: settings.startingPhase === 'slow' ? theme.accent : 'transparent',
                  borderColor: theme.accent,
                },
              ]}
              onPress={() => {
                haptics.selection();
                if (!settings.isPro) { handleProFeatureTap(); return; }
                settings.update({ startingPhase: 'slow' });
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.phaseOptionText, { color: settings.startingPhase === 'slow' ? COLORS.white : theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
                {t('settings.startSlow')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Export Data (PRO) */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: 'transparent' }]}
            onPress={async () => {
              if (!settings.isPro) { handleProFeatureTap(); return; }
              if (sessions.length === 0) return;
              await exportSessionsAsCSV(sessions);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.settingLabelRow}>
              <Text style={[styles.settingLabel, { color: theme.text, fontSize: fontSize.md }]}>
                {t('settings.exportData')}
              </Text>
              {!settings.isPro && (
                <View style={styles.proBadge}>
                  <Ionicons name="diamond" size={10} color={COLORS.white} />
                </View>
              )}
            </View>
            <Ionicons name="download-outline" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontSize: fontSize.xs }]}>
            {t('settings.about')}
          </Text>
          <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.settingLabel, { color: theme.text, fontSize: fontSize.md }]}>{t('settings.version')}</Text>
            <Text style={[styles.settingValue, { color: theme.textSecondary }]}>
              1.0.0
            </Text>
          </View>
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
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: theme.border }]}
            accessibilityRole="button"
            onPress={async () => {
              try {
                const { restorePurchases } = await import('../../src/utils/revenueCat');
                const { isPro } = await restorePurchases();
                if (isPro) {
                  settings.update({ isPro: true });
                  Alert.alert(t('common.ok'), t('settings.restoreSuccess'));
                } else {
                  Alert.alert(t('common.ok'), t('settings.restoreNone'));
                }
              } catch {
                Alert.alert(t('common.error'), t('settings.restoreFailed'));
              }
            }}
          >
            <Text style={[styles.settingLabel, { color: theme.text, fontSize: fontSize.md }]}>
              {t('settings.restorePurchases')}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: 'transparent' }]}
            accessibilityRole="button"
            onPress={handleDeleteAccount}
          >
            <Text style={[styles.settingLabel, { color: '#D85E43', fontSize: fontSize.md }]}>
              {t('auth.deleteAccount')}
            </Text>
            <Ionicons name="trash-outline" size={18} color="#D85E43" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Wheel Picker Modals */}
      <WheelPickerModal
        visible={activePicker === 'fastInterval'}
        title={t('sessionCard.fastInterval')}
        columns={INTERVAL_COLUMNS}
        values={[Math.floor(settings.fastInterval / 60), settings.fastInterval % 60]}
        onConfirm={([m, s]) => settings.update({ fastInterval: m * 60 + s })}
        onClose={() => setActivePicker(null)}
        accentColor={theme.primary}
      />
      <WheelPickerModal
        visible={activePicker === 'slowInterval'}
        title={t('sessionCard.slowInterval')}
        columns={INTERVAL_COLUMNS}
        values={[Math.floor(settings.slowInterval / 60), settings.slowInterval % 60]}
        onConfirm={([m, s]) => settings.update({ slowInterval: m * 60 + s })}
        onClose={() => setActivePicker(null)}
        accentColor={theme.accent}
      />
      <WheelPickerModal
        visible={activePicker === 'reminderTime'}
        title={t('settings.reminderTime')}
        columns={TIME_COLUMNS}
        values={settings.reminderTime.split(':').map(Number)}
        onConfirm={async ([h, m]) => {
          const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          settings.update({ reminderTime: time });
          const { scheduleWalkReminder } = await import('../../src/utils/notifications');
          await scheduleWalkReminder(h, m, t('notifications.reminderTitle'), t('notifications.reminderBody'));
        }}
        onClose={() => setActivePicker(null)}
      />
      {/* List Picker Modals */}
      <WheelPickerModal
        visible={activePicker === 'rounds'}
        title={t('settings.customRounds')}
        columns={ROUND_COLUMNS}
        values={[settings.roundCount]}
        separator=""
        onConfirm={([n]) => settings.update({ roundCount: n })}
        onClose={() => setActivePicker(null)}
      />
      <PickerModal<number>
        visible={activePicker === 'stepGoal'}
        title={t('settings.dailyStepGoalTitle')}
        options={STEP_GOAL_OPTIONS.map((g) => ({ label: g.toLocaleString(), value: g }))}
        selectedValue={settings.dailyStepGoal}
        onSelect={(val) => settings.update({ dailyStepGoal: val })}
        onClose={() => setActivePicker(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  screenTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
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
    fontWeight: '600',
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
  proBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
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
    fontWeight: '700',
    color: COLORS.white,
  },
  proSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: 'rgba(255,255,255,0.9)',
  },
  themeGrid: {
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.md,
  },
  themePreviewCard: {
    flex: 1,
    flexShrink: 1,
    height: 52,
    borderRadius: 8,
    overflow: 'hidden' as const,
    position: 'relative' as const,
  },
  themePreviewStripe: {
    height: 5,
  },
  themePreviewBody: {
    flex: 1,
    padding: 3,
    gap: 3,
  },
  themePreviewDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  themePreviewLine: {
    height: 2,
    borderRadius: 1,
    width: '75%' as unknown as number,
  },
  themePreviewLineShort: {
    width: '45%' as unknown as number,
  },
  themeCheckmark: {
    position: 'absolute' as const,
    top: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  phaseToggleRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  phaseOption: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  phaseOptionText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  soundTypeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  soundTypeOption: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  soundTypeText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  pickerValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pickerValueText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
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
    fontWeight: '700',
    color: COLORS.white,
  },
});

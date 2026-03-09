import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, LogBox } from 'react-native';

// expo-notifications' native module tries to call getRegistrationInfoAsync during
// init on iOS Simulator where the APNs keychain entitlement is absent.
// This is a simulator-only false positive — suppress the dev overlay.
LogBox.ignoreLogs(['getRegistrationInfoAsync', 'Keychain access failed']);
import { setAudioModeAsync } from 'expo-audio';
import { useTranslation } from 'react-i18next';
import { useSettingsStore, useSessionsStore, useAuthStore } from '../src/store';
import { useSync } from '../src/hooks/useSync';
import { initSentry } from '../src/utils/sentry';
import { initRevenueCat, checkSubscriptionStatus, identifyUser } from '../src/utils/revenueCat';
import * as Notifications from 'expo-notifications';
import {
  scheduleStreakProtection,
  scheduleWeeklySummary,
  checkNotificationPermissions,
} from '../src/utils/notifications';
import { COLORS } from '../src/constants';
import { isHealthKitAvailable, getLatestWeight, getLatestHeight } from '../src/utils/healthKit';

// Suppress phase-transition notifications when app is in foreground
// (sound/haptic feedback already handles foreground UX)
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isPhaseTransition =
      notification.request.identifier.startsWith('phase-transition-');
    return {
      shouldPlaySound: !isPhaseTransition,
      shouldSetBadge: false,
      shouldShowBanner: !isPhaseTransition,
      shouldShowList: !isPhaseTransition,
    };
  },
});
import '../src/i18n';

// Initialize Sentry and RevenueCat as early as possible
initSentry();
initRevenueCat();

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const { t } = useTranslation();

  useSync();

  useEffect(() => {
    // Configure audio for background playback
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    });

    // Hydrate stores from AsyncStorage
    const hydrateStores = async () => {
      await Promise.all([
        useSettingsStore.getState().hydrate(),
        useSessionsStore.getState().hydrate(),
        useAuthStore.getState().hydrate(),
      ]);

      // Dynamically import and hydrate optional stores
      try {
        const { useBadgesStore } = await import('../src/store/badgesStore');
        const { useProfileStore } = await import('../src/store/profileStore');
        await Promise.all([
          useBadgesStore.getState().hydrate(),
          useProfileStore.getState().hydrate(),
        ]);
      } catch {
        // Stores may not exist yet during development
      }

      // Auto-import weight/height from HealthKit if enabled
      const healthEnabled = useSettingsStore.getState().healthIntegration;
      if (healthEnabled && isHealthKitAvailable()) {
        try {
          const { useProfileStore } = await import('../src/store/profileStore');
          const profile = useProfileStore.getState();
          const [weight, height] = await Promise.all([
            getLatestWeight(),
            getLatestHeight(),
          ]);
          const updates: Record<string, number> = {};
          if (weight && !profile.weight) updates.weight = weight;
          if (height && !profile.height) updates.height = height;
          if (Object.keys(updates).length > 0) {
            useProfileStore.getState().update(updates);
          }
        } catch {
          // HealthKit not available or permission denied
        }
      }

      // Identify RevenueCat user if logged in & sync entitlements
      const authState = useAuthStore.getState();
      if (authState.user?.id) {
        await identifyUser(authState.user.id).catch(() => {});
      }
      const isProFromRC = await checkSubscriptionStatus().catch(() => false);
      useSettingsStore.getState().update({ isPro: isProFromRC });

      setReady(true);
    };

    hydrateStores();
  }, []);

  useEffect(() => {
    if (!ready) return;

    const setupNotifications = async () => {
      const granted = await checkNotificationPermissions();
      if (!granted) return;

      // Get stats for streak
      const stats = useSessionsStore.getState().stats;
      if (stats.currentStreak > 0) {
        scheduleStreakProtection(
          stats.currentStreak,
          t('notifications.streakProtectionTitle'),
          t('notifications.streakProtectionBody', { streak: stats.currentStreak }),
        );
      }

      // Schedule weekly summary
      scheduleWeeklySummary(
        t('notifications.weeklySummaryTitle'),
        t('notifications.weeklySummaryBody', { walks: stats.totalSessions, calories: stats.totalCalories }),
      );
    };

    setupNotifications().catch(() => {});

    // Set up badge unlock notifications
    const setupBadgeNotifications = async () => {
      const { useBadgesStore } = await import('../src/store/badgesStore');
      useBadgesStore.getState().setOnBadgeUnlocked((_id, titleKey, _descKey) => {
        Notifications.scheduleNotificationAsync({
          identifier: `badge-unlock-${_id}`,
          content: {
            title: t('notifications.badgeUnlocked'),
            body: t(titleKey),
          },
          trigger: null,
        });
      });
    };
    setupBadgeNotifications().catch(() => {});

    // Navigate to timer when user taps walk reminder notification
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const id = response.notification.request.identifier;
      if (id === 'walk-reminder') {
        router.replace('/(tabs)');
      }
    });
    return () => subscription.remove();
  }, [ready]);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen
        name="summary"
        options={{ presentation: 'modal', gestureEnabled: false }}
      />
      <Stack.Screen
        name="paywall"
        options={{ presentation: 'modal', gestureEnabled: true }}
      />
      <Stack.Screen
        name="privacy"
        options={{ presentation: 'modal', gestureEnabled: true }}
      />
      <Stack.Screen
        name="terms"
        options={{ presentation: 'modal', gestureEnabled: true }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});

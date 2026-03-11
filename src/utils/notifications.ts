import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import i18n from '../i18n';

// ─── Breathing-specific reminder tips (rotated daily) ────────────────────────

const REMINDER_TIPS = [
  'notifications.tip1',
  'notifications.tip2',
  'notifications.tip3',
  'notifications.tip4',
  'notifications.tip5',
  'notifications.tip6',
  'notifications.tip7',
];

function getDailyTip(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  return i18n.t(REMINDER_TIPS[dayOfYear % REMINDER_TIPS.length]);
}

// ─── Permissions ─────────────────────────────────────────────────────────────

/** Check if notifications are already granted (does NOT prompt the user) */
export async function checkNotificationPermissions(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    return true;
  } catch {
    // Keychain / APNs entitlement not available (e.g. iOS Simulator)
    return false;
  }
}

// ─── Scheduled notifications ─────────────────────────────────────────────────

export async function scheduleStreakProtection(streak: number): Promise<void> {
  await cancelNotification('streak-protection');

  await Notifications.scheduleNotificationAsync({
    identifier: 'streak-protection',
    content: {
      title: i18n.t('notifications.streakProtectionTitle'),
      body: i18n.t('notifications.streakProtectionBody', { streak }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  });
}

export async function scheduleWeeklySummary(
  sessions: number,
  minutes: number,
): Promise<void> {
  await cancelNotification('weekly-summary');

  await Notifications.scheduleNotificationAsync({
    identifier: 'weekly-summary',
    content: {
      title: i18n.t('notifications.weeklySummaryTitle'),
      body: i18n.t('notifications.weeklySummaryBody', { sessions, minutes }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1,
      hour: 10,
      minute: 0,
    },
  });
}

export async function scheduleBreatheReminder(
  hour: number,
  minute: number,
): Promise<void> {
  await cancelNotification('breathe-reminder');

  await Notifications.scheduleNotificationAsync({
    identifier: 'breathe-reminder',
    content: {
      title: i18n.t('notifications.reminderTitle'),
      body: getDailyTip(),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function scheduleSessionComplete(techniqueName: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: 'session-complete',
    content: {
      title: i18n.t('notifications.sessionCompleteTitle'),
      body: i18n.t('notifications.sessionCompleteBody', { technique: techniqueName }),
    },
    trigger: null,
  });
}

export async function cancelNotification(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

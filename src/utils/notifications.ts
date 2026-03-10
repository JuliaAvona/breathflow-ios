import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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

export async function scheduleStreakProtection(
  _streak: number,
  title: string,
  body: string,
): Promise<void> {
  await cancelNotification('streak-protection');

  await Notifications.scheduleNotificationAsync({
    identifier: 'streak-protection',
    content: {
      title,
      body,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  });
}

export async function scheduleWeeklySummary(
  title: string,
  body: string,
): Promise<void> {
  await cancelNotification('weekly-summary');

  await Notifications.scheduleNotificationAsync({
    identifier: 'weekly-summary',
    content: {
      title,
      body,
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
  title: string,
  body: string,
): Promise<void> {
  await cancelNotification('breathe-reminder');

  await Notifications.scheduleNotificationAsync({
    identifier: 'breathe-reminder',
    content: {
      title,
      body,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelNotification(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

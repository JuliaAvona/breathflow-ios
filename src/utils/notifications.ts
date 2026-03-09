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

export async function scheduleWalkReminder(
  hour: number,
  minute: number,
  title: string,
  body: string,
): Promise<void> {
  await cancelNotification('walk-reminder');

  await Notifications.scheduleNotificationAsync({
    identifier: 'walk-reminder',
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

// --- Phase transition notifications (between rounds) ---

export interface PhaseTransition {
  secondsFromNow: number;
  phase: string;
  round: number;
  totalRounds: number;
}

export function computePhaseTransitions(config: {
  fastDuration: number;
  slowDuration: number;
  rounds: number;
  currentRound: number;
  timeRemaining: number;
  phase: string;
  warmUp: boolean;
  coolDown: boolean;
  warmUpDuration: number;
  coolDownDuration: number;
}): PhaseTransition[] {
  const transitions: PhaseTransition[] = [];
  let elapsed = 0;

  // Start from the current phase's remaining time
  const startPhase = config.phase;
  const startRound = config.currentRound;

  // Time remaining in the current phase
  elapsed += config.timeRemaining;

  // Determine what comes after the current phase
  if (startPhase === 'WARM_UP') {
    transitions.push({
      secondsFromNow: elapsed,
      phase: 'FAST',
      round: 1,
      totalRounds: config.rounds,
    });
    // Then go through all rounds
    for (let round = 1; round <= config.rounds; round++) {
      elapsed += config.fastDuration;
      transitions.push({ secondsFromNow: elapsed, phase: 'SLOW', round, totalRounds: config.rounds });
      elapsed += config.slowDuration;
      if (round < config.rounds) {
        transitions.push({ secondsFromNow: elapsed, phase: 'FAST', round: round + 1, totalRounds: config.rounds });
      } else if (config.coolDown) {
        transitions.push({ secondsFromNow: elapsed, phase: 'COOL_DOWN', round, totalRounds: config.rounds });
      } else {
        transitions.push({ secondsFromNow: elapsed, phase: 'DONE', round, totalRounds: config.rounds });
      }
    }
    if (config.coolDown) {
      elapsed += config.coolDownDuration;
      transitions.push({ secondsFromNow: elapsed, phase: 'DONE', round: config.rounds, totalRounds: config.rounds });
    }
  } else if (startPhase === 'FAST') {
    // Current FAST phase ends → SLOW
    transitions.push({ secondsFromNow: elapsed, phase: 'SLOW', round: startRound, totalRounds: config.rounds });
    elapsed += config.slowDuration;
    // Continue from current round's SLOW onward
    if (startRound < config.rounds) {
      transitions.push({ secondsFromNow: elapsed, phase: 'FAST', round: startRound + 1, totalRounds: config.rounds });
    } else if (config.coolDown) {
      transitions.push({ secondsFromNow: elapsed, phase: 'COOL_DOWN', round: startRound, totalRounds: config.rounds });
    } else {
      transitions.push({ secondsFromNow: elapsed, phase: 'DONE', round: startRound, totalRounds: config.rounds });
    }
    // Remaining rounds
    for (let round = startRound + 1; round <= config.rounds; round++) {
      elapsed += config.fastDuration;
      transitions.push({ secondsFromNow: elapsed, phase: 'SLOW', round, totalRounds: config.rounds });
      elapsed += config.slowDuration;
      if (round < config.rounds) {
        transitions.push({ secondsFromNow: elapsed, phase: 'FAST', round: round + 1, totalRounds: config.rounds });
      } else if (config.coolDown) {
        transitions.push({ secondsFromNow: elapsed, phase: 'COOL_DOWN', round, totalRounds: config.rounds });
      } else {
        transitions.push({ secondsFromNow: elapsed, phase: 'DONE', round, totalRounds: config.rounds });
      }
    }
    if (config.coolDown) {
      elapsed += config.coolDownDuration;
      transitions.push({ secondsFromNow: elapsed, phase: 'DONE', round: config.rounds, totalRounds: config.rounds });
    }
  } else if (startPhase === 'SLOW') {
    // Current SLOW phase ends → next FAST or COOL_DOWN or DONE
    if (startRound < config.rounds) {
      transitions.push({ secondsFromNow: elapsed, phase: 'FAST', round: startRound + 1, totalRounds: config.rounds });
    } else if (config.coolDown) {
      transitions.push({ secondsFromNow: elapsed, phase: 'COOL_DOWN', round: startRound, totalRounds: config.rounds });
    } else {
      transitions.push({ secondsFromNow: elapsed, phase: 'DONE', round: startRound, totalRounds: config.rounds });
    }
    // Remaining rounds
    for (let round = startRound + 1; round <= config.rounds; round++) {
      elapsed += config.fastDuration;
      transitions.push({ secondsFromNow: elapsed, phase: 'SLOW', round, totalRounds: config.rounds });
      elapsed += config.slowDuration;
      if (round < config.rounds) {
        transitions.push({ secondsFromNow: elapsed, phase: 'FAST', round: round + 1, totalRounds: config.rounds });
      } else if (config.coolDown) {
        transitions.push({ secondsFromNow: elapsed, phase: 'COOL_DOWN', round, totalRounds: config.rounds });
      } else {
        transitions.push({ secondsFromNow: elapsed, phase: 'DONE', round, totalRounds: config.rounds });
      }
    }
    if (config.coolDown) {
      elapsed += config.coolDownDuration;
      transitions.push({ secondsFromNow: elapsed, phase: 'DONE', round: config.rounds, totalRounds: config.rounds });
    }
  } else if (startPhase === 'COOL_DOWN') {
    transitions.push({ secondsFromNow: elapsed, phase: 'DONE', round: config.rounds, totalRounds: config.rounds });
  }

  return transitions;
}

export async function schedulePhaseNotifications(
  transitions: PhaseTransition[],
  getContent: (t: PhaseTransition) => { title: string; body: string },
): Promise<void> {
  for (let i = 0; i < transitions.length; i++) {
    const transition = transitions[i];
    if (transition.secondsFromNow <= 0) continue;

    const { title, body } = getContent(transition);
    await Notifications.scheduleNotificationAsync({
      identifier: `phase-transition-${i}`,
      content: {
        title,
        body,
        sound: 'default',
        data: { type: 'phase-transition' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: transition.secondsFromNow,
        repeats: false,
      },
    });
  }
}

export async function cancelPhaseNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (notification.identifier.startsWith('phase-transition-')) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

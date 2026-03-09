import { NativeModules, Platform } from 'react-native';
import { TimerPhase } from '../types';

const { LiveActivityModule } = NativeModules;

/**
 * Check if Live Activities are available (iOS 16.1+ and user permission).
 */
export async function isLiveActivityAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios' || !LiveActivityModule) return false;
  try {
    return await LiveActivityModule.isAvailable();
  } catch {
    return false;
  }
}

/**
 * Start a new Live Activity for the walking session.
 * Called once when the timer starts.
 */
export async function startLiveActivity(params: {
  totalRounds: number;
  fastDuration: number;
  slowDuration: number;
  warmUpDuration: number;
  coolDownDuration: number;
  phase: TimerPhase;
  currentRound: number;
  timeRemaining: number;
}): Promise<void> {
  if (Platform.OS !== 'ios' || !LiveActivityModule) return;
  try {
    await LiveActivityModule.startActivity({
      totalRounds: params.totalRounds,
      fastDurationSec: params.fastDuration,
      slowDurationSec: params.slowDuration,
      warmUpDurationSec: params.warmUpDuration,
      coolDownDurationSec: params.coolDownDuration,
      phase: params.phase,
      currentRound: params.currentRound,
      phaseEndTimestamp: Date.now() + params.timeRemaining * 1000,
      isPaused: false,
      pausedTimeRemaining: 0,
    });
  } catch {
    // Live Activity is non-critical — silently fail
  }
}

/**
 * Update the Live Activity on phase transitions, pause, or resume.
 */
export async function updateLiveActivity(params: {
  phase: TimerPhase;
  currentRound: number;
  timeRemaining: number;
  isPaused: boolean;
  isPhaseChange?: boolean;
}): Promise<void> {
  if (Platform.OS !== 'ios' || !LiveActivityModule) return;
  try {
    await LiveActivityModule.updateActivity({
      phase: params.phase,
      currentRound: params.currentRound,
      phaseEndTimestamp: params.isPaused
        ? Date.now() + 999999 * 1000 // Far future — iOS won't count down
        : Date.now() + params.timeRemaining * 1000,
      isPaused: params.isPaused,
      pausedTimeRemaining: params.isPaused ? params.timeRemaining : 0,
      isPhaseChange: params.isPhaseChange ?? false,
    });
  } catch {
    // Silently fail
  }
}

/**
 * End the Live Activity (timer stopped or session complete).
 */
export async function endLiveActivity(): Promise<void> {
  if (Platform.OS !== 'ios' || !LiveActivityModule) return;
  try {
    await LiveActivityModule.endActivity();
  } catch {
    // Silently fail
  }
}

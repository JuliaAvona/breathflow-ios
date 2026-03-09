import { Platform, Alert, NativeModules } from 'react-native';
import { Session } from '../types';

// Apple HealthKit integration via react-native-health.
// Gracefully degrades when native module is unavailable (Expo Go).

let AppleHealthKit: any = null;
let HealthConstants: any = null;

try {
  // The native module methods live on NativeModules.AppleHealthKit directly.
  // react-native-health's index.js uses Object.assign({}, NativeModule, ...)
  // which fails to copy native methods (they're on the prototype).
  // So we access the native module directly and grab constants separately.
  const nativeModule = NativeModules.AppleHealthKit;
  if (nativeModule && typeof nativeModule.initHealthKit === 'function') {
    AppleHealthKit = nativeModule;
    // Get constants (Permissions, Units, etc.) from the JS wrapper
    const mod = require('react-native-health');
    const wrapper = mod.default || mod;
    HealthConstants = wrapper?.Constants;
  }
} catch {
  // Not available — Expo Go or module not installed
}

export function isHealthKitAvailable(): boolean {
  return Platform.OS === 'ios' && AppleHealthKit !== null;
}

export async function requestHealthPermissions(): Promise<boolean> {
  if (!isHealthKitAvailable()) {
    Alert.alert(
      'Apple Health Unavailable',
      'Apple Health integration requires a full app build. It is not available in Expo Go.',
    );
    return false;
  }

  try {
    const permissions = {
      permissions: {
        read: [
          HealthConstants.Permissions.StepCount,
          HealthConstants.Permissions.ActiveEnergyBurned,
          HealthConstants.Permissions.Weight,
          HealthConstants.Permissions.Height,
        ],
        write: [
          HealthConstants.Permissions.ActiveEnergyBurned,
          HealthConstants.Permissions.Workout,
        ],
      },
    };
    return new Promise((resolve) => {
      AppleHealthKit.initHealthKit(permissions, (err: string) => {
        if (err) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  } catch {
    return false;
  }
}

export async function saveSessionToHealth(session: Session): Promise<boolean> {
  if (!isHealthKitAvailable()) return false;

  try {
    const startDate = new Date(session.startedAt).toISOString();
    const endDate = new Date(session.completedAt).toISOString();

    return new Promise((resolve) => {
      AppleHealthKit.saveWorkout(
        {
          type: 'Walking',
          startDate,
          endDate,
          energyBurned: session.estimatedCalories,
          energyBurnedUnit: 'calorie',
        },
        (err: string) => {
          if (err) {
            resolve(false);
          } else {
            resolve(true);
          }
        },
      );
    });
  } catch {
    return false;
  }
}

export async function getTodayStepCount(): Promise<number> {
  if (!isHealthKitAvailable()) return 0;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return new Promise((resolve) => {
      AppleHealthKit.getStepCount(
        { date: today.toISOString() },
        (err: string, results: { value: number }) => {
          if (err || !results) {
            resolve(0);
          } else {
            resolve(Math.round(results.value));
          }
        },
      );
    });
  } catch {
    return 0;
  }
}

export async function getStepCountBetween(
  startDate: Date,
  endDate: Date,
): Promise<number> {
  if (!isHealthKitAvailable()) return 0;

  try {
    return new Promise((resolve) => {
      AppleHealthKit.getStepCount(
        {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        (err: string, results: { value: number }) => {
          if (err || !results) {
            resolve(0);
          } else {
            resolve(Math.round(results.value));
          }
        },
      );
    });
  } catch {
    return 0;
  }
}

export async function getDistanceBetween(
  startDate: Date,
  endDate: Date,
): Promise<number> {
  if (!isHealthKitAvailable()) return 0;

  try {
    return new Promise((resolve) => {
      AppleHealthKit.getDistanceWalkingRunning(
        {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          unit: 'meter',
        },
        (err: string, results: { value: number }) => {
          if (err || !results) {
            resolve(0);
          } else {
            resolve(Math.round(results.value));
          }
        },
      );
    });
  } catch {
    return 0;
  }
}

export async function getLatestWeight(): Promise<number | null> {
  if (!isHealthKitAvailable()) return null;

  try {
    return new Promise((resolve) => {
      AppleHealthKit.getLatestWeight(
        { unit: 'kg' },
        (err: string, results: { value: number }) => {
          if (err || !results) {
            resolve(null);
          } else {
            resolve(Math.round(results.value * 10) / 10);
          }
        },
      );
    });
  } catch {
    return null;
  }
}

export async function getLatestHeight(): Promise<number | null> {
  if (!isHealthKitAvailable()) return null;

  try {
    return new Promise((resolve) => {
      AppleHealthKit.getLatestHeight(
        { unit: 'cm' },
        (err: string, results: { value: number }) => {
          if (err || !results) {
            resolve(null);
          } else {
            resolve(Math.round(results.value));
          }
        },
      );
    });
  } catch {
    return null;
  }
}

import { Platform, Alert, NativeModules } from 'react-native';

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
        read: [],
        write: [
          HealthConstants.Permissions.MindfulSession,
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

export async function writeMindfulSession(
  startDate: Date,
  endDate: Date,
  _durationInMinutes: number,
): Promise<boolean> {
  if (!isHealthKitAvailable()) return false;

  try {
    return new Promise((resolve) => {
      AppleHealthKit.saveMindfulSession(
        {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
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


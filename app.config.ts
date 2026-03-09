import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Japanese Walking - WalkPace',
  slug: 'walkpace',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    backgroundColor: '#EDE5DD',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.walkpace.app',
    buildNumber: '13',
    usesAppleSignIn: true,
    infoPlist: {
      UIBackgroundModes: ['audio'],
      CFBundleDisplayName: 'WalkPace',
      NSSupportsLiveActivities: true,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.walkpace.app',
    edgeToEdgeEnabled: true,
  },
  scheme: 'walkpace',
  plugins: [
    'expo-router',
    'expo-apple-authentication',
    'expo-secure-store',
    [
      '@sentry/react-native/expo',
      {
        organization: 'walkpace',
        project: 'walkpace-ios',
      },
    ],
    [
      'react-native-health',
      {
        healthSharePermission:
          'WalkPace reads your steps, distance, weight, and height to track walking progress and provide accurate calorie estimates.',
        healthUpdatePermission:
          'WalkPace saves your walking workouts and active energy burned to Apple Health.',
      },
    ],
  ],
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    revenueCatApiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY,
    eas: {
      projectId: '84e9dacb-8ba2-432f-8a72-5cad86ceb77a',
    },
  },
});

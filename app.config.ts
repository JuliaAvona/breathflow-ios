import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'BreathFlow — Breathing Exercises',
  slug: 'breathflow',
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
    bundleIdentifier: 'com.breathflow.app',
    buildNumber: '13',
    usesAppleSignIn: true,
    infoPlist: {
      UIBackgroundModes: ['audio'],
      CFBundleDisplayName: 'BreathFlow',
      NSSupportsLiveActivities: true,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.breathflow.app',
    edgeToEdgeEnabled: true,
  },
  scheme: 'breathflow',
  plugins: [
    'expo-router',
    'expo-apple-authentication',
    'expo-secure-store',
    [
      '@sentry/react-native/expo',
      {
        organization: 'breathflow',
        project: 'breathflow-ios',
      },
    ],
    [
      'react-native-health',
      {
        healthSharePermission:
          'BreathFlow reads your weight and height to personalize your breathing exercises and provide accurate session insights.',
        healthUpdatePermission:
          'BreathFlow saves your mindfulness sessions to Apple Health.',
        healthClinicalPermission: '',
        readPermissions: [
          'Weight',
          'Height',
        ],
        writePermissions: [
          'MindfulSession',
        ],
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

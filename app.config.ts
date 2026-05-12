import { ExpoConfig, ConfigContext } from 'expo/config';

// Load .env explicitly so subprocess invocations (e.g. EAS CLI calling
// `npx expo config`) reliably see the EXPO_PUBLIC_* vars.
require('dotenv').config();

// SKAdNetwork IDs required for Meta Ads attribution on iOS 14.5+
// Source: https://developers.facebook.com/docs/SKAdNetwork
const META_SKADNETWORK_IDS = [
  'v9wttpbfk9.skadnetwork',
  'n38lu8286q.skadnetwork',
  '4fzdc2evr5.skadnetwork',
  '4pfyvq9l8r.skadnetwork',
  '2fnua5tdw4.skadnetwork',
  'ydx93a7ass.skadnetwork',
  '5a6flpkh64.skadnetwork',
  'p78axxw29g.skadnetwork',
  '7ug5zh24hu.skadnetwork',
  '9rd848q2bz.skadnetwork',
  'n6fk4nfna4.skadnetwork',
  'kbd757ywx3.skadnetwork',
  '9t245vhmpl.skadnetwork',
  '2u9pt9hc89.skadnetwork',
  '8s468mfl3y.skadnetwork',
  'klf5c3l5u5.skadnetwork',
  'ppxm28t8ap.skadnetwork',
  '424m5254lk.skadnetwork',
  'uw77j35x4d.skadnetwork',
  '578prtvx9j.skadnetwork',
  '4dzt52r2t5.skadnetwork',
  'gta9lk7p23.skadnetwork',
  'e5fvkxwrpn.skadnetwork',
  '8c4e2ghe7u.skadnetwork',
  'zq492l623r.skadnetwork',
  '3qy4746246.skadnetwork',
  'wzmmz9fp6w.skadnetwork',
  'yclnxrl5pm.skadnetwork',
  't38b2kh725.skadnetwork',
  '7ug5zh24hu.skadnetwork',
  '9nlqeag3gk.skadnetwork',
  '27o44oqhq8.skadnetwork',
  'prcb7njmu6.skadnetwork',
  'm8dbw4sv7c.skadnetwork',
  'cstr6suwn9.skadnetwork',
  'cg4yq2srnc.skadnetwork',
  'hs6bdukanm.skadnetwork',
  'tl55sbb4fm.skadnetwork',
  'mlmmfzh3r3.skadnetwork',
  '6xzpu9s2p8.skadnetwork',
  '275upjj5gd.skadnetwork',
  's39g8k73mm.skadnetwork',
  '3rd42ekr43.skadnetwork',
  '3sh42y64q3.skadnetwork',
  'f38h382jlk.skadnetwork',
  'hdw39hrw9y.skadnetwork',
  '5lm9lj6jb7.skadnetwork',
  'mtkv5xtk9e.skadnetwork',
  'v72qych5uu.skadnetwork',
  'c6k4g5qg8m.skadnetwork',
  'ejvt5qm6ak.skadnetwork',
  'wg4vff78zm.skadnetwork',
  '238da6jt44.skadnetwork',
  'rx5hdcabgc.skadnetwork',
  '32z4fx6l9h.skadnetwork',
  'mlmmfzh3r3.skadnetwork',
  'lr83yxwka7.skadnetwork',
];

const FB_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? '';
const FB_CLIENT_TOKEN = process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN ?? '';
const FB_DISPLAY_NAME = process.env.EXPO_PUBLIC_FACEBOOK_DISPLAY_NAME ?? 'BreathFlow';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'BreathFlow — Breathing Exercises',
  slug: 'breathflow',
  version: '1.2',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    backgroundColor: '#EDE5DD',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.izbrodin90.breathflow',
    buildNumber: '20',
    usesAppleSignIn: true,
    appleTeamId: '9B587AMM75',
    infoPlist: {
      UIBackgroundModes: ['audio'],
      CFBundleDisplayName: 'BreathFlow',
      NSSupportsLiveActivities: true,
      // Meta / Facebook SDK — auto-init disabled; we initialize manually
      // after the user responds to the ATT prompt.
      FacebookAppID: FB_APP_ID,
      FacebookClientToken: FB_CLIENT_TOKEN,
      FacebookDisplayName: FB_DISPLAY_NAME,
      FacebookAutoInitEnabled: false,
      FacebookAutoLogAppEventsEnabled: true,
      FacebookAdvertiserIDCollectionEnabled: true,
      LSApplicationQueriesSchemes: [
        'fbapi',
        'fb-messenger-share-api',
        'fbauth2',
        'fbshareextension',
      ],
      CFBundleURLTypes: [
        {
          CFBundleURLSchemes: [`fb${FB_APP_ID}`],
        },
      ],
      // SKAdNetwork — Meta + partner network IDs
      SKAdNetworkItems: Array.from(new Set(META_SKADNETWORK_IDS)).map((id) => ({
        SKAdNetworkIdentifier: id,
      })),
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
          'BreathFlow uses Apple Health to track your mindfulness practice.',
        healthUpdatePermission:
          'BreathFlow saves your breathing sessions as Mindful Minutes to Apple Health.',
        healthClinicalPermission: '',
        readPermissions: [],
        writePermissions: [
          'MindfulSession',
        ],
      },
    ],
    [
      'react-native-fbsdk-next',
      {
        appID: FB_APP_ID,
        clientToken: FB_CLIENT_TOKEN,
        displayName: FB_DISPLAY_NAME,
        scheme: `fb${FB_APP_ID}`,
        advertiserIDCollectionEnabled: true,
        autoLogAppEventsEnabled: true,
        isAutoInitEnabled: false,
        iosUserTrackingPermission:
          'This identifier will be used to deliver personalized ads to you.',
      },
    ],
    [
      'expo-tracking-transparency',
      {
        userTrackingPermission:
          'This identifier will be used to deliver personalized ads to you.',
      },
    ],
  ],
  owner: 'izbrodin90',
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    revenueCatApiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY,
    facebookAppId: FB_APP_ID,
    facebookClientToken: FB_CLIENT_TOKEN,
    eas: {
      projectId: '9a72ff2d-fe77-45ed-94c3-b234e8cdb928',
    },
  },
});

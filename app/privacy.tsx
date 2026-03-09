import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../src/hooks/useColorScheme';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, FONTS } from '../src/constants';

export default function PrivacyScreen() {
  const { t } = useTranslation();
  const theme = useThemeColors();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.backButton, { color: theme.primary }]}>
            {'\u2190'}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {t('legal.privacyPolicyTitle')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.lastUpdated, { color: theme.textSecondary }]}>
          Last updated: February 28, 2026
        </Text>

        <Text style={[styles.body, { color: theme.text }]}>
          This Privacy Policy describes how WalkPace ("we", "our", or "us") collects, uses, and protects your information when you use the WalkPace mobile application (the "App").
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          1. What Data We Collect
        </Text>
        <Text style={[styles.body, { color: theme.text }]}>
          WalkPace collects the following data to provide and improve the App experience:{'\n\n'}
          {'\u2022'} Walking session data: duration, intervals completed, rounds, timestamps, and estimated calories burned.{'\n'}
          {'\u2022'} App settings and preferences: sound, vibration, timer configurations, and theme preferences.{'\n'}
          {'\u2022'} Optional personal information: weight, age, and height, if you choose to provide them for more accurate calorie estimation.{'\n'}
          {'\u2022'} Achievement and streak data: badges earned and daily walking streaks.{'\n'}
          {'\u2022'} Account information: anonymous user ID or Apple ID email (if you sign in with Apple).
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          2. Health Data (Apple HealthKit)
        </Text>
        <Text style={[styles.body, { color: theme.text }]}>
          If you grant permission, WalkPace integrates with Apple HealthKit to both read and write health data:{'\n\n'}
          {'\u2022'} We read: step count, walking distance, weight, and height to track your walking progress and provide accurate calorie estimates.{'\n'}
          {'\u2022'} We write: workout sessions and active energy burned from your interval walking sessions.{'\n\n'}
          HealthKit integration is entirely optional and can be enabled or disabled at any time in the App settings. Health data accessed through HealthKit is never stored on our servers or shared with third parties.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          3. Data Storage and Cloud Sync
        </Text>
        <Text style={[styles.body, { color: theme.text }]}>
          WalkPace is designed as an offline-first application. All your data is stored locally on your device first.{'\n\n'}
          When you are signed in, your data is also synced to our cloud servers (hosted on Supabase) to enable backup and cross-device sync. This includes your walking sessions, statistics, settings, profile, and badges. All cloud data is protected by Row Level Security — only you can access your own data.{'\n\n'}
          Authentication sessions are stored securely using the iOS Keychain (SecureStore).
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          4. Third-Party Services
        </Text>
        <Text style={[styles.body, { color: theme.text }]}>
          WalkPace uses the following third-party services:{'\n\n'}
          {'\u2022'} Supabase — cloud database and authentication. Your synced data is stored on Supabase servers. Privacy policy: supabase.com/privacy{'\n'}
          {'\u2022'} RevenueCat — subscription management. Processes your purchase transactions and subscription status. Privacy policy: revenuecat.com/privacy{'\n'}
          {'\u2022'} Sentry — crash reporting. Receives anonymous crash reports and device information to help us fix bugs. No personal data is included. Privacy policy: sentry.io/privacy{'\n\n'}
          We do not sell, trade, or rent your personal data to any third parties for marketing or advertising purposes.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          5. Data Security
        </Text>
        <Text style={[styles.body, { color: theme.text }]}>
          Your local data is protected by your device's built-in security features (passcode, Face ID, Touch ID). Cloud data is protected by encryption in transit (TLS) and at rest, with Row Level Security ensuring only authenticated users can access their own data. We recommend keeping your device software up to date.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          6. Data Deletion
        </Text>
        <Text style={[styles.body, { color: theme.text }]}>
          You can delete your account and all associated data at any time from Settings {'>'} Delete Account. This will permanently remove all your data from both your device and our cloud servers, including walking sessions, statistics, badges, settings, and profile information. This action cannot be undone.{'\n\n'}
          If you have an active subscription, please cancel it before deleting your account via Settings {'>'} Subscriptions on your device.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          7. Children's Privacy
        </Text>
        <Text style={[styles.body, { color: theme.text }]}>
          WalkPace is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          8. Changes to This Policy
        </Text>
        <Text style={[styles.body, { color: theme.text }]}>
          We may update this Privacy Policy from time to time. Any changes will be reflected in the App with an updated "Last updated" date. We encourage you to review this policy periodically.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          9. Contact Us
        </Text>
        <Text style={[styles.body, { color: theme.text }]}>
          If you have any questions or concerns about this Privacy Policy, please contact us at:{'\n\n'}
          Email: support@walkpace.app
        </Text>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backButton: {
    fontSize: FONT_SIZE.xl,
    fontFamily: FONTS.medium,
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONTS.bold,
  },
  headerSpacer: {
    width: FONT_SIZE.xl,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  lastUpdated: {
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONTS.bold,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  body: {
    fontSize: FONT_SIZE.md,
    lineHeight: 24,
    marginBottom: SPACING.sm,
  },
  bottomSpacer: {
    height: SPACING.xl,
  },
});

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

export default function TermsScreen() {
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
          {t('legal.termsOfServiceTitle')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.lastUpdated, { color: theme.textSecondary }]}>
          Last updated: March 24, 2026
        </Text>

        <Text style={[styles.body, { color: theme.text }]}>
          Please read these Terms of Service ("Terms") carefully before using the BreathFlow mobile application (the "App") operated by BreathFlow ("we", "our", or "us"). By downloading, installing, or using the App, you agree to be bound by these Terms.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          1. Purchase Terms
        </Text>
        <Text style={[styles.body, { color: theme.text }]}>
          BreathFlow offers optional premium features ("BreathFlow Pro") through the following plans:{'\n\n'}
          {'\u2022'} Weekly subscription — auto-renews weekly. Cancel anytime in App Store settings at least 24 hours before renewal.{'\n'}
          {'\u2022'} Annual subscription — auto-renews yearly. Cancel anytime in App Store settings at least 24 hours before renewal.{'\n'}
          {'\u2022'} Lifetime purchase — one-time payment, no subscription or renewal.{'\n\n'}
          Payment is charged to your Apple ID account at the confirmation of purchase. Subscriptions automatically renew unless cancelled. Prices may vary by region and are subject to change. Refunds are handled by Apple according to their refund policy.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          2. Health Disclaimer
        </Text>
        <Text style={[styles.body, { color: theme.text }]}>
          BreathFlow is designed to guide breathing exercises and mindfulness practice and is intended for informational and wellness purposes only. The App is not a medical device and is not intended to diagnose, treat, cure, or prevent any disease or health condition.{'\n\n'}
          {'\u2022'} Some breathing techniques involve extended breath holds or rapid breathing, which may cause dizziness, lightheadedness, or tingling sensations. Stop immediately if you feel unwell.{'\n'}
          {'\u2022'} Do not practice advanced breathing techniques (such as Power Breathing or Kapalabhati) while driving, swimming, in water, or in any situation where loss of consciousness could be dangerous.{'\n'}
          {'\u2022'} Consult with a qualified healthcare provider before using the App if you are pregnant, have respiratory conditions (such as asthma or COPD), cardiovascular conditions, epilepsy, or any other pre-existing health conditions.{'\n'}
          {'\u2022'} Hyperventilation-based techniques can cause temporary changes in blood chemistry. Practice in a safe, seated or lying position.{'\n'}
          {'\u2022'} You use the App and participate in breathing exercises entirely at your own risk.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          3. Acceptable Use
        </Text>
        <Text style={[styles.body, { color: theme.text }]}>
          You agree to use the App only for its intended purpose of breathing exercises and mindfulness practice. You may not:{'\n\n'}
          {'\u2022'} Reverse engineer, decompile, or disassemble the App.{'\n'}
          {'\u2022'} Attempt to gain unauthorized access to any part of the App or its related systems.{'\n'}
          {'\u2022'} Use the App in any manner that could damage, disable, or impair its functionality.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          4. Intellectual Property
        </Text>
        <Text style={[styles.body, { color: theme.text }]}>
          All content, features, and functionality of the App, including but not limited to text, graphics, logos, icons, and software, are the exclusive property of BreathFlow and are protected by applicable intellectual property laws.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          5. Limitation of Liability
        </Text>
        <Text style={[styles.body, { color: theme.text }]}>
          To the fullest extent permitted by applicable law, BreathFlow and its developers, officers, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to:{'\n\n'}
          {'\u2022'} Loss of data or profits.{'\n'}
          {'\u2022'} Personal injury or health issues arising from the use of the App, including but not limited to dizziness, lightheadedness, or hyperventilation.{'\n'}
          {'\u2022'} Any interruption or cessation of the App's functionality.{'\n'}
          {'\u2022'} Any errors or inaccuracies in breathing timer functions, session tracking, or other App features.{'\n\n'}
          In no event shall our total liability to you exceed the amount you have paid to us in the twelve (12) months preceding the claim.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          6. Termination
        </Text>
        <Text style={[styles.body, { color: theme.text }]}>
          We reserve the right to terminate or suspend your access to the App at any time, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties. Upon termination, your right to use the App will immediately cease.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          7. Changes to These Terms
        </Text>
        <Text style={[styles.body, { color: theme.text }]}>
          We may revise these Terms from time to time. The most current version will always be available within the App. By continuing to use the App after changes become effective, you agree to be bound by the revised Terms.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          8. Governing Law
        </Text>
        <Text style={[styles.body, { color: theme.text }]}>
          These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          9. Contact Us
        </Text>
        <Text style={[styles.body, { color: theme.text }]}>
          If you have any questions about these Terms of Service, please contact us at:{'\n\n'}
          Email: app.support.535@gmail.com
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

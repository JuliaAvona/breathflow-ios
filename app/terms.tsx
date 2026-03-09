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
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../src/constants';

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
          Last updated: January 1, 2025
        </Text>

        <Text style={[styles.body, { color: theme.text }]}>
          Please read these Terms of Service ("Terms") carefully before using the WalkPace mobile application (the "App") operated by WalkPace ("we", "our", or "us"). By downloading, installing, or using the App, you agree to be bound by these Terms.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          1. Subscription Terms
        </Text>
        <Text style={[styles.body, { color: theme.text }]}>
          WalkPace offers optional premium features through auto-renewable subscriptions ("WalkPace PRO").{'\n\n'}
          {'\u2022'} Payment will be charged to your Apple ID account at the confirmation of purchase.{'\n'}
          {'\u2022'} Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the current billing period.{'\n'}
          {'\u2022'} Your account will be charged for renewal within 24 hours prior to the end of the current period at the rate of your selected plan.{'\n'}
          {'\u2022'} You can manage and cancel your subscriptions by going to your Account Settings on the App Store after purchase.{'\n'}
          {'\u2022'} Any unused portion of a free trial period, if offered, will be forfeited when you purchase a subscription.{'\n\n'}
          Subscription prices may vary by region and are subject to change. Any price changes will take effect at the start of the next subscription period following the date of the price change.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          2. Free Trial
        </Text>
        <Text style={[styles.body, { color: theme.text }]}>
          We may offer free trial periods for WalkPace PRO subscriptions. During the free trial, you will have access to all PRO features at no charge. At the end of the free trial period, your subscription will automatically convert to a paid subscription unless you cancel at least 24 hours before the trial ends.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          3. Health Disclaimer
        </Text>
        <Text style={[styles.body, { color: theme.text }]}>
          WalkPace is designed to assist with interval walking training and is intended for informational and fitness tracking purposes only. The App is not a medical device and is not intended to diagnose, treat, cure, or prevent any disease or health condition.{'\n\n'}
          {'\u2022'} Calorie estimates provided by the App are approximate and should not be relied upon for medical or dietary purposes.{'\n'}
          {'\u2022'} Always consult with a qualified healthcare provider before beginning any new exercise program, especially if you have pre-existing health conditions.{'\n'}
          {'\u2022'} Stop exercising immediately and seek medical attention if you experience pain, dizziness, shortness of breath, or any other concerning symptoms.{'\n'}
          {'\u2022'} You use the App and participate in walking exercises entirely at your own risk.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          4. Acceptable Use
        </Text>
        <Text style={[styles.body, { color: theme.text }]}>
          You agree to use the App only for its intended purpose of interval walking training and fitness tracking. You may not:{'\n\n'}
          {'\u2022'} Reverse engineer, decompile, or disassemble the App.{'\n'}
          {'\u2022'} Attempt to gain unauthorized access to any part of the App or its related systems.{'\n'}
          {'\u2022'} Use the App in any manner that could damage, disable, or impair its functionality.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          5. Intellectual Property
        </Text>
        <Text style={[styles.body, { color: theme.text }]}>
          All content, features, and functionality of the App, including but not limited to text, graphics, logos, icons, and software, are the exclusive property of WalkPace and are protected by applicable intellectual property laws.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          6. Limitation of Liability
        </Text>
        <Text style={[styles.body, { color: theme.text }]}>
          To the fullest extent permitted by applicable law, WalkPace and its developers, officers, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to:{'\n\n'}
          {'\u2022'} Loss of data or profits.{'\n'}
          {'\u2022'} Personal injury or health issues arising from the use of the App.{'\n'}
          {'\u2022'} Any interruption or cessation of the App's functionality.{'\n'}
          {'\u2022'} Any errors or inaccuracies in calorie estimates, timer functions, or other App features.{'\n\n'}
          In no event shall our total liability to you exceed the amount you have paid to us in subscription fees during the twelve (12) months preceding the claim.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          7. Termination
        </Text>
        <Text style={[styles.body, { color: theme.text }]}>
          We reserve the right to terminate or suspend your access to the App at any time, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties. Upon termination, your right to use the App will immediately cease.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          8. Changes to These Terms
        </Text>
        <Text style={[styles.body, { color: theme.text }]}>
          We may revise these Terms from time to time. The most current version will always be available within the App. By continuing to use the App after changes become effective, you agree to be bound by the revised Terms.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          9. Governing Law
        </Text>
        <Text style={[styles.body, { color: theme.text }]}>
          These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          10. Contact Us
        </Text>
        <Text style={[styles.body, { color: theme.text }]}>
          If you have any questions about these Terms of Service, please contact us at:{'\n\n'}
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
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
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
    fontWeight: '700',
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

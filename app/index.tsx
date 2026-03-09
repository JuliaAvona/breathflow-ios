import { Redirect } from 'expo-router';
import { useSettingsStore } from '../src/store';

export default function Index() {
  const onboardingCompleted = useSettingsStore((s) => s.onboardingCompleted);

  if (!onboardingCompleted) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}

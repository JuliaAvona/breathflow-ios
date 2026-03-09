import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const SENTRY_DSN = Constants.expoConfig?.extra?.sentryDsn ?? '';

export function initSentry() {
  if (!SENTRY_DSN) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.2,
    debug: __DEV__,
    enabled: !__DEV__,
  });
}

export { Sentry };

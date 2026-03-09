import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { pushAll, pullAndMerge } from '../services/syncService';

const SYNC_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

export function useSync() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s._hydrated);
  const lastSyncRef = useRef<number>(0);

  // Sync when user first appears (after auth hydrate)
  useEffect(() => {
    if (!user || !hydrated) return;

    const syncNow = async () => {
      try {
        await pullAndMerge();
        await pushAll();
        lastSyncRef.current = Date.now();
      } catch {
        // Sync failed silently — will retry on next foreground
      }
    };
    syncNow();
  }, [user?.id, hydrated]);

  // Sync when app returns to foreground (throttled)
  useEffect(() => {
    if (!user) return;

    const handleAppState = async (state: AppStateStatus) => {
      if (state !== 'active') return;

      const now = Date.now();
      if (now - lastSyncRef.current < SYNC_THROTTLE_MS) return;
      lastSyncRef.current = now;

      try {
        await pullAndMerge();
        await pushAll();
      } catch {
        // Sync failed silently — will retry on next foreground
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [user?.id]);
}

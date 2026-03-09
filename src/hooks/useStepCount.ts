import { useState, useEffect, useRef } from 'react';
import { getTodayStepCount, isHealthKitAvailable } from '../utils/healthKit';

const POLL_INTERVAL = 10_000; // 10 seconds

export function useStepCount(enabled: boolean): number {
  const [steps, setSteps] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled || !isHealthKitAvailable()) return;

    const fetchSteps = async () => {
      const count = await getTodayStepCount();
      setSteps(count);
    };

    fetchSteps();
    intervalRef.current = setInterval(fetchSteps, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled]);

  return steps;
}

import { create } from 'zustand';
import { TimerPhase } from '../types';
import { TIMER_DEFAULTS } from '../constants';

interface TimerStore {
  phase: TimerPhase;
  phaseBeforePause: TimerPhase | null;
  currentRound: number;
  totalRounds: number;
  fastDuration: number;
  slowDuration: number;
  timeRemaining: number;
  totalElapsed: number;
  fastElapsed: number;
  slowElapsed: number;
  warmUpElapsed: number;
  coolDownElapsed: number;
  startedAt: number | null;
  warmUpEnabled: boolean;
  coolDownEnabled: boolean;
  warmUpDuration: number;
  coolDownDuration: number;
  countdownActive: boolean;
  startingPhaseConfig: 'fast' | 'slow';

  // Notification callbacks (set from component layer)
  onScheduleNotifications: ((config: {
    fastDuration: number;
    slowDuration: number;
    rounds: number;
    currentRound: number;
    timeRemaining: number;
    phase: TimerPhase;
    warmUp: boolean;
    coolDown: boolean;
    warmUpDuration: number;
    coolDownDuration: number;
  }) => void) | null;
  onCancelNotifications: (() => void) | null;
  setNotificationCallbacks: (
    onSchedule: TimerStore['onScheduleNotifications'],
    onCancel: TimerStore['onCancelNotifications'],
  ) => void;

  start: (options: {
    fastDuration?: number;
    slowDuration?: number;
    rounds?: number;
    warmUp?: boolean;
    coolDown?: boolean;
    warmUpDuration?: number;
    coolDownDuration?: number;
    startingPhase?: 'fast' | 'slow';
  }) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  tick: () => { phaseChanged: boolean; countdown: boolean; timeRemaining: number };
  reset: () => void;
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  phase: 'READY',
  phaseBeforePause: null,
  currentRound: 1,
  totalRounds: TIMER_DEFAULTS.totalRounds,
  fastDuration: TIMER_DEFAULTS.fastDuration,
  slowDuration: TIMER_DEFAULTS.slowDuration,
  timeRemaining: TIMER_DEFAULTS.fastDuration,
  totalElapsed: 0,
  fastElapsed: 0,
  slowElapsed: 0,
  warmUpElapsed: 0,
  coolDownElapsed: 0,
  startedAt: null,
  warmUpEnabled: false,
  coolDownEnabled: false,
  warmUpDuration: TIMER_DEFAULTS.warmUpDuration,
  coolDownDuration: TIMER_DEFAULTS.coolDownDuration,
  countdownActive: false,
  startingPhaseConfig: 'fast',

  onScheduleNotifications: null,
  onCancelNotifications: null,
  setNotificationCallbacks: (onSchedule, onCancel) => {
    set({ onScheduleNotifications: onSchedule, onCancelNotifications: onCancel });
  },

  start: ({
    fastDuration = TIMER_DEFAULTS.fastDuration,
    slowDuration = TIMER_DEFAULTS.slowDuration,
    rounds = TIMER_DEFAULTS.totalRounds,
    warmUp = false,
    coolDown = false,
    warmUpDuration = TIMER_DEFAULTS.warmUpDuration,
    coolDownDuration = TIMER_DEFAULTS.coolDownDuration,
    startingPhase = 'fast',
  }) => {
    const firstActivePhase: TimerPhase = startingPhase === 'slow' ? 'SLOW' : 'FAST';
    const startPhase: TimerPhase = warmUp ? 'WARM_UP' : firstActivePhase;
    const startTime = warmUp ? warmUpDuration : (startingPhase === 'slow' ? slowDuration : fastDuration);

    set({
      phase: startPhase,
      phaseBeforePause: null,
      currentRound: 1,
      totalRounds: rounds,
      fastDuration,
      slowDuration,
      timeRemaining: startTime,
      totalElapsed: 0,
      fastElapsed: 0,
      slowElapsed: 0,
      warmUpElapsed: 0,
      coolDownElapsed: 0,
      startedAt: Date.now(),
      warmUpEnabled: warmUp,
      coolDownEnabled: coolDown,
      warmUpDuration,
      coolDownDuration,
      countdownActive: false,
      startingPhaseConfig: startingPhase,
    });

    // Schedule phase transition notifications
    const state = get();
    state.onScheduleNotifications?.({
      fastDuration,
      slowDuration,
      rounds,
      currentRound: 1,
      timeRemaining: state.timeRemaining,
      phase: state.phase,
      warmUp,
      coolDown,
      warmUpDuration,
      coolDownDuration,
    });
  },

  pause: () => {
    const { phase, onCancelNotifications } = get();
    if (phase === 'FAST' || phase === 'SLOW' || phase === 'WARM_UP' || phase === 'COOL_DOWN') {
      set({ phase: 'PAUSED', phaseBeforePause: phase, countdownActive: false });
      onCancelNotifications?.();
    }
  },

  resume: () => {
    const state = get();
    if (state.phaseBeforePause) {
      set({ phase: state.phaseBeforePause, phaseBeforePause: null });

      // Reschedule notifications for remaining time
      const resumed = get();
      state.onScheduleNotifications?.({
        fastDuration: resumed.fastDuration,
        slowDuration: resumed.slowDuration,
        rounds: resumed.totalRounds,
        currentRound: resumed.currentRound,
        timeRemaining: resumed.timeRemaining,
        phase: resumed.phase,
        warmUp: false,
        coolDown: resumed.coolDownEnabled,
        warmUpDuration: 0,
        coolDownDuration: resumed.coolDownDuration,
      });
    }
  },

  stop: () => {
    const { onCancelNotifications } = get();
    onCancelNotifications?.();
    set({
      phase: 'READY',
      phaseBeforePause: null,
      currentRound: 1,
      timeRemaining: get().fastDuration,
      totalElapsed: 0,
      fastElapsed: 0,
      slowElapsed: 0,
      warmUpElapsed: 0,
      coolDownElapsed: 0,
      startedAt: null,
      countdownActive: false,
    });
  },

  tick: () => {
    const state = get();
    const activePhases: TimerPhase[] = ['FAST', 'SLOW', 'WARM_UP', 'COOL_DOWN'];
    if (!activePhases.includes(state.phase)) return { phaseChanged: false, countdown: false, timeRemaining: state.timeRemaining };

    const newTimeRemaining = state.timeRemaining - 1;
    const newTotalElapsed = state.totalElapsed + 1;
    const newFastElapsed =
      state.phase === 'FAST' ? state.fastElapsed + 1 : state.fastElapsed;
    const newSlowElapsed =
      state.phase === 'SLOW' ? state.slowElapsed + 1 : state.slowElapsed;
    const newWarmUpElapsed =
      state.phase === 'WARM_UP' ? state.warmUpElapsed + 1 : state.warmUpElapsed;
    const newCoolDownElapsed =
      state.phase === 'COOL_DOWN' ? state.coolDownElapsed + 1 : state.coolDownElapsed;

    // Check countdown (last 5 seconds)
    const isCountdown =
      newTimeRemaining > 0 &&
      newTimeRemaining <= TIMER_DEFAULTS.countdownBeepSeconds &&
      (state.phase === 'FAST' || state.phase === 'SLOW' || state.phase === 'WARM_UP' || state.phase === 'COOL_DOWN');

    if (newTimeRemaining <= 0) {
      // Phase completed
      if (state.phase === 'WARM_UP') {
        // Warm-up done → start first active phase
        const firstPhase: TimerPhase = state.startingPhaseConfig === 'slow' ? 'SLOW' : 'FAST';
        const firstTime = state.startingPhaseConfig === 'slow' ? state.slowDuration : state.fastDuration;
        set({
          phase: firstPhase,
          timeRemaining: firstTime,
          totalElapsed: newTotalElapsed,
          fastElapsed: newFastElapsed,
          slowElapsed: newSlowElapsed,
          warmUpElapsed: newWarmUpElapsed,
          coolDownElapsed: newCoolDownElapsed,
          countdownActive: false,
        });
        return { phaseChanged: true, countdown: false, timeRemaining: newTimeRemaining };
      }

      // Determine phase order based on startingPhaseConfig
      const isSlowStart = state.startingPhaseConfig === 'slow';
      const phaseA: TimerPhase = isSlowStart ? 'SLOW' : 'FAST'; // first in round
      const phaseB: TimerPhase = isSlowStart ? 'FAST' : 'SLOW'; // second in round
      const durationA = isSlowStart ? state.slowDuration : state.fastDuration;
      const durationB = isSlowStart ? state.fastDuration : state.slowDuration;

      if (state.phase === phaseA) {
        // Switch to second phase of round
        set({
          phase: phaseB,
          timeRemaining: durationB,
          totalElapsed: newTotalElapsed,
          fastElapsed: newFastElapsed,
          slowElapsed: newSlowElapsed,
          warmUpElapsed: newWarmUpElapsed,
          coolDownElapsed: newCoolDownElapsed,
          countdownActive: false,
        });
        return { phaseChanged: true, countdown: false, timeRemaining: newTimeRemaining };
      }

      if (state.phase === phaseB) {
        if (state.currentRound < state.totalRounds) {
          // Next round — back to first phase
          set({
            phase: phaseA,
            currentRound: state.currentRound + 1,
            timeRemaining: durationA,
            totalElapsed: newTotalElapsed,
            fastElapsed: newFastElapsed,
            slowElapsed: newSlowElapsed,
            warmUpElapsed: newWarmUpElapsed,
            coolDownElapsed: newCoolDownElapsed,
            countdownActive: false,
          });
          return { phaseChanged: true, countdown: false, timeRemaining: newTimeRemaining };
        } else if (state.coolDownEnabled) {
          // All rounds done, start cool-down
          set({
            phase: 'COOL_DOWN',
            timeRemaining: state.coolDownDuration,
            totalElapsed: newTotalElapsed,
            fastElapsed: newFastElapsed,
            slowElapsed: newSlowElapsed,
            warmUpElapsed: newWarmUpElapsed,
            coolDownElapsed: newCoolDownElapsed,
            countdownActive: false,
          });
          return { phaseChanged: true, countdown: false, timeRemaining: newTimeRemaining };
        } else {
          // All done
          set({
            phase: 'DONE',
            timeRemaining: 0,
            totalElapsed: newTotalElapsed,
            fastElapsed: newFastElapsed,
            slowElapsed: newSlowElapsed,
            warmUpElapsed: newWarmUpElapsed,
            coolDownElapsed: newCoolDownElapsed,
            countdownActive: false,
          });
          return { phaseChanged: true, countdown: false, timeRemaining: newTimeRemaining };
        }
      }

      if (state.phase === 'COOL_DOWN') {
        // Cool-down done → DONE
        set({
          phase: 'DONE',
          timeRemaining: 0,
          totalElapsed: newTotalElapsed,
          fastElapsed: newFastElapsed,
          slowElapsed: newSlowElapsed,
          warmUpElapsed: newWarmUpElapsed,
          coolDownElapsed: newCoolDownElapsed,
          countdownActive: false,
        });
        return { phaseChanged: true, countdown: false, timeRemaining: newTimeRemaining };
      }
    }

    set({
      timeRemaining: newTimeRemaining,
      totalElapsed: newTotalElapsed,
      fastElapsed: newFastElapsed,
      slowElapsed: newSlowElapsed,
      warmUpElapsed: newWarmUpElapsed,
      coolDownElapsed: newCoolDownElapsed,
      countdownActive: isCountdown,
    });

    return { phaseChanged: false, countdown: isCountdown, timeRemaining: newTimeRemaining };
  },

  reset: () => {
    const { onCancelNotifications } = get();
    onCancelNotifications?.();
    set({
      phase: 'READY',
      phaseBeforePause: null,
      currentRound: 1,
      timeRemaining: get().fastDuration,
      totalElapsed: 0,
      fastElapsed: 0,
      slowElapsed: 0,
      warmUpElapsed: 0,
      coolDownElapsed: 0,
      startedAt: null,
      countdownActive: false,
    });
  },
}));

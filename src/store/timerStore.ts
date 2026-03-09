import { create } from 'zustand';
import type {
  BreathingTechnique,
  TimerMode,
  TimerPhase,
  PowerBreathingPhase,
  KapalabhatiPhase,
} from '../types';

// ─── Constants ──────────────────────────────────────────────────────────────

const RECOVERY_DURATION = 15; // seconds

// ─── Phase mapping from PhaseType to TimerPhase ─────────────────────────────

const PHASE_TYPE_TO_TIMER_PHASE: Record<string, TimerPhase> = {
  inhale: 'INHALE',
  holdIn: 'HOLD_IN',
  exhale: 'EXHALE',
  holdOut: 'HOLD_OUT',
};

// ─── Store Interface ────────────────────────────────────────────────────────

interface TimerStore {
  // Current state
  mode: TimerMode;
  technique: BreathingTechnique | null;

  // Standard mode
  phase: TimerPhase;
  currentPhaseIndex: number;
  phaseTimeRemaining: number;
  currentCycle: number;
  totalCycles: number;

  // Power Breathing mode
  powerPhase: PowerBreathingPhase;
  breathCount: number;
  targetBreaths: number;
  retentionTime: number;
  retentionTimes: number[];
  currentRound: number;
  totalRounds: number;
  recoveryTimeRemaining: number;

  // Kapalabhati mode
  kapalabhatiPhase: KapalabhatiPhase;
  currentSet: number;
  totalSets: number;
  setTimeRemaining: number;
  restTimeRemaining: number;
  breathsInSet: number;

  // Common
  totalElapsed: number;
  isRunning: boolean;
  startedAt: string | null;

  // Actions
  startSession: (
    technique: BreathingTechnique,
    overrides?: {
      cycles?: number;
      phaseDurations?: number[];
      rounds?: number;
      breathsPerRound?: number;
    },
  ) => void;
  tick: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  endRetention: () => void;
  reset: () => void;
}

// ─── Initial State ──────────────────────────────────────────────────────────

const initialState = {
  mode: 'standard' as TimerMode,
  technique: null as BreathingTechnique | null,

  phase: 'READY' as TimerPhase,
  currentPhaseIndex: 0,
  phaseTimeRemaining: 0,
  currentCycle: 0,
  totalCycles: 0,

  powerPhase: 'READY' as PowerBreathingPhase,
  breathCount: 0,
  targetBreaths: 30,
  retentionTime: 0,
  retentionTimes: [] as number[],
  currentRound: 0,
  totalRounds: 3,
  recoveryTimeRemaining: 0,

  kapalabhatiPhase: 'READY' as KapalabhatiPhase,
  currentSet: 0,
  totalSets: 3,
  setTimeRemaining: 0,
  restTimeRemaining: 0,
  breathsInSet: 0,

  totalElapsed: 0,
  isRunning: false,
  startedAt: null as string | null,
};

// ─── Store ──────────────────────────────────────────────────────────────────

export const useTimerStore = create<TimerStore>()((set, get) => ({
  ...initialState,

  // ─── Start Session ──────────────────────────────────────────────────────

  startSession: (technique, overrides) => {
    const mode = technique.mode;

    if (mode === 'standard') {
      const phaseDurations = overrides?.phaseDurations;

      // If phase durations are overridden, create a modified copy of the technique
      const effectiveTechnique = phaseDurations
        ? {
            ...technique,
            phases: technique.phases.map((p, i) => ({
              ...p,
              duration: phaseDurations[i] ?? p.duration,
            })),
          }
        : technique;

      const phases = effectiveTechnique.phases;
      const firstPhaseDuration = phases[0].duration;

      const totalCycles =
        overrides?.cycles ??
        (technique.defaultCycles > 0 ? technique.defaultCycles : 0);

      set({
        ...initialState,
        mode: 'standard',
        technique: effectiveTechnique,
        phase: PHASE_TYPE_TO_TIMER_PHASE[phases[0].type] ?? 'INHALE',
        currentPhaseIndex: 0,
        phaseTimeRemaining: firstPhaseDuration,
        currentCycle: 1,
        totalCycles,
        totalElapsed: 0,
        isRunning: true,
        startedAt: new Date().toISOString(),
      });
    } else if (mode === 'power') {
      const targetBreaths = overrides?.breathsPerRound ?? technique.breathCount ?? 30;
      const totalRounds = overrides?.rounds ?? technique.roundCount ?? 3;

      set({
        ...initialState,
        mode: 'power',
        technique,
        powerPhase: 'BREATHING',
        breathCount: 0,
        targetBreaths,
        retentionTime: 0,
        retentionTimes: [],
        currentRound: 1,
        totalRounds,
        recoveryTimeRemaining: 0,
        totalElapsed: 0,
        isRunning: true,
        startedAt: new Date().toISOString(),
      });
    } else if (mode === 'kapalabhati') {
      const totalSets = technique.setCount ?? 3;
      const setDuration = technique.setDuration ?? 30;

      set({
        ...initialState,
        mode: 'kapalabhati',
        technique,
        kapalabhatiPhase: 'RAPID_SET',
        currentSet: 1,
        totalSets,
        setTimeRemaining: setDuration,
        restTimeRemaining: 0,
        breathsInSet: 0,
        totalElapsed: 0,
        isRunning: true,
        startedAt: new Date().toISOString(),
      });
    }
  },

  // ─── Tick ───────────────────────────────────────────────────────────────

  tick: () => {
    const state = get();
    if (!state.isRunning) return;

    const { mode } = state;

    if (mode === 'standard') {
      tickStandard(state, set);
    } else if (mode === 'power') {
      tickPower(state, set);
    } else if (mode === 'kapalabhati') {
      tickKapalabhati(state, set);
    }
  },

  // ─── Pause ──────────────────────────────────────────────────────────────

  pause: () => {
    const state = get();
    if (!state.isRunning) return;

    // Don't pause if already done
    if (state.mode === 'standard' && state.phase === 'DONE') return;
    if (state.mode === 'power' && state.powerPhase === 'DONE') return;
    if (state.mode === 'kapalabhati' && state.kapalabhatiPhase === 'DONE') return;

    if (state.mode === 'standard') {
      set({ isRunning: false, phase: 'PAUSED' });
    } else if (state.mode === 'power') {
      set({ isRunning: false, powerPhase: 'PAUSED' });
    } else if (state.mode === 'kapalabhati') {
      set({ isRunning: false, kapalabhatiPhase: 'PAUSED' });
    }
  },

  // ─── Resume ─────────────────────────────────────────────────────────────

  resume: () => {
    const state = get();
    if (state.isRunning) return;

    // Restore the correct phase based on what was happening before pause.
    // We need to figure out which phase to restore. Since we store the
    // phase index and other state, we can reconstruct.
    if (state.mode === 'standard' && state.phase === 'PAUSED') {
      const technique = state.technique;
      if (!technique) return;
      const phases = technique.phases;
      const phaseIndex = state.currentPhaseIndex;
      const phaseType = phases[phaseIndex]?.type;
      const restoredPhase = phaseType
        ? (PHASE_TYPE_TO_TIMER_PHASE[phaseType] ?? 'INHALE')
        : 'INHALE';
      set({ isRunning: true, phase: restoredPhase });
    } else if (state.mode === 'power' && state.powerPhase === 'PAUSED') {
      // Determine what power phase to restore based on state
      let restoredPhase: PowerBreathingPhase = 'BREATHING';
      if (state.recoveryTimeRemaining > 0) {
        restoredPhase = 'RECOVERY';
      } else if (state.retentionTime > 0 && state.breathCount >= state.targetBreaths) {
        restoredPhase = 'RETENTION';
      }
      set({ isRunning: true, powerPhase: restoredPhase });
    } else if (state.mode === 'kapalabhati' && state.kapalabhatiPhase === 'PAUSED') {
      const restoredPhase: KapalabhatiPhase =
        state.restTimeRemaining > 0 ? 'REST' : 'RAPID_SET';
      set({ isRunning: true, kapalabhatiPhase: restoredPhase });
    }
  },

  // ─── Stop ───────────────────────────────────────────────────────────────

  stop: () => {
    set({
      ...initialState,
    });
  },

  // ─── End Retention (Power Breathing) ────────────────────────────────────

  endRetention: () => {
    const state = get();
    if (state.mode !== 'power' || state.powerPhase !== 'RETENTION') return;

    const newRetentionTimes = [...state.retentionTimes, state.retentionTime];

    if (state.currentRound >= state.totalRounds) {
      // Last round — go to DONE
      set({
        powerPhase: 'DONE',
        retentionTimes: newRetentionTimes,
        isRunning: false,
      });
    } else {
      // Start recovery breath
      set({
        powerPhase: 'RECOVERY',
        retentionTimes: newRetentionTimes,
        recoveryTimeRemaining: RECOVERY_DURATION,
      });
    }
  },

  // ─── Reset ──────────────────────────────────────────────────────────────

  reset: () => {
    set({
      ...initialState,
    });
  },
}));

// ─── Standard Mode Tick ─────────────────────────────────────────────────────

function tickStandard(
  state: TimerStore,
  set: (partial: Partial<TimerStore>) => void,
): void {
  const { technique, currentPhaseIndex, phaseTimeRemaining, currentCycle, totalCycles, totalElapsed } = state;
  if (!technique) return;

  const phases = technique.phases;
  const newTimeRemaining = phaseTimeRemaining - 1;
  const newTotalElapsed = totalElapsed + 1;

  // Check duration-based completion (coherence, cyclic sigh)
  if (technique.defaultDuration && technique.defaultDuration > 0 && totalCycles === 0) {
    if (newTotalElapsed >= technique.defaultDuration) {
      set({
        phase: 'DONE',
        phaseTimeRemaining: 0,
        totalElapsed: newTotalElapsed,
        isRunning: false,
      });
      return;
    }
  }

  if (newTimeRemaining > 0) {
    // Phase still in progress
    set({
      phaseTimeRemaining: newTimeRemaining,
      totalElapsed: newTotalElapsed,
    });
    return;
  }

  // Phase completed (newTimeRemaining <= 0)
  const nextPhaseIndex = currentPhaseIndex + 1;

  if (nextPhaseIndex < phases.length) {
    // Move to next phase within the same cycle
    const overrideDurations = getPhaseDuration(state, nextPhaseIndex);
    set({
      phase: PHASE_TYPE_TO_TIMER_PHASE[phases[nextPhaseIndex].type] ?? 'INHALE',
      currentPhaseIndex: nextPhaseIndex,
      phaseTimeRemaining: overrideDurations,
      totalElapsed: newTotalElapsed,
    });
  } else {
    // All phases in this cycle are done
    if (totalCycles > 0 && currentCycle >= totalCycles) {
      // All cycles complete
      set({
        phase: 'DONE',
        phaseTimeRemaining: 0,
        totalElapsed: newTotalElapsed,
        isRunning: false,
      });
    } else {
      // Start next cycle (loop back to first phase)
      const overrideDurations = getPhaseDuration(state, 0);
      set({
        phase: PHASE_TYPE_TO_TIMER_PHASE[phases[0].type] ?? 'INHALE',
        currentPhaseIndex: 0,
        phaseTimeRemaining: overrideDurations,
        currentCycle: currentCycle + 1,
        totalElapsed: newTotalElapsed,
      });
    }
  }
}

// ─── Power Breathing Tick ───────────────────────────────────────────────────

function tickPower(
  state: TimerStore,
  set: (partial: Partial<TimerStore>) => void,
): void {
  const {
    powerPhase,
    breathCount,
    targetBreaths,
    retentionTime,
    currentRound,
    totalRounds,
    recoveryTimeRemaining,
    totalElapsed,
  } = state;

  const newTotalElapsed = totalElapsed + 1;

  if (powerPhase === 'BREATHING') {
    // Each tick represents ~1 second, and each breath is ~2 seconds
    // We increment breath count every 2 ticks (1s inhale + 1s exhale)
    const newBreathCount = breathCount + 0.5;

    if (newBreathCount >= targetBreaths) {
      // Breathing phase done — move to retention
      set({
        powerPhase: 'RETENTION',
        breathCount: targetBreaths,
        retentionTime: 0,
        totalElapsed: newTotalElapsed,
      });
    } else {
      set({
        breathCount: newBreathCount,
        totalElapsed: newTotalElapsed,
      });
    }
    return;
  }

  if (powerPhase === 'RETENTION') {
    // Timer counts UP — user ends it with endRetention()
    set({
      retentionTime: retentionTime + 1,
      totalElapsed: newTotalElapsed,
    });
    return;
  }

  if (powerPhase === 'RECOVERY') {
    const newRecoveryTime = recoveryTimeRemaining - 1;

    if (newRecoveryTime <= 0) {
      // Recovery done — start next round
      const nextRound = currentRound + 1;

      if (nextRound > totalRounds) {
        // All rounds complete
        set({
          powerPhase: 'DONE',
          recoveryTimeRemaining: 0,
          totalElapsed: newTotalElapsed,
          isRunning: false,
        });
      } else {
        set({
          powerPhase: 'BREATHING',
          breathCount: 0,
          retentionTime: 0,
          recoveryTimeRemaining: 0,
          currentRound: nextRound,
          totalElapsed: newTotalElapsed,
        });
      }
    } else {
      set({
        recoveryTimeRemaining: newRecoveryTime,
        totalElapsed: newTotalElapsed,
      });
    }
    return;
  }
}

// ─── Kapalabhati Tick ───────────────────────────────────────────────────────

function tickKapalabhati(
  state: TimerStore,
  set: (partial: Partial<TimerStore>) => void,
): void {
  const {
    kapalabhatiPhase,
    currentSet,
    totalSets,
    setTimeRemaining,
    restTimeRemaining,
    breathsInSet,
    totalElapsed,
    technique,
  } = state;

  const newTotalElapsed = totalElapsed + 1;
  const restDuration = technique?.restDuration ?? 30;

  if (kapalabhatiPhase === 'RAPID_SET') {
    const newSetTime = setTimeRemaining - 1;
    // Each breath cycle is 1s (0.5s exhale + 0.5s inhale), so 1 breath per second
    const newBreathsInSet = breathsInSet + 1;

    if (newSetTime <= 0) {
      // Set complete
      if (currentSet >= totalSets) {
        // All sets done
        set({
          kapalabhatiPhase: 'DONE',
          setTimeRemaining: 0,
          breathsInSet: newBreathsInSet,
          totalElapsed: newTotalElapsed,
          isRunning: false,
        });
      } else {
        // Start rest period
        set({
          kapalabhatiPhase: 'REST',
          setTimeRemaining: 0,
          restTimeRemaining: restDuration,
          breathsInSet: newBreathsInSet,
          totalElapsed: newTotalElapsed,
        });
      }
    } else {
      set({
        setTimeRemaining: newSetTime,
        breathsInSet: newBreathsInSet,
        totalElapsed: newTotalElapsed,
      });
    }
    return;
  }

  if (kapalabhatiPhase === 'REST') {
    const newRestTime = restTimeRemaining - 1;

    if (newRestTime <= 0) {
      // Rest done — start next set
      const setDuration = technique?.setDuration ?? 30;
      set({
        kapalabhatiPhase: 'RAPID_SET',
        currentSet: currentSet + 1,
        setTimeRemaining: setDuration,
        restTimeRemaining: 0,
        breathsInSet: 0,
        totalElapsed: newTotalElapsed,
      });
    } else {
      set({
        restTimeRemaining: newRestTime,
        totalElapsed: newTotalElapsed,
      });
    }
    return;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getPhaseDuration(state: TimerStore, phaseIndex: number): number {
  // The technique already has override durations baked in from startSession
  return state.technique?.phases[phaseIndex]?.duration ?? 0;
}

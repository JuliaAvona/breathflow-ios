import { useTimerStore } from '../timerStore';
import type { BreathingTechnique } from '../../types';

const standardTechnique: BreathingTechnique = {
  id: 'box',
  nameKey: 'techniques.box.name',
  descriptionKey: 'techniques.box.description',
  category: 'focus',
  phases: [
    { type: 'inhale', duration: 2, instructionKey: 'phase.breatheIn' },
    { type: 'holdIn', duration: 2, instructionKey: 'phase.hold' },
    { type: 'exhale', duration: 2, instructionKey: 'phase.breatheOut' },
    { type: 'holdOut', duration: 2, instructionKey: 'phase.hold' },
  ],
  defaultCycles: 2,
  adjustable: true,
  shape: 'square',
  color: '#4A90D9',
  icon: 'square',
  mode: 'standard',
  isPro: false,
};

const durationTechnique: BreathingTechnique = {
  ...standardTechnique,
  id: 'coherence',
  phases: [
    { type: 'inhale', duration: 3, instructionKey: 'phase.breatheIn' },
    { type: 'exhale', duration: 3, instructionKey: 'phase.breatheOut' },
  ],
  defaultCycles: 0,
  defaultDuration: 10,
};

const powerTechnique: BreathingTechnique = {
  ...standardTechnique,
  id: 'power',
  mode: 'power',
  hasRetention: true,
  hasRecovery: true,
  breathCount: 3,
  roundCount: 2,
};

const kapalabhatiTechnique: BreathingTechnique = {
  ...standardTechnique,
  id: 'kapalabhati',
  mode: 'kapalabhati',
  setCount: 2,
  setDuration: 3,
  restDuration: 2,
};

function tickN(n: number) {
  for (let i = 0; i < n; i++) useTimerStore.getState().tick();
}

beforeEach(() => {
  useTimerStore.getState().reset();
});

describe('timerStore — standard mode', () => {
  it('starts with the first phase and cycle 1', () => {
    useTimerStore.getState().startSession(standardTechnique);
    const s = useTimerStore.getState();
    expect(s.phase).toBe('INHALE');
    expect(s.currentPhaseIndex).toBe(0);
    expect(s.currentCycle).toBe(1);
    expect(s.phaseTimeRemaining).toBe(2);
    expect(s.isRunning).toBe(true);
  });

  it('advances to the next phase when phaseTimeRemaining hits 0', () => {
    useTimerStore.getState().startSession(standardTechnique);
    tickN(2); // consume the 2s inhale
    const s = useTimerStore.getState();
    expect(s.phase).toBe('HOLD_IN');
    expect(s.currentPhaseIndex).toBe(1);
    expect(s.phaseTimeRemaining).toBe(2);
  });

  it('loops back to phase 0 and increments the cycle after the last phase', () => {
    useTimerStore.getState().startSession(standardTechnique);
    tickN(8); // one full cycle: 4 phases * 2s
    const s = useTimerStore.getState();
    expect(s.currentCycle).toBe(2);
    expect(s.currentPhaseIndex).toBe(0);
    expect(s.phase).toBe('INHALE');
    expect(s.isRunning).toBe(true);
  });

  it('marks DONE once all cycles complete', () => {
    useTimerStore.getState().startSession(standardTechnique);
    tickN(16); // two full cycles * 4 phases * 2s
    const s = useTimerStore.getState();
    expect(s.phase).toBe('DONE');
    expect(s.isRunning).toBe(false);
  });

  it('completes early via maxDuration even mid-cycle', () => {
    useTimerStore.getState().startSession(standardTechnique, { maxDuration: 5 });
    tickN(5);
    const s = useTimerStore.getState();
    expect(s.phase).toBe('DONE');
    expect(s.isRunning).toBe(false);
    expect(s.totalElapsed).toBe(5);
  });

  it('completes via defaultDuration when totalCycles is 0 (e.g. Coherence)', () => {
    useTimerStore.getState().startSession(durationTechnique);
    tickN(9);
    expect(useTimerStore.getState().phase).not.toBe('DONE');
    tickN(1);
    const s = useTimerStore.getState();
    expect(s.phase).toBe('DONE');
    expect(s.isRunning).toBe(false);
  });

  it('pause/resume restores the exact phase via currentPhaseIndex', () => {
    useTimerStore.getState().startSession(standardTechnique);
    tickN(3); // now in HOLD_IN, 1s remaining
    useTimerStore.getState().pause();
    expect(useTimerStore.getState().phase).toBe('PAUSED');
    useTimerStore.getState().resume();
    const s = useTimerStore.getState();
    expect(s.phase).toBe('HOLD_IN');
    expect(s.isRunning).toBe(true);
  });

  it('pause() is a no-op once the session is DONE', () => {
    useTimerStore.getState().startSession(standardTechnique, { maxDuration: 1 });
    tickN(1);
    expect(useTimerStore.getState().phase).toBe('DONE');
    useTimerStore.getState().pause();
    expect(useTimerStore.getState().phase).toBe('DONE'); // not PAUSED
  });
});

describe('timerStore — power breathing mode', () => {
  it('starts in BREATHING with round 1', () => {
    useTimerStore.getState().startSession(powerTechnique);
    const s = useTimerStore.getState();
    expect(s.powerPhase).toBe('BREATHING');
    expect(s.currentRound).toBe(1);
    expect(s.targetBreaths).toBe(3);
  });

  it('transitions BREATHING -> RETENTION exactly at targetBreaths, with retentionTime starting at 0', () => {
    useTimerStore.getState().startSession(powerTechnique);
    tickN(3); // targetBreaths = 3
    const s = useTimerStore.getState();
    expect(s.powerPhase).toBe('RETENTION');
    expect(s.breathCount).toBe(3);
    expect(s.retentionTime).toBe(0);
  });

  it('counts retentionTime up each tick while in RETENTION (user-controlled)', () => {
    useTimerStore.getState().startSession(powerTechnique);
    tickN(3); // enter RETENTION
    tickN(4);
    const s = useTimerStore.getState();
    expect(s.powerPhase).toBe('RETENTION');
    expect(s.retentionTime).toBe(4);
  });

  it(
    'regression: resume() restores RETENTION (not BREATHING) when paused ' +
      'immediately after entering it, while retentionTime is still 0',
    () => {
      useTimerStore.getState().startSession(powerTechnique);
      tickN(3); // exactly enters RETENTION this tick; retentionTime === 0
      expect(useTimerStore.getState().retentionTime).toBe(0);
      expect(useTimerStore.getState().powerPhase).toBe('RETENTION');

      useTimerStore.getState().pause();
      expect(useTimerStore.getState().powerPhase).toBe('PAUSED');

      useTimerStore.getState().resume();
      expect(useTimerStore.getState().powerPhase).toBe('RETENTION');
    },
  );

  it('endRetention() moves to RECOVERY when more rounds remain', () => {
    useTimerStore.getState().startSession(powerTechnique);
    tickN(3);
    tickN(5); // accumulate some retention time
    useTimerStore.getState().endRetention();
    const s = useTimerStore.getState();
    expect(s.powerPhase).toBe('RECOVERY');
    expect(s.retentionTimes).toEqual([5]);
    expect(s.recoveryTimeRemaining).toBe(15);
  });

  it('endRetention() moves to DONE on the last round', () => {
    useTimerStore.getState().startSession(powerTechnique);
    tickN(3);
    useTimerStore.getState().endRetention(); // round 1 -> RECOVERY
    tickN(15); // finish recovery -> round 2 BREATHING
    tickN(3); // round 2 BREATHING -> RETENTION
    useTimerStore.getState().endRetention(); // last round -> DONE
    const s = useTimerStore.getState();
    expect(s.powerPhase).toBe('DONE');
    expect(s.isRunning).toBe(false);
    expect(s.retentionTimes.length).toBe(2);
  });

  it('RECOVERY resets breathCount/retentionTime and advances the round on completion', () => {
    useTimerStore.getState().startSession(powerTechnique);
    tickN(3);
    useTimerStore.getState().endRetention();
    tickN(15);
    const s = useTimerStore.getState();
    expect(s.powerPhase).toBe('BREATHING');
    expect(s.currentRound).toBe(2);
    expect(s.breathCount).toBe(0);
    expect(s.retentionTime).toBe(0);
  });

  it('pause/resume restores RECOVERY', () => {
    useTimerStore.getState().startSession(powerTechnique);
    tickN(3);
    useTimerStore.getState().endRetention();
    tickN(5); // partway through recovery
    useTimerStore.getState().pause();
    useTimerStore.getState().resume();
    expect(useTimerStore.getState().powerPhase).toBe('RECOVERY');
  });
});

describe('timerStore — kapalabhati mode', () => {
  it('starts in RAPID_SET with set 1', () => {
    useTimerStore.getState().startSession(kapalabhatiTechnique);
    const s = useTimerStore.getState();
    expect(s.kapalabhatiPhase).toBe('RAPID_SET');
    expect(s.currentSet).toBe(1);
    expect(s.setTimeRemaining).toBe(3);
  });

  it('transitions RAPID_SET -> REST when a set finishes and more sets remain', () => {
    useTimerStore.getState().startSession(kapalabhatiTechnique);
    tickN(3);
    const s = useTimerStore.getState();
    expect(s.kapalabhatiPhase).toBe('REST');
    expect(s.restTimeRemaining).toBe(2);
  });

  it('transitions REST -> next RAPID_SET, resetting breathsInSet and setTimeRemaining', () => {
    useTimerStore.getState().startSession(kapalabhatiTechnique);
    tickN(3); // -> REST
    tickN(2); // -> next RAPID_SET
    const s = useTimerStore.getState();
    expect(s.kapalabhatiPhase).toBe('RAPID_SET');
    expect(s.currentSet).toBe(2);
    expect(s.setTimeRemaining).toBe(3);
    expect(s.breathsInSet).toBe(0);
  });

  it('marks DONE after the last set completes', () => {
    useTimerStore.getState().startSession(kapalabhatiTechnique);
    tickN(3); // set 1 -> REST
    tickN(2); // -> set 2 RAPID_SET
    tickN(3); // set 2 (last) finishes -> DONE
    const s = useTimerStore.getState();
    expect(s.kapalabhatiPhase).toBe('DONE');
    expect(s.isRunning).toBe(false);
  });

  it('pause/resume restores REST', () => {
    useTimerStore.getState().startSession(kapalabhatiTechnique);
    tickN(3); // -> REST
    useTimerStore.getState().pause();
    useTimerStore.getState().resume();
    expect(useTimerStore.getState().kapalabhatiPhase).toBe('REST');
  });

  it('pause/resume restores RAPID_SET', () => {
    useTimerStore.getState().startSession(kapalabhatiTechnique);
    tickN(1); // still mid-set
    useTimerStore.getState().pause();
    useTimerStore.getState().resume();
    expect(useTimerStore.getState().kapalabhatiPhase).toBe('RAPID_SET');
  });
});

describe('timerStore — stop/reset', () => {
  it('stop() returns to the initial READY state', () => {
    useTimerStore.getState().startSession(standardTechnique);
    tickN(3);
    useTimerStore.getState().stop();
    const s = useTimerStore.getState();
    expect(s.phase).toBe('READY');
    expect(s.isRunning).toBe(false);
    expect(s.currentCycle).toBe(0);
  });
});

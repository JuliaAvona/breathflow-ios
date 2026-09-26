import { useSettingsStore } from '../settingsStore';

beforeEach(() => {
  useSettingsStore.setState({
    isPro: false,
    settingsUpdatedAt: 0,
  });
});

describe('settingsStore', () => {
  it('setSetting updates the value and stamps settingsUpdatedAt', () => {
    const before = useSettingsStore.getState().settingsUpdatedAt;
    useSettingsStore.getState().setSetting('soundEnabled', false);
    const s = useSettingsStore.getState();
    expect(s.soundEnabled).toBe(false);
    expect(s.settingsUpdatedAt).toBeGreaterThanOrEqual(before);
  });

  it('grantPro sets isPro and stamps settingsUpdatedAt when actually changing', () => {
    useSettingsStore.getState().grantPro();
    const s = useSettingsStore.getState();
    expect(s.isPro).toBe(true);
    expect(s.settingsUpdatedAt).toBeGreaterThan(0);
  });

  it(
    'regression: grantPro()/revokePro() are no-ops when the value is already ' +
      'correct, so an unconditional cold-launch entitlement re-check does not ' +
      'keep bumping settingsUpdatedAt and starve the last-write-wins sync merge',
    () => {
      useSettingsStore.getState().grantPro();
      const stampAfterFirstGrant = useSettingsStore.getState().settingsUpdatedAt;

      // Simulate app/_layout.tsx re-confirming the same Pro state on a later launch.
      useSettingsStore.getState().grantPro();
      expect(useSettingsStore.getState().settingsUpdatedAt).toBe(stampAfterFirstGrant);

      useSettingsStore.setState({ isPro: false, settingsUpdatedAt: 0 });
      // revokePro() when already not-Pro should likewise be a no-op.
      useSettingsStore.getState().revokePro();
      expect(useSettingsStore.getState().settingsUpdatedAt).toBe(0);
    },
  );

  it('revokePro sets isPro false and stamps settingsUpdatedAt when actually changing', () => {
    useSettingsStore.setState({ isPro: true, settingsUpdatedAt: 0 });
    useSettingsStore.getState().revokePro();
    const s = useSettingsStore.getState();
    expect(s.isPro).toBe(false);
    expect(s.settingsUpdatedAt).toBeGreaterThan(0);
  });
});

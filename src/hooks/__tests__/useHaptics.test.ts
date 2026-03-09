import { renderHook, act } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { useHaptics } from '../useHaptics';
import { useSettingsStore } from '../../store';

describe('useHaptics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Enable haptics by default
    useSettingsStore.setState({ hapticsEnabled: true });
  });

  it('calls impactAsync(Light) on light()', () => {
    const { result } = renderHook(() => useHaptics());

    act(() => {
      result.current.light();
    });

    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });

  it('calls impactAsync(Medium) on medium()', () => {
    const { result } = renderHook(() => useHaptics());

    act(() => {
      result.current.medium();
    });

    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
  });

  it('calls impactAsync(Heavy) on heavy()', () => {
    const { result } = renderHook(() => useHaptics());

    act(() => {
      result.current.heavy();
    });

    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy);
  });

  it('calls selectionAsync on selection()', () => {
    const { result } = renderHook(() => useHaptics());

    act(() => {
      result.current.selection();
    });

    expect(Haptics.selectionAsync).toHaveBeenCalled();
  });

  it('calls notificationAsync(Success) on success()', () => {
    const { result } = renderHook(() => useHaptics());

    act(() => {
      result.current.success();
    });

    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
  });

  it('calls notificationAsync(Warning) on warning()', () => {
    const { result } = renderHook(() => useHaptics());

    act(() => {
      result.current.warning();
    });

    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Warning);
  });

  it('calls notificationAsync(Error) on error()', () => {
    const { result } = renderHook(() => useHaptics());

    act(() => {
      result.current.error();
    });

    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
  });

  it('does not call haptics when hapticsEnabled is false', () => {
    useSettingsStore.setState({ hapticsEnabled: false });

    const { result } = renderHook(() => useHaptics());

    act(() => {
      result.current.light();
      result.current.medium();
      result.current.heavy();
      result.current.selection();
      result.current.success();
      result.current.warning();
      result.current.error();
    });

    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it('respects setting changes', () => {
    const { result } = renderHook(() => useHaptics());

    // Haptics enabled — should fire
    act(() => {
      result.current.light();
    });
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);

    // Disable haptics
    act(() => {
      useSettingsStore.setState({ hapticsEnabled: false });
    });

    // Re-render hook to pick up new state
    const { result: result2 } = renderHook(() => useHaptics());

    act(() => {
      result2.current.light();
    });

    // Should still be 1 (no new call)
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
  });
});

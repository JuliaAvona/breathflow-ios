import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSync } from '../useSync';
import { useAuthStore } from '../../store/authStore';
import { useSessionsStore } from '../../store/sessionsStore';
import { pullAndMerge, pushAll } from '../../services/syncService';
import { checkSubscriptionStatus } from '../../utils/revenueCat';

jest.mock('../../services/syncService', () => ({
  pullAndMerge: jest.fn().mockResolvedValue(undefined),
  pushAll: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../utils/revenueCat', () => ({
  checkSubscriptionStatus: jest.fn().mockResolvedValue(null),
}));

describe('useSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: { id: 'user-1' } as never, _hydrated: true });
    useSessionsStore.setState({ _hydrated: false });
    (checkSubscriptionStatus as jest.Mock).mockResolvedValue(null);
  });

  it('does not sync until sessions are hydrated, then syncs once they are (regression: pull could overwrite unhydrated local sessions)', async () => {
    renderHook(() => useSync());

    await act(async () => {
      await Promise.resolve();
    });
    expect(pullAndMerge).not.toHaveBeenCalled();

    act(() => {
      useSessionsStore.setState({ _hydrated: true });
    });

    await waitFor(() => expect(pullAndMerge).toHaveBeenCalledTimes(1));
    expect(pushAll).toHaveBeenCalledTimes(1);
  });
});

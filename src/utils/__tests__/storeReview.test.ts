import { AppState } from 'react-native';

const mockIsAvailableAsync = jest.fn();
const mockRequestReview = jest.fn();
jest.mock('expo-store-review', () => ({
  isAvailableAsync: () => mockIsAvailableAsync(),
  requestReview: () => mockRequestReview(),
}));

import { requestStoreReview } from '../storeReview';

describe('requestStoreReview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAvailableAsync.mockResolvedValue(true);
    mockRequestReview.mockResolvedValue(undefined);
    Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
  });

  it('requests a review when the app is active', async () => {
    await requestStoreReview();

    expect(mockRequestReview).toHaveBeenCalledTimes(1);
  });

  it('swallows a rejected requestReview instead of leaking an unhandled rejection (regression: BREATHFLOW-7)', async () => {
    mockRequestReview.mockRejectedValue(new Error('Cannot determine the current window scene'));

    await expect(requestStoreReview()).resolves.toBeUndefined();
  });

  it('skips the prompt when the app is not in the foreground', async () => {
    Object.defineProperty(AppState, 'currentState', { value: 'background', configurable: true });

    await requestStoreReview();

    expect(mockRequestReview).not.toHaveBeenCalled();
  });
});

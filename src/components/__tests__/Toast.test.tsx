import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import { Toast } from '../Toast';

// Mock safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

describe('Toast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders message when visible', () => {
    render(<Toast message="Saved!" visible={true} onHide={jest.fn()} />);

    expect(screen.getByText('Saved!')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    render(<Toast message="Hidden" visible={false} onHide={jest.fn()} />);

    expect(screen.queryByText('Hidden')).toBeNull();
  });

  it('calls onHide after duration', () => {
    const onHide = jest.fn();
    render(<Toast message="Auto-hide" visible={true} onHide={onHide} duration={2000} />);

    // Should not have been called yet
    expect(onHide).not.toHaveBeenCalled();

    // Advance past duration + animation time
    act(() => {
      jest.advanceTimersByTime(2500);
    });

    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it('renders with different types', () => {
    const { rerender } = render(
      <Toast message="Success!" visible={true} onHide={jest.fn()} type="success" />
    );
    expect(screen.getByText('Success!')).toBeTruthy();

    rerender(
      <Toast message="Info!" visible={true} onHide={jest.fn()} type="info" />
    );
    expect(screen.getByText('Info!')).toBeTruthy();

    rerender(
      <Toast message="Error!" visible={true} onHide={jest.fn()} type="error" />
    );
    expect(screen.getByText('Error!')).toBeTruthy();
  });
});

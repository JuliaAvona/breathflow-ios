import React from 'react';
import { render } from '@testing-library/react-native';
import { ConfettiOverlay } from '../ConfettiOverlay';

describe('ConfettiOverlay', () => {
  it('renders nothing when not visible', () => {
    const { toJSON } = render(<ConfettiOverlay visible={false} />);
    expect(toJSON()).toBeNull();
  });

  it('renders confetti pieces when visible', () => {
    const { toJSON } = render(<ConfettiOverlay visible={true} />);
    const tree = toJSON();
    expect(tree).toBeTruthy();
    // Should have children (confetti pieces)
    if (tree && 'children' in tree) {
      expect(tree.children).toBeTruthy();
      expect(tree.children!.length).toBe(40); // CONFETTI_COUNT
    }
  });

  it('calls onComplete after animation', () => {
    jest.useFakeTimers();
    const onComplete = jest.fn();

    render(<ConfettiOverlay visible={true} onComplete={onComplete} />);

    // Animation duration is 2200ms
    jest.advanceTimersByTime(2500);

    expect(onComplete).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('accepts visible toggle from false to true', () => {
    const { rerender, toJSON } = render(<ConfettiOverlay visible={false} />);
    expect(toJSON()).toBeNull();

    rerender(<ConfettiOverlay visible={true} />);
    expect(toJSON()).toBeTruthy();
  });
});

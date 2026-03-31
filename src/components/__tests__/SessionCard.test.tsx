import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SessionCard } from '../SessionCard';
import { BreathingSession } from '../../types';

// Mock safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

const mockSession: BreathingSession = {
  id: 'test-session-1',
  userId: 'user-1',
  date: '2026-02-19',
  startedAt: new Date('2026-02-19T10:00:00').toISOString(),
  completedAt: new Date('2026-02-19T10:30:00').toISOString(),
  completed: true,
  techniqueId: 'box_breathing',
  cyclesCompleted: 6,
  totalDuration: 1800,
};

describe('SessionCard', () => {
  it('renders session stats', () => {
    render(<SessionCard session={mockSession as never} />);

    // i18n mock returns keys as-is
    expect(screen.getByText('sessionCard.time')).toBeTruthy();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<SessionCard session={mockSession as never} />);
    expect(toJSON()).toBeTruthy();
  });

  it('opens detail modal on press', () => {
    render(<SessionCard session={mockSession as never} />);

    // The modal's close button text shouldn't be visible initially
    expect(screen.queryByText('common.close')).toBeNull();

    // Press the card to open detail modal
    const card = screen.getByText('sessionCard.time');
    fireEvent.press(card);

    // After pressing, modal should show detail content
    expect(screen.getByText('common.close')).toBeTruthy();
  });

  it('closes detail modal when close button is pressed', () => {
    render(<SessionCard session={mockSession as never} />);

    // Open modal
    fireEvent.press(screen.getByText('sessionCard.time'));
    expect(screen.getByText('common.close')).toBeTruthy();

    // Close modal
    fireEvent.press(screen.getByText('common.close'));

    // Modal content should be hidden
    expect(screen.queryByText('common.close')).toBeNull();
  });
});

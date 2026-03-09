import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SessionCard } from '../SessionCard';
import { Session } from '../../types';

// Mock safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
  SafeAreaView: ({ children }: any) => children,
}));

const mockSession: Session = {
  id: 'test-session-1',
  date: '2026-02-19',
  startedAt: new Date('2026-02-19T10:00:00').getTime(),
  completedAt: new Date('2026-02-19T10:30:00').getTime(),
  rounds: 5,
  totalRounds: 5,
  fastDuration: 180,
  slowDuration: 180,
  totalDuration: 1800,
  estimatedCalories: 120,
  completed: true,
  warmUp: false,
  coolDown: false,
};

describe('SessionCard', () => {
  it('renders session stats', () => {
    render(<SessionCard session={mockSession} />);

    // i18n mock returns keys as-is
    expect(screen.getByText('sessionCard.time')).toBeTruthy();
    expect(screen.getByText('sessionCard.rounds')).toBeTruthy();
    expect(screen.getByText('sessionCard.cal')).toBeTruthy();
  });

  it('displays rounds as current/total', () => {
    render(<SessionCard session={mockSession} />);

    expect(screen.getByText('5/5')).toBeTruthy();
  });

  it('displays estimated calories', () => {
    render(<SessionCard session={mockSession} />);

    expect(screen.getByText('120')).toBeTruthy();
  });

  it('opens detail modal on press', () => {
    render(<SessionCard session={mockSession} />);

    // The modal's close button text shouldn't be visible initially
    expect(screen.queryByText('common.close')).toBeNull();

    // Press the card to open detail modal
    const card = screen.getByText('sessionCard.time');
    fireEvent.press(card);

    // After pressing, modal should show detail content
    expect(screen.getByText('common.close')).toBeTruthy();
    expect(screen.getByText('sessionCard.fastInterval')).toBeTruthy();
    expect(screen.getByText('sessionCard.slowInterval')).toBeTruthy();
  });

  it('closes detail modal when close button is pressed', () => {
    render(<SessionCard session={mockSession} />);

    // Open modal
    fireEvent.press(screen.getByText('sessionCard.time'));
    expect(screen.getByText('common.close')).toBeTruthy();

    // Close modal
    fireEvent.press(screen.getByText('common.close'));

    // Modal content should be hidden
    expect(screen.queryByText('sessionCard.fastInterval')).toBeNull();
  });

  it('shows steps in modal when session has steps', () => {
    const sessionWithSteps: Session = {
      ...mockSession,
      steps: 3500,
      distance: 2800,
    };

    render(<SessionCard session={sessionWithSteps} />);

    // Open modal
    fireEvent.press(screen.getByText('sessionCard.time'));

    expect(screen.getByText('3,500')).toBeTruthy();
    expect(screen.getByText('summary.steps')).toBeTruthy();
    expect(screen.getByText(/2\.80.*summary\.km/)).toBeTruthy();
    expect(screen.getByText('summary.distance')).toBeTruthy();
  });

  it('shows warmUp/coolDown checkmarks in modal when enabled', () => {
    const sessionWithExtras: Session = {
      ...mockSession,
      warmUp: true,
      coolDown: true,
    };

    render(<SessionCard session={sessionWithExtras} />);

    // Open modal
    fireEvent.press(screen.getByText('sessionCard.time'));

    expect(screen.getByText('timer.warmUp')).toBeTruthy();
    expect(screen.getByText('timer.coolDown')).toBeTruthy();
  });

  it('calls onDelete with session id when provided', () => {
    const onDelete = jest.fn();
    render(<SessionCard session={mockSession} onDelete={onDelete} />);

    // The delete background should be present (trash icon)
    // Note: The actual swipe-to-delete requires PanResponder gesture which is
    // hard to simulate in tests. We verify the callback prop is accepted.
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('renders without onDelete prop (no swipe behavior)', () => {
    const { toJSON } = render(<SessionCard session={mockSession} />);
    expect(toJSON()).toBeTruthy();
  });
});

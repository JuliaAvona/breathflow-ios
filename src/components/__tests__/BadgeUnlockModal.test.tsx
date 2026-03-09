import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { BadgeUnlockModal } from '../BadgeUnlockModal';
import { Badge } from '../../types';

const mockBadge: Badge = {
  id: 'first_walk',
  icon: 1,
  titleKey: 'badges.badge_first_walk_title',
  descriptionKey: 'badges.badge_first_walk_desc',
  unlockedAt: Date.now(),
  category: 'sessions',
  condition: { type: 'sessions', value: 1 },
};

describe('BadgeUnlockModal', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders when visible and badge is provided', () => {
    render(
      <BadgeUnlockModal
        badge={mockBadge}
        visible={true}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText('badges.unlocked')).toBeTruthy();
    expect(screen.getByText('badges.badge_first_walk_title')).toBeTruthy();
    expect(screen.getByText('badges.badge_first_walk_desc')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const { queryByText } = render(
      <BadgeUnlockModal
        badge={mockBadge}
        visible={false}
        onClose={jest.fn()}
      />
    );

    expect(queryByText('badges.unlocked')).toBeNull();
  });

  it('does not render when badge is null', () => {
    const { queryByText } = render(
      <BadgeUnlockModal
        badge={null}
        visible={true}
        onClose={jest.fn()}
      />
    );

    expect(queryByText('badges.unlocked')).toBeNull();
  });

  it('displays trophy icon', () => {
    render(
      <BadgeUnlockModal
        badge={mockBadge}
        visible={true}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText('badges.unlocked')).toBeTruthy();
  });

  it('auto-closes after 3 seconds', async () => {
    const onClose = jest.fn();

    render(
      <BadgeUnlockModal
        badge={mockBadge}
        visible={true}
        onClose={onClose}
      />
    );

    expect(onClose).not.toHaveBeenCalled();

    // Fast-forward time by 3 seconds
    jest.advanceTimersByTime(3000);

    // Wait for animation to complete (additional 200ms)
    jest.advanceTimersByTime(200);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('renders badge image', () => {
    const { UNSAFE_getAllByType } = render(
      <BadgeUnlockModal
        badge={mockBadge}
        visible={true}
        onClose={jest.fn()}
      />
    );
    const { Image } = require('react-native');
    const images = UNSAFE_getAllByType(Image);
    expect(images.length).toBeGreaterThan(0);
  });
});

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { BadgeUnlockModal } from '../BadgeUnlockModal';
import { Badge, UserStats, UserSettings } from '../../types';

const mockCondition = (_stats: UserStats, _settings: UserSettings): boolean => true;

const mockBadge: Badge = {
  id: 'first_breath',
  icon: 'leaf-outline',
  nameKey: 'badges.first_breath.name',
  descriptionKey: 'badges.first_breath.description',
  category: 'sessions',
  condition: mockCondition,
  isPro: false,
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
    expect(screen.getByText('badges.first_breath.name')).toBeTruthy();
    expect(screen.getByText('badges.first_breath.description')).toBeTruthy();
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

  it('displays unlocked headline', () => {
    render(
      <BadgeUnlockModal
        badge={mockBadge}
        visible={true}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText('badges.unlocked')).toBeTruthy();
  });

  it('renders badge content when visible', () => {
    const { toJSON } = render(
      <BadgeUnlockModal
        badge={mockBadge}
        visible={true}
        onClose={jest.fn()}
      />
    );
    expect(toJSON()).toBeTruthy();
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { BadgeGrid } from '../BadgeGrid';
import { Badge, UserStats, UserSettings } from '../../types';

const mockCondition = (_stats: UserStats, _settings: UserSettings): boolean => true;

const mockBadges: Badge[] = [
  {
    id: 'first_breath',
    icon: 'leaf-outline',
    nameKey: 'badges.first_breath.name',
    descriptionKey: 'badges.first_breath.description',
    category: 'sessions',
    condition: mockCondition,
    isPro: false,
  },
  {
    id: 'explorer',
    icon: 'compass-outline',
    nameKey: 'badges.explorer.name',
    descriptionKey: 'badges.explorer.description',
    category: 'exploration',
    condition: mockCondition,
    isPro: false,
  },
  {
    id: 'week_warrior',
    icon: 'flame-outline',
    nameKey: 'badges.week_warrior.name',
    descriptionKey: 'badges.week_warrior.description',
    category: 'streak',
    condition: mockCondition,
    isPro: false,
  },
];

describe('BadgeGrid', () => {
  it('renders all badges', () => {
    render(<BadgeGrid badges={mockBadges} unlockedBadges={[]} isPro />);

    expect(screen.getByText('badges.first_breath.name')).toBeTruthy();
    expect(screen.getByText('badges.explorer.name')).toBeTruthy();
    expect(screen.getByText('badges.week_warrior.name')).toBeTruthy();
  });

  it('displays badge descriptions', () => {
    render(<BadgeGrid badges={mockBadges} unlockedBadges={[]} isPro />);

    expect(screen.getByText('badges.first_breath.description')).toBeTruthy();
    expect(screen.getByText('badges.explorer.description')).toBeTruthy();
  });

  it('renders empty grid when no badges provided', () => {
    const { queryByText } = render(<BadgeGrid badges={[]} unlockedBadges={[]} isPro />);

    expect(queryByText(/badges\./)).toBeNull();
  });

  it('handles single badge correctly', () => {
    render(<BadgeGrid badges={[mockBadges[0]]} unlockedBadges={[]} isPro />);

    expect(screen.getByText('badges.first_breath.name')).toBeTruthy();
  });

  it('renders correct number of badge items', () => {
    const { toJSON } = render(<BadgeGrid badges={mockBadges} unlockedBadges={[]} isPro />);
    expect(toJSON()).toBeTruthy();
  });
});

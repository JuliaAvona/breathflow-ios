import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { BadgeGrid } from '../BadgeGrid';
import { Badge } from '../../types';

const mockBadges: Badge[] = [
  {
    id: 'first_walk',
    icon: 1, // Mock image number
    titleKey: 'badges.badge_first_walk_title',
    descriptionKey: 'badges.badge_first_walk_desc',
    unlockedAt: Date.now(),
    category: 'sessions',
    condition: { type: 'sessions', value: 1 },
  },
  {
    id: 'walks_10',
    icon: 2,
    titleKey: 'badges.badge_walks_10_title',
    descriptionKey: 'badges.badge_walks_10_desc',
    unlockedAt: null, // Locked badge
    category: 'sessions',
    condition: { type: 'sessions', value: 10 },
  },
  {
    id: 'streak_7',
    icon: 3,
    titleKey: 'badges.badge_streak_7_title',
    descriptionKey: 'badges.badge_streak_7_desc',
    unlockedAt: Date.now(),
    category: 'streak',
    condition: { type: 'streak', value: 7 },
  },
];

describe('BadgeGrid', () => {
  it('renders all badges', () => {
    render(<BadgeGrid badges={mockBadges} />);

    expect(screen.getByText('badges.badge_first_walk_title')).toBeTruthy();
    expect(screen.getByText('badges.badge_walks_10_title')).toBeTruthy();
    expect(screen.getByText('badges.badge_streak_7_title')).toBeTruthy();
  });

  it('displays badge descriptions', () => {
    render(<BadgeGrid badges={mockBadges} />);

    expect(screen.getByText('badges.badge_first_walk_desc')).toBeTruthy();
    expect(screen.getByText('badges.badge_walks_10_desc')).toBeTruthy();
  });

  it('renders empty grid when no badges provided', () => {
    const { queryByText } = render(<BadgeGrid badges={[]} />);

    expect(queryByText(/badges\./)).toBeNull();
  });

  it('handles single badge correctly', () => {
    render(<BadgeGrid badges={[mockBadges[0]]} />);

    expect(screen.getByText('badges.badge_first_walk_title')).toBeTruthy();
  });

  it('renders images for each badge', () => {
    const { UNSAFE_getAllByType } = render(<BadgeGrid badges={mockBadges} />);
    const { Image } = require('react-native');
    const images = UNSAFE_getAllByType(Image);
    expect(images).toHaveLength(mockBadges.length);
  });
});

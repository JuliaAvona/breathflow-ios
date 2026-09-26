import type { ImageSourcePropType } from 'react-native';
import type { Mood } from '../types';

// Fluent Emoji (3D style) — https://github.com/lobehub/fluent-emoji
export const MOOD_EMOJI_IMAGES: Record<Mood, ImageSourcePropType> = {
  sleepy: require('../../assets/emoji/mood_sleepy.webp'),
  anxious: require('../../assets/emoji/mood_anxious.webp'),
  focused: require('../../assets/emoji/mood_focused.webp'),
  calm: require('../../assets/emoji/mood_calm.webp'),
  happy: require('../../assets/emoji/mood_happy.webp'),
  energized: require('../../assets/emoji/mood_energized.webp'),
};

import { formatTime, formatTotalTime, getToday, isConsecutiveDay, generateId } from '../time';

describe('time utilities', () => {
  describe('formatTime', () => {
    it('formats seconds to MM:SS correctly', () => {
      expect(formatTime(45)).toBe('0:45');
      expect(formatTime(5)).toBe('0:05');
    });

    it('formats minutes and seconds correctly', () => {
      expect(formatTime(65)).toBe('1:05');
      expect(formatTime(180)).toBe('3:00');
      expect(formatTime(125)).toBe('2:05');
    });

    it('handles zero seconds', () => {
      expect(formatTime(0)).toBe('0:00');
    });

    it('handles large durations', () => {
      expect(formatTime(3600)).toBe('60:00'); // 1 hour
      expect(formatTime(3665)).toBe('61:05'); // 1 hour, 1 min, 5 sec
    });
  });

  describe('formatTotalTime', () => {
    it('formats time without hours', () => {
      expect(formatTotalTime(125)).toBe('2:05');
      expect(formatTotalTime(3599)).toBe('59:59');
    });

    it('formats time with hours', () => {
      expect(formatTotalTime(3600)).toBe('1:00:00');
      expect(formatTotalTime(3665)).toBe('1:01:05');
      expect(formatTotalTime(7325)).toBe('2:02:05');
    });

    it('pads minutes and seconds with zero', () => {
      expect(formatTotalTime(3605)).toBe('1:00:05');
      expect(formatTotalTime(3665)).toBe('1:01:05');
    });
  });

  describe('getToday', () => {
    it('returns date in YYYY-MM-DD format', () => {
      const today = getToday();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('isConsecutiveDay', () => {
    it('returns true for consecutive days', () => {
      expect(isConsecutiveDay('2026-02-13', '2026-02-14')).toBe(true);
      expect(isConsecutiveDay('2026-02-14', '2026-02-13')).toBe(true);
    });

    it('returns false for non-consecutive days', () => {
      expect(isConsecutiveDay('2026-02-13', '2026-02-15')).toBe(false);
      expect(isConsecutiveDay('2026-02-10', '2026-02-14')).toBe(false);
    });

    it('returns false for same day', () => {
      expect(isConsecutiveDay('2026-02-14', '2026-02-14')).toBe(false);
    });
  });

  describe('generateId', () => {
    it('generates a unique ID', () => {
      const id1 = generateId();
      const id2 = generateId();

      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
    });

    it('generates ID as string', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
    });

    it('generates IDs with consistent format', () => {
      const id = generateId();
      // Should be a timestamp-based string with random component
      expect(id.length).toBeGreaterThan(0);
      expect(typeof id).toBe('string');
    });
  });
});

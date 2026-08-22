import { parseTime, formatTime, mergeRanges, subtractRanges, generateSlots, rangesOverlap } from './time.util';

describe('time.util', () => {
  describe('parseTime / formatTime', () => {
    it('parses HH:mm into minutes since midnight', () => {
      expect(parseTime('00:00')).toBe(0);
      expect(parseTime('09:30')).toBe(570);
      expect(parseTime('23:59')).toBe(1439);
    });

    it('rejects malformed times', () => {
      expect(() => parseTime('24:00')).toThrow();
      expect(() => parseTime('9:30')).toThrow();
      expect(() => parseTime('bad')).toThrow();
    });

    it('round-trips through formatTime', () => {
      expect(formatTime(parseTime('17:05'))).toBe('17:05');
    });
  });

  describe('mergeRanges', () => {
    it('merges overlapping and adjacent ranges', () => {
      const merged = mergeRanges([
        { start: 60, end: 120 },
        { start: 120, end: 180 },
        { start: 200, end: 240 },
      ]);
      expect(merged).toEqual([
        { start: 60, end: 180 },
        { start: 200, end: 240 },
      ]);
    });
  });

  describe('subtractRanges', () => {
    it('removes a break in the middle of a working range', () => {
      // Doctor works 17:00-22:00 (1020-1320), break 19:00-19:30 (1140-1170)
      const result = subtractRanges([{ start: 1020, end: 1320 }], [{ start: 1140, end: 1170 }]);
      expect(result).toEqual([
        { start: 1020, end: 1140 },
        { start: 1170, end: 1320 },
      ]);
    });

    it('removes a busy range that fully covers a working range', () => {
      const result = subtractRanges([{ start: 600, end: 660 }], [{ start: 500, end: 700 }]);
      expect(result).toEqual([]);
    });

    it('handles a busy range that starts before and ends inside', () => {
      const result = subtractRanges([{ start: 600, end: 700 }], [{ start: 500, end: 650 }]);
      expect(result).toEqual([{ start: 650, end: 700 }]);
    });

    it('is a no-op when there is no overlap', () => {
      const result = subtractRanges([{ start: 600, end: 700 }], [{ start: 800, end: 900 }]);
      expect(result).toEqual([{ start: 600, end: 700 }]);
    });
  });

  describe('generateSlots', () => {
    it('slices a working window into fixed-duration appointment slots', () => {
      // 17:00-19:00 (1020-1140), 20-minute slots
      const slots = generateSlots([{ start: 1020, end: 1140 }], 20);
      expect(slots).toHaveLength(6);
      expect(slots[0]).toEqual({ start: 1020, end: 1040 });
      expect(slots[5]).toEqual({ start: 1120, end: 1140 });
    });

    it('drops a trailing partial slot that does not fit', () => {
      const slots = generateSlots([{ start: 0, end: 50 }], 20);
      expect(slots).toEqual([
        { start: 0, end: 20 },
        { start: 20, end: 40 },
      ]);
    });

    it('reproduces the spec example: 17:00-22:00 minus 19:00-19:30 break, 20-minute slots', () => {
      const free = subtractRanges([{ start: parseTime('17:00'), end: parseTime('22:00') }], [
        { start: parseTime('19:00'), end: parseTime('19:30') },
      ]);
      const slots = generateSlots(free, 20).map((s) => ({ start: formatTime(s.start), end: formatTime(s.end) }));
      expect(slots[0]).toEqual({ start: '17:00', end: '17:20' });
      expect(slots).not.toContainEqual({ start: '19:00', end: '19:20' });
      // Second range is 19:30-22:00 (150 min); 20-minute slots restart at 19:30 and
      // can't span the break, so the last slot is 21:30-21:50, not 21:40-22:00.
      expect(slots[slots.length - 1]).toEqual({ start: '21:30', end: '21:50' });
    });
  });

  describe('rangesOverlap', () => {
    it('detects overlap and non-overlap correctly, including touching edges', () => {
      expect(rangesOverlap({ start: 0, end: 60 }, { start: 30, end: 90 })).toBe(true);
      expect(rangesOverlap({ start: 0, end: 60 }, { start: 60, end: 120 })).toBe(false);
      expect(rangesOverlap({ start: 0, end: 60 }, { start: 61, end: 120 })).toBe(false);
    });
  });
});

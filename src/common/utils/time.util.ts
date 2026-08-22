/**
 * Pure time-interval math shared by the availability engine and, in the
 * appointments module, by conflict checking — both need "given busy ranges,
 * what's free" or "does this new range collide with anything".
 */
export interface TimeRange {
  start: number; // minutes since midnight
  end: number;
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseTime(value: string): number {
  const match = TIME_RE.exec(value);
  if (!match) throw new Error(`Invalid time string: "${value}" (expected HH:mm)`);
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Merges overlapping/adjacent ranges and sorts by start time. */
export function mergeRanges(ranges: TimeRange[]): TimeRange[] {
  const sorted = [...ranges].filter((r) => r.end > r.start).sort((a, b) => a.start - b.start);
  const merged: TimeRange[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

/** Subtracts `busy` ranges from `base` ranges, returning the remaining free ranges. */
export function subtractRanges(base: TimeRange[], busy: TimeRange[]): TimeRange[] {
  const mergedBusy = mergeRanges(busy);
  let result: TimeRange[] = mergeRanges(base);

  for (const b of mergedBusy) {
    const next: TimeRange[] = [];
    for (const r of result) {
      if (b.end <= r.start || b.start >= r.end) {
        // no overlap
        next.push(r);
        continue;
      }
      if (b.start > r.start) next.push({ start: r.start, end: Math.min(b.start, r.end) });
      if (b.end < r.end) next.push({ start: Math.max(b.end, r.start), end: r.end });
    }
    result = next.filter((r) => r.end > r.start);
  }
  return result;
}

export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && b.start < a.end;
}

export function anyOverlap(range: TimeRange, others: TimeRange[]): boolean {
  return others.some((o) => rangesOverlap(range, o));
}

/** Slices free ranges into consecutive fixed-duration slots. */
export function generateSlots(freeRanges: TimeRange[], durationMinutes: number, stepMinutes?: number): TimeRange[] {
  const step = stepMinutes ?? durationMinutes;
  const slots: TimeRange[] = [];
  for (const range of freeRanges) {
    let cursor = range.start;
    while (cursor + durationMinutes <= range.end) {
      slots.push({ start: cursor, end: cursor + durationMinutes });
      cursor += step;
    }
  }
  return slots;
}

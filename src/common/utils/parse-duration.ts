/** Parses a "30d" / "15m" / "12h" / "45s" style duration string into milliseconds. */
export function parseDurationMs(value: string, fallbackMs: number): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)$/.exec(value.trim());
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unitMs: Record<string, number> = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * unitMs[match[2]];
}

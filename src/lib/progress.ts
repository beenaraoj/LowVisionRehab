import type { SessionRecord } from '../types';

export type TrendDirection = 'up' | 'flat' | 'down' | 'insufficient';

export interface Trend {
  direction: TrendDirection;
  /** Recent value (e.g. % words read, or threshold degrees) */
  recent: number | null;
  /** Older comparison value */
  previous: number | null;
}

const WINDOW = 5;
/** Relative change below this is reported as 'flat' — avoids noise-driven messages */
const FLAT_BAND = 0.07;

function trendOf(values: number[], higherIsBetter: boolean): Trend {
  // values are newest-first
  if (values.length < 2) {
    return { direction: 'insufficient', recent: values[0] ?? null, previous: null };
  }
  // Non-overlapping windows: with fewer than 2 full windows, shrink the
  // recent window so it never shares sessions with its own baseline.
  const w = Math.min(WINDOW, Math.floor(values.length / 2));
  const recentWin = values.slice(0, w);
  const older = values.slice(w, w + WINDOW);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const recent = mean(recentWin);
  const previous = mean(older);
  const base = Math.max(Math.abs(previous), 0.0001);
  const rel = (recent - previous) / base;
  let direction: TrendDirection = 'flat';
  if (Math.abs(rel) >= FLAT_BAND) {
    const improved = higherIsBetter ? rel > 0 : rel < 0;
    direction = improved ? 'up' : 'down';
  }
  return {
    direction,
    recent: Math.round(recent * 100) / 100,
    previous: Math.round(previous * 100) / 100,
  };
}

/** % of words read across recent dot-fixation sessions (newest-first input). */
export function readingTrend(sessions: SessionRecord[]): Trend {
  const pcts = sessions
    .filter((s) => s.exercise === 'dot-fixation')
    .filter((s) => s.results.length >= 3) // ignore tiny fragments
    .map((s) => (s.results.filter((r) => r.read).length / s.results.length) * 100);
  return trendOf(pcts, true);
}

/** Letter-test threshold trend — smaller letters seen = better. */
export function letterTrend(sessions: SessionRecord[]): Trend {
  const thresholds = sessions
    .filter((s) => s.exercise === 'letter-test')
    .map((s) => s.thresholdDeg)
    .filter((t): t is number => t !== null);
  return trendOf(thresholds, false);
}

/** Longest fixation hold trend — longer holds = better. */
export function holdTrend(sessions: SessionRecord[]): Trend {
  const bests = sessions
    .filter((s) => s.exercise === 'fixation-drill')
    .filter((s) => s.holdsSec.length > 0)
    .map((s) => Math.max(...s.holdsSec));
  return trendOf(bests, true);
}
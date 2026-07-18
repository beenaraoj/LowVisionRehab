/**
 * Up-down staircase for the disappearing-letter test.
 *
 * Clinical intent (confirmed with the clinician): the patient looks DIRECTLY
 * at a central letter; the smallest letter they can still see tracks central
 * scotoma density over time. Letter size shrinks while seen, grows when lost,
 * and each direction change is a "reversal". After STOP_REVERSALS reversals
 * the threshold is the mean of the reversal sizes.
 *
 * Sizes are visual-angle degrees (calibrated), so thresholds are comparable
 * across sessions and devices. Note: letters render in the app's bold sans
 * face, not true Sloan optotypes — thresholds are consistent within the app
 * but are NOT clinical acuity values.
 */

export interface StaircaseState {
  /** Current letter size to present, degrees */
  currentDeg: number;
  /** Step applied on the next move (coarse until first reversal, then fine) */
  stepDeg: number;
  /** Last response direction: shrinking (true) or growing (false); null before first answer */
  descending: boolean | null;
  /** Sizes at which the staircase reversed direction */
  reversals: number[];
  presentations: number;
  done: boolean;
  /**
   * Set when the patient cannot see even the maximum-size letter — clinically
   * meaningful (dense central scotoma), recorded as a null threshold.
   */
  cannotSeeMax: boolean;
  /**
   * Set when the patient still sees the MINIMUM-size letter — the best
   * possible outcome; threshold is recorded as the floor value rather than
   * looping redundant presentations.
   */
  flooredAtMin: boolean;
}

export const STAIRCASE = {
  minDeg: 0.2,
  maxDeg: 5,
  coarseStepDeg: 0.4,
  fineStepDeg: 0.2,
  stopReversals: 3,
  /** Hard cap so a confused tapping pattern can never loop forever */
  maxPresentations: 30,
} as const;

export function createStaircase(startDeg: number): StaircaseState {
  return {
    currentDeg: clamp(startDeg),
    stepDeg: STAIRCASE.coarseStepDeg,
    descending: null,
    reversals: [],
    presentations: 0,
    done: false,
    cannotSeeMax: false,
    flooredAtMin: false,
  };
}

function clamp(deg: number): number {
  return Math.min(STAIRCASE.maxDeg, Math.max(STAIRCASE.minDeg, deg));
}

/** Advance the staircase with the patient's answer for the current size. */
export function respond(s: StaircaseState, seen: boolean): StaircaseState {
  if (s.done) return s;
  const presentations = s.presentations + 1;
  const wasDescending = s.descending;
  const nowDescending = seen; // seen -> try smaller; not seen -> go bigger

  const reversals =
    wasDescending !== null && wasDescending !== nowDescending
      ? [...s.reversals, s.currentDeg]
      : s.reversals;

  // Refine the step once the first reversal brackets the threshold.
  const stepDeg = reversals.length > 0 ? STAIRCASE.fineStepDeg : s.stepDeg;

  // Patient cannot see the letter even at max size: stop, flag it.
  if (!seen && s.currentDeg >= STAIRCASE.maxDeg) {
    return { ...s, presentations, reversals, done: true, cannotSeeMax: true };
  }

  // Patient still sees the minimum-size letter: best possible outcome —
  // stop with the floor as the threshold instead of looping at the clamp.
  // (Epsilon tolerance: repeated float steps can land at 0.20000000000000007.)
  if (seen && s.currentDeg <= STAIRCASE.minDeg + 1e-9) {
    return {
      ...s,
      presentations,
      reversals,
      stepDeg,
      descending: nowDescending,
      done: true,
      cannotSeeMax: false,
      flooredAtMin: true,
    };
  }

  const done =
    reversals.length >= STAIRCASE.stopReversals ||
    presentations >= STAIRCASE.maxPresentations;

  const next = clamp(seen ? s.currentDeg - stepDeg : s.currentDeg + stepDeg);

  return {
    currentDeg: done ? s.currentDeg : next,
    stepDeg,
    descending: nowDescending,
    reversals,
    presentations,
    done,
    cannotSeeMax: false,
    flooredAtMin: false,
  };
}

/** Mean of reversal sizes; the floor value when floored; null when unusable. */
export function threshold(s: StaircaseState): number | null {
  if (s.flooredAtMin) return STAIRCASE.minDeg;
  if (s.cannotSeeMax || s.reversals.length === 0) return null;
  const mean = s.reversals.reduce((a, b) => a + b, 0) / s.reversals.length;
  return Math.round(mean * 100) / 100;
}
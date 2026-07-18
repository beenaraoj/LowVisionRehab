/**
 * Gaze direction, in the clinician's prescription language.
 * "inferior" means the patient shifts their gaze BELOW the word,
 * so the word is rendered ABOVE the fixation dot (and vice versa).
 * Horizontal directions are screen left/right of the word; the clinician
 * converts nasal/temporal per-eye when writing the prescription.
 */
export type GazeDirection = 'inferior' | 'superior' | 'left' | 'right';

export type DotColor = 'red' | 'blue' | 'orange';

export type Polarity = 'dark' | 'light'; // dark = white text on black (default)

export interface Calibration {
  /** CSS pixels per physical centimetre of screen, from card-match or screen-size entry */
  pxPerCm: number;
  /** Patient's viewing distance from the screen, in cm */
  distanceCm: number;
  method: 'card' | 'screen-size';
  savedAt: string; // ISO date
  /**
   * window.screen dimensions (CSS points) captured at save time. If these no
   * longer match at exercise time (e.g. iPadOS Display Zoom was changed, or the
   * page moved to a different device), the calibration is stale and exercises
   * must be blocked until recalibration.
   */
  screenW?: number;
  screenH?: number;
}

export interface ExerciseSettings {
  gazeDirection: GazeDirection;
  eccentricityDeg: number;
  dotColor: DotColor;
  /** Capital-letter height of the target word, in degrees of visual angle */
  letterHeightDeg: number;
  words: string[];
  sessionMinutes: number;
  polarity: Polarity;
  /** Speak short prompts (instructions, "Did you read the word?") via speech synthesis */
  audioPrompts: boolean;
  /** Letter test: starting letter size in degrees for the staircase */
  letterStartDeg: number;
  /** Fixation drill: seconds counted as a full successful hold */
  fixationTargetSec: number;
  /** Fixation drill: number of hold trials per session */
  fixationTrials: number;
}

export type ExerciseType = 'dot-fixation' | 'letter-test' | 'fixation-drill';

export interface WordResult {
  word: string;
  read: boolean;
}

interface SessionBase {
  id: string;
  startedAt: string; // ISO date
  durationSec: number;
  completed: boolean; // false if ended early
}

export interface DotFixationSession extends SessionBase {
  exercise: 'dot-fixation';
  settings: Omit<ExerciseSettings, 'words'> & { wordCount: number };
  results: WordResult[];
}

export interface LetterTestSession extends SessionBase {
  exercise: 'letter-test';
  /** Mean of the reversal sizes, in degrees — the tracked self-monitoring number. null = could not see even the largest letter */
  thresholdDeg: number | null;
  /** Letter sizes (degrees) at each staircase reversal */
  reversals: number[];
  /** Number of letter presentations answered */
  presentations: number;
}

export interface FixationDrillSession extends SessionBase {
  exercise: 'fixation-drill';
  /** Seconds each trial's fixation was held before fading (capped at target) */
  holdsSec: number[];
  targetHoldSec: number;
  dotColor: DotColor;
}

export type SessionRecord = DotFixationSession | LetterTestSession | FixationDrillSession;
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
}

export interface WordResult {
  word: string;
  read: boolean;
}

export interface SessionRecord {
  id: string;
  startedAt: string; // ISO date
  exercise: 'dot-fixation';
  durationSec: number;
  completed: boolean; // false if ended early via the End button
  settings: Omit<ExerciseSettings, 'words'> & { wordCount: number };
  results: WordResult[];
}

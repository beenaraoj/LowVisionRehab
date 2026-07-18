import type {
  Calibration,
  DotColor,
  ExerciseSettings,
  GazeDirection,
  Polarity,
  SessionRecord,
} from '../types';
import { DEFAULT_WORDS } from './words';

const KEYS = {
  calibration: 'evt.calibration.v1',
  settings: 'evt.settings.v1',
  sessions: 'evt.sessions.v1',
} as const;

/** Newest sessions kept; prevents unbounded growth toward the localStorage quota. */
const MAX_SESSIONS = 500;

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Guarded write. Returns false instead of throwing on QuotaExceededError /
 * private-mode restrictions so a failed save can never strand the UI
 * mid-exercise. Callers that persist clinical data must check the result.
 */
function writeJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// --- Calibration ---

function isFiniteInRange(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
}

export function loadCalibration(): Calibration | null {
  const raw = readJson<Calibration>(KEYS.calibration);
  if (!raw) return null;
  // Reject corrupted values rather than running exercises with garbage geometry.
  if (!isFiniteInRange(raw.pxPerCm, 5, 500)) return null;
  if (!isFiniteInRange(raw.distanceCm, 15, 200)) return null;
  return raw;
}

export function saveCalibration(cal: Calibration): boolean {
  return writeJson(KEYS.calibration, cal);
}

// --- Settings ---

export const DEFAULT_SETTINGS: ExerciseSettings = {
  gazeDirection: 'inferior',
  eccentricityDeg: 2,
  dotColor: 'red',
  letterHeightDeg: 2,
  words: DEFAULT_WORDS,
  sessionMinutes: 5,
  polarity: 'dark',
  audioPrompts: true,
  letterStartDeg: 2,
  fixationTargetSec: 30,
  fixationTrials: 5,
};

const GAZE_DIRECTIONS: GazeDirection[] = ['inferior', 'superior', 'left', 'right'];
const DOT_COLOR_NAMES: DotColor[] = ['red', 'blue', 'orange'];
const POLARITIES: Polarity[] = ['dark', 'light'];

/**
 * Field-by-field sanitization: any stored field that fails validation falls
 * back to its default instead of flowing into an exercise. Guards against
 * corruption, manual edits, and schema drift across app versions —
 * e.g. words: [] would otherwise run a dot-only exercise logging empty words.
 */
function sanitizeSettings(raw: Partial<ExerciseSettings> | null): ExerciseSettings {
  const d = DEFAULT_SETTINGS;
  if (!raw || typeof raw !== 'object') return { ...d };
  const words =
    Array.isArray(raw.words) && raw.words.length > 0
      ? raw.words.filter((w): w is string => typeof w === 'string' && w.trim().length > 0)
      : [];
  return {
    gazeDirection: GAZE_DIRECTIONS.includes(raw.gazeDirection as GazeDirection)
      ? (raw.gazeDirection as GazeDirection)
      : d.gazeDirection,
    eccentricityDeg: isFiniteInRange(raw.eccentricityDeg, 0.5, 10)
      ? raw.eccentricityDeg
      : d.eccentricityDeg,
    dotColor: DOT_COLOR_NAMES.includes(raw.dotColor as DotColor)
      ? (raw.dotColor as DotColor)
      : d.dotColor,
    letterHeightDeg: isFiniteInRange(raw.letterHeightDeg, 0.5, 6)
      ? raw.letterHeightDeg
      : d.letterHeightDeg,
    words: words.length > 0 ? words : [...d.words],
    sessionMinutes: isFiniteInRange(raw.sessionMinutes, 1, 30)
      ? raw.sessionMinutes
      : d.sessionMinutes,
    polarity: POLARITIES.includes(raw.polarity as Polarity) ? (raw.polarity as Polarity) : d.polarity,
    audioPrompts: typeof raw.audioPrompts === 'boolean' ? raw.audioPrompts : d.audioPrompts,
    letterStartDeg: isFiniteInRange(raw.letterStartDeg, 0.5, 5)
      ? raw.letterStartDeg
      : d.letterStartDeg,
    fixationTargetSec: isFiniteInRange(raw.fixationTargetSec, 5, 120)
      ? raw.fixationTargetSec
      : d.fixationTargetSec,
    fixationTrials: isFiniteInRange(raw.fixationTrials, 1, 10)
      ? raw.fixationTrials
      : d.fixationTrials,
  };
}

export function loadSettings(): ExerciseSettings {
  return sanitizeSettings(readJson<Partial<ExerciseSettings>>(KEYS.settings));
}

export function saveSettings(s: ExerciseSettings): boolean {
  return writeJson(KEYS.settings, s);
}

// --- Sessions ---

export function loadSessions(): SessionRecord[] {
  return readJson<SessionRecord[]>(KEYS.sessions) ?? [];
}

/**
 * Upsert by id: a session keeps one stable id for its whole lifetime, so a
 * partial save (pagehide mid-session) is later overwritten by the final save
 * instead of duplicating. Returns false if the write failed (quota) — the
 * caller surfaces that instead of silently losing clinical data.
 */
export function saveSession(session: SessionRecord): boolean {
  const all = loadSessions().filter((s) => s.id !== session.id);
  all.unshift(session);
  return writeJson(KEYS.sessions, all.slice(0, MAX_SESSIONS));
}
import type { Calibration, ExerciseSettings, SessionRecord } from '../types';
import { DEFAULT_WORDS } from './words';

const KEYS = {
  calibration: 'evt.calibration.v1',
  settings: 'evt.settings.v1',
  sessions: 'evt.sessions.v1',
} as const;

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function loadCalibration(): Calibration | null {
  return readJson<Calibration>(KEYS.calibration);
}

export function saveCalibration(cal: Calibration): void {
  localStorage.setItem(KEYS.calibration, JSON.stringify(cal));
}

export const DEFAULT_SETTINGS: ExerciseSettings = {
  gazeDirection: 'inferior',
  eccentricityDeg: 2,
  dotColor: 'red',
  letterHeightDeg: 2,
  words: DEFAULT_WORDS,
  sessionMinutes: 5,
  polarity: 'dark',
};

export function loadSettings(): ExerciseSettings {
  return { ...DEFAULT_SETTINGS, ...readJson<Partial<ExerciseSettings>>(KEYS.settings) };
}

export function saveSettings(s: ExerciseSettings): void {
  localStorage.setItem(KEYS.settings, JSON.stringify(s));
}

export function loadSessions(): SessionRecord[] {
  return readJson<SessionRecord[]>(KEYS.sessions) ?? [];
}

export function saveSession(session: SessionRecord): void {
  const all = loadSessions();
  all.unshift(session);
  localStorage.setItem(KEYS.sessions, JSON.stringify(all));
}

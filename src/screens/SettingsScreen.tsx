import { useState } from 'react';
import type { Calibration, DotColor, ExerciseSettings, GazeDirection } from '../types';
import {
  degreesToPx,
  describePlacement,
  fontSizeForLetterHeight,
  wordOffsetPx,
} from '../lib/geometry';
import { DOT_COLORS } from '../lib/colors';

interface Props {
  settings: ExerciseSettings;
  calibration: Calibration | null;
  onSave: (s: ExerciseSettings) => void;
  onBack: () => void;
}

const DIRECTIONS: { value: GazeDirection; label: string }[] = [
  { value: 'inferior', label: 'Inferior (look below word)' },
  { value: 'superior', label: 'Superior (look above word)' },
  { value: 'left', label: 'Left (look left of word)' },
  { value: 'right', label: 'Right (look right of word)' },
];

/** Clinician-facing: prescription parameters + live placement preview. */
export default function SettingsScreen({ settings, calibration, onSave, onBack }: Props) {
  const [s, setS] = useState<ExerciseSettings>(settings);
  const [wordsText, setWordsText] = useState(settings.words.join('\n'));

  const set = <K extends keyof ExerciseSettings>(key: K, value: ExerciseSettings[K]) =>
    setS((prev) => ({ ...prev, [key]: value }));

  const words = wordsText
    .split('\n')
    .map((w) => w.trim())
    .filter(Boolean);

  // Fit check: will the word land on screen at the calibrated distance?
  let fitWarning: string | null = null;
  let offset = { dx: 0, dy: 0 };
  if (calibration) {
    offset = wordOffsetPx(s.gazeDirection, s.eccentricityDeg, calibration);
    const fontPx = fontSizeForLetterHeight(s.letterHeightDeg, calibration);
    const halfW = window.innerWidth / 2;
    const halfH = window.innerHeight / 2;
    const longestWord = words.reduce((m, w) => Math.max(m, w.length), 4);
    // rough word box: width ~ 0.6em per char, height ~ 1em
    const wordHalfW = (longestWord * fontPx * 0.6) / 2;
    const wordHalfH = fontPx / 2;
    if (
      Math.abs(offset.dx) + wordHalfW > halfW ||
      Math.abs(offset.dy) + wordHalfH > halfH
    ) {
      fitWarning =
        'At this eccentricity, text size and viewing distance, the word will not fit on this screen. Reduce eccentricity/text size or sit further away.';
    }
  }

  // Mini preview, scaled to fit its box (not true scale — true px shown as text).
  const PREVIEW = 260;
  const previewScale = calibration
    ? Math.min(
        1,
        (PREVIEW / 2 - 30) / Math.max(Math.abs(offset.dx), Math.abs(offset.dy), 1),
      )
    : 1;

  const valid = words.length > 0 && s.eccentricityDeg > 0;

  return (
    <div className="screen">
      <button className="nav-back" onClick={onBack}>
        ← Back
      </button>
      <h1>Exercise Settings</h1>
      <p className="muted">Clinician area — sets the training prescription manually for now.</p>

      {!calibration && (
        <p className="warning">Screen is not calibrated — placement preview unavailable.</p>
      )}

      <div className="field">
        <label>Gaze direction (from prescription)</label>
        <div className="choices">
          {DIRECTIONS.map((d) => (
            <button
              key={d.value}
              className={s.gazeDirection === d.value ? 'selected' : ''}
              onClick={() => set('gazeDirection', d.value)}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Eccentricity (degrees from fixation)</label>
        <div className="stepper">
          <button
            onClick={() => set('eccentricityDeg', Math.max(0.5, s.eccentricityDeg - 0.5))}
          >
            −
          </button>
          <span className="value">{s.eccentricityDeg.toFixed(1)}°</span>
          <button
            onClick={() => set('eccentricityDeg', Math.min(10, s.eccentricityDeg + 0.5))}
          >
            +
          </button>
        </div>
      </div>

      <div className="field">
        <label>Fixation dot colour</label>
        <div className="choices">
          {(Object.keys(DOT_COLORS) as DotColor[]).map((c) => (
            <button
              key={c}
              className={s.dotColor === c ? 'selected' : ''}
              style={{ borderColor: DOT_COLORS[c] }}
              onClick={() => set('dotColor', c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Letter height (degrees)</label>
        <div className="stepper">
          <button
            onClick={() => set('letterHeightDeg', Math.max(0.5, s.letterHeightDeg - 0.25))}
          >
            −
          </button>
          <span className="value">{s.letterHeightDeg.toFixed(2)}°</span>
          <button
            onClick={() => set('letterHeightDeg', Math.min(6, s.letterHeightDeg + 0.25))}
          >
            +
          </button>
        </div>
        {calibration && (
          <p className="muted">
            ≈ {degreesToPx(s.letterHeightDeg, calibration).toFixed(0)} px capital-letter
            height at {calibration.distanceCm} cm.
          </p>
        )}
      </div>

      <div className="field">
        <label>Session length (minutes)</label>
        <div className="stepper">
          <button onClick={() => set('sessionMinutes', Math.max(1, s.sessionMinutes - 1))}>
            −
          </button>
          <span className="value">{s.sessionMinutes} min</span>
          <button onClick={() => set('sessionMinutes', Math.min(30, s.sessionMinutes + 1))}>
            +
          </button>
        </div>
      </div>

      <div className="field">
        <label>Display polarity</label>
        <div className="choices">
          <button
            className={s.polarity === 'dark' ? 'selected' : ''}
            onClick={() => set('polarity', 'dark')}
          >
            White on black
          </button>
          <button
            className={s.polarity === 'light' ? 'selected' : ''}
            onClick={() => set('polarity', 'light')}
          >
            Black on white
          </button>
        </div>
      </div>

      <div className="field">
        <label htmlFor="words">Word list (one per line)</label>
        <textarea
          id="words"
          value={wordsText}
          onChange={(e) => setWordsText(e.target.value)}
          spellCheck={false}
        />
        <p className="muted">{words.length} words</p>
      </div>

      <h2>Placement preview</h2>
      <p>{describePlacement(s.gazeDirection, s.eccentricityDeg)}</p>
      {calibration && (
        <>
          <div
            style={{
              position: 'relative',
              width: PREVIEW,
              height: PREVIEW,
              border: '2px solid var(--muted)',
              borderRadius: 12,
              alignSelf: 'center',
            }}
          >
            <div
              className="fixation-dot"
              style={{
                left: '50%',
                top: '50%',
                width: 18,
                height: 18,
                background: DOT_COLORS[s.dotColor],
              }}
            />
            <span
              className="target-word"
              style={{
                left: `calc(50% + ${offset.dx * previewScale}px)`,
                top: `calc(50% + ${offset.dy * previewScale}px)`,
                fontSize: 22,
              }}
            >
              {words[0] ?? 'word'}
            </span>
          </div>
          <p className="muted">
            Preview not to scale. True offset on this screen:{' '}
            {Math.hypot(offset.dx, offset.dy).toFixed(0)} px.
          </p>
        </>
      )}

      {fitWarning && <p className="warning">{fitWarning}</p>}

      <button
        className="btn-huge"
        disabled={!valid}
        onClick={() => onSave({ ...s, words })}
      >
        Save Settings
      </button>
    </div>
  );
}

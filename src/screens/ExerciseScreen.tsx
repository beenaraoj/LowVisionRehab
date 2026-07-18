import { useMemo, useRef, useState } from 'react';
import type { Calibration, ExerciseSettings, WordResult } from '../types';
import {
  dotDiameterPx,
  fontSizeForLetterHeight,
  wordOffsetPx,
} from '../lib/geometry';
import { DOT_COLORS } from '../lib/colors';
import { shuffled } from '../lib/words';
import { saveSession } from '../lib/storage';

interface Props {
  settings: ExerciseSettings;
  calibration: Calibration;
  onExit: () => void;
}

type Phase = 'intro' | 'fixate' | 'respond' | 'done';

/**
 * Dot-fixation reading exercise (patient mode).
 * One action per screen:
 *  - fixate:  dot + word only; tapping ANYWHERE advances
 *  - respond: "Did you read the word?" YES / NO
 * Loops until the timed session elapses, then shows a summary.
 */
export default function ExerciseScreen({ settings, calibration, onExit }: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [results, setResults] = useState<WordResult[]>([]);
  const [queue, setQueue] = useState<string[]>(() => shuffled(settings.words));
  const startRef = useRef<number>(0);
  const savedRef = useRef(false);

  const offset = useMemo(
    () => wordOffsetPx(settings.gazeDirection, settings.eccentricityDeg, calibration),
    [settings, calibration],
  );
  const fontPx = fontSizeForLetterHeight(settings.letterHeightDeg, calibration);
  const dotPx = dotDiameterPx(calibration);
  const currentWord = queue[0] ?? '';

  // Safety: never run an exercise whose geometry doesn't fit this screen —
  // a clamped offset would silently train the wrong eccentricity.
  const fits =
    Math.abs(offset.dx) + (currentWord.length * fontPx * 0.6) / 2 < window.innerWidth / 2 &&
    Math.abs(offset.dy) + fontPx / 2 < window.innerHeight / 2;

  const elapsedSec = () => Math.round((Date.now() - startRef.current) / 1000);

  const finish = (completed: boolean, finalResults: WordResult[]) => {
    if (!savedRef.current && (finalResults.length > 0 || completed)) {
      savedRef.current = true;
      saveSession({
        id: `${Date.now()}`,
        startedAt: new Date(startRef.current || Date.now()).toISOString(),
        exercise: 'dot-fixation',
        durationSec: startRef.current ? elapsedSec() : 0,
        completed,
        settings: {
          gazeDirection: settings.gazeDirection,
          eccentricityDeg: settings.eccentricityDeg,
          dotColor: settings.dotColor,
          letterHeightDeg: settings.letterHeightDeg,
          sessionMinutes: settings.sessionMinutes,
          polarity: settings.polarity,
          wordCount: settings.words.length,
        },
        results: finalResults,
      });
    }
  };

  const answer = (read: boolean) => {
    const next = [...results, { word: currentWord, read }];
    setResults(next);
    setQueue((q) => {
      const rest = q.slice(1);
      if (rest.length > 0) return rest;
      // refill, avoiding an immediate repeat of the word just shown
      let refill = shuffled(settings.words);
      if (refill.length > 1 && refill[0] === currentWord) {
        refill = [...refill.slice(1), refill[0]];
      }
      return refill;
    });
    if (elapsedSec() >= settings.sessionMinutes * 60) {
      finish(true, next);
      setPhase('done');
    } else {
      setPhase('fixate');
    }
  };

  const endEarly = () => {
    finish(false, results);
    setPhase('done');
  };

  if (phase === 'intro') {
    return (
      <div className="screen" style={{ justifyContent: 'center' }}>
        <h1>Dot Reading</h1>
        <p style={{ fontSize: '1.4rem' }}>
          Look at the <strong>coloured dot</strong> the whole time. Try to read the word
          without looking at it. Tap the screen when ready to answer.
        </p>
        {!fits && (
          <p className="warning">
            The prescribed eccentricity does not fit on this screen at the calibrated
            distance. Please adjust settings or calibration first.
          </p>
        )}
        <button
          className="btn-huge"
          disabled={!fits}
          onClick={() => {
            startRef.current = Date.now();
            setPhase('fixate');
          }}
        >
          Begin
        </button>
        <button onClick={onExit}>Back</button>
      </div>
    );
  }

  if (phase === 'fixate') {
    return (
      <div className="exercise-stage" onPointerDown={() => setPhase('respond')}>
        <div
          className="fixation-dot"
          style={{
            left: '50%',
            top: '50%',
            width: dotPx,
            height: dotPx,
            background: DOT_COLORS[settings.dotColor],
          }}
        />
        <span
          className="target-word"
          style={{
            left: `calc(50% + ${offset.dx}px)`,
            top: `calc(50% + ${offset.dy}px)`,
            fontSize: fontPx,
          }}
        >
          {currentWord}
        </span>
      </div>
    );
  }

  if (phase === 'respond') {
    return (
      <div className="screen" style={{ justifyContent: 'center' }}>
        <h1 style={{ textAlign: 'center' }}>Did you read the word?</h1>
        <p style={{ textAlign: 'center', fontSize: '2.2rem', fontWeight: 700 }}>
          {currentWord}
        </p>
        <button className="btn-huge btn-yes" onClick={() => answer(true)}>
          ✓ Yes, I read it
        </button>
        <button className="btn-huge btn-no" onClick={() => answer(false)}>
          ✗ No, I couldn't
        </button>
        <button className="end-button" style={{ position: 'static' }} onClick={endEarly}>
          End session
        </button>
      </div>
    );
  }

  // done
  const readCount = results.filter((r) => r.read).length;
  return (
    <div className="screen" style={{ justifyContent: 'center' }}>
      <h1 style={{ textAlign: 'center' }}>Well done!</h1>
      <p style={{ textAlign: 'center', fontSize: '1.6rem' }}>
        You read {readCount} of {results.length} words.
      </p>
      <button className="btn-huge" onClick={onExit}>
        Finish
      </button>
    </div>
  );
}

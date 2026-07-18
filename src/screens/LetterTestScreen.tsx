import { useEffect, useRef, useState } from 'react';
import type { Calibration, ExerciseSettings, LetterTestSession } from '../types';
import { degreesToPx } from '../lib/geometry';
import { createStaircase, respond, threshold, type StaircaseState } from '../lib/staircase';
import { nextLetter } from '../lib/letters';
import { useSessionSaver, useCalibrationGuards } from '../lib/useSession';
import { speak, stopSpeaking } from '../lib/audio';

interface Props {
  settings: ExerciseSettings;
  calibration: Calibration;
  onExit: () => void;
}

type Phase = 'intro' | 'show' | 'respond' | 'done';

const ANSWER_ARM_MS = 300;

/**
 * Disappearing-letter test (patient mode).
 *
 * The patient looks DIRECTLY at a single central letter — the smallest
 * letter they can still see tracks central scotoma density over time
 * (self-monitoring, per clinician). Up-down staircase: shrink while seen,
 * grow when lost, threshold = mean of 3 reversal sizes, in calibrated
 * degrees so results are comparable across sessions.
 */
export default function LetterTestScreen({ settings, calibration, onExit }: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [stair, setStair] = useState<StaircaseState>(() =>
    createStaircase(settings.letterStartDeg),
  );
  const [letter, setLetter] = useState<string>(() => nextLetter(null));
  const [armed, setArmed] = useState(false);

  const stairRef = useRef(stair);
  stairRef.current = stair;

  const { zoomOk, screenChanged } = useCalibrationGuards(calibration);

  const session = useSessionSaver((completed): LetterTestSession => {
    const s = stairRef.current;
    return {
      id: session.sessionId(),
      startedAt: session.startedAtIso(),
      exercise: 'letter-test',
      durationSec: session.elapsedSec(),
      completed,
      thresholdDeg: threshold(s),
      reversals: s.reversals,
      presentations: s.presentations,
    };
  });

  const paused = phase === 'show' && !zoomOk;
  useEffect(() => {
    session.setPaused(paused);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  useEffect(() => {
    if (phase !== 'respond') return;
    setArmed(false);
    speak('Could you see the letter?', settings.audioPrompts);
    const t = setTimeout(() => setArmed(true), ANSWER_ARM_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const answer = (seen: boolean) => {
    if (!armed) return;
    const next = respond(stair, seen);
    setStair(next);
    if (next.done) {
      stairRef.current = next; // finish() reads via ref; state flush is async
      session.finish(true);
      speak('The letter check is complete. Well done.', settings.audioPrompts);
      setPhase('done');
    } else {
      setLetter((prev) => nextLetter(prev));
      setPhase('show');
    }
  };

  const endEarly = () => {
    session.finish(false);
    stopSpeaking();
    setPhase('done');
  };

  if (phase === 'intro') {
    return (
      <div className="screen" style={{ justifyContent: 'center' }}>
        <h1>Letter Check</h1>
        <p style={{ fontSize: '1.4rem' }}>
          Look <strong>directly at the letter</strong> in the middle of the screen. Tap the
          screen, then answer whether you could see it. The letters will change size.
        </p>
        {screenChanged && (
          <p className="warning">
            The screen's display settings have changed since calibration. Please
            recalibrate before testing.
          </p>
        )}
        <button
          className="btn-huge"
          disabled={screenChanged}
          onClick={() => {
            session.begin();
            speak(
              'Look directly at the letter in the middle of the screen. Tap the screen, then answer whether you could see it.',
              settings.audioPrompts,
            );
            setPhase('show');
          }}
        >
          Begin
        </button>
        <button onClick={onExit}>Back</button>
      </div>
    );
  }

  if (phase === 'show') {
    if (paused) {
      return (
        <div className="screen" style={{ justifyContent: 'center' }}>
          <h1>Paused</h1>
          <p className="warning">
            The screen is zoomed, so letter sizes are not accurate. Please pinch out to
            remove zoom, then the test will continue.
          </p>
          <button className="btn-huge btn-end" onClick={endEarly}>
            End test
          </button>
        </div>
      );
    }
    const letterPx = degreesToPx(stair.currentDeg, calibration);
    return (
      <div className="exercise-stage" onClick={() => setPhase('respond')}>
        <span
          className="target-word"
          style={{
            left: '50%',
            top: '50%',
            // font-size scaled so the rendered CAP HEIGHT is the staircase size
            fontSize: letterPx / 0.72,
          }}
        >
          {letter}
        </span>
      </div>
    );
  }

  if (phase === 'respond') {
    return (
      <div className="screen" style={{ justifyContent: 'center' }}>
        <h1 style={{ textAlign: 'center' }}>Could you see the letter?</h1>
        <button className="btn-huge btn-yes" disabled={!armed} onClick={() => answer(true)}>
          ✓ Yes, I saw it
        </button>
        <button className="btn-huge btn-no" disabled={!armed} onClick={() => answer(false)}>
          ✗ No, it disappeared
        </button>
        <button className="btn-end" onClick={endEarly}>
          End test
        </button>
      </div>
    );
  }

  // done
  const t = threshold(stair);
  return (
    <div className="screen" style={{ justifyContent: 'center' }}>
      <h1 style={{ textAlign: 'center' }}>Letter check complete</h1>
      <p style={{ textAlign: 'center', fontSize: '1.6rem' }}>
        {stair.flooredAtMin
          ? `Excellent — you saw even the smallest letter (${t!.toFixed(2)}°)!`
          : t !== null
            ? `Smallest letter seen: ${t.toFixed(2)}°`
            : stair.cannotSeeMax
              ? 'The letters were hard to see today. Your clinician will see this result.'
              : 'Test ended early — no result recorded this time.'}
      </p>
      {session.saveFailed && (
        <p className="warning">
          This result could not be saved on the device (storage full or restricted).
          Please tell your clinician.
        </p>
      )}
      <button className="btn-huge" onClick={onExit}>
        Finish
      </button>
    </div>
  );
}
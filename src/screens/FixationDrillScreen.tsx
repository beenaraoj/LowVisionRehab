import { useEffect, useRef, useState } from 'react';
import type { Calibration, ExerciseSettings, FixationDrillSession } from '../types';
import { dotDiameterPx } from '../lib/geometry';
import { DOT_COLORS } from '../lib/colors';
import { useSessionSaver, useCalibrationGuards } from '../lib/useSession';
import { speak, stopSpeaking } from '../lib/audio';

interface Props {
  settings: ExerciseSettings;
  calibration: Calibration;
  onExit: () => void;
}

type Phase = 'intro' | 'hold' | 'interrupted' | 'rest' | 'done';

/** Ghost-tap defence for buttons that appear right after a stage tap. */
const ANSWER_ARM_MS = 300;

/**
 * Steady-fixation drill (patient mode).
 *
 * The patient holds eccentric fixation on the central dot; when it fades
 * (fixation drifted, dot fell into the scotoma) they tap — the tap ENDS the
 * trial (clinician's choice), so the outcome is how long each hold lasted.
 * Reaching the target duration ends the trial as a full success. N trials
 * per session, with a rest screen between trials.
 */
export default function FixationDrillScreen({ settings, calibration, onExit }: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [holds, setHolds] = useState<number[]>([]);
  const [lastHold, setLastHold] = useState(0);
  const [armed, setArmed] = useState(false);

  const holdsRef = useRef<number[]>([]);
  holdsRef.current = holds;
  const trialStartRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { zoomOk, screenChanged } = useCalibrationGuards(calibration);

  const session = useSessionSaver(
    (completed): FixationDrillSession => ({
      id: session.sessionId(),
      startedAt: session.startedAtIso(),
      exercise: 'fixation-drill',
      durationSec: session.elapsedSec(),
      completed,
      holdsSec: holdsRef.current,
      targetHoldSec: settings.fixationTargetSec,
      dotColor: settings.dotColor,
    }),
  );

  const dotPx = dotDiameterPx(calibration);
  const target = settings.fixationTargetSec;
  const trials = settings.fixationTrials;

  // A zoomed hold is VOID: clear its timer, discard its start time, and move
  // to an explicit 'interrupted' state. The patient restarts the hold with a
  // button that only arms once zoom is back to 1:1 — there is no silent
  // auto-resume (which would carry a stale start time or no timer at all).
  useEffect(() => {
    if (phase === 'hold' && !zoomOk) {
      clearTimer();
      setPhase('interrupted');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, zoomOk]);

  // Interrupted time never counts toward the session clock.
  useEffect(() => {
    session.setPaused(phase === 'interrupted');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Ghost-tap defence: the rest/interrupted screens appear in response to a
  // stage tap — disarm their buttons briefly, like every respond screen.
  useEffect(() => {
    if (phase !== 'rest' && phase !== 'interrupted') return;
    setArmed(false);
    const t = setTimeout(() => setArmed(true), ANSWER_ARM_MS);
    return () => clearTimeout(t);
  }, [phase]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
  useEffect(() => clearTimer, []);

  const endTrial = (heldSec: number, fullHold: boolean) => {
    clearTimer();
    const capped = Math.min(heldSec, target);
    const next = [...holds, capped];
    setHolds(next);
    setLastHold(capped);
    if (next.length >= trials) {
      holdsRef.current = next; // finish() reads via ref; state flush is async
      session.finish(true);
      speak('The drill is complete. Well done.', settings.audioPrompts);
      setPhase('done');
    } else {
      speak(
        fullHold
          ? `Excellent — a full hold. Rest, then tap to start hold ${next.length + 1}.`
          : `You held ${capped} seconds. Rest, then tap to start hold ${next.length + 1}.`,
        settings.audioPrompts,
      );
      setPhase('rest');
    }
  };

  const startTrial = () => {
    trialStartRef.current = Date.now();
    clearTimer();
    // Full-success cap: reaching the target ends the trial automatically.
    timerRef.current = setTimeout(() => endTrial(target, true), target * 1000);
    setPhase('hold');
  };

  const tappedDuringHold = () => {
    const heldSec = Math.round((Date.now() - trialStartRef.current) / 1000);
    endTrial(heldSec, false);
  };

  const endEarly = () => {
    clearTimer();
    session.finish(false);
    stopSpeaking();
    setPhase('done');
  };

  if (phase === 'intro') {
    return (
      <div className="screen" style={{ justifyContent: 'center' }}>
        <h1>Hold Steady</h1>
        <p style={{ fontSize: '1.4rem' }}>
          Keep the <strong>coloured dot</strong> in view as long as you can, using your
          trained viewing spot. Tap the screen when the dot fades or disappears. Up to{' '}
          {target} seconds per try, {trials} tries.
        </p>
        {screenChanged && (
          <p className="warning">
            The screen's display settings have changed since calibration. Please
            recalibrate before exercising.
          </p>
        )}
        <button
          className="btn-huge"
          disabled={screenChanged}
          onClick={() => {
            session.begin();
            speak(
              'Keep the coloured dot in view as long as you can. Tap the screen when it fades or disappears.',
              settings.audioPrompts,
            );
            startTrial();
          }}
        >
          Begin
        </button>
        <button onClick={onExit}>Back</button>
      </div>
    );
  }

  if (phase === 'interrupted') {
    return (
      <div className="screen" style={{ justifyContent: 'center' }}>
        <h1>Paused</h1>
        {!zoomOk ? (
          <p className="warning">
            The screen is zoomed, so sizes are not accurate. Please pinch out to remove
            zoom.
          </p>
        ) : (
          <p style={{ fontSize: '1.4rem' }}>Ready to continue when you are.</p>
        )}
        <button className="btn-huge" disabled={!zoomOk || !armed} onClick={startTrial}>
          Restart this hold
        </button>
        <button className="btn-end" onClick={endEarly}>
          End drill
        </button>
      </div>
    );
  }

  if (phase === 'hold') {
    return (
      <div className="exercise-stage" onClick={tappedDuringHold}>
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
      </div>
    );
  }

  if (phase === 'rest') {
    return (
      <div className="screen" style={{ justifyContent: 'center' }}>
        <h1 style={{ textAlign: 'center' }}>
          {lastHold >= target ? 'Full hold — excellent!' : `You held ${lastHold} seconds`}
        </h1>
        <p style={{ textAlign: 'center', fontSize: '1.4rem' }}>
          Hold {holds.length} of {trials} done. Rest your eyes for a moment.
        </p>
        <button className="btn-huge" disabled={!armed} onClick={startTrial}>
          Start next hold
        </button>
        <button className="btn-end" onClick={endEarly}>
          End drill
        </button>
      </div>
    );
  }

  // done
  const best = holds.length > 0 ? Math.max(...holds) : 0;
  return (
    <div className="screen" style={{ justifyContent: 'center' }}>
      <h1 style={{ textAlign: 'center' }}>Well done!</h1>
      <p style={{ textAlign: 'center', fontSize: '1.6rem' }}>
        {holds.length > 0
          ? `Best hold: ${best} seconds (${holds.length} ${holds.length === 1 ? 'try' : 'tries'}).`
          : 'Drill ended before any holds were completed.'}
      </p>
      {session.saveFailed && (
        <p className="warning">
          This session could not be saved on the device (storage full or restricted).
          Please tell your clinician.
        </p>
      )}
      <button className="btn-huge" onClick={onExit}>
        Finish
      </button>
    </div>
  );
}
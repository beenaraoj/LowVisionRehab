import { useEffect, useRef, useState } from 'react';
import type { Calibration, ExerciseSettings, WordResult } from '../types';
import {
  dotDiameterPx,
  fontSizeForLetterHeight,
  longestWordLength,
  stimulusFits,
  wordOffsetPx,
} from '../lib/geometry';
import { useViewportSize, useVisualViewportScale, isZoomAccurate } from '../lib/useViewport';
import { speak, stopSpeaking } from '../lib/audio';
import { shuffled } from '../lib/words';
import { saveSession } from '../lib/storage';
import DotWordDisplay from '../components/DotWordDisplay';

interface Props {
  settings: ExerciseSettings;
  calibration: Calibration;
  onExit: () => void;
}

type Phase = 'intro' | 'fixate' | 'respond' | 'done';

/** Ghost-tap defence: ignore respond-screen answers for this long after the phase switch. */
const ANSWER_ARM_MS = 300;

/**
 * Dot-fixation reading exercise (patient mode).
 *  - fixate:  dot + word only; tapping ANYWHERE advances (on click, so the
 *             same tap can never also fire on the buttons rendered next)
 *  - respond: "Did you read the word?" YES / NO (briefly disarmed after
 *             mount as a second defence against tap-through)
 * Loops until the timed session elapses, then shows a summary. The session
 * keeps one stable id and is also saved on pagehide/backgrounding, so a
 * closed tab or evicted page never silently loses clinical data.
 */
export default function ExerciseScreen({ settings, calibration, onExit }: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [results, setResults] = useState<WordResult[]>([]);
  const [queue, setQueue] = useState<string[]>(() => shuffled(settings.words));
  const [armed, setArmed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const startRef = useRef(0);
  const sessionIdRef = useRef('');
  const finishedRef = useRef(false);
  // Mirrors for the pagehide listener, which can't see current state.
  const resultsRef = useRef<WordResult[]>([]);
  resultsRef.current = results;

  const { vw, vh } = useViewportSize();
  const zoomScale = useVisualViewportScale();
  const zoomOk = isZoomAccurate(zoomScale);

  const offset = wordOffsetPx(settings.gazeDirection, settings.eccentricityDeg, calibration);
  const fontPx = fontSizeForLetterHeight(settings.letterHeightDeg, calibration);
  const dotPx = dotDiameterPx(calibration);
  const currentWord = queue[0] ?? '';

  // Stale-calibration guard: if the screen's CSS-point dimensions changed
  // since calibration (iPadOS Display Zoom, different device), every px→degree
  // conversion is wrong. Block until recalibrated. Compared orientation-
  // invariantly (min/max) because iPad Safari swaps screen.width/height
  // when the device rotates — rotation is NOT a calibration change.
  const screenChanged =
    calibration.screenW !== undefined &&
    calibration.screenH !== undefined &&
    (Math.min(calibration.screenW, calibration.screenH) !==
      Math.min(window.screen.width, window.screen.height) ||
      Math.max(calibration.screenW, calibration.screenH) !==
        Math.max(window.screen.width, window.screen.height));

  // Gate Begin on the LONGEST word in the list, not whichever happens to be
  // shuffled first — every word of the session must fit.
  const allWordsFit = stimulusFits(longestWordLength(settings.words), fontPx, offset, vw, vh);
  // Re-checked live for the word on screen (rotation mid-session).
  const currentWordFits = stimulusFits(currentWord.length || 1, fontPx, offset, vw, vh);

  // Safety pauses (zoom / doesn't-fit) must not consume prescribed training
  // time: accumulate paused wall-clock and subtract it from the session timer.
  const paused = phase === 'fixate' && (!zoomOk || !currentWordFits);
  const pausedAccumRef = useRef(0);
  const pauseStartRef = useRef(0);
  useEffect(() => {
    if (!paused) return;
    pauseStartRef.current = Date.now();
    return () => {
      pausedAccumRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = 0;
    };
  }, [paused]);

  const pausedMs = () =>
    pausedAccumRef.current +
    (pauseStartRef.current ? Date.now() - pauseStartRef.current : 0);
  const elapsedSec = () =>
    Math.round((Date.now() - startRef.current - pausedMs()) / 1000);

  const buildRecord = (completed: boolean, finalResults: WordResult[]) => ({
    id: sessionIdRef.current,
    startedAt: new Date(startRef.current).toISOString(),
    exercise: 'dot-fixation' as const,
    durationSec: elapsedSec(),
    completed,
    settings: {
      gazeDirection: settings.gazeDirection,
      eccentricityDeg: settings.eccentricityDeg,
      dotColor: settings.dotColor,
      letterHeightDeg: settings.letterHeightDeg,
      sessionMinutes: settings.sessionMinutes,
      polarity: settings.polarity,
      audioPrompts: settings.audioPrompts,
      wordCount: settings.words.length,
    },
    results: finalResults,
  });

  // Every started session is recorded — including "began and gave up before
  // answering anything", which tells the clinician the prescription is too hard.
  const finish = (completed: boolean, finalResults: WordResult[]) => {
    if (finishedRef.current || !startRef.current) return;
    finishedRef.current = true;
    const ok = saveSession(buildRecord(completed, finalResults));
    if (!ok) setSaveFailed(true);
  };

  // Partial save if the page is backgrounded/evicted mid-session. Uses the
  // same session id, so the final save simply overwrites it.
  useEffect(() => {
    const persistPartial = () => {
      if (startRef.current && !finishedRef.current) {
        saveSession(buildRecord(false, resultsRef.current));
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') persistPartial();
    };
    window.addEventListener('pagehide', persistPartial);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', persistPartial);
      document.removeEventListener('visibilitychange', onVisibility);
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Disarm the answer buttons briefly whenever the respond screen appears.
  useEffect(() => {
    if (phase !== 'respond') return;
    setArmed(false);
    speak('Did you read the word?', settings.audioPrompts);
    const t = setTimeout(() => setArmed(true), ANSWER_ARM_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const answer = (read: boolean) => {
    if (!armed) return;
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
      speak('Well done. The session is complete.', settings.audioPrompts);
      setPhase('done');
    } else {
      setPhase('fixate');
    }
  };

  const endEarly = () => {
    finish(false, results);
    stopSpeaking();
    setPhase('done');
  };

  if (phase === 'intro') {
    const blocked = screenChanged || !allWordsFit;
    return (
      <div className="screen" style={{ justifyContent: 'center' }}>
        <h1>Dot Reading</h1>
        <p style={{ fontSize: '1.4rem' }}>
          Look at the <strong>coloured dot</strong> the whole time. Try to read the word
          without looking at it. Tap the screen when ready to answer.
        </p>
        {screenChanged && (
          <p className="warning">
            The screen's display settings have changed since calibration, so distances are
            no longer accurate. Please recalibrate before exercising.
          </p>
        )}
        {!screenChanged && !allWordsFit && (
          <p className="warning">
            The prescribed eccentricity and text size do not fit on this screen for every
            word in the list at the calibrated distance. Please adjust settings or
            calibration first.
          </p>
        )}
        <button
          className="btn-huge"
          disabled={blocked}
          onClick={() => {
            startRef.current = Date.now();
            sessionIdRef.current = `s-${Date.now()}`;
            finishedRef.current = false;
            pausedAccumRef.current = 0;
            speak(
              'Look at the coloured dot the whole time. Try to read the word without looking at it. Tap the screen when you are ready to answer.',
              settings.audioPrompts,
            );
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
    // Live safety pauses — never show a stimulus whose geometry is wrong.
    if (!zoomOk || !currentWordFits) {
      return (
        <div className="screen" style={{ justifyContent: 'center' }}>
          <h1>Paused</h1>
          <p className="warning">
            {!zoomOk
              ? 'The screen is zoomed, so distances are not accurate. Please pinch out to remove zoom, then the exercise will continue.'
              : 'The word no longer fits on the screen. Please turn the iPad back, or end the session and adjust settings.'}
          </p>
          <button className="btn-huge btn-end" onClick={endEarly}>
            End session
          </button>
        </div>
      );
    }
    // Advance on click, not pointerdown: the tap completes on this stage, so
    // it can never also fire on the Yes/No buttons rendered afterwards.
    return (
      <div className="exercise-stage" onClick={() => setPhase('respond')}>
        <DotWordDisplay
          dx={offset.dx}
          dy={offset.dy}
          dotPx={dotPx}
          fontPx={fontPx}
          dotColor={settings.dotColor}
          word={currentWord}
        />
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
        <button className="btn-huge btn-yes" disabled={!armed} onClick={() => answer(true)}>
          ✓ Yes, I read it
        </button>
        <button className="btn-huge btn-no" disabled={!armed} onClick={() => answer(false)}>
          ✗ No, I couldn't
        </button>
        <button className="btn-end" onClick={endEarly}>
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
      {saveFailed && (
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
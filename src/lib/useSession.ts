import { useEffect, useRef, useState } from 'react';
import type { Calibration, SessionRecord } from '../types';
import { useViewportSize, useVisualViewportScale, isZoomAccurate } from './useViewport';
import { saveSession } from './storage';
import { stopSpeaking } from './audio';

/**
 * Shared session lifecycle for every patient exercise:
 *  - stable session id for the whole run (partial saves upsert, never duplicate)
 *  - partial save on pagehide/backgrounding so evicted pages lose nothing
 *  - every STARTED session is recorded, even abandoned-with-no-results
 *  - paused time (safety pauses) excluded from the session clock
 *  - failed writes surfaced via saveFailed instead of thrown mid-exercise
 *
 * The caller provides buildRecord(completed) — it must read current data from
 * refs (the pagehide listener fires outside React's render cycle).
 */
export function useSessionSaver(buildRecord: (completed: boolean) => SessionRecord) {
  const startRef = useRef(0);
  const sessionIdRef = useRef('');
  const finishedRef = useRef(false);
  const pausedAccumRef = useRef(0);
  const pauseStartRef = useRef(0);
  const [saveFailed, setSaveFailed] = useState(false);

  const buildRef = useRef(buildRecord);
  buildRef.current = buildRecord;

  const begin = () => {
    startRef.current = Date.now();
    sessionIdRef.current = `s-${Date.now()}`;
    finishedRef.current = false;
    pausedAccumRef.current = 0;
    pauseStartRef.current = 0;
  };

  const pausedMs = () =>
    pausedAccumRef.current +
    (pauseStartRef.current ? Date.now() - pauseStartRef.current : 0);

  const elapsedSec = () =>
    Math.round((Date.now() - startRef.current - pausedMs()) / 1000);

  const setPaused = (paused: boolean) => {
    if (paused && !pauseStartRef.current) {
      pauseStartRef.current = Date.now();
    } else if (!paused && pauseStartRef.current) {
      pausedAccumRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = 0;
    }
  };

  const finish = (completed: boolean) => {
    if (finishedRef.current || !startRef.current) return;
    finishedRef.current = true;
    if (!saveSession(buildRef.current(completed))) setSaveFailed(true);
  };

  useEffect(() => {
    const persistPartial = () => {
      if (startRef.current && !finishedRef.current) {
        saveSession(buildRef.current(false));
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
  }, []);

  return {
    begin,
    finish,
    elapsedSec,
    setPaused,
    saveFailed,
    sessionId: () => sessionIdRef.current,
    startedAtIso: () => new Date(startRef.current).toISOString(),
    started: () => startRef.current !== 0,
  };
}

/**
 * Shared geometry safety guards:
 *  - screenChanged: display's CSS-point dims differ from calibration time
 *    (Display Zoom / different device) — compared orientation-invariantly,
 *    because iPad Safari swaps screen.width/height on rotation
 *  - zoomOk: pinch-zoom is at 1:1 so calibrated px sizes are true
 */
export function useCalibrationGuards(calibration: Calibration) {
  const viewport = useViewportSize();
  const zoomScale = useVisualViewportScale();
  const zoomOk = isZoomAccurate(zoomScale);

  const screenChanged =
    calibration.screenW !== undefined &&
    calibration.screenH !== undefined &&
    (Math.min(calibration.screenW, calibration.screenH) !==
      Math.min(window.screen.width, window.screen.height) ||
      Math.max(calibration.screenW, calibration.screenH) !==
        Math.max(window.screen.width, window.screen.height));

  return { ...viewport, zoomOk, screenChanged };
}
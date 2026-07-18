import { useEffect, useState } from 'react';

/**
 * Live viewport size — updates on resize/orientation change so fit checks
 * re-evaluate when the patient rotates the iPad mid-session.
 */
export function useViewportSize(): { vw: number; vh: number } {
  const [size, setSize] = useState({ vw: window.innerWidth, vh: window.innerHeight });
  useEffect(() => {
    const update = () => setSize({ vw: window.innerWidth, vh: window.innerHeight });
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);
  return size;
}

/**
 * Live pinch-zoom scale (visualViewport.scale). Anything other than 1 means
 * a CSS pixel no longer has the physical size it had at calibration, so every
 * "degree" on screen is wrong — exercises must pause until zoom is reset.
 */
export function useVisualViewportScale(): number {
  const [scale, setScale] = useState(() => window.visualViewport?.scale ?? 1);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setScale(vv.scale);
    vv.addEventListener('resize', update);
    return () => vv.removeEventListener('resize', update);
  }, []);
  return scale;
}

/** True when zoom is close enough to 1:1 for angular rendering to be accurate. */
export function isZoomAccurate(scale: number): boolean {
  return Math.abs(scale - 1) < 0.01;
}
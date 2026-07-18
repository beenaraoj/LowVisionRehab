import type { Calibration, GazeDirection } from '../types';

/**
 * Convert a visual angle to on-screen CSS pixels.
 *
 * This is the clinically critical conversion for the whole app: the
 * dot-to-word offset must be a TRUE angular distance, or the patient
 * trains the wrong retinal locus.
 *
 *   size_on_screen (cm) = viewingDistance (cm) × tan(angle)
 *   size_on_screen (px) = size_cm × pxPerCm
 */
export function degreesToPx(deg: number, cal: Calibration): number {
  return Math.tan((deg * Math.PI) / 180) * cal.distanceCm * cal.pxPerCm;
}

/** ISO/IEC 7810 ID-1 card (credit card) width in cm — the card-match reference. */
export const CARD_WIDTH_CM = 8.56;

/**
 * Screen-position offset of the WORD relative to the fixation DOT.
 *
 * The prescription's gaze direction says where the patient looks relative
 * to the word, so the word goes the OPPOSITE way from the dot:
 *   gaze inferior (look below word)  -> word above dot  (negative y)
 *   gaze superior (look above word)  -> word below dot  (positive y)
 *   gaze left  (look left of word)   -> word right of dot (positive x)
 *   gaze right (look right of word)  -> word left of dot  (negative x)
 */
export function wordOffsetPx(
  gaze: GazeDirection,
  eccentricityDeg: number,
  cal: Calibration,
): { dx: number; dy: number } {
  const d = degreesToPx(eccentricityDeg, cal);
  switch (gaze) {
    case 'inferior':
      return { dx: 0, dy: -d };
    case 'superior':
      return { dx: 0, dy: d };
    case 'left':
      return { dx: d, dy: 0 };
    case 'right':
      return { dx: -d, dy: 0 };
  }
}

/** Human-readable description of where the word will appear, for previews. */
export function describePlacement(gaze: GazeDirection, deg: number): string {
  const where: Record<GazeDirection, string> = {
    inferior: 'above',
    superior: 'below',
    left: 'to the right of',
    right: 'to the left of',
  };
  const look: Record<GazeDirection, string> = {
    inferior: 'below',
    superior: 'above',
    left: 'to the left of',
    right: 'to the right of',
  };
  return `Word appears ${deg}° ${where[gaze]} the dot — patient looks ${look[gaze]} the word.`;
}

/**
 * Cap-height is ~0.72 of font-size in typical sans faces; we prescribe
 * letter height as an angle, so scale font-size up accordingly.
 */
export function fontSizeForLetterHeight(letterHeightDeg: number, cal: Calibration): number {
  return degreesToPx(letterHeightDeg, cal) / 0.72;
}

/** Fixation dot diameter: fixed 0.5° of visual angle, never below 16px. */
export function dotDiameterPx(cal: Calibration): number {
  return Math.max(16, degreesToPx(0.5, cal));
}

/** Longest word in a list, in characters (floor of 1 to avoid degenerate zero-width checks). */
export function longestWordLength(words: string[]): number {
  return words.reduce((m, w) => Math.max(m, w.length), 1);
}

/**
 * THE single safety fit-check, shared by the settings preview and the
 * exercise. A stimulus that does not fully fit on screen must never be
 * shown — a clipped word silently trains the wrong eccentricity.
 *
 * Word box estimate: ~0.6em average advance width per character and 1em
 * height for a bold sans face. Kept deliberately conservative; if this
 * constant is ever tuned, every caller updates together.
 */
export function stimulusFits(
  wordLength: number,
  fontPx: number,
  offset: { dx: number; dy: number },
  viewportW: number,
  viewportH: number,
): boolean {
  const wordHalfW = (wordLength * fontPx * 0.6) / 2;
  const wordHalfH = fontPx / 2;
  return (
    Math.abs(offset.dx) + wordHalfW < viewportW / 2 &&
    Math.abs(offset.dy) + wordHalfH < viewportH / 2
  );
}

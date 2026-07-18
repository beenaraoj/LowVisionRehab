import type { DotColor } from '../types';
import { DOT_COLORS } from '../lib/colors';

interface Props {
  /** Word offset from the dot, in CSS px (already scaled if used in a preview) */
  dx: number;
  dy: number;
  dotPx: number;
  fontPx: number;
  dotColor: DotColor;
  word: string;
}

/**
 * THE dot + word stimulus renderer, shared by the exercise stage and the
 * clinician's settings preview so both always apply the same placement
 * convention. Expects a positioned (relative/fixed) container.
 */
export default function DotWordDisplay({ dx, dy, dotPx, fontPx, dotColor, word }: Props) {
  return (
    <>
      <div
        className="fixation-dot"
        style={{
          left: '50%',
          top: '50%',
          width: dotPx,
          height: dotPx,
          background: DOT_COLORS[dotColor],
        }}
      />
      <span
        className="target-word"
        style={{
          left: `calc(50% + ${dx}px)`,
          top: `calc(50% + ${dy}px)`,
          fontSize: fontPx,
        }}
      >
        {word}
      </span>
    </>
  );
}
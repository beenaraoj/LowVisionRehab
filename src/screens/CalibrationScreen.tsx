import { useEffect, useState } from 'react';
import type { Calibration } from '../types';
import { CARD_WIDTH_CM, degreesToPx } from '../lib/geometry';
import { useViewportSize } from '../lib/useViewport';

interface Props {
  calibration: Calibration | null;
  onSave: (cal: Calibration) => void;
  onBack: () => void;
}

type Method = 'card' | 'screen-size';

const MIN_CARD_PX = 150;
const maxCardPx = () => Math.min(700, window.innerWidth - 40);
const clampCard = (v: number) => Math.max(MIN_CARD_PX, Math.min(maxCardPx(), v));

const screenDiagPx = () => Math.sqrt(window.screen.width ** 2 + window.screen.height ** 2);

/**
 * Establishes the two numbers every exercise depends on:
 *  - pxPerCm (physical scale of this screen)
 *  - viewing distance in cm
 * Card-match is the primary method; entering the screen's diagonal size
 * is the fallback when no card is handy.
 */
export default function CalibrationScreen({ calibration, onSave, onBack }: Props) {
  const [method, setMethod] = useState<Method>(calibration?.method ?? 'card');
  const [cardPx, setCardPx] = useState(() =>
    calibration ? clampCard(calibration.pxPerCm * CARD_WIDTH_CM) : 320,
  );
  const { vw } = useViewportSize();
  // Keep the outline inside the screen if the device rotates mid-calibration.
  const maxCard = Math.min(700, vw - 40);
  useEffect(() => {
    setCardPx((v) => Math.max(MIN_CARD_PX, Math.min(maxCard, v)));
  }, [maxCard]);
  // Restore the diagonal a saved screen-size calibration was derived from —
  // otherwise re-saving after a distance tweak would silently recompute
  // pxPerCm from a wrong default diagonal.
  const [diagonalIn, setDiagonalIn] = useState(() =>
    calibration?.method === 'screen-size'
      ? Math.round((screenDiagPx() / (calibration.pxPerCm * 2.54)) * 10) / 10
      : 11,
  );
  const [distanceCm, setDistanceCm] = useState(calibration?.distanceCm ?? 40);

  const pxPerCm =
    method === 'card' ? cardPx / CARD_WIDTH_CM : screenDiagPx() / (diagonalIn * 2.54);

  const valid = pxPerCm > 5 && pxPerCm < 500 && distanceCm >= 15 && distanceCm <= 200;

  const save = () =>
    onSave({
      pxPerCm,
      distanceCm,
      method,
      savedAt: new Date().toISOString(), // stamped at save, not render
      screenW: window.screen.width,
      screenH: window.screen.height,
    });

  return (
    <div className="screen">
      <button className="nav-back" onClick={onBack}>
        ← Back
      </button>
      <h1>Screen Calibration</h1>

      <div className="choices">
        <button
          className={method === 'card' ? 'selected' : ''}
          onClick={() => setMethod('card')}
        >
          Match a card
        </button>
        <button
          className={method === 'screen-size' ? 'selected' : ''}
          onClick={() => setMethod('screen-size')}
        >
          Enter screen size
        </button>
      </div>

      {method === 'card' ? (
        <>
          <p>
            Hold any standard bank/credit card against the screen. Adjust until the yellow
            outline is exactly the same width as the card.
          </p>
          <div className="card-outline" style={{ width: cardPx }} />
          <input
            type="range"
            min={MIN_CARD_PX}
            max={maxCard}
            step={1}
            value={cardPx}
            onChange={(e) =>
              setCardPx(Math.max(MIN_CARD_PX, Math.min(maxCard, Number(e.target.value))))
            }
            aria-label="Card outline width"
          />
          <div className="btn-row">
            <button onClick={() => setCardPx((v) => Math.max(MIN_CARD_PX, v - 2))}>
              − Smaller
            </button>
            <button onClick={() => setCardPx((v) => Math.min(maxCard, v + 2))}>
              + Larger
            </button>
          </div>
        </>
      ) : (
        <div className="field">
          <label htmlFor="diag">Screen size (diagonal, inches — e.g. 11 for iPad Pro 11")</label>
          <input
            id="diag"
            type="number"
            inputMode="decimal"
            min={7}
            max={40}
            step={0.1}
            value={diagonalIn}
            onChange={(e) => setDiagonalIn(Number(e.target.value))}
          />
        </div>
      )}

      <h2>Viewing distance</h2>
      <p>How far the patient's eyes are from the screen during exercises.</p>
      <div className="stepper">
        <button onClick={() => setDistanceCm((v) => Math.max(15, v - 5))}>−</button>
        <span className="value">{distanceCm} cm</span>
        <button onClick={() => setDistanceCm((v) => Math.min(200, v + 5))}>+</button>
      </div>

      <p className="muted">
        Check: at this calibration, 1° of visual angle ={' '}
        {valid
          ? degreesToPx(1, { pxPerCm, distanceCm, method, savedAt: '' }).toFixed(0)
          : '—'}{' '}
        px on screen.
      </p>

      {!valid && <p className="warning">Calibration values look out of range — please check.</p>}

      <button className="btn-huge" disabled={!valid} onClick={save}>
        Save Calibration
      </button>
    </div>
  );
}
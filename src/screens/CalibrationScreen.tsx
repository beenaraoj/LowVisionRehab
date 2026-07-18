import { useState } from 'react';
import type { Calibration } from '../types';
import { CARD_WIDTH_CM, degreesToPx } from '../lib/geometry';

interface Props {
  calibration: Calibration | null;
  onSave: (cal: Calibration) => void;
  onBack: () => void;
}

type Method = 'card' | 'screen-size';

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
    calibration ? calibration.pxPerCm * CARD_WIDTH_CM : 320,
  );
  const [diagonalIn, setDiagonalIn] = useState(11);
  const [distanceCm, setDistanceCm] = useState(calibration?.distanceCm ?? 40);

  const screenDiagPx = Math.sqrt(window.screen.width ** 2 + window.screen.height ** 2);

  const pxPerCm =
    method === 'card' ? cardPx / CARD_WIDTH_CM : screenDiagPx / (diagonalIn * 2.54);

  const preview: Calibration = {
    pxPerCm,
    distanceCm,
    method,
    savedAt: new Date().toISOString(),
  };

  const valid = pxPerCm > 5 && pxPerCm < 500 && distanceCm >= 15 && distanceCm <= 200;

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
            min={150}
            max={Math.min(700, window.innerWidth - 40)}
            step={1}
            value={cardPx}
            onChange={(e) => setCardPx(Number(e.target.value))}
            aria-label="Card outline width"
          />
          <div className="btn-row">
            <button onClick={() => setCardPx((v) => v - 2)}>− Smaller</button>
            <button onClick={() => setCardPx((v) => v + 2)}>+ Larger</button>
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
        Check: at this calibration, 1° of visual angle = {degreesToPx(1, preview).toFixed(0)}{' '}
        px on screen.
      </p>

      {!valid && <p className="warning">Calibration values look out of range — please check.</p>}

      <button className="btn-huge" disabled={!valid} onClick={() => onSave(preview)}>
        Save Calibration
      </button>
    </div>
  );
}

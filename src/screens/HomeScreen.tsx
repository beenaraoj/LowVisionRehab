import type { Screen } from '../App';

interface Props {
  calibrated: boolean;
  onNavigate: (s: Screen) => void;
}

/**
 * Patient-facing entry point: one dominant action (Start Exercise).
 * Clinician functions live in smaller (but still >=60px) buttons below.
 */
export default function HomeScreen({ calibrated, onNavigate }: Props) {
  return (
    <div className="screen" style={{ justifyContent: 'center' }}>
      <h1 style={{ textAlign: 'center' }}>Eye Training</h1>

      {!calibrated && (
        <p className="warning">
          Screen not calibrated yet. Calibrate before the first exercise so distances are
          accurate.
        </p>
      )}

      <button
        className="btn-huge"
        onClick={() => onNavigate(calibrated ? 'exercise' : 'calibration')}
      >
        {calibrated ? 'Start Exercise' : 'Calibrate Screen'}
      </button>

      <div className="btn-row" style={{ marginTop: '2rem' }}>
        <button onClick={() => onNavigate('calibration')}>Calibration</button>
        <button onClick={() => onNavigate('settings')}>Settings</button>
        <button onClick={() => onNavigate('log')}>History</button>
      </div>
    </div>
  );
}

import type { Screen } from '../App';

interface Props {
  calibrated: boolean;
  onNavigate: (s: Screen) => void;
}

/**
 * Patient-facing entry point: the three exercises as large buttons plus
 * progress. Clinician functions live in smaller (but still >=60px) buttons.
 */
export default function HomeScreen({ calibrated, onNavigate }: Props) {
  return (
    <div className="screen" style={{ justifyContent: 'center' }}>
      <h1 style={{ textAlign: 'center' }}>Eye Training</h1>

      {!calibrated && (
        <>
          <p className="warning">
            Screen not calibrated yet. Calibrate before the first exercise so distances
            are accurate.
          </p>
          <button className="btn-huge" onClick={() => onNavigate('calibration')}>
            Calibrate Screen
          </button>
        </>
      )}

      {calibrated && (
        <>
          <button className="btn-huge" onClick={() => onNavigate('exercise')}>
            Dot Reading
          </button>
          <button className="btn-huge" onClick={() => onNavigate('letter-test')}>
            Letter Check
          </button>
          <button className="btn-huge" onClick={() => onNavigate('fixation-drill')}>
            Hold Steady
          </button>
          <button className="btn-huge" onClick={() => onNavigate('progress')}>
            My Progress
          </button>
        </>
      )}

      <div className="btn-row" style={{ marginTop: '2rem' }}>
        <button onClick={() => onNavigate('calibration')}>Calibration</button>
        <button onClick={() => onNavigate('settings')}>Settings</button>
        <button onClick={() => onNavigate('log')}>History</button>
      </div>
    </div>
  );
}
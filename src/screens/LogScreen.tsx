import { useState } from 'react';
import type { SessionRecord } from '../types';
import { loadSessions } from '../lib/storage';

interface Props {
  onBack: () => void;
}

// One formatter for all rows — constructing Intl.DateTimeFormat per call is
// one of the most expensive per-call operations in JS on mobile.
const DATE_FMT = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

const PAGE_SIZE = 50;

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/** Local session history — clinician-facing for now; export comes later. */
export default function LogScreen({ onBack }: Props) {
  const [sessions] = useState<SessionRecord[]>(loadSessions);
  const [shown, setShown] = useState(PAGE_SIZE);

  return (
    <div className="screen">
      <button className="nav-back" onClick={onBack}>
        ← Back
      </button>
      <h1>Session History</h1>

      {sessions.length === 0 && <p className="muted">No sessions recorded yet.</p>}

      {sessions.slice(0, shown).map((s) => {
        const read = s.results.filter((r) => r.read).length;
        return (
          <div key={s.id} className="session-item">
            <strong>{DATE_FMT.format(new Date(s.startedAt))}</strong>
            <span>
              Dot reading — {s.settings.gazeDirection} {s.settings.eccentricityDeg}°, letters{' '}
              {s.settings.letterHeightDeg}°
            </span>
            <span>
              {read}/{s.results.length} words read · {fmtDuration(s.durationSec)}
              {!s.completed && ' · ended early'}
            </span>
          </div>
        );
      })}

      {sessions.length > shown && (
        <button onClick={() => setShown((n) => n + PAGE_SIZE)}>
          Show older ({sessions.length - shown} more)
        </button>
      )}
    </div>
  );
}
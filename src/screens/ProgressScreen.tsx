import { useState } from 'react';
import type { SessionRecord } from '../types';
import { loadSessions } from '../lib/storage';
import { readingTrend, letterTrend, holdTrend, type Trend } from '../lib/progress';

interface Props {
  onBack: () => void;
}

/**
 * Patient-facing progress view (clinician's choice: performance trend).
 * Deliberately gentle language — a plateau reads as "steady", never failure.
 * Full per-session detail stays in the clinician's History screen.
 */

function TrendCard({
  title,
  trend,
  format,
}: {
  title: string;
  trend: Trend;
  format: (v: number) => string;
}) {
  const MESSAGES: Record<Trend['direction'], { icon: string; text: string }> = {
    up: { icon: '↑', text: 'Getting better!' },
    flat: { icon: '→', text: 'Holding steady' },
    down: { icon: '·', text: 'Keep practising' },
    insufficient: { icon: '·', text: 'Keep practising to see your progress' },
  };
  const m = MESSAGES[trend.direction];
  return (
    <div className="trend-card">
      <h2>{title}</h2>
      <p className="trend-message">
        <span aria-hidden="true">{m.icon} </span>
        {m.text}
      </p>
      {trend.recent !== null && (
        <p className="muted">
          Recently: {format(trend.recent)}
          {trend.previous !== null && trend.direction !== 'insufficient'
            ? ` (before: ${format(trend.previous)})`
            : ''}
        </p>
      )}
    </div>
  );
}

export default function ProgressScreen({ onBack }: Props) {
  const [sessions] = useState<SessionRecord[]>(loadSessions);

  const reading = readingTrend(sessions);
  const letters = letterTrend(sessions);
  const holds = holdTrend(sessions);

  const anyData = sessions.length > 0;

  return (
    <div className="screen">
      <button className="nav-back" onClick={onBack}>
        ← Back
      </button>
      <h1>My Progress</h1>

      {!anyData && (
        <p style={{ fontSize: '1.4rem' }}>
          No sessions yet. Your progress will appear here after your first exercise.
        </p>
      )}

      {anyData && (
        <>
          <TrendCard
            title="Dot reading"
            trend={reading}
            format={(v) => `${Math.round(v)}% of words read`}
          />
          <TrendCard
            title="Letter check"
            trend={letters}
            format={(v) => `smallest letter ${v.toFixed(2)}°`}
          />
          <TrendCard
            title="Hold steady"
            trend={holds}
            format={(v) => `best hold ${Math.round(v)} seconds`}
          />
        </>
      )}
    </div>
  );
}
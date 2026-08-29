interface ControlBarProps {
  lookaheadHours: number;
  onLookaheadChange: (value: number) => void;
  onRun: () => void;
  isLoading: boolean;
  error: string | null;
  lastRun: string | null;
}

export default function ControlBar({ lookaheadHours, onLookaheadChange, onRun, isLoading, error, lastRun }: ControlBarProps) {
  return <div className="control-stack"><div className="control-bar"><div className="control-label"><span className="signal-dot" /> Screening window</div><label><span>Lookahead</span><input type="number" min="1" max="168" value={lookaheadHours} onChange={(event) => onLookaheadChange(Math.max(1, Math.min(168, Number(event.target.value) || 1)))} /><em>hours</em></label><button className="run-button" onClick={onRun} disabled={isLoading}><span>{isLoading ? "Propagating..." : "Run Screening"}</span><b>{isLoading ? "↻" : "→"}</b></button></div>{error && <div className="error-banner" role="alert"><strong>Backend unavailable</strong><span>{error}</span></div>}{lastRun && !error && <div className="run-meta">Last response received <strong>{lastRun}</strong> · CelesTrak → Skyfield SGP4 → risk screen</div>}</div>;
}

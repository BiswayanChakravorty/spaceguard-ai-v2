import type { ConjunctionResult } from "../types";

interface RiskDetailPanelProps {
  result: ConjunctionResult | null;
}

export default function RiskDetailPanel({ result }: RiskDetailPanelProps) {
  if (!result) return <aside className="detail-panel detail-empty"><span className="panel-index">DETAIL / 00</span><div className="detail-ring">+</div><h2>Select a conjunction</h2><p>Choose a row from the queue to inspect both objects, the refined closest approach, and the screening score.</p></aside>;
  return <aside className="detail-panel"><div className="detail-header"><span className="panel-index">DETAIL / {result.risk_label}</span><span className={`risk-pill ${result.risk_label.toLowerCase()}`}>{result.risk_label}</span></div><h2>{result.object_a}</h2><div className="pair-with">{result.catnr_a} <span>×</span> {result.object_b} <small>{result.catnr_b}</small></div><div className="score-block"><span>Risk score</span><strong>{(result.risk_score * 100).toFixed(1)}<small>/100</small></strong><div className="score-track"><i style={{ width: `${result.risk_score * 100}%` }} /></div></div><dl className="detail-metrics"><div><dt>Closest approach</dt><dd>{result.closest_approach_km.toFixed(3)} <small>km</small></dd></div><div><dt>Approach time</dt><dd>{new Date(result.closest_approach_time_utc).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}<small> UTC</small></dd></div><div><dt>Relative velocity</dt><dd>{result.relative_velocity_kmps.toFixed(3)} <small>km/s</small></dd></div></dl><div className="model-note"><span>MODEL NOTE</span><p>Score is a deterministic priority heuristic from propagated distance, relative velocity, and debris involvement. It is not a probability of collision.</p></div></aside>;
}

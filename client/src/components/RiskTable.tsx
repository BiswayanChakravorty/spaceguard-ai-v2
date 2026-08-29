import { useMemo, useState } from "react";
import type { ConjunctionResult, RiskLabel } from "../types";

interface RiskTableProps {
  results: ConjunctionResult[];
  selected: ConjunctionResult | null;
  onSelect: (result: ConjunctionResult) => void;
}

type SortKey = "risk_score" | "closest_approach_km" | "relative_velocity_kmps";

function formatTime(value: string): string {
  return new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function labelClass(label: RiskLabel): string {
  return label.toLowerCase();
}

export default function RiskTable({ results, selected, onSelect }: RiskTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("risk_score");
  const [descending, setDescending] = useState(true);
  const sortedResults = useMemo(() => [...results].sort((a, b) => (a[sortKey] - b[sortKey]) * (descending ? -1 : 1)), [descending, results, sortKey]);

  const changeSort = (key: SortKey) => {
    if (sortKey === key) setDescending((value) => !value);
    else { setSortKey(key); setDescending(true); }
  };

  return (
    <section className="risk-table-panel">
      <div className="panel-heading"><div><span className="eyebrow">Conjunction queue</span><h2>Screening results</h2></div><span className="result-count">{results.length} pairs / live API response</span></div>
      {results.length === 0 ? <div className="empty-state"><span className="empty-orbit">◎</span><h3>No screening run yet</h3><p>Run a 24-hour screen to populate this queue with real SGP4-derived closest approaches.</p></div> : <div className="table-wrap"><table><thead><tr><th>Priority</th><th>Object pair</th><th><button onClick={() => changeSort("closest_approach_km")}>Approach km ↕</button></th><th><button onClick={() => changeSort("relative_velocity_kmps")}>Rel. velocity ↕</button></th><th><button onClick={() => changeSort("risk_score")}>Risk ↕</button></th></tr></thead><tbody>{sortedResults.map((result, index) => <tr key={`${result.catnr_a}-${result.catnr_b}`} className={selected === result ? "is-selected" : ""} onClick={() => onSelect(result)}><td><span className={`priority-rank ${index === 0 ? "top" : ""}`}>{String(index + 1).padStart(2, "0")}</span></td><td><strong>{result.object_a}</strong><span>{result.catnr_a} <i>×</i> {result.object_b} · {result.catnr_b}</span></td><td><strong>{result.closest_approach_km.toFixed(2)}</strong><span>{formatTime(result.closest_approach_time_utc)} UTC</span></td><td><strong>{result.relative_velocity_kmps.toFixed(2)} km/s</strong><span>relative vector</span></td><td><span className={`risk-pill ${labelClass(result.risk_label)}`}>{result.risk_label}</span><span className="risk-score">{(result.risk_score * 100).toFixed(1)} score</span></td></tr>)}</tbody></table></div>}
    </section>
  );
}

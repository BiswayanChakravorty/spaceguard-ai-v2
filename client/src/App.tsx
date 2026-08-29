import { useMemo, useState } from "react";
import ControlBar from "./components/ControlBar";
import OrbitScene from "./components/OrbitScene";
import ReportExport from "./components/ReportExport";
import RiskDetailPanel from "./components/RiskDetailPanel";
import RiskTable from "./components/RiskTable";
import { runScreening } from "./api/spaceguard";
import type { ConjunctionResult } from "./types";

export default function App() {
  const [results, setResults] = useState<ConjunctionResult[]>([]);
  const [selected, setSelected] = useState<ConjunctionResult | null>(null);
  const [lookaheadHours, setLookaheadHours] = useState(24);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const stats = useMemo(() => ({
    high: results.filter((result) => result.risk_label === "HIGH").length,
    medium: results.filter((result) => result.risk_label === "MEDIUM").length,
    pairs: results.length,
  }), [results]);

  const screen = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const nextResults = await runScreening(lookaheadHours);
      setResults(nextResults);
      setSelected(nextResults[0] ?? null);
      setLastRun(new Date().toLocaleString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to reach the screening backend.");
    } finally {
      setIsLoading(false);
    }
  };

  return <div className="app-shell"><aside className="sidebar"><div className="brand"><span className="brand-mark">◒</span><div><strong>SPACEGUARD</strong><span>AI / ORBITAL RISK</span></div></div><nav><a className="active" href="#overview">Overview <span>01</span></a><a href="#risk-queue">Risk queue <span>{stats.pairs ? String(stats.pairs).padStart(2, "0") : "—"}</span></a><a href="#detail">Selected pair <span>→</span></a></nav><div className="sidebar-foot"><span className="live-indicator" /> Public GP source<br /><small>CelesTrak / live on request</small></div></aside><main className="main-content" id="overview"><header className="topbar"><div><span className="kicker">MISSION CONTROL / PART 02</span><h1>Orbital risk monitor</h1></div><div className="status-lockup"><span className="live-indicator" /> API READY <span className="divider" /> SGP4</div></header><section className="hero-grid"><div className="hero-copy"><span className="kicker">LEO CONJUNCTION SCREEN</span><p>Propagate current public orbital elements forward in time, identify the closest pass, and surface the pairs that warrant attention.</p><ControlBar lookaheadHours={lookaheadHours} onLookaheadChange={setLookaheadHours} onRun={() => void screen()} isLoading={isLoading} error={error} lastRun={lastRun} /><div className="hero-note"><span>01</span><p>Closest approach is computed from real Skyfield SGP4 vectors. The score is a screening priority, not a collision probability.</p></div></div><OrbitScene results={results} selected={selected} /></section><section className="metric-strip"><div><span>Current result set</span><strong>{stats.pairs || "—"}</strong><small>pairs returned</small></div><div><span>High priority</span><strong className={stats.high ? "accent" : ""}>{stats.high || "—"}</strong><small>risk label HIGH</small></div><div><span>Medium priority</span><strong>{stats.medium || "—"}</strong><small>risk label MEDIUM</small></div><div><span>Lookahead</span><strong>{lookaheadHours}</strong><small>hours forward</small></div></section><section className="queue-section" id="risk-queue"><div className="section-heading"><div><span className="kicker">02 / SORTABLE OUTPUT</span><h2>Conjunction queue</h2></div><ReportExport results={results} /></div><RiskTable results={results} selected={selected} onSelect={setSelected} /></section><section className="detail-section" id="detail"><div className="section-heading"><div><span className="kicker">03 / INSPECTION</span><h2>Selected pair</h2></div><span className="section-rule" /></div><RiskDetailPanel result={selected} /></section><footer><span>SPACEGUARD AI / PART 2</span><span>Frontend reads VITE_API_BASE_URL · no orbital mechanics in client</span></footer></main></div>;
}

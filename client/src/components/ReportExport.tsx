import type { ConjunctionResult } from "../types";

interface ReportExportProps {
  results: ConjunctionResult[];
}

function buildReport(results: ConjunctionResult[]): string {
  const generatedAt = new Date().toISOString();
  const rows = results.length ? results.map((result) => `| ${result.object_a} × ${result.object_b} | ${result.closest_approach_km.toFixed(3)} | ${new Date(result.closest_approach_time_utc).toISOString()} | ${result.relative_velocity_kmps.toFixed(3)} | ${result.risk_label} (${result.risk_score.toFixed(4)}) |`).join("\n") : "| — | — | — | — | No results |";
  return `# SpaceGuard AI Risk Report\n\nGenerated: ${generatedAt}\n\nThis report summarizes the current response from the Part 1 FastAPI service. Closest approaches come from Skyfield SGP4 propagation; risk scores are screening priorities, not collision probabilities.\n\n## Conjunctions\n\n| Object pair | Closest approach (km) | Time (UTC) | Relative velocity (km/s) | Risk |\n| --- | ---: | --- | ---: | --- |\n${rows}\n\n## Source\n\nCelesTrak public GP data → SpaceGuard AI Part 1 → Skyfield SGP4.\n`;
}

export default function ReportExport({ results }: ReportExportProps) {
  const download = () => {
    const blob = new Blob([buildReport(results)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `spaceguard-risk-report-${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return <button className="export-button" onClick={download} disabled={!results.length}>Export Markdown report <span>↓</span></button>;
}

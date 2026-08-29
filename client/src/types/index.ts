export type RiskLabel = "HIGH" | "MEDIUM" | "LOW";

export interface ConjunctionResult {
  object_a: string;
  object_b: string;
  catnr_a: string;
  catnr_b: string;
  closest_approach_km: number;
  closest_approach_time_utc: string;
  relative_velocity_kmps: number;
  risk_score: number;
  risk_label: RiskLabel;
}

export interface VisualObject {
  name: string;
  catnr: string;
  riskLabel?: RiskLabel;
  isSelected?: boolean;
}

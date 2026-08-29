import type { ConjunctionResult } from "../types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export async function runScreening(lookaheadHours: number): Promise<ConjunctionResult[]> {
  if (!API_BASE_URL) {
    throw new Error("VITE_API_BASE_URL is not configured. Copy .env.example to .env and set the Part 1 API URL.");
  }

  const response = await fetch(`${API_BASE_URL}/screen`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lookahead_hours: lookaheadHours }),
  });

  if (!response.ok) {
    let detail = `Backend returned HTTP ${response.status}.`;
    try {
      const payload: unknown = await response.json();
      if (typeof payload === "object" && payload !== null && "detail" in payload && typeof payload.detail === "string") {
        detail = payload.detail;
      }
    } catch {
      // Keep the useful HTTP status when the backend did not return JSON.
    }
    throw new Error(detail);
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("The backend returned an unexpected screening response.");
  }
  return data as ConjunctionResult[];
}

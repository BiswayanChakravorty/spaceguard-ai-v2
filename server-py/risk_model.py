"""Simple, explainable conjunction-risk scoring constants and function."""

from __future__ import annotations

import math

# Tunable screening thresholds. These are priority-screening thresholds, not collision probabilities.
HIGH_CONCERN_DISTANCE_KM = 5.0
NEGLIGIBLE_DISTANCE_KM = 50.0
HIGH_RISK_SCORE = 0.70
MEDIUM_RISK_SCORE = 0.40
REFERENCE_RELATIVE_VELOCITY_KMPS = 15.0


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def score_risk(
    closest_approach_km: float,
    relative_velocity_kmps: float,
    is_debris_pair: bool,
) -> dict[str, float | str]:
    """Return a bounded logistic-style priority score and risk label."""
    distance_signal = _clamp(
        (NEGLIGIBLE_DISTANCE_KM - closest_approach_km)
        / (NEGLIGIBLE_DISTANCE_KM - HIGH_CONCERN_DISTANCE_KM),
        0.0,
        1.0,
    )
    velocity_signal = _clamp(relative_velocity_kmps / REFERENCE_RELATIVE_VELOCITY_KMPS, 0.0, 1.0)
    debris_signal = 0.35 if is_debris_pair else 0.0
    logit = (3.5 * distance_signal) + (0.9 * velocity_signal) + debris_signal - 2.15
    risk_score = _clamp(1.0 / (1.0 + math.exp(-logit)), 0.0, 1.0)
    if risk_score >= HIGH_RISK_SCORE:
        risk_label = "HIGH"
    elif risk_score >= MEDIUM_RISK_SCORE:
        risk_label = "MEDIUM"
    else:
        risk_label = "LOW"
    return {"risk_score": round(risk_score, 4), "risk_label": risk_label}

"""Two-stage SGP4 closest-approach screening."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import numpy as np
from skyfield.api import EarthSatellite

from propagation import get_position_velocity, load_satellite
from risk_model import score_risk

FINE_STEP_SECONDS = 10
FINE_HALF_WINDOW_MINUTES = 10


def _time_array(ts: Any, start: datetime, end: datetime, step_seconds: int) -> Any:
    count = max(1, int((end - start).total_seconds() / step_seconds))
    datetimes = [start + timedelta(seconds=step_seconds * index) for index in range(count + 1)]
    return ts.from_datetimes(datetimes)


def _closest_index(ts: Any, satellite_a: EarthSatellite, satellite_b: EarthSatellite, times: Any) -> tuple[int, np.ndarray, np.ndarray]:
    position_a, velocity_a = get_position_velocity(satellite_a, times)
    position_b, velocity_b = get_position_velocity(satellite_b, times)
    distances = np.linalg.norm(position_a - position_b, axis=0)
    return int(np.argmin(distances)), distances, velocity_a - velocity_b


def find_closest_approach(
    sat_a: EarthSatellite,
    sat_b: EarthSatellite,
    ts: Any,
    window_hours: int = 24,
    coarse_step_minutes: int = 5,
) -> dict[str, Any]:
    """Search a lookahead window at coarse resolution, then refine +/-10 minutes at 10 seconds."""
    start_time = ts.now()
    start_datetime = start_time.utc_datetime().replace(tzinfo=timezone.utc)
    end_datetime = start_datetime + timedelta(hours=window_hours)
    coarse_times = _time_array(ts, start_datetime, end_datetime, coarse_step_minutes * 60)
    coarse_index, _, _ = _closest_index(ts, sat_a, sat_b, coarse_times)
    coarse_datetime = coarse_times[coarse_index].utc_datetime().replace(tzinfo=timezone.utc)

    fine_start = max(start_datetime, coarse_datetime - timedelta(minutes=FINE_HALF_WINDOW_MINUTES))
    fine_end = min(end_datetime, coarse_datetime + timedelta(minutes=FINE_HALF_WINDOW_MINUTES))
    fine_times = _time_array(ts, fine_start, fine_end, FINE_STEP_SECONDS)
    fine_index, distances, relative_velocities = _closest_index(ts, sat_a, sat_b, fine_times)
    closest_time = fine_times[fine_index].utc_datetime().replace(tzinfo=timezone.utc)
    return {
        "closest_approach_km": float(distances[fine_index]),
        "closest_approach_time_utc": closest_time.isoformat().replace("+00:00", "Z"),
        "relative_velocity_kmps": float(np.linalg.norm(relative_velocities[:, fine_index])),
    }


def screen_all_pairs(objects: list[dict[str, Any]], ts: Any, window_hours: int) -> list[dict[str, Any]]:
    """Screen every unique satellite/debris pair, excluding ordinary satellite-satellite pairs."""
    loaded = [
        (record, load_satellite(record["tle_line1"], record["tle_line2"], record["name"]))
        for record in objects
    ]
    results: list[dict[str, Any]] = []
    for index, (record_a, sat_a) in enumerate(loaded):
        for record_b, sat_b in loaded[index + 1 :]:
            is_debris_pair = record_a["object_type"] == "debris" or record_b["object_type"] == "debris"
            if not is_debris_pair:
                continue
            approach = find_closest_approach(sat_a, sat_b, ts, window_hours=window_hours)
            risk = score_risk(
                approach["closest_approach_km"],
                approach["relative_velocity_kmps"],
                is_debris_pair,
            )
            results.append(
                {
                    "object_a": record_a["name"],
                    "object_b": record_b["name"],
                    "catnr_a": record_a["catnr"],
                    "catnr_b": record_b["catnr"],
                    **approach,
                    **risk,
                }
            )
    return sorted(results, key=lambda result: result["risk_score"], reverse=True)

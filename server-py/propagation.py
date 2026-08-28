"""Skyfield SGP4 propagation helpers for SpaceGuard AI Part 1."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any

import numpy as np
from skyfield.api import EarthSatellite, Loader

SERVER_DIR = Path(__file__).resolve().parent
LOADER = Loader(str(SERVER_DIR / "skyfield-data"))
TIMESCALE = LOADER.timescale()


def load_satellite(tle_line1: str, tle_line2: str, name: str) -> EarthSatellite:
    """Build an EarthSatellite from a TLE pair using Skyfield's standard timescale."""
    return EarthSatellite(tle_line1, tle_line2, name, TIMESCALE)


def get_position_velocity(satellite: EarthSatellite, time: Any) -> tuple[np.ndarray, np.ndarray]:
    """Return geocentric position in km and velocity in km/s at a Skyfield Time."""
    geocentric = satellite.at(time)
    return (
        np.asarray(geocentric.position.km, dtype=float),
        np.asarray(geocentric.velocity.km_per_s, dtype=float),
    )


def time_from_utc_datetime(utc_datetime: datetime) -> Any:
    """Convert a timezone-aware UTC datetime through Skyfield's timescale."""
    return TIMESCALE.from_datetime(utc_datetime)

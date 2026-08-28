from datetime import datetime, timezone

import numpy as np
from skyfield.api import EarthSatellite

from propagation import TIMESCALE, get_position_velocity, load_satellite


SAMPLE_TLE_LINE1 = "1 25544U 98067A   24120.00000000  .00012345  00000-0  23456-3 0  9991"
SAMPLE_TLE_LINE2 = "2 25544  51.6400 120.0000 0005000  30.0000 120.0000 15.50000000123456"


def test_load_satellite_produces_earth_satellite():
    satellite = load_satellite(SAMPLE_TLE_LINE1, SAMPLE_TLE_LINE2, "ISS (ZARYA)")
    assert isinstance(satellite, EarthSatellite)
    assert satellite.name == "ISS (ZARYA)"


def test_get_position_velocity_returns_three_element_vectors():
    satellite = load_satellite(SAMPLE_TLE_LINE1, SAMPLE_TLE_LINE2, "ISS (ZARYA)")
    skyfield_time = TIMESCALE.from_datetime(datetime(2024, 5, 1, tzinfo=timezone.utc))
    position_km, velocity_kmps = get_position_velocity(satellite, skyfield_time)
    assert position_km.shape == (3,)
    assert velocity_kmps.shape == (3,)
    assert np.isfinite(position_km).all()
    assert np.isfinite(velocity_kmps).all()
    assert 6_000 < float(np.linalg.norm(position_km)) < 8_000
    assert 5 < float(np.linalg.norm(velocity_kmps)) < 9

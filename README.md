# SpaceGuard AI — Part 1 Backend

SpaceGuard AI Part 1 is a small, stateless Python backend for screening public low-Earth-orbit satellite/debris conjunctions. It retrieves current Two-Line Element data from CelesTrak, propagates each object with Skyfield’s SGP4 implementation, performs a coarse-to-fine closest-approach search, and returns a bounded heuristic risk score.

> This repository intentionally contains **backend code only**. React/Three.js visualization and public deployment are reserved for later parts.

## Structure

```text
server-py/
  main.py             FastAPI application and REST endpoints
  ingestion.py        CelesTrak GP retrieval and normalization
  propagation.py      Skyfield EarthSatellite propagation helpers
  screening.py        closest approach and explainable risk scoring
  test_propagation.py offline propagation tests
  requirements.txt    pinned runtime and test dependencies
```

## Local setup

```bash
cd server-py
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Start the API from the `server-py` directory:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API uses the public CelesTrak GP endpoint at `https://celestrak.org/NORAD/elements/gp.php`. The default station group is combined with debris catalog number `33953`, which is the public debris object requested in the Part 1 brief. Requests use a ten-second timeout; CelesTrak failure returns HTTP 503 rather than fabricating data.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Returns a small service health response. |
| `POST` | `/screen` | Fetches current public GP data, propagates objects, screens candidate pairs, and returns results sorted by descending risk score. |
| `GET` | `/conjunctions` | Convenience wrapper around the default 24-hour `/screen` request. |

`POST /screen` accepts `lookahead_hours` from 1 through 168 and an optional `debris_catnr` string. The response includes an ISO UTC screening timestamp, source label, object count, and conjunction records with closest-approach time, distance in kilometres, relative velocity in kilometres per second, risk score, risk label, and a plain-language model note.

Example request:

```bash
curl -X POST http://localhost:8000/screen \
  -H 'Content-Type: application/json' \
  -d '{"lookahead_hours": 24, "debris_catnr": "33953"}'
```

Representative response shape:

```json
{
  "screened_at": "2026-08-28T12:00:00Z",
  "lookahead_hours": 24,
  "source": "CelesTrak GP + Skyfield SGP4",
  "objects": 2,
  "conjunctions": [
    {
      "object_a": "ISS (ZARYA)",
      "object_b": "DEBRIS OBJECT",
      "object_a_catnr": "25544",
      "object_b_catnr": "33953",
      "time": "2026-08-28T20:15:10Z",
      "distance_km": 12.34,
      "relative_velocity_km_s": 7.81,
      "risk_score": 0.8123,
      "risk_label": "Critical",
      "model_note": "Heuristic screening score; not a probability of collision."
    }
  ]
}
```

The numerical values in the response block are illustrative of the schema, not a stored prediction. Live output is generated from the public data available when the endpoint is called.

## Screening method

For each candidate pair, the service samples a requested lookahead window at five-minute intervals, identifies the coarse minimum, then refines a ten-minute neighbourhood at ten-second intervals. Skyfield supplies the propagated TEME position and velocity vectors. The risk model combines minimum distance, relative velocity, and whether debris is involved, then applies a logistic transform to produce a deterministic value between 0 and 1. The result is a screening priority, **not** a probability of collision and not an operational conjunction data message.

## Testing

The propagation tests use static TLE strings and make no network request:

```bash
pytest -q
```

## Deployment note

Part 1 is intentionally not deployed. When deployment is requested, the same stateless FastAPI service can be hosted on either Render or Railway with a start command such as `uvicorn main:app --host 0.0.0.0 --port $PORT`. Deployment, frontend work, persistent storage, scheduled jobs, and authentication are outside this Part 1 scope.

## References

[1]: https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json "CelesTrak public GP data"
[2]: https://fastapi.tiangolo.com/ "FastAPI documentation"
[3]: https://rhodesmill.org/skyfield/ "Skyfield documentation"
[4]: https://pypi.org/project/sgp4/ "python-sgp4 project"
[5]: https://numpy.org/ "NumPy documentation"
[6]: https://requests.readthedocs.io/ "Requests documentation"
[7]: https://pytest.org/ "Pytest documentation"
[8]: https://render.com/ "Render"
[9]: https://railway.app/ "Railway"

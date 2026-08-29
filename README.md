# SpaceGuard AI

SpaceGuard AI is a two-part low-Earth-orbit conjunction-screening project. **Part 1** provides a stateless Python/FastAPI service that retrieves public orbital elements, propagates them with Skyfield SGP4, screens candidate pairs, and returns an explainable risk score. **Part 2** provides the typed React/Vite frontend that consumes that API and presents the result as an interactive orbital-risk workbench.

> The client does not perform orbital mechanics. All propagation, closest-approach calculations, relative-velocity calculations, and risk scoring remain in `server-py/`. The frontend is responsible for controls, presentation, visualization, sorting, selection, and report export.

## Repository structure

```text
server-py/
  main.py             FastAPI application and REST endpoints
  ingestion.py        CelesTrak GP retrieval and normalization
  propagation.py      Skyfield EarthSatellite propagation helpers
  screening.py        closest-approach search and pair metrics
  risk_model.py       deterministic logistic-style risk model
  test_propagation.py offline SGP4 propagation tests
  requirements.txt    pinned Python runtime and test dependencies

client/
  index.html          browser entry document
  package.json        Vite/React scripts and dependencies
  vite.config.ts      Vite development and preview configuration
  tsconfig.json       strict TypeScript configuration
  .env.example        frontend environment-variable template
  README.md           client-specific setup notes
  src/
    App.tsx           top-level dashboard state and layout
    main.tsx          React entry point
    styles.css        responsive ISRO-inspired visual system
    vite-env.d.ts     Vite environment typing
    api/spaceguard.ts typed Fetch API client
    types/index.ts    API response and client view types
    components/
      ControlBar.tsx       lookahead input, validation, loading, errors
      OrbitScene.tsx       Three.js Earth and orbital projection
      RiskTable.tsx        sortable conjunction output
      RiskDetailPanel.tsx  selected-pair inspection panel
      ReportExport.tsx     client-side Markdown report download
```

## Part 1 — Python screening backend

Part 1 is a stateless Python backend. It requests current Two-Line Element data from the public [CelesTrak GP endpoint][1], normalizes the response, propagates each object with [Skyfield][3] SGP4 helpers, performs a coarse-to-fine closest-approach search, and calculates a bounded deterministic screening score. A CelesTrak failure returns HTTP 503 rather than fabricated orbital data.

### Part 1 setup

```bash
cd server-py
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Part 1 endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Returns the service health response. |
| `POST` | `/screen` | Fetches current public GP data, propagates objects, screens candidate pairs, and returns sorted conjunction results. |
| `GET` | `/conjunctions` | Convenience wrapper for the default 24-hour screening request. |

`POST /screen` accepts `lookahead_hours` from 1 through 168 and an optional `debris_catnr`. The response contains the screening timestamp, lookahead window, source label, object count, conjunction records, closest-approach time, distance in kilometres, relative velocity in kilometres per second, risk score, risk label, and model note.

```bash
curl -X POST http://localhost:8000/screen \
  -H 'Content-Type: application/json' \
  -d '{"lookahead_hours": 24, "debris_catnr": "33953"}'
```

The service samples the requested window at five-minute intervals, refines the coarse minimum in a ten-minute neighbourhood at ten-second intervals, and uses propagated position and velocity vectors for the reported metrics. The risk output is a **screening priority**, not a collision probability and not an operational conjunction data message.

## Part 2 — React/Vite orbital-risk frontend

Part 2 is the browser client located entirely in `client/`. It is a typed React/Vite application that reads the Part 1 API through `VITE_API_BASE_URL`. It contains no Python, orbital-mechanics implementation, database, scheduler, authentication, or deployment configuration.

### Part 2 objective

The Part 2 frontend turns one `/screen` response into an interactive operational view:

| Area | Definition |
| --- | --- |
| Screening controls | The operator enters a lookahead window from 1 through 168 hours and starts a screening request. The control displays the loading state as `Propagating...` and prevents duplicate submission while the request is active. |
| API integration | `src/api/spaceguard.ts` reads `VITE_API_BASE_URL`, sends the typed JSON request, parses the typed array response, and surfaces backend or upstream-data failures as user-readable errors. |
| Three.js visualization | `src/components/OrbitScene.tsx` renders an Earth sphere, a dark orbital field, circular LEO projection paths, object markers, and a connector line between the currently selected pair. The scene is a visual projection and does not replace the server’s SGP4 calculations. |
| Result summary | The dashboard shows returned-pair count, HIGH count, MEDIUM count, and the active lookahead window. |
| Conjunction queue | `src/components/RiskTable.tsx` renders the exact API fields in a sortable table. Approach distance, relative velocity, and risk score can be sorted in ascending or descending order. |
| Risk coding | `HIGH`, `MEDIUM`, and `LOW` labels use distinct visual treatments while retaining the exact API label values. Scores are displayed on a 0–100 presentation scale from the API’s 0–1 score. |
| Selected-pair inspection | Clicking a table row updates the selected objects, risk score, closest approach, approach time, relative velocity, and model note in `RiskDetailPanel.tsx`. The selected pair is also highlighted in the orbit scene. |
| Markdown report | `ReportExport.tsx` generates a client-side Markdown file from the current response, including screening metadata, conjunction rows, selected-pair details, and the heuristic-risk disclaimer. |
| Responsive layout | The CSS adapts the mission rail, controls, orbit canvas, queue, and detail panel for narrow screens without changing the API contract. |

### Part 2 client setup

Run the backend first, then start the client in a second terminal:

```bash
cd client
pnpm install
cp .env.example .env.local
```

Set the local API base URL in `client/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Start the Vite development server:

```bash
pnpm dev
```

The client can be built and type-checked with:

```bash
pnpm check
pnpm build
```

### Part 2 request and response flow

The frontend follows this sequence:

```text
Lookahead input
      ↓
ControlBar validation: integer, 1–168 hours
      ↓
POST ${VITE_API_BASE_URL}/screen
      ↓
Typed response parsing
      ↓
Summary counters + Three.js scene + sortable queue
      ↓
Selected-row detail panel + Markdown export
```

The client expects the Part 1 `/screen` response to be a JSON array with records shaped like this:

```json
[
  {
    "object_a": "ISS (ZARYA)",
    "object_b": "DEBRIS OBJECT",
    "catnr_a": "25544",
    "catnr_b": "33953",
    "closest_approach_km": 12.34,
    "closest_approach_time_utc": "2026-08-28T20:15:10Z",
    "relative_velocity_kmps": 7.81,
    "risk_score": 0.8123,
    "risk_label": "HIGH"
  }
]
```

The numerical values above describe the response shape only. They are not a stored prediction. Live values are generated by the backend from public orbital data available when the request is made.

### Part 2 state model

`App.tsx` owns the client state for the current lookahead value, loading state, error message, result array, selected result, and active sort. `ControlBar` emits a validated request. `RiskTable` emits a selected record and sort changes. `OrbitScene` receives the result array and selected record as props. `RiskDetailPanel` receives only the selected record. This keeps the client presentation layer separate from the Part 1 orbital-mechanics layer.

### Part 2 error behavior

The client presents a visible error state when the API base URL is absent, the network request fails, the backend returns a non-success response, or the response cannot be parsed as the expected typed conjunction array. The frontend does not replace a failed live response with fake conjunction data.

### Part 2 design system

The interface uses an ISRO-inspired mission-control visual language: deep navy operational surfaces, mineral cyan telemetry marks, a restrained saffron action signal, compact technical labels, serif editorial headings, calibrated orbital lines, and a responsive split between the mission rail, control workbench, orbital canvas, queue, and inspection panel.

## Validation completed

The combined local flow has been checked with the Part 1 API and real public CelesTrak data. The frontend rendered a real 24-hour response containing 21 conjunction records, populated the counters and queue, updated the selected-pair detail panel and linked orbit scene when a row was selected, reordered the queue through the risk sort control, and activated Markdown report export. The client TypeScript check and production build also complete successfully.

The client was validated with a temporary local preview and the backend bound to `0.0.0.0` for browser access. This preview arrangement is for local validation only; no production deployment is included in Part 2.

## Scope boundaries

Part 2 intentionally adds only the requested frontend. It does not modify `server-py/`, add persistent storage, add background jobs, add user accounts, add notifications, add a scheduler, or deploy the service. A future deployment must provide a reachable `VITE_API_BASE_URL` and a backend configuration that permits requests from the deployed client origin.

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

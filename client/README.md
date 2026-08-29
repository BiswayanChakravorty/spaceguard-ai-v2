# SpaceGuard AI — Part 2 Frontend

This is the React/TypeScript frontend for SpaceGuard AI. It presents a dark ISRO-inspired orbital-risk workbench with a Three.js Earth scene, sortable conjunction results, selected-pair details, visible backend states, and a client-generated Markdown report.

The frontend does not implement orbital mechanics or risk scoring. It calls the Part 1 FastAPI backend at the URL supplied by `VITE_API_BASE_URL`, and renders the exact `ConjunctionResult` response returned by `POST /screen`.

## Local setup

Start the Part 1 backend first at `http://localhost:8000`, then run:

```bash
cd client
cp .env.example .env
pnpm install
pnpm dev
```

The default `.env.example` value is:

```text
VITE_API_BASE_URL=http://localhost:8000
```

Use `pnpm build` for a production build or `pnpm check` for TypeScript validation. The application shows a loading state while `/screen` is running and a visible error banner if the API is unreachable or CelesTrak is unavailable through the backend.

## Frontend flow

Select a lookahead window, click **Run Screening**, and wait for the live response. The queue displays the returned satellite/debris pairs sorted by risk score. Selecting a row updates the detail panel and links the pair in the Three.js scene. **Export Markdown report** downloads the currently displayed results as a `.md` file without another backend request.

The orbit viewport uses a visual-only circular projection for orientation. It does not replace the backend’s SGP4-derived closest-approach values. Before a screening run, it renders default orbital paths so the scene is still useful as an empty state.

## Netlify deployment

Deploy the `client/` directory as a Vite site on Netlify. Set the Netlify environment variable `VITE_API_BASE_URL` to the public Render or Railway URL of the Part 1 FastAPI backend. Do not commit a real `.env` file. Netlify must be able to reach the backend origin, and the backend already exposes permissive CORS for the current project stage.

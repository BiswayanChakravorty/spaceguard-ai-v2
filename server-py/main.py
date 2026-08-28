"""SpaceGuard AI Part 1 FastAPI application."""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ingestion import CelesTrakUnavailableError, fetch_debris_object, fetch_stations
from propagation import TIMESCALE
from screening import screen_all_pairs

app = FastAPI(title="SpaceGuard AI API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class ScreenRequest(BaseModel):
    lookahead_hours: int = Field(default=24, gt=0, le=168)
    debris_catnr: str = Field(default="33953", min_length=1)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/screen")
def screen(request: ScreenRequest) -> list[dict[str, Any]]:
    """Fetch current GP elements and return the highest-risk conjunctions first."""
    try:
        stations = fetch_stations()
        debris = fetch_debris_object(request.debris_catnr)
        objects = stations + debris
        if not debris:
            raise CelesTrakUnavailableError("CelesTrak returned no record for the requested debris catalog number.")
        return screen_all_pairs(objects, TIMESCALE, request.lookahead_hours)
    except CelesTrakUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

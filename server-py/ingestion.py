"""Public CelesTrak GP ingestion for SpaceGuard AI Part 1."""

from __future__ import annotations

from typing import Any

import requests

CELESTRAK_URL = "https://celestrak.org/NORAD/elements/gp.php"
REQUEST_TIMEOUT_SECONDS = 10
DEFAULT_DEBRIS_CATNR = "33953"


class CelesTrakUnavailableError(RuntimeError):
    """Raised when the public CelesTrak GP endpoint cannot be used."""


def _fetch(params: dict[str, str]) -> list[dict[str, Any]]:
    try:
        response = requests.get(CELESTRAK_URL, params=params, timeout=REQUEST_TIMEOUT_SECONDS)
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError) as exc:
        raise CelesTrakUnavailableError(
            "CelesTrak GP data is currently unavailable. Please retry the screening request."
        ) from exc

    if not isinstance(payload, list):
        raise CelesTrakUnavailableError("CelesTrak returned an unexpected GP data format.")
    return payload


def _fetch_tle(params: dict[str, str]) -> dict[str, tuple[str, str]]:
    """Fetch real two-line elements for the catalog records returned by GP JSON."""
    try:
        response = requests.get(CELESTRAK_URL, params={**params, "FORMAT": "tle"}, timeout=REQUEST_TIMEOUT_SECONDS)
        response.raise_for_status()
    except requests.RequestException as exc:
        raise CelesTrakUnavailableError(
            "CelesTrak TLE data is currently unavailable. Please retry the screening request."
        ) from exc

    lines = [line.rstrip() for line in response.text.splitlines() if line.strip()]
    tle_by_catnr: dict[str, tuple[str, str]] = {}
    for index in range(len(lines) - 2):
        if lines[index + 1].startswith("1 ") and lines[index + 2].startswith("2 "):
            line1, line2 = lines[index + 1], lines[index + 2]
            tle_by_catnr[line1[2:7].strip()] = (line1, line2)
    if not tle_by_catnr:
        raise CelesTrakUnavailableError("CelesTrak returned no usable TLE records.")
    return tle_by_catnr


def _normalize(record: dict[str, Any], object_type: str) -> dict[str, Any] | None:
    name = record.get("OBJECT_NAME") or record.get("OBJECT_ID")
    catnr = record.get("NORAD_CAT_ID")
    line1 = record.get("TLE_LINE1")
    line2 = record.get("TLE_LINE2")
    if not all((name, catnr, line1, line2)):
        return None
    return {
        "name": str(name).strip(),
        "catnr": str(catnr),
        "tle_line1": str(line1).strip(),
        "tle_line2": str(line2).strip(),
        "object_type": object_type,
    }


def _normalize_payload(payload: list[dict[str, Any]], object_type: str, params: dict[str, str]) -> list[dict[str, Any]]:
    tle_by_catnr = _fetch_tle(params)
    normalized_records: list[dict[str, Any]] = []
    for item in payload:
        catnr = str(item.get("NORAD_CAT_ID", ""))
        tle = tle_by_catnr.get(catnr)
        if tle:
            item = {**item, "TLE_LINE1": tle[0], "TLE_LINE2": tle[1]}
        if normalized := _normalize(item, object_type):
            normalized_records.append(normalized)
    return normalized_records


def fetch_stations() -> list[dict[str, Any]]:
    """Fetch and normalize the public station GP group."""
    params = {"GROUP": "stations"}
    return _normalize_payload(_fetch({**params, "FORMAT": "json"}), "satellite", params)


def fetch_debris_object(catnr: str = DEFAULT_DEBRIS_CATNR) -> list[dict[str, Any]]:
    """Fetch and normalize one public catalog-number GP record."""
    params = {"CATNR": str(catnr)}
    return _normalize_payload(_fetch({**params, "FORMAT": "json"}), "debris", params)

import logging
import math
from functools import lru_cache
from typing import Any

import duckdb
import numpy as np
from fastapi import APIRouter, HTTPException
from pyproj import Transformer

from app.api import RAIN_MM, connection
from app.schemas import AreaRequest, AreaResponse, ErrorResponse

logger = logging.getLogger(__name__)

MAX_VERTICES = 1000
MIN_RING_POSITIONS = 4
MAX_AREA_M2 = 1_000_000.0
MAX_EXTENT_M = 2500

AUSSAGEKRAFT_VALUES = ("BESTAETIGT", "NUR_LUFTBILD", "ANNAHME", "WIDERSPRUCH")
KLASSEN_VALUES = (
    "DACH",
    "VERSIEGELT",
    "WIESE",
    "BAUM",
    "GRUENDACH",
    "STILLGEWAESSER",
    "FLIESSGEWAESSER",
)

AREA_SQL = f"""
SELECT rechtswert, hochwert, aussagekraft, klasse,
       {", ".join(f"score_prozent_{mm}mm" for mm in RAIN_MM)},
       {", ".join(f"abfluss_mm_{mm}mm" for mm in RAIN_MM)}
FROM zellen
WHERE rechtswert BETWEEN $x0 AND $x1 AND hochwert BETWEEN $y0 AND $y1
"""

router = APIRouter(prefix="/api/v1")


@lru_cache(maxsize=1)
def wgs84_to_utm() -> Transformer:
    return Transformer.from_crs(4326, 25832, always_xy=True)


def unprocessable(detail: str) -> HTTPException:
    return HTTPException(status_code=422, detail=detail)


def validate_ring(rings: list[list[tuple[float, float]]]) -> list[tuple[float, float]]:
    if len(rings) != 1:
        raise unprocessable("Nur ein äußerer Ring erlaubt")
    ring = rings[0]
    if len(ring) < MIN_RING_POSITIONS:
        raise unprocessable("Ring braucht mindestens 4 Positionen")
    if len(ring) - 1 > MAX_VERTICES:
        raise unprocessable("Zu viele Eckpunkte")
    if ring[0] != ring[-1]:
        raise unprocessable("Ring ist nicht geschlossen")
    if not all(math.isfinite(value) for position in ring for value in position):
        raise unprocessable("Ungültige Koordinaten")
    return ring


def project_ring(ring: list[tuple[float, float]]) -> tuple[np.ndarray, np.ndarray]:
    longitudes, latitudes = zip(*ring)
    easting, northing = wgs84_to_utm().transform(
        np.asarray(longitudes), np.asarray(latitudes)
    )
    if not (np.isfinite(easting).all() and np.isfinite(northing).all()):
        raise unprocessable("Ungültige Koordinaten")
    return np.asarray(easting), np.asarray(northing)


def shoelace_area(easting: np.ndarray, northing: np.ndarray) -> float:
    return abs(
        float(
            np.dot(easting[:-1], northing[1:]) - np.dot(easting[1:], northing[:-1])
        )
        / 2
    )


def rasterise(
    easting: np.ndarray, northing: np.ndarray
) -> tuple[np.ndarray, int, int, int, int]:
    """Return an even-odd mask plus (x0, x1, y0, y1) of the integer cell grid.

    Mask[y - y0, x - x0] is True when the centre (x + 0.5, y + 0.5) of the cell with
    lower-left corner (x, y) lies inside the polygon. PIL's polygon fill includes every
    pixel touched by an edge, which biases counts by up to one cell per side.
    """
    x0, x1 = math.floor(easting.min()), math.ceil(easting.max())
    y0, y1 = math.floor(northing.min()), math.ceil(northing.max())
    width, height = max(x1 - x0, 1), max(y1 - y0, 1)
    if max(width, height) > MAX_EXTENT_M:
        raise unprocessable("Ausdehnung zu groß (max. 2,5 km)")
    row_centres = y0 + np.arange(height) + 0.5
    start_x, end_x = easting[:-1], easting[1:]
    start_y, end_y = northing[:-1], northing[1:]
    crosses = (start_y[None, :] <= row_centres[:, None]) != (
        end_y[None, :] <= row_centres[:, None]
    )
    rows, edges = np.nonzero(crosses)
    crossing_x = start_x[edges] + (row_centres[rows] - start_y[edges]) * (
        (end_x[edges] - start_x[edges]) / (end_y[edges] - start_y[edges])
    )
    first_inside = np.clip(np.floor(crossing_x - x0 - 0.5).astype(np.int64) + 1, 0, width)
    toggles = np.bincount(rows * (width + 1) + first_inside, minlength=height * (width + 1))
    parity = (toggles & 1).astype(np.uint8).reshape(height, width + 1)[:, :width]
    return np.cumsum(parity, axis=1, dtype=np.uint8) & 1 == 1, x0, x1, y0, y1


def fetch_columns(parameters: dict[str, int]) -> dict[str, Any]:
    try:
        with connection().cursor() as cursor:
            return cursor.execute(AREA_SQL, parameters).fetchnumpy()
    except (duckdb.Error, OSError) as error:
        logger.warning("Parquet query failed: %s", error)
        raise HTTPException(status_code=503, detail="Zelldaten nicht lesbar") from error


def as_float_array(column: Any) -> np.ndarray:
    return np.ma.filled(np.ma.asarray(column).astype(np.float64), np.nan)


def count_values(column: np.ndarray, keys: tuple[str, ...]) -> dict[str, int]:
    values, counts = np.unique(column, return_counts=True)
    found = dict(zip(values.tolist(), counts.tolist()))
    return {key: int(found.get(key, 0)) for key in keys}


def rounded(value: float) -> float:
    return round(float(value), 1) + 0.0


def aggregate(columns: dict[str, Any], inside: np.ndarray) -> dict[str, Any]:
    score_mittel: dict[str, float | None] = {}
    rueckhalt_liter: dict[str, float] = {}
    abfluss_liter: dict[str, float] = {}
    zellen_mit_score = 0
    for mm in RAIN_MM:
        scores = as_float_array(columns[f"score_prozent_{mm}mm"])[inside]
        runoffs = as_float_array(columns[f"abfluss_mm_{mm}mm"])[inside]
        scored = ~np.isnan(scores)
        scored_count = int(scored.sum())
        zellen_mit_score = max(zellen_mit_score, scored_count)
        score_mittel[str(mm)] = (
            rounded(scores[scored].mean()) if scored_count else None
        )
        scored_runoffs = runoffs[~np.isnan(runoffs)]
        abfluss_liter[str(mm)] = rounded(scored_runoffs.sum())
        rueckhalt_liter[str(mm)] = rounded(
            mm * scored_runoffs.size - scored_runoffs.sum()
        )
    return {
        "zellen_mit_score": zellen_mit_score,
        "score_mittel": score_mittel,
        "rueckhalt_liter": rueckhalt_liter,
        "abfluss_liter": abfluss_liter,
        "aussagekraft": count_values(
            columns["aussagekraft"][inside], AUSSAGEKRAFT_VALUES
        ),
        "klassen": count_values(columns["klasse"][inside], KLASSEN_VALUES),
    }


@router.post(
    "/area",
    response_model=AreaResponse,
    responses={422: {"model": ErrorResponse}, 503: {"model": ErrorResponse}},
)
def area(request: AreaRequest) -> AreaResponse:
    ring = validate_ring(request.geometry.coordinates)
    easting, northing = project_ring(ring)
    flaeche_m2 = shoelace_area(easting, northing)
    if flaeche_m2 > MAX_AREA_M2:
        raise unprocessable("Fläche zu groß (max. 1 km²)")
    mask, x0, x1, y0, y1 = rasterise(easting, northing)
    columns = fetch_columns({"x0": x0, "x1": x1 - 1, "y0": y0, "y1": y1 - 1})
    rows = np.asarray(columns["hochwert"], dtype=np.int64) - y0
    cols = np.asarray(columns["rechtswert"], dtype=np.int64) - x0
    inside = np.zeros(rows.shape, dtype=bool)
    in_bounds = (rows >= 0) & (rows < mask.shape[0]) & (cols >= 0) & (cols < mask.shape[1])
    inside[in_bounds] = mask[rows[in_bounds], cols[in_bounds]]
    return AreaResponse(
        flaeche_m2=rounded(flaeche_m2),
        zellen=int(inside.sum()),
        **aggregate(columns, inside),
    )

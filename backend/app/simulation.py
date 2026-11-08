import logging
from functools import lru_cache
from typing import Annotated

import numpy as np
from fastapi import APIRouter, HTTPException, Path, Response
from numpy.typing import NDArray

from app.api import RAIN_MM
from app.schemas import ErrorResponse
from app.tiles import (
    CACHE_CONTROL,
    MAX_ZOOM,
    TILE_CACHE_SIZE,
    NO_SCORE_COLOR,
    OPAQUE_ALPHA,
    build_cell_sql,
    hex_to_rgb,
    ramp_to_channels,
    render_cell_tile,
    show_all,
)

logger = logging.getLogger(__name__)

HOURS_PER_DAY = 24
RETAINED_DIGITS = 4
UNAVAILABLE_DETAIL = "Simulationsdaten nicht lesbar"

RETAINED_COLOR_STOPS: tuple[tuple[float, str, float], ...] = (
    (0.0, "#D6EEFF", 0.0),
    (0.04, "#D6EEFF", 0.85),
    (0.25, "#8CCBFF", 0.85),
    (0.5, "#3D95FF", 0.85),
    (0.75, "#1259D9", 0.85),
    (1.0, "#0A2A80", 0.85),
)
NO_SCORE_ALPHA = 0.0

STOP_RETAINED = np.array([share for share, _, _ in RETAINED_COLOR_STOPS], dtype=np.float64)
STOP_CHANNELS = np.array(
    [[*hex_to_rgb(color), alpha * OPAQUE_ALPHA] for _, color, alpha in RETAINED_COLOR_STOPS],
    dtype=np.float64,
)
NO_SCORE_RGBA = np.array(
    [*hex_to_rgb(NO_SCORE_COLOR), round(NO_SCORE_ALPHA * OPAQUE_ALPHA)], dtype=np.uint8
)

SURFACES = ("versiegelt", "wiese", "baum")

router = APIRouter(prefix="/api/v1")


def retained_to_rgba(shares: NDArray[np.float64]) -> NDArray[np.uint8]:
    return ramp_to_channels(shares, STOP_RETAINED, STOP_CHANNELS)


def surface_runoff_sql(surface: str) -> str:
    storage = f"s_{surface}_mm::DOUBLE"
    return (
        f"anteil_{surface}::DOUBLE * CASE"
        f" WHEN {storage} IS NULL THEN NULL"
        f" WHEN $rain > 0.2 * {storage}"
        f" THEN power($rain - 0.2 * {storage}, 2) / ($rain + 0.8 * {storage})"
        " ELSE 0 END"
    )


def retained_share_sql() -> str:
    runoff = " + ".join(
        [surface_runoff_sql(surface) for surface in SURFACES]
        + ["linearer_abflussanteil::DOUBLE * $rain"]
    )
    return f"($rain - ({runoff})) / $rain_day"


def rain_parameters(regen: int, hour: int) -> dict[str, float]:
    return {"rain": regen * hour / HOURS_PER_DAY, "rain_day": float(regen)}


@lru_cache(maxsize=TILE_CACHE_SIZE)
def render_simulation_tile(regen: int, hour: int, zoom: int, x: int, y: int) -> bytes:
    return render_cell_tile(
        zoom,
        x,
        y,
        lambda aggregate: build_cell_sql(
            "simulation", retained_share_sql(), RETAINED_DIGITS, aggregate
        ),
        rain_parameters(regen, hour),
        retained_to_rgba,
        NO_SCORE_RGBA,
        show_all,
        UNAVAILABLE_DETAIL,
    )


@router.get(
    "/simulation/tiles/{regen}/{stunde}/{z}/{x}/{y}.png",
    response_class=Response,
    responses={
        200: {"content": {"image/png": {}}},
        422: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
)
def simulation_tile(
    regen: int,
    stunde: Annotated[int, Path(ge=0, le=HOURS_PER_DAY)],
    z: Annotated[int, Path(ge=0, le=MAX_ZOOM)],
    x: Annotated[int, Path(ge=0)],
    y: Annotated[int, Path(ge=0)],
) -> Response:
    if regen not in RAIN_MM:
        raise HTTPException(status_code=422, detail="regen muss 30, 40, 50, 60, 70 oder 80 sein")
    if x >= 2**z or y >= 2**z:
        raise HTTPException(status_code=422, detail="x oder y außerhalb des Kachelbereichs")
    content = render_simulation_tile(regen, stunde, z, x, y)
    return Response(
        content=content, media_type="image/png", headers={"Cache-Control": CACHE_CONTROL}
    )

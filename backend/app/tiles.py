import io
import logging
import math
from functools import lru_cache
from typing import Annotated

import duckdb
import numpy as np
from fastapi import APIRouter, HTTPException, Path, Query, Response
from numpy.typing import NDArray
from PIL import Image

from app.api import RAIN_MM, connection
from app.schemas import ErrorResponse

logger = logging.getLogger(__name__)

TILE_SIZE = 256
MIN_RENDER_ZOOM = 13
MAX_ZOOM = 22
BBOX_MARGIN_DEGREES = 0.00002
CELL_SIZE_M = 1.0
FOOTPRINT_OVERLAP_PIXELS = 0.25
EQUATOR_METERS_PER_PIXEL_Z0 = 156543.03392804097
CACHE_CONTROL = "public, max-age=300, must-revalidate"
TILE_CACHE_SIZE = 4096

SCORE_COLOR_STOPS: tuple[tuple[float, str], ...] = (
    (11.0, "#D73027"),
    (25.0, "#F46D43"),
    (40.0, "#FDAE61"),
    (50.0, "#FEE08B"),
    (60.0, "#A6D96A"),
    (72.0, "#66BD63"),
    (85.0, "#1A9850"),
)
NO_SCORE_COLOR = "#9E9E9E"

PIXEL_X_SQL = "(laengengrad + 180.0) / 360.0 * $scale - $origin_x"
PIXEL_Y_SQL = (
    "(0.5 - ln(tan(pi() / 4.0 + radians(breitengrad) / 2.0)) / (2.0 * pi()))"
    " * $scale - $origin_y"
)
BBOX_SQL = (
    "breitengrad BETWEEN $south AND $north AND laengengrad BETWEEN $west AND $east"
)

router = APIRouter(prefix="/api/v1")


def hex_to_rgb(color: str) -> tuple[int, int, int]:
    return int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)


STOP_SCORES = np.array([score for score, _ in SCORE_COLOR_STOPS], dtype=np.float64)
STOP_CHANNELS = np.array(
    [hex_to_rgb(color) for _, color in SCORE_COLOR_STOPS], dtype=np.float64
)
NO_SCORE_RGB = np.array(hex_to_rgb(NO_SCORE_COLOR), dtype=np.uint8)


def score_to_rgb(scores: NDArray[np.float64]) -> NDArray[np.uint8]:
    channels = [
        np.interp(scores, STOP_SCORES, STOP_CHANNELS[:, channel]) for channel in range(3)
    ]
    return np.rint(np.stack(channels, axis=-1)).astype(np.uint8)


def encode_png(rgba: NDArray[np.uint8]) -> bytes:
    buffer = io.BytesIO()
    Image.fromarray(rgba, "RGBA").save(buffer, format="PNG", compress_level=3)
    return buffer.getvalue()


@lru_cache(maxsize=1)
def transparent_png() -> bytes:
    return encode_png(np.zeros((TILE_SIZE, TILE_SIZE, 4), dtype=np.uint8))


def tile_bounds(zoom: int, x: int, y: int) -> tuple[float, float, float, float]:
    tiles = 2**zoom
    west = x / tiles * 360.0 - 180.0
    east = (x + 1) / tiles * 360.0 - 180.0
    north = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / tiles))))
    south = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (y + 1) / tiles))))
    return south, north, west, east


def meters_per_pixel(zoom: int, latitude: float) -> float:
    return EQUATOR_METERS_PER_PIXEL_Z0 * math.cos(math.radians(latitude)) / 2**zoom


@lru_cache(maxsize=1)
def data_extent() -> tuple[float, float, float, float]:
    with connection().cursor() as cursor:
        row = cursor.execute(
            "SELECT min(breitengrad), max(breitengrad), min(laengengrad), max(laengengrad)"
            " FROM zellen"
        ).fetchone()
    if row is None or row[0] is None:
        raise OSError("Empty cell data")
    return row


def build_sql(regen: int, aggregate: bool) -> str:
    score = f"score_prozent_{regen}mm::DOUBLE"
    if not aggregate:
        return (
            f"SELECT {PIXEL_X_SQL} AS px, {PIXEL_Y_SQL} AS py, round({score}, 2) AS score"
            f" FROM zellen WHERE {BBOX_SQL}"
        )
    return (
        "SELECT px, py, round(avg(score), 2) AS score FROM ("
        f"SELECT floor({PIXEL_X_SQL})::INTEGER AS px, floor({PIXEL_Y_SQL})::INTEGER AS py,"
        f" {score} AS score FROM zellen WHERE {BBOX_SQL})"
        f" WHERE px BETWEEN 0 AND {TILE_SIZE - 1} AND py BETWEEN 0 AND {TILE_SIZE - 1}"
        " GROUP BY px, py"
    )


def query_tile_cells(
    regen: int, zoom: int, x: int, y: int, aggregate: bool
) -> tuple[NDArray[np.float64], NDArray[np.float64], NDArray[np.float64]]:
    south, north, west, east = tile_bounds(zoom, x, y)
    parameters = {
        "south": south - BBOX_MARGIN_DEGREES,
        "north": north + BBOX_MARGIN_DEGREES,
        "west": west - BBOX_MARGIN_DEGREES,
        "east": east + BBOX_MARGIN_DEGREES,
        "scale": float(TILE_SIZE * 2**zoom),
        "origin_x": float(x * TILE_SIZE),
        "origin_y": float(y * TILE_SIZE),
    }
    with connection().cursor() as cursor:
        columns = cursor.execute(build_sql(regen, aggregate), parameters).fetchnumpy()
    return (
        np.ma.filled(columns["px"].astype(np.float64), np.nan),
        np.ma.filled(columns["py"].astype(np.float64), np.nan),
        np.ma.filled(columns["score"].astype(np.float64), np.nan),
    )


def visible_mask(scores: NDArray[np.float64], score_min: float, score_max: float) -> NDArray[np.bool_]:
    unscored = np.isnan(scores)
    with np.errstate(invalid="ignore"):
        in_range = (scores >= score_min) & (scores <= score_max)
    return unscored | in_range


def cell_colors(scores: NDArray[np.float64]) -> NDArray[np.uint8]:
    colors = np.empty((scores.size, 3), dtype=np.uint8)
    unscored = np.isnan(scores)
    colors[unscored] = NO_SCORE_RGB
    colors[~unscored] = score_to_rgb(scores[~unscored])
    return colors


def paint_pixels(
    rgba: NDArray[np.uint8],
    px: NDArray[np.float64],
    py: NDArray[np.float64],
    scores: NDArray[np.float64],
    score_min: float,
    score_max: float,
) -> None:
    keep = visible_mask(scores, score_min, score_max)
    colors = cell_colors(scores[keep])
    rows = py[keep].astype(np.intp)
    columns = px[keep].astype(np.intp)
    rgba[rows, columns, :3] = colors
    rgba[rows, columns, 3] = 255


def paint_footprints(
    rgba: NDArray[np.uint8],
    px: NDArray[np.float64],
    py: NDArray[np.float64],
    scores: NDArray[np.float64],
    half_cell_pixels: float,
    score_min: float,
    score_max: float,
) -> None:
    keep = visible_mask(scores, score_min, score_max)
    colors = cell_colors(scores[keep])
    left = np.floor(px[keep] - half_cell_pixels + 0.5).astype(np.intp)
    top = np.floor(py[keep] - half_cell_pixels + 0.5).astype(np.intp)
    far_edge = half_cell_pixels + 0.5 + FOOTPRINT_OVERLAP_PIXELS
    right = np.maximum(np.floor(px[keep] + far_edge).astype(np.intp), left + 1)
    bottom = np.maximum(np.floor(py[keep] + far_edge).astype(np.intp), top + 1)
    if left.size == 0:
        return
    for offset_y in range(int((bottom - top).max())):
        rows = top + offset_y
        row_mask = (rows < bottom) & (rows >= 0) & (rows < TILE_SIZE)
        for offset_x in range(int((right - left).max())):
            columns = left + offset_x
            mask = row_mask & (columns < right) & (columns >= 0) & (columns < TILE_SIZE)
            rgba[rows[mask], columns[mask], :3] = colors[mask]
            rgba[rows[mask], columns[mask], 3] = 255


@lru_cache(maxsize=TILE_CACHE_SIZE)
def render_tile(
    regen: int, zoom: int, x: int, y: int, score_min: float, score_max: float
) -> bytes:
    if zoom < MIN_RENDER_ZOOM:
        return transparent_png()
    try:
        extent_south, extent_north, extent_west, extent_east = data_extent()
        south, north, west, east = tile_bounds(zoom, x, y)
        if (
            north < extent_south
            or south > extent_north
            or east < extent_west
            or west > extent_east
        ):
            return transparent_png()
        pixel_meters = meters_per_pixel(zoom, (south + north) / 2)
        aggregate = pixel_meters >= CELL_SIZE_M
        px, py, scores = query_tile_cells(regen, zoom, x, y, aggregate)
    except (duckdb.Error, OSError) as error:
        logger.warning("Tile query failed: %s", error)
        raise HTTPException(status_code=503, detail="Zelldaten nicht lesbar") from error
    if px.size == 0:
        return transparent_png()
    rgba = np.zeros((TILE_SIZE, TILE_SIZE, 4), dtype=np.uint8)
    if aggregate:
        paint_pixels(rgba, px, py, scores, score_min, score_max)
    else:
        half_cell_pixels = CELL_SIZE_M / pixel_meters / 2
        paint_footprints(rgba, px, py, scores, half_cell_pixels, score_min, score_max)
    return encode_png(rgba)


@router.get(
    "/tiles/{regen}/{z}/{x}/{y}.png",
    response_class=Response,
    responses={
        200: {"content": {"image/png": {}}},
        422: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
)
def tile(
    regen: int,
    z: Annotated[int, Path(ge=0, le=MAX_ZOOM)],
    x: Annotated[int, Path(ge=0)],
    y: Annotated[int, Path(ge=0)],
    score_min: Annotated[float, Query(ge=0, le=100)] = 0.0,
    score_max: Annotated[float, Query(ge=0, le=100)] = 100.0,
) -> Response:
    if regen not in RAIN_MM:
        raise HTTPException(status_code=422, detail="regen muss 30, 40, 50, 60, 70 oder 80 sein")
    if x >= 2**z or y >= 2**z:
        raise HTTPException(status_code=422, detail="x oder y außerhalb des Kachelbereichs")
    if score_min > score_max:
        raise HTTPException(status_code=422, detail="score_min darf score_max nicht überschreiten")
    content = render_tile(regen, z, x, y, score_min, score_max)
    return Response(
        content=content, media_type="image/png", headers={"Cache-Control": CACHE_CONTROL}
    )

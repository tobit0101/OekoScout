import io
import logging
import math
from collections.abc import Callable
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

ColorFunction = Callable[[NDArray[np.float64]], NDArray[np.uint8]]

router = APIRouter(prefix="/api/v1")


def hex_to_rgb(color: str) -> tuple[int, int, int]:
    return int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)


STOP_SCORES = np.array([score for score, _ in SCORE_COLOR_STOPS], dtype=np.float64)
STOP_CHANNELS = np.array(
    [hex_to_rgb(color) for _, color in SCORE_COLOR_STOPS], dtype=np.float64
)
NO_SCORE_RGB = np.array(hex_to_rgb(NO_SCORE_COLOR), dtype=np.uint8)


def ramp_to_rgb(
    values: NDArray[np.float64],
    stop_values: NDArray[np.float64],
    stop_channels: NDArray[np.float64],
) -> NDArray[np.uint8]:
    channels = [
        np.interp(values, stop_values, stop_channels[:, channel]) for channel in range(3)
    ]
    return np.rint(np.stack(channels, axis=-1)).astype(np.uint8)


def score_to_rgb(scores: NDArray[np.float64]) -> NDArray[np.uint8]:
    return ramp_to_rgb(scores, STOP_SCORES, STOP_CHANNELS)


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


def build_cell_sql(source: str, value_sql: str, digits: int, aggregate: bool) -> str:
    if not aggregate:
        return (
            f"SELECT {PIXEL_X_SQL} AS px, {PIXEL_Y_SQL} AS py, round({value_sql}, {digits}) AS value"
            f" FROM {source} WHERE {BBOX_SQL}"
        )
    return (
        f"SELECT px, py, round(avg(value), {digits}) AS value FROM ("
        f"SELECT floor({PIXEL_X_SQL})::INTEGER AS px, floor({PIXEL_Y_SQL})::INTEGER AS py,"
        f" {value_sql} AS value FROM {source} WHERE {BBOX_SQL})"
        f" WHERE px BETWEEN 0 AND {TILE_SIZE - 1} AND py BETWEEN 0 AND {TILE_SIZE - 1}"
        " GROUP BY px, py"
    )


def query_tile_cells(
    sql: str, extra_parameters: dict[str, float], zoom: int, x: int, y: int
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
        **extra_parameters,
    }
    with connection().cursor() as cursor:
        columns = cursor.execute(sql, parameters).fetchnumpy()
    return (
        np.ma.filled(columns["px"].astype(np.float64), np.nan),
        np.ma.filled(columns["py"].astype(np.float64), np.nan),
        np.ma.filled(columns["value"].astype(np.float64), np.nan),
    )


def visible_mask(scores: NDArray[np.float64], score_min: float, score_max: float) -> NDArray[np.bool_]:
    unscored = np.isnan(scores)
    with np.errstate(invalid="ignore"):
        in_range = (scores >= score_min) & (scores <= score_max)
    return unscored | in_range


def show_all(values: NDArray[np.float64]) -> NDArray[np.bool_]:
    return np.ones(values.shape, dtype=np.bool_)


def cell_colors(
    values: NDArray[np.float64], to_rgb: ColorFunction = score_to_rgb
) -> NDArray[np.uint8]:
    colors = np.empty((values.size, 3), dtype=np.uint8)
    unscored = np.isnan(values)
    colors[unscored] = NO_SCORE_RGB
    colors[~unscored] = to_rgb(values[~unscored])
    return colors


def paint_pixels(
    rgba: NDArray[np.uint8],
    px: NDArray[np.float64],
    py: NDArray[np.float64],
    colors: NDArray[np.uint8],
) -> None:
    rows = py.astype(np.intp)
    columns = px.astype(np.intp)
    rgba[rows, columns, :3] = colors
    rgba[rows, columns, 3] = 255


def paint_footprints(
    rgba: NDArray[np.uint8],
    px: NDArray[np.float64],
    py: NDArray[np.float64],
    colors: NDArray[np.uint8],
    half_cell_pixels: float,
) -> None:
    left = np.floor(px - half_cell_pixels + 0.5).astype(np.intp)
    top = np.floor(py - half_cell_pixels + 0.5).astype(np.intp)
    far_edge = half_cell_pixels + 0.5 + FOOTPRINT_OVERLAP_PIXELS
    right = np.maximum(np.floor(px + far_edge).astype(np.intp), left + 1)
    bottom = np.maximum(np.floor(py + far_edge).astype(np.intp), top + 1)
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


def render_cell_tile(
    zoom: int,
    x: int,
    y: int,
    build_sql: Callable[[bool], str],
    extra_parameters: dict[str, float],
    to_rgb: ColorFunction,
    visible: Callable[[NDArray[np.float64]], NDArray[np.bool_]],
    unavailable_detail: str,
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
        px, py, values = query_tile_cells(
            build_sql(aggregate), extra_parameters, zoom, x, y
        )
    except (duckdb.Error, OSError) as error:
        logger.warning("Tile query failed: %s", error)
        raise HTTPException(status_code=503, detail=unavailable_detail) from error
    if px.size == 0:
        return transparent_png()
    keep = visible(values)
    colors = cell_colors(values[keep], to_rgb)
    rgba = np.zeros((TILE_SIZE, TILE_SIZE, 4), dtype=np.uint8)
    if aggregate:
        paint_pixels(rgba, px[keep], py[keep], colors)
    else:
        half_cell_pixels = CELL_SIZE_M / pixel_meters / 2
        paint_footprints(rgba, px[keep], py[keep], colors, half_cell_pixels)
    return encode_png(rgba)


@lru_cache(maxsize=TILE_CACHE_SIZE)
def render_tile(
    regen: int, zoom: int, x: int, y: int, score_min: float, score_max: float
) -> bytes:
    score = f"score_prozent_{regen}mm::DOUBLE"
    return render_cell_tile(
        zoom,
        x,
        y,
        lambda aggregate: build_cell_sql("zellen", score, 2, aggregate),
        {},
        score_to_rgb,
        lambda scores: visible_mask(scores, score_min, score_max),
        "Zelldaten nicht lesbar",
    )


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

import io
from collections import defaultdict
from pathlib import Path

import duckdb
import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image

import app.api as api_module
from app.simulation import (
    RETAINED_COLOR_STOPS,
    rain_parameters,
    retained_share_sql,
    retained_to_rgba,
)
from app.tiles import CACHE_CONTROL
from conftest import clear_api_caches
from test_tiles import CELL_UNSCORED, tile_position

CELL_MIXED = (48.9127069, 8.7206437)
CELL_BELOW_THRESHOLD = (48.9127069, 8.7206711)
CELL_LINEAR = (48.9127159, 8.7206436)
SCORED_CELLS = (CELL_MIXED, CELL_BELOW_THRESHOLD, CELL_LINEAR)
ALL_CELLS = (CELL_MIXED, CELL_UNSCORED, CELL_BELOW_THRESHOLD, CELL_LINEAR)

LIGHTEST = (0xD6, 0xEE, 0xFF, round(0.85 * 255))
DARKEST = (0x0A, 0x2A, 0x80, round(0.85 * 255))
GREY = (0x9E, 0x9E, 0x9E, 0)
COLOUR_TOLERANCE = 1

CELL_PARAMETERS: dict[tuple[float, float], tuple[float, ...] | None] = {
    CELL_MIXED: (0.5, 0.2, 0.3, 0.0, 2.0, 20.0, 40.0),
    CELL_UNSCORED: None,
    CELL_BELOW_THRESHOLD: (0.0, 1.0, 0.0, 0.0, 2.0, 200.0, 40.0),
    CELL_LINEAR: (0.6, 0.1, 0.1, 0.2, 1.0, 10.0, 25.0),
}

SIMULATION_SQL = """
COPY (
    SELECT
        rechtswert::INTEGER AS rechtswert,
        hochwert::INTEGER AS hochwert,
        breitengrad::DOUBLE AS breitengrad,
        laengengrad::DOUBLE AS laengengrad,
        anteil_versiegelt::FLOAT AS anteil_versiegelt,
        anteil_wiese::FLOAT AS anteil_wiese,
        anteil_baum::FLOAT AS anteil_baum,
        linearer_abflussanteil::FLOAT AS linearer_abflussanteil,
        s_versiegelt_mm::FLOAT AS s_versiegelt_mm,
        s_wiese_mm::FLOAT AS s_wiese_mm,
        s_baum_mm::FLOAT AS s_baum_mm
    FROM (VALUES
        (479531, 5417789, 48.9127069, 8.7206437, 0.5, 0.2, 0.3, 0.0, 2.0, 20.0, 40.0),
        (479532, 5417789, 48.9127069, 8.7206574,
         NULL, NULL, NULL, NULL, NULL, NULL, NULL),
        (479533, 5417789, 48.9127069, 8.7206711, 0.0, 1.0, 0.0, 0.0, 2.0, 200.0, 40.0),
        (479531, 5417790, 48.9127159, 8.7206436, 0.6, 0.1, 0.1, 0.2, 1.0, 10.0, 25.0)
    ) AS t(
        rechtswert, hochwert, breitengrad, laengengrad,
        anteil_versiegelt, anteil_wiese, anteil_baum, linearer_abflussanteil,
        s_versiegelt_mm, s_wiese_mm, s_baum_mm
    )
) TO '{path}' (FORMAT parquet)
"""


@pytest.fixture
def simulation_client(data_dir: Path, client: TestClient) -> TestClient:
    duckdb.sql(SIMULATION_SQL.format(path=data_dir / "simulation.parquet"))
    clear_api_caches()
    return client


def reference_retained_share(
    parameters: tuple[float, ...] | None, regen: int, hour: int
) -> float:
    if parameters is None:
        return float("nan")
    shares, linear, storages = (
        [float(np.float32(value)) for value in parameters[:3]],
        float(np.float32(parameters[3])),
        [float(np.float32(value)) for value in parameters[4:]],
    )
    rain = regen * hour / 24
    runoff = linear * rain
    for share, storage in zip(shares, storages):
        threshold = 0.2 * storage
        if rain > threshold:
            runoff += share * (rain - threshold) ** 2 / (rain + 0.8 * storage)
    return (rain - runoff) / regen


def expected_rgba(share: float) -> tuple[int, int, int, int]:
    if np.isnan(share):
        return GREY
    return tuple(int(channel) for channel in retained_to_rgba(np.array([share]))[0])


def fetch_pixel(
    client: TestClient,
    cell: tuple[float, float],
    zoom: int,
    regen: int,
    hour: int,
) -> tuple[int, int, int, int]:
    x, y, pixel_x, pixel_y = tile_position(*cell, zoom)
    response = client.get(f"/api/v1/simulation/tiles/{regen}/{hour}/{zoom}/{x}/{y}.png")
    assert response.status_code == 200
    return Image.open(io.BytesIO(response.content)).getpixel((pixel_x, pixel_y))


def assert_close(
    actual: tuple[int, int, int, int], expected: tuple[int, int, int, int]
) -> None:
    assert max(abs(a - e) for a, e in zip(actual, expected)) <= COLOUR_TOLERANCE


def test_tile_response_format(simulation_client: TestClient) -> None:
    for zoom in (16, 18):
        x, y, _, _ = tile_position(*CELL_MIXED, zoom)
        response = simulation_client.get(
            f"/api/v1/simulation/tiles/50/12/{zoom}/{x}/{y}.png"
        )
        assert response.status_code == 200
        assert response.headers["content-type"] == "image/png"
        assert response.headers["cache-control"] == CACHE_CONTROL
        image = Image.open(io.BytesIO(response.content))
        assert image.size == (256, 256)
        assert image.mode == "RGBA"
        assert np.asarray(image)[:, :, 3].max() > 0


def test_hour_zero_is_lightest_colour_and_transparent(
    simulation_client: TestClient,
) -> None:
    for cell in SCORED_CELLS:
        assert fetch_pixel(simulation_client, cell, 18, 50, 0) == LIGHTEST
    assert fetch_pixel(simulation_client, CELL_UNSCORED, 18, 50, 0) == GREY


def test_no_score_cell_is_semi_transparent_grey(
    simulation_client: TestClient,
) -> None:
    assert GREY[3] == 0
    assert fetch_pixel(simulation_client, CELL_UNSCORED, 18, 50, 12) == GREY


@pytest.mark.parametrize("regen", [30, 50, 80])
def test_hour_24_equals_score_formula(
    simulation_client: TestClient, regen: int
) -> None:
    for cell, parameters in CELL_PARAMETERS.items():
        pixel = fetch_pixel(simulation_client, cell, 18, regen, 24)
        if parameters is None:
            assert pixel == GREY
            continue
        assert_close(pixel, expected_rgba(reference_retained_share(parameters, regen, 24)))


def test_cell_below_threshold_retains_everything(
    simulation_client: TestClient,
) -> None:
    assert reference_retained_share(CELL_PARAMETERS[CELL_BELOW_THRESHOLD], 30, 24) == 1.0
    assert fetch_pixel(simulation_client, CELL_BELOW_THRESHOLD, 18, 30, 24) == DARKEST


@pytest.mark.parametrize("regen,hour", [(30, 24), (80, 12), (50, 7), (80, 0), (60, 24)])
def test_sql_formula_matches_reference(
    simulation_client: TestClient, regen: int, hour: int
) -> None:
    with api_module.connection().cursor() as cursor:
        rows = cursor.execute(
            f"SELECT {retained_share_sql()} FROM simulation",
            rain_parameters(regen, hour),
        ).fetchall()
    for (value,), parameters in zip(rows, CELL_PARAMETERS.values()):
        expected = reference_retained_share(parameters, regen, hour)
        if parameters is None:
            assert value is None
            continue
        assert value == pytest.approx(expected, abs=1e-9)


def test_partial_null_parameters_yield_no_value(
    simulation_client: TestClient,
) -> None:
    with api_module.connection().cursor() as cursor:
        value = cursor.execute(
            "SELECT"
            f" {retained_share_sql().replace('s_baum_mm', 'NULL::FLOAT')}"
            " FROM simulation LIMIT 1",
            rain_parameters(50, 12),
        ).fetchone()
    assert value == (None,)


def test_aggregated_zoom_averages_cells_per_pixel(
    simulation_client: TestClient,
) -> None:
    regen, hour = 60, 15
    zoom = 16
    shares_by_pixel: dict[tuple[int, int, int, int], list[float]] = defaultdict(list)
    for cell, parameters in CELL_PARAMETERS.items():
        share = reference_retained_share(parameters, regen, hour)
        shares_by_pixel[tile_position(*cell, zoom)].append(share)
    for cell in ALL_CELLS:
        shares = [share for share in shares_by_pixel[tile_position(*cell, zoom)] if not np.isnan(share)]
        pixel = fetch_pixel(simulation_client, cell, zoom, regen, hour)
        if not shares:
            assert pixel == GREY
            continue
        assert_close(pixel, expected_rgba(float(np.mean(shares))))


def test_footprint_zoom_paints_each_cell(simulation_client: TestClient) -> None:
    regen, hour = 60, 15
    zoom = 19
    for cell, parameters in CELL_PARAMETERS.items():
        pixel = fetch_pixel(simulation_client, cell, zoom, regen, hour)
        if parameters is None:
            assert pixel == GREY
            continue
        assert_close(pixel, expected_rgba(reference_retained_share(parameters, regen, hour)))


def test_retained_share_grows_with_hour(simulation_client: TestClient) -> None:
    previous = -1.0
    for hour in (0, 6, 12, 18, 24):
        share = reference_retained_share(CELL_PARAMETERS[CELL_MIXED], 50, hour)
        assert share >= previous
        previous = share
        assert_close(
            fetch_pixel(simulation_client, CELL_MIXED, 18, 50, hour), expected_rgba(share)
        )


def test_colour_stops_are_exact() -> None:
    shares = np.array([share for share, _, _ in RETAINED_COLOR_STOPS], dtype=np.float64)
    expected = np.array(
        [
            [*(int(colour[i : i + 2], 16) for i in (1, 3, 5)), round(alpha * 255)]
            for _, colour, alpha in RETAINED_COLOR_STOPS
        ]
    )
    assert (retained_to_rgba(shares) == expected).all()
    assert [alpha for *_, alpha in expected] == [217, 217, 217, 217, 217]


def test_colour_interpolation_and_clamping() -> None:
    ratio = (0.375 - 0.25) / (0.5 - 0.25)
    expected = [
        round(start + (end - start) * ratio)
        for start, end in (
            (0x8C, 0x3D),
            (0xCB, 0x95),
            (0xFF, 0xFF),
            (0.85 * 255, 0.85 * 255),
        )
    ]
    assert list(retained_to_rgba(np.array([0.375]))[0]) == expected
    low, high = retained_to_rgba(np.array([-0.5, 1.5]))
    assert tuple(low) == LIGHTEST
    assert tuple(high) == DARKEST


def test_low_zoom_and_distant_tile_are_transparent(
    simulation_client: TestClient,
) -> None:
    x, y, _, _ = tile_position(*CELL_MIXED, 12)
    low = simulation_client.get(f"/api/v1/simulation/tiles/50/12/12/{x}/{y}.png")
    assert np.asarray(Image.open(io.BytesIO(low.content)))[:, :, 3].max() == 0
    x, y, _, _ = tile_position(48.0, 8.0, 18)
    far = simulation_client.get(f"/api/v1/simulation/tiles/50/12/18/{x}/{y}.png")
    assert np.asarray(Image.open(io.BytesIO(far.content)))[:, :, 3].max() == 0


def test_tile_cache_is_reused(simulation_client: TestClient) -> None:
    x, y, _, _ = tile_position(*CELL_MIXED, 18)
    path = f"/api/v1/simulation/tiles/50/12/18/{x}/{y}.png"
    assert simulation_client.get(path).content == simulation_client.get(path).content


@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/simulation/tiles/35/12/18/1/1.png",
        "/api/v1/simulation/tiles/50/25/18/1/1.png",
        "/api/v1/simulation/tiles/50/-1/18/1/1.png",
        "/api/v1/simulation/tiles/50/abc/18/1/1.png",
        "/api/v1/simulation/tiles/50/12/18/262144/1.png",
        "/api/v1/simulation/tiles/50/12/18/1/262144.png",
        "/api/v1/simulation/tiles/50/12/23/1/1.png",
    ],
)
def test_invalid_requests_return_422(client: TestClient, path: str) -> None:
    assert client.get(path).status_code == 422


def test_regen_error_message_is_german(client: TestClient) -> None:
    response = client.get("/api/v1/simulation/tiles/35/12/18/1/1.png")
    assert response.json() == {"detail": "regen muss 30, 40, 50, 60, 70 oder 80 sein"}


def test_missing_simulation_returns_503(client: TestClient) -> None:
    x, y, _, _ = tile_position(*CELL_MIXED, 18)
    response = client.get(f"/api/v1/simulation/tiles/50/12/18/{x}/{y}.png")
    assert response.status_code == 503
    assert response.json() == {"detail": "Simulationsdaten nicht lesbar"}


def test_missing_simulation_keeps_other_endpoints_working(client: TestClient) -> None:
    assert client.get("/api/v1/health").status_code == 200
    x, y, _, _ = tile_position(*CELL_MIXED, 18)
    assert client.get(f"/api/v1/tiles/50/18/{x}/{y}.png").status_code == 200

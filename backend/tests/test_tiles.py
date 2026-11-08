import io
import math
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.tiles import CACHE_CONTROL, SCORE_COLOR_STOPS, score_to_rgb

CELL_UNSCORED = (48.9127069, 8.7206574)
CELL_50 = (48.9127069, 8.7206711)
CELL_20 = (48.9127159, 8.7206436)

GREY = (0x9E, 0x9E, 0x9E, 255)
STOP_50 = (0xFE, 0xE0, 0x8B, 255)
TRANSPARENT_ALPHA = 0


def tile_position(lat: float, lng: float, zoom: int) -> tuple[int, int, int, int]:
    scale = 256 * 2**zoom
    world_x = (lng + 180) / 360 * scale
    world_y = (
        0.5 - math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)) / (2 * math.pi)
    ) * scale
    pixel_x, pixel_y = math.floor(world_x), math.floor(world_y)
    return pixel_x // 256, pixel_y // 256, pixel_x % 256, pixel_y % 256


def fetch_tile(
    client: TestClient, zoom: int, x: int, y: int, regen: int = 50, query: str = ""
) -> Image.Image:
    response = client.get(f"/api/v1/tiles/{regen}/{zoom}/{x}/{y}.png{query}")
    assert response.status_code == 200
    return Image.open(io.BytesIO(response.content))


def pixel_at(
    client: TestClient, cell: tuple[float, float], zoom: int, query: str = ""
) -> tuple[int, int, int, int]:
    x, y, pixel_x, pixel_y = tile_position(*cell, zoom)
    return fetch_tile(client, zoom, x, y, query=query).getpixel((pixel_x, pixel_y))


def test_tile_response_format(client: TestClient) -> None:
    for zoom in (16, 18):
        x, y, _, _ = tile_position(*CELL_50, zoom)
        response = client.get(f"/api/v1/tiles/50/{zoom}/{x}/{y}.png")
        assert response.status_code == 200
        assert response.headers["content-type"] == "image/png"
        assert response.headers["cache-control"] == CACHE_CONTROL
        image = Image.open(io.BytesIO(response.content))
        assert image.size == (256, 256)
        assert image.mode == "RGBA"
        assert np.asarray(image)[:, :, 3].max() == 255


def test_cell_pixel_has_score_colour(client: TestClient) -> None:
    assert pixel_at(client, CELL_50, 18) == STOP_50


def test_cell_pixel_score_between_stops(client: TestClient) -> None:
    red, green, blue, alpha = pixel_at(client, CELL_20, 18)
    assert alpha == 255
    expected = score_to_rgb(np.array([20.0]))[0]
    assert (red, green, blue) == tuple(expected)


def test_unscored_cell_is_grey(client: TestClient) -> None:
    assert pixel_at(client, CELL_UNSCORED, 18) == GREY


def test_aggregated_zoom_draws_colour(client: TestClient) -> None:
    x, y, pixel_x, pixel_y = tile_position(*CELL_50, 16)
    image = np.asarray(fetch_tile(client, 16, x, y))
    assert image[pixel_y, pixel_x, 3] == 255


def test_score_filter_hides_excluded_cell(client: TestClient) -> None:
    excluded = pixel_at(client, CELL_50, 18, "?score_min=60&score_max=100")
    assert excluded[3] == TRANSPARENT_ALPHA
    kept = pixel_at(client, CELL_50, 18, "?score_min=40&score_max=60")
    assert kept == STOP_50


def test_score_filter_keeps_unscored_grey(client: TestClient) -> None:
    assert pixel_at(client, CELL_UNSCORED, 18, "?score_min=60&score_max=61") == GREY


def test_distant_tile_is_transparent(client: TestClient) -> None:
    x, y, _, _ = tile_position(48.0, 8.0, 18)
    image = np.asarray(fetch_tile(client, 18, x, y))
    assert image.shape == (256, 256, 4)
    assert image[:, :, 3].max() == 0


def test_low_zoom_is_transparent(client: TestClient) -> None:
    x, y, _, _ = tile_position(*CELL_50, 12)
    image = np.asarray(fetch_tile(client, 12, x, y))
    assert image[:, :, 3].max() == 0


def test_tile_cache_is_reused(client: TestClient) -> None:
    x, y, _, _ = tile_position(*CELL_50, 18)
    first = client.get(f"/api/v1/tiles/50/18/{x}/{y}.png").content
    second = client.get(f"/api/v1/tiles/50/18/{x}/{y}.png").content
    assert first == second


@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/tiles/35/18/1/1.png",
        "/api/v1/tiles/50/18/262144/1.png",
        "/api/v1/tiles/50/18/1/262144.png",
        "/api/v1/tiles/50/23/1/1.png",
        "/api/v1/tiles/50/18/1/1.png?score_min=70&score_max=30",
        "/api/v1/tiles/50/18/1/1.png?score_min=-1",
        "/api/v1/tiles/50/18/1/1.png?score_max=101",
    ],
)
def test_invalid_requests_return_422(client: TestClient, path: str) -> None:
    assert client.get(path).status_code == 422


def test_tile_missing_parquet(client: TestClient, data_dir: Path) -> None:
    (data_dir / "zellen.parquet").unlink()
    x, y, _, _ = tile_position(*CELL_50, 18)
    response = client.get(f"/api/v1/tiles/50/18/{x}/{y}.png")
    assert response.status_code == 503
    assert response.json() == {"detail": "Zelldaten nicht lesbar"}


def test_colour_stops_are_exact() -> None:
    scores = np.array([score for score, _ in SCORE_COLOR_STOPS], dtype=np.float64)
    expected = np.array(
        [
            [int(colour[i : i + 2], 16) for i in (1, 3, 5)]
            for _, colour in SCORE_COLOR_STOPS
        ]
    )
    assert (score_to_rgb(scores) == expected).all()
    assert tuple(score_to_rgb(np.array([50.0]))[0]) == STOP_50[:3]


def test_colour_interpolation_between_stops() -> None:
    ratio = (30.5 - 25) / (40 - 25)
    expected = [
        round(start + (end - start) * ratio)
        for start, end in ((0xF4, 0xFD), (0x6D, 0xAE), (0x43, 0x61))
    ]
    assert list(score_to_rgb(np.array([30.5]))[0]) == expected


def test_colour_clamping() -> None:
    low, high = score_to_rgb(np.array([0.0, 100.0]))
    assert tuple(low) == (0xD7, 0x30, 0x27)
    assert tuple(high) == (0x1A, 0x98, 0x50)

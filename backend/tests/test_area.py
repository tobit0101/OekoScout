import math

import pytest
from fastapi.testclient import TestClient
from pyproj import Transformer

import app.api as api_module

UTM_TO_WGS84 = Transformer.from_crs(25832, 4326, always_xy=True)

CELL_A = (479531, 5417789)
RAIN_KEYS = ["30", "40", "50", "60", "70", "80"]
AUSSAGEKRAFT_KEYS = {"BESTAETIGT", "NUR_LUFTBILD", "ANNAHME", "WIDERSPRUCH"}
KLASSEN_KEYS = {
    "DACH",
    "VERSIEGELT",
    "WIESE",
    "BAUM",
    "GRUENDACH",
    "STILLGEWAESSER",
    "FLIESSGEWAESSER",
}


def utm_ring(
    min_x: float, min_y: float, max_x: float, max_y: float
) -> list[list[float]]:
    corners = [
        (min_x, min_y),
        (max_x, min_y),
        (max_x, max_y),
        (min_x, max_y),
        (min_x, min_y),
    ]
    return [list(UTM_TO_WGS84.transform(x, y)) for x, y in corners]


def post_ring(client: TestClient, ring: list[list[float]]):
    return client.post(
        "/api/v1/area", json={"geometry": {"type": "Polygon", "coordinates": [ring]}}
    )


def test_area_covering_all_fixture_cells(client: TestClient) -> None:
    response = post_ring(client, utm_ring(479531, 5417789, 479534, 5417791))

    assert response.status_code == 200
    body = response.json()
    assert body["flaeche_m2"] == pytest.approx(6.0, abs=0.5)
    assert body["zellen"] == 4
    assert body["zellen_mit_score"] == 3
    assert body["score_mittel"]["50"] == 39.9
    assert body["rueckhalt_liter"]["50"] == 95.8
    assert body["abfluss_liter"]["50"] == 54.2
    assert body["aussagekraft"] == {
        "BESTAETIGT": 1,
        "NUR_LUFTBILD": 0,
        "ANNAHME": 2,
        "WIDERSPRUCH": 1,
    }
    assert body["klassen"] == {
        "DACH": 1,
        "VERSIEGELT": 0,
        "WIESE": 1,
        "BAUM": 1,
        "GRUENDACH": 1,
        "STILLGEWAESSER": 0,
        "FLIESSGEWAESSER": 0,
    }


def test_area_all_keys_present(client: TestClient) -> None:
    body = post_ring(client, utm_ring(479531, 5417789, 479534, 5417791)).json()

    assert set(body) == {
        "flaeche_m2",
        "zellen",
        "zellen_mit_score",
        "score_mittel",
        "rueckhalt_liter",
        "abfluss_liter",
        "aussagekraft",
        "klassen",
    }
    for field in ("score_mittel", "rueckhalt_liter", "abfluss_liter"):
        assert list(body[field]) == RAIN_KEYS
    assert set(body["aussagekraft"]) == AUSSAGEKRAFT_KEYS
    assert set(body["klassen"]) == KLASSEN_KEYS


def test_area_per_rain_amount_values(client: TestClient) -> None:
    body = post_ring(client, utm_ring(479531, 5417789, 479532, 5417791)).json()

    assert body["zellen"] == 2
    assert body["score_mittel"]["60"] == 32.0
    assert body["score_mittel"]["80"] == 27.9
    assert body["rueckhalt_liter"]["30"] == 26.0
    assert body["abfluss_liter"]["80"] == 75.3


def test_area_unscored_cell_counts_only_in_cells_and_aussagekraft(
    client: TestClient,
) -> None:
    body = post_ring(client, utm_ring(479532, 5417789, 479533, 5417790)).json()

    assert body["zellen"] == 1
    assert body["zellen_mit_score"] == 0
    assert body["aussagekraft"]["WIDERSPRUCH"] == 1
    assert body["klassen"]["WIESE"] == 1
    assert all(value is None for value in body["score_mittel"].values())
    assert all(value == 0 for value in body["rueckhalt_liter"].values())
    assert all(value == 0 for value in body["abfluss_liter"].values())


def test_area_membership_uses_cell_centre(client: TestClient) -> None:
    body = post_ring(client, utm_ring(479531.6, 5417789, 479533.4, 5417790)).json()

    assert body["zellen"] == 1
    assert body["klassen"]["WIESE"] == 1


def test_area_without_cells(client: TestClient) -> None:
    body = post_ring(client, utm_ring(480500, 5417000, 480510, 5417010)).json()

    assert body["zellen"] == 0
    assert body["zellen_mit_score"] == 0
    assert list(body["score_mittel"].values()) == [None] * 6
    assert list(body["rueckhalt_liter"].values()) == [0] * 6
    assert list(body["abfluss_liter"].values()) == [0] * 6
    assert sum(body["aussagekraft"].values()) == 0
    assert sum(body["klassen"].values()) == 0


def test_area_square_ten_metres(client: TestClient) -> None:
    body = post_ring(client, utm_ring(479525, 5417785, 479535, 5417795)).json()

    assert body["flaeche_m2"] == pytest.approx(100.0, abs=0.5)
    assert body["zellen"] == 4


def test_area_triangle_is_not_bounding_box(client: TestClient) -> None:
    ring = [
        list(UTM_TO_WGS84.transform(x, y))
        for x, y in [
            (479531, 5417789),
            (479534, 5417789),
            (479534, 5417791),
            (479531, 5417789),
        ]
    ]

    body = post_ring(client, ring).json()

    assert body["zellen"] == 2
    assert body["klassen"]["WIESE"] == 1
    assert body["klassen"]["GRUENDACH"] == 1
    assert body["flaeche_m2"] == pytest.approx(3.0, abs=0.5)


def test_area_self_intersecting_polygon_accepted(client: TestClient) -> None:
    ring = [
        list(UTM_TO_WGS84.transform(x, y))
        for x, y in [
            (479531, 5417789),
            (479534, 5417791),
            (479534, 5417789),
            (479531, 5417791),
            (479531, 5417789),
        ]
    ]

    assert post_ring(client, ring).status_code == 200


def test_area_inner_ring_422(client: TestClient) -> None:
    outer = utm_ring(479525, 5417785, 479535, 5417795)
    inner = utm_ring(479528, 5417788, 479531, 5417791)

    response = client.post(
        "/api/v1/area",
        json={"geometry": {"type": "Polygon", "coordinates": [outer, inner]}},
    )

    assert response.status_code == 422
    assert isinstance(response.json()["detail"], str)


def test_area_unclosed_ring_422(client: TestClient) -> None:
    ring = utm_ring(479525, 5417785, 479535, 5417795)[:-1]

    response = post_ring(client, ring)

    assert response.status_code == 422
    assert isinstance(response.json()["detail"], str)


def test_area_three_positions_422(client: TestClient) -> None:
    ring = utm_ring(479525, 5417785, 479535, 5417795)[:2]
    ring.append(ring[0])

    response = post_ring(client, ring)

    assert response.status_code == 422
    assert isinstance(response.json()["detail"], str)


def test_area_too_many_vertices_422(client: TestClient) -> None:
    centre_x, centre_y, radius = 479530.0, 5417790.0, 20.0
    count = 1001
    ring = [
        list(
            UTM_TO_WGS84.transform(
                centre_x + radius * math.cos(2 * math.pi * index / count),
                centre_y + radius * math.sin(2 * math.pi * index / count),
            )
        )
        for index in range(count)
    ]
    ring.append(ring[0])

    response = post_ring(client, ring)

    assert response.status_code == 422
    assert response.json()["detail"] == "Zu viele Eckpunkte"


def test_area_too_large_422(client: TestClient) -> None:
    response = post_ring(client, utm_ring(479000, 5417000, 480100, 5418100))

    assert response.status_code == 422
    assert response.json()["detail"] == "Fläche zu groß (max. 1 km²)"


def test_area_exactly_one_square_kilometre_accepted(client: TestClient) -> None:
    response = post_ring(client, utm_ring(479000, 5417000, 480000, 5418000))

    assert response.status_code == 200


def test_area_wrong_geometry_type_422(client: TestClient) -> None:
    response = client.post(
        "/api/v1/area",
        json={"geometry": {"type": "Point", "coordinates": [8.72, 48.91]}},
    )

    assert response.status_code == 422


def test_area_malformed_body_422(client: TestClient) -> None:
    assert client.post("/api/v1/area", json={}).status_code == 422


def test_area_unreadable_data_503(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("DATA_DIR", "/nonexistent")
    api_module.connection.cache_clear()

    response = post_ring(client, utm_ring(479531, 5417789, 479534, 5417791))

    assert response.status_code == 503
    assert response.json() == {"detail": "Zelldaten nicht lesbar"}

import pytest
from fastapi.testclient import TestClient

import app.api as api_module

CENTER_A = {"lat": 48.9127069, "lng": 8.7206437}
CENTER_B = {"lat": 48.9127069, "lng": 8.7206574}
CENTER_C = {"lat": 48.9127069, "lng": 8.7206711}
RAIN_KEYS = ["30", "40", "50", "60", "70", "80"]


def test_cell_exact_center(client: TestClient) -> None:
    response = client.get("/api/v1/cell", params=CENTER_A)

    assert response.status_code == 200
    assert response.json() == {
        "id": "479531_5417789",
        "region": 1,
        "klasse": "BAUM",
        "aussagekraft": "ANNAHME",
        "bodengruppe": "UNDURCHLAESSIG",
        "neigung_prozent": 62.4,
        "annahmen": ["BAUM_ALS_BAUM_GRAS_MISCHUNG_SCHLECHT"],
        "score_prozent": {"30": 66.5, "40": 56.9, "50": 49.6, "60": 44.0, "70": 39.5, "80": 35.8},
        "abfluss_mm": {"30": 10.0, "40": 17.2, "50": 25.2, "60": 33.6, "70": 42.4, "80": 51.3},
    }


def test_cell_nearest_wins(client: TestClient) -> None:
    response = client.get("/api/v1/cell", params={"lat": 48.9127069, "lng": 8.7206460})

    assert response.status_code == 200
    assert response.json()["id"] == "479531_5417789"


def test_cell_null_scores(client: TestClient) -> None:
    response = client.get("/api/v1/cell", params=CENTER_B)

    assert response.status_code == 200
    body = response.json()
    assert body["score_prozent"] == dict.fromkeys(RAIN_KEYS)
    assert body["abfluss_mm"] == dict.fromkeys(RAIN_KEYS)
    assert body["annahmen"] == []


def test_cell_multiple_annahmen(client: TestClient) -> None:
    response = client.get("/api/v1/cell", params=CENTER_C)

    assert response.status_code == 200
    assert response.json()["annahmen"] == [
        "GRUENDACH_MIT_ABFLUSSBEIWERT_0_4",
        "VEGETATION_IN_STRASSE_LUFTBILD_GILT",
    ]


def test_cell_outside_404(client: TestClient) -> None:
    response = client.get("/api/v1/cell", params={"lat": 48.0, "lng": 8.0})

    assert response.status_code == 404
    assert response.json() == {"detail": "Keine Zelle im Rechengebiet an dieser Koordinate"}


@pytest.mark.parametrize(
    "params",
    [
        {},
        {"lat": "abc", "lng": 8.7},
        {"lat": 91, "lng": 8.7},
        {"lat": 48.9, "lng": 181},
    ],
)
def test_cell_validation_422(client: TestClient, params: dict) -> None:
    response = client.get("/api/v1/cell", params=params)

    assert response.status_code == 422


def test_cell_unreadable_data_503(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("DATA_DIR", "/nonexistent")
    api_module.connection.cache_clear()

    response = client.get("/api/v1/cell", params=CENTER_A)

    assert response.status_code == 503
    assert response.json() == {"detail": "Zelldaten nicht lesbar"}

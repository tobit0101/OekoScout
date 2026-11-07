from pathlib import Path

from fastapi.testclient import TestClient


def test_regions_feature_collection(client: TestClient) -> None:
    response = client.get("/api/v1/regions")
    assert response.status_code == 200
    body = response.json()
    assert body["type"] == "FeatureCollection"
    assert "crs" not in body
    assert len(body["features"]) == 1
    feature = body["features"][0]
    assert feature["type"] == "Feature"
    assert feature["id"] == 1
    assert feature["properties"] == {
        "id": 1,
        "flaeche_m2": 100,
        "bbox_epsg25832": [479530, 5417780, 479540, 5417790],
    }


def test_regions_wgs84(client: TestClient) -> None:
    ring = client.get("/api/v1/regions").json()["features"][0]["geometry"]["coordinates"][0]
    lng, lat = ring[0]
    assert abs(lng - 8.72060) < 1e-4
    assert abs(lat - 48.91263) < 1e-4
    for coordinate in ring:
        for value in coordinate:
            assert len(repr(value).split(".")[1]) <= 7
    assert ring[0] == ring[-1]


def test_regions_missing_file_503(client: TestClient, data_dir: Path) -> None:
    (data_dir / "regionen.geojson").unlink()
    response = client.get("/api/v1/regions")
    assert response.status_code == 503
    assert response.json() == {"detail": "Regionen nicht lesbar"}

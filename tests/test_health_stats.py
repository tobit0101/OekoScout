import json
from pathlib import Path

from fastapi.testclient import TestClient


def test_health_ok(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "zellen": 3}


def test_health_missing_parquet(client: TestClient, data_dir: Path) -> None:
    (data_dir / "zellen.parquet").unlink()
    response = client.get("/api/v1/health")
    assert response.status_code == 503
    assert isinstance(response.json()["detail"], str)


def test_stats_returns_kennzahlen(client: TestClient, data_dir: Path) -> None:
    expected = json.loads((data_dir / "kennzahlen.json").read_text(encoding="utf-8"))
    response = client.get("/api/v1/stats")
    assert response.status_code == 200
    assert response.json() == expected


def test_stats_missing_file(client: TestClient, data_dir: Path) -> None:
    (data_dir / "kennzahlen.json").unlink()
    response = client.get("/api/v1/stats")
    assert response.status_code == 503
    assert isinstance(response.json()["detail"], str)


def test_cors_header(client: TestClient) -> None:
    response = client.get("/api/v1/health", headers={"Origin": "http://localhost:5173"})
    assert response.headers["access-control-allow-origin"] == "*"

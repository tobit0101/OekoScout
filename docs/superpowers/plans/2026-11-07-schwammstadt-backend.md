# Schwammstadt-Score Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** FastAPI + DuckDB REST API (`/api/v1`) for cell lookup, region outlines and key figures, shipped via Docker Compose.

**Architecture:** One in-memory DuckDB connection (cached) with a view `zellen` over `$DATA_DIR/zellen.parquet`; each request uses `connection().cursor()`. GeoJSON regions are transformed to WGS84 with pyproj once and cached. `kennzahlen.json` is read once and cached.

**Tech Stack:** Python 3.12, FastAPI 0.162.2, Uvicorn 0.54.0, DuckDB 2.0.0, pyproj 3.8.0, Pydantic 2.14.3, pytest 9.2.0, httpx 0.28.1.

**Spec:** `docs/superpowers/specs/2026-11-07-schwammstadt-backend-design.md` (data model: `docs/datenmodell.md`, API contract: `docs/api.md`)

## Global Constraints

- Files: `app/main.py` (app, CORS, router), `app/api.py` (endpoints + DuckDB logic), `app/schemas.py` (Pydantic models). No further app modules.
- `requirements.txt` pinned: `fastapi==0.162.2`, `uvicorn[standard]==0.54.0`, `duckdb==2.0.0`, `pyproj==3.8.0`, `pydantic==2.14.3`. Dev: `requirements-dev.txt` with `-r requirements.txt`, `pytest==9.2.0`, `httpx==0.28.1`.
- Router prefix `/api/v1`. CORS `allow_origins=["*"]`, methods `["GET"]`, headers `["*"]`.
- `DATA_DIR` env var, default `data` (relative to CWD); read at call time, not at import.
- Type hints everywhere, guard clauses, `logging.getLogger(__name__)` instead of print. Comments/docstrings in English, only where technically necessary.
- Rain amounts: `RAIN_MM = (30, 40, 50, 60, 70, 80)`; response keys are strings `"30"`…`"80"` in that order.
- Local venv: `.venv/bin/python -m pytest` (deps already installed). Commit messages: Angular convention (`feat:`, `test:`, `build:`, `docs:`), no co-author lines.

## Review Focus

1. Cell with `null` scores (`WIDERSPRUCH`) → 200 with `null` values in `score_prozent`/`abfluss_mm`, not 500. Test in Task 2.
2. Empty `annahmen` string → `[]`, not `[""]`. Test in Task 2.
3. Missing/non-numeric/out-of-range `lat`/`lng` → 422, not 500. Test in Task 2.
4. Missing `zellen.parquet` → `/health` 503 with `detail`, app still starts. Test in Task 1.
5. Concurrent requests share one connection → each request must use its own `cursor()`. Covered by implementation rule in Task 1.

---

### Task 1: App skeleton, health, stats

**Files:**
- Create: `requirements.txt`, `requirements-dev.txt`, `app/__init__.py` (empty), `app/main.py`, `app/api.py`, `app/schemas.py`
- Test: `tests/conftest.py`, `tests/test_health_stats.py`

**Interfaces:**
- Produces in `app/api.py`: `router: APIRouter` (prefix `/api/v1`), `data_dir() -> Path`, `connection() -> duckdb.DuckDBPyConnection` (`functools.lru_cache`), `load_stats() -> StatsResponse` (`lru_cache`), `RAIN_MM`.
- Produces in `app/schemas.py`: `ErrorResponse(detail: str)`, `HealthResponse(status: Literal["ok"], zellen: int)`, `ScoreSummary(min: float, mittel: float, max: float)`, `StatsResponse(zeilen: int, mit_score: int, score_je_regenmenge: dict[str, ScoreSummary], je_region: dict[str, int], aussagekraft: dict[str, int])`.
- Produces in `tests/conftest.py`: fixture `data_dir(tmp_path, monkeypatch) -> Path` writing fixture files, setting `DATA_DIR`, clearing all `lru_cache`s in `app.api` (call `.cache_clear()` on every cached function before and after); fixture `client(data_dir) -> TestClient`.
  - Fixture `zellen.parquet` written with `duckdb.sql("COPY (SELECT ...) TO '<path>' (FORMAT parquet)")`, columns and types as in `docs/datenmodell.md` (`region` TINYINT, `rechtswert`/`hochwert` INTEGER, scores/abfluss/neigung FLOAT, rest VARCHAR/DOUBLE). Rows:
    - A `479531_5417789`, region 1, lat 48.9127069, lng 8.7206437, scores 66.5/56.9/49.6/44.0/39.5/35.8, abfluss 10.0/17.2/25.2/33.6/42.4/51.3, `ANNAHME`, `BAUM`, annahmen `BAUM_ALS_BAUM_GRAS_MISCHUNG_SCHLECHT`, `UNDURCHLAESSIG`, 62.4
    - B `479532_5417789` (east neighbour), lat 48.9127069, lng 8.7206574, all scores/abfluss NULL, `WIDERSPRUCH`, `WIESE`, annahmen `''`, `DURCHLAESSIG`, 3.0
    - C `479533_5417789`, lat 48.9127069, lng 8.7206711, scores 50.0 each, abfluss 5.0 each, `ANNAHME`, `GRUENDACH`, annahmen `GRUENDACH_MIT_ABFLUSSBEIWERT_0_4;VEGETATION_IN_STRASSE_LUFTBILD_GILT`, `SEHR_DURCHLAESSIG`, 0.0
  - Fixture `kennzahlen.json`: copy structure of `data/kennzahlen.json` with small numbers (`zeilen` 3, `mit_score` 2).
  - Fixture `regionen.geojson`: FeatureCollection, `crs` EPSG:25832, one feature: properties `{"id": 1, "flaeche_m2": 100, "bbox_epsg25832": [479530, 5417780, 479540, 5417790]}`, Polygon ring `[[479530,5417780],[479540,5417780],[479540,5417790],[479530,5417790],[479530,5417780]]`.

- [ ] **Step 1: Write failing tests** in `tests/test_health_stats.py`:
  - `test_health_ok`: `GET /api/v1/health` → 200, `{"status": "ok", "zellen": 3}`.
  - `test_health_missing_parquet`: delete fixture parquet before request → 503, body has `detail` (str).
  - `test_stats_returns_kennzahlen`: 200, body equals fixture JSON.
  - `test_cors_header`: `GET /api/v1/health` with `Origin: http://localhost:5173` → `access-control-allow-origin == "*"`.
- [ ] **Step 2: Run** `.venv/bin/python -m pytest tests/test_health_stats.py -v` → FAIL (import error).
- [ ] **Step 3: Implement** `requirements*.txt`, `app/schemas.py` models above, `app/api.py`:
  - `connection()`: `duckdb.connect()` (in-memory), `CREATE VIEW zellen AS SELECT * FROM read_parquet('<path>')` (path escaped, `'`→`''`). lru_cache does not cache exceptions, so a missing file is retried on the next call.
  - `GET /health` → `SELECT count(*) FROM zellen` via `connection().cursor()`; on `duckdb.Error` or `OSError`: log warning, `HTTPException(503, "Zelldaten nicht lesbar")`. Declare `responses={503: {"model": ErrorResponse}}`.
  - `GET /stats` → `load_stats()` (`StatsResponse.model_validate_json(...)`); 503 with `ErrorResponse` if file missing.
  - `app/main.py`: `FastAPI(title="Schwammstadt-Score Pforzheim API", version="1.0.0")`, `CORSMiddleware`, `include_router(router)`, `logging.basicConfig(level=logging.INFO)`.
- [ ] **Step 4: Run** tests → PASS.
- [ ] **Step 5: Commit** `feat: add api skeleton with health and stats endpoints`

### Task 2: Cell lookup

**Files:**
- Modify: `app/api.py`, `app/schemas.py`
- Test: `tests/test_cell.py`

**Interfaces:**
- Consumes: `router`, `connection()`, `RAIN_MM`, `ErrorResponse`, fixtures `client`.
- Produces: `CellResponse(id: str, region: int, klasse: str, aussagekraft: str, bodengruppe: str, neigung_prozent: float, annahmen: list[str], score_prozent: dict[str, float | None], abfluss_mm: dict[str, float | None])`.

- [ ] **Step 1: Write failing tests** in `tests/test_cell.py`:
  - `test_cell_exact_center`: `lat=48.9127069&lng=8.7206437` → 200, body equals exactly the example JSON (row A): `annahmen == ["BAUM_ALS_BAUM_GRAS_MISCHUNG_SCHLECHT"]`, `score_prozent == {"30": 66.5, "40": 56.9, "50": 49.6, "60": 44.0, "70": 39.5, "80": 35.8}`, `abfluss_mm == {"30": 10.0, "40": 17.2, "50": 25.2, "60": 33.6, "70": 42.4, "80": 51.3}`, `neigung_prozent == 62.4`, `region == 1`.
  - `test_cell_nearest_wins`: `lat=48.9127069&lng=8.7206460` (0.17 m east of A, 0.83 m west of B) → `id == "479531_5417789"`.
  - `test_cell_null_scores`: row B center → 200, all six `score_prozent` and `abfluss_mm` values `None`, `annahmen == []`.
  - `test_cell_multiple_annahmen`: row C center → `annahmen == ["GRUENDACH_MIT_ABFLUSSBEIWERT_0_4", "VEGETATION_IN_STRASSE_LUFTBILD_GILT"]`.
  - `test_cell_outside_404`: `lat=48.0&lng=8.0` → 404, `"detail"` is str.
  - `test_cell_validation_422` parametrized: no params; `lat=abc&lng=8.7`; `lat=91&lng=8.7`; `lat=48.9&lng=181` → 422.
- [ ] **Step 2: Run** `.venv/bin/python -m pytest tests/test_cell.py -v` → FAIL (404 route missing).
- [ ] **Step 3: Implement** `GET /cell` in `app/api.py`: `lat: float = Query(ge=-90, le=90)`, `lng: float = Query(ge=-180, le=180)`, `response_model=CellResponse`, `responses={404: {"model": ErrorResponse}}`. Parameterized SQL (never string-format user input):
  ```sql
  SELECT id, region, klasse, aussagekraft, bodengruppe,
         round(neigung_prozent::DOUBLE, 1), annahmen,
         round(score_prozent_30mm::DOUBLE, 1), ... , round(abfluss_mm_80mm::DOUBLE, 1)
  FROM zellen
  WHERE breitengrad BETWEEN $lat - 0.000015 AND $lat + 0.000015
    AND laengengrad BETWEEN $lng - 0.000015 AND $lng + 0.000015
  ORDER BY power(breitengrad - $lat, 2) + power((laengengrad - $lng) * cos(radians($lat)), 2)
  LIMIT 1
  ```
  Build the score/abfluss column list from `RAIN_MM`. No hit → `HTTPException(404, "Keine Zelle im Rechengebiet an dieser Koordinate")`. `annahmen`: `[a for a in text.split(";") if a]`.
- [ ] **Step 4: Run** all tests → PASS.
- [ ] **Step 5: Commit** `feat: add cell lookup endpoint`

### Task 3: Regions in WGS84

**Files:**
- Modify: `app/api.py`, `app/schemas.py`
- Test: `tests/test_regions.py`

**Interfaces:**
- Consumes: `router`, `data_dir()`, `ErrorResponse`, fixture `client`.
- Produces: `RegionProperties(id: int, flaeche_m2: int, bbox_epsg25832: list[int])`, `RegionGeometry(type: Literal["Polygon", "MultiPolygon"], coordinates: list[Any])`, `RegionFeature(type: Literal["Feature"], id: int, properties: RegionProperties, geometry: RegionGeometry)`, `RegionCollection(type: Literal["FeatureCollection"], features: list[RegionFeature])`; `load_regions() -> RegionCollection` (lru_cache).

- [ ] **Step 1: Write failing tests** in `tests/test_regions.py`:
  - `test_regions_feature_collection`: 200, `type == "FeatureCollection"`, one feature, `id == 1`, `properties == {"id": 1, "flaeche_m2": 100, "bbox_epsg25832": [479530, 5417780, 479540, 5417790]}`, no `crs` key in body.
  - `test_regions_wgs84`: first ring point `[lng, lat]` ≈ `[8.72060, 48.91263]` (`abs < 1e-4`); every coordinate has ≤ 7 decimals; ring closed (first == last).
  - `test_regions_missing_file_503`: delete fixture geojson → 503.
- [ ] **Step 2: Run** `.venv/bin/python -m pytest tests/test_regions.py -v` → FAIL.
- [ ] **Step 3: Implement** `load_regions()`: `Transformer.from_crs(25832, 4326, always_xy=True)`; transform each ring of Polygon / each polygon of MultiPolygon; `round(v, 7)`; GeoJSON order `[lng, lat]`; drop `crs` (RFC 7946 default is WGS84); `feature.id = properties.id`. `GET /regions` → `load_regions()`, 503 `ErrorResponse` on `OSError`.
- [ ] **Step 4: Run** all tests → PASS.
- [ ] **Step 5: Commit** `feat: add regions endpoint with wgs84 transform`

### Task 4: Docker, Compose, README

**Files:**
- Create: `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `README.md`

- [ ] **Step 1: Dockerfile** `python:3.12-slim`; `PYTHONDONTWRITEBYTECODE=1`, `PYTHONUNBUFFERED=1`; `WORKDIR /app`; `pip install --no-cache-dir -r requirements.txt`; copy `app/`; non-root user `app`; `ENV DATA_DIR=/app/data`; `EXPOSE 8000`; `HEALTHCHECK` via `python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health')"`; `CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]`.
- [ ] **Step 2: .dockerignore** `data/`, `.venv/`, `.git/`, `tests/`, `docs/`, `__pycache__/`, `.pytest_cache/`.
- [ ] **Step 3: docker-compose.yml** service `api`: `build: .`, `ports: ["8000:8000"]`, `volumes: ["./data:/app/data:ro"]`, `environment: [DATA_DIR=/app/data]`, `restart: unless-stopped`.
- [ ] **Step 4: README.md** (German): purpose, data files required in `./data`, `docker compose up --build`, local dev (`pip install -r requirements-dev.txt`, `uvicorn app.main:app --reload`, `pytest`), `curl` examples for all four endpoints incl. `http://localhost:8000/api/v1/cell?lat=48.9127069&lng=8.7206437`, link to `/docs` (Swagger) and `docs/api.md`.
- [ ] **Step 5: Verify** `docker compose up --build -d`, then `curl -s localhost:8000/api/v1/health` → `{"status":"ok","zellen":4589876}`; cell curl returns example JSON; `docker compose down`.
- [ ] **Step 6: Commit** `build: add docker setup and readme`

# Schwammstadt-Score Backend – Design

## Intent

Minimal REST API for the Schwammstadt-Score Pforzheim frontend (Google Maps). Point lookup of 1×1 m cells, region outlines and key figures. Raster tiles are generated and served elsewhere; this backend does not serve tiles.

## Data

`data/` (bind-mounted read-only, not in git): `zellen.parquet` (4,589,876 rows), `regionen.geojson` (8 polygons, EPSG:25832), `kennzahlen.json`. Data model: `docs/datenmodell.md`.

## Requirements (from the user)

- Python 3.12, FastAPI, Uvicorn, DuckDB; DuckDB queries `zellen.parquet` directly, in-memory connection, read-only; no relational DB.
- CORS `*`.
- 404 and 422 responses typed with Pydantic.
- Endpoints under `/api/v1`: `GET /health`, `GET /cell?lat=&lng=`, `GET /regions`, `GET /stats`.
- `/cell`: bounding-box filter `BETWEEN lat - 0.000015 AND lat + 0.000015`, nearest by euclidean distance, `LIMIT 1`; `annahmen` split on `;` into an array (empty array when empty); 404 when no hit.
- Files: `app/main.py`, `app/api.py`, `app/schemas.py`, `requirements.txt`, `Dockerfile` (`python:3.12-slim`), `docker-compose.yml` (service `api`, `8000:8000`, `./data:/app/data:ro`, `DATA_DIR=/app/data`), `README.md`.

## Decisions made by Claude (reversible)

- Data files stay out of git (`.gitignore`), only local in `./data`.
- Parquet is queried through a DuckDB view, not loaded into a table: ~11 ms per point query vs. ~1.5 ms in-memory, but ~800 MB less RAM.
- Bounding box applied to latitude **and** longitude (±0.000015°).
- Distance: euclidean in degrees with longitude scaled by `cos(lat)`, so the nearest cell is the nearest in metres.
- Score/runoff values are `null` where the parquet has `null` (`WIDERSPRUCH`, flowing water). Values rounded to 1 decimal (float32 artefacts removed).
- `/regions` returns a GeoJSON FeatureCollection transformed to WGS84 once at startup; coordinates rounded to 7 decimals (≈1 cm). Usable with `map.data.addGeoJson()`.
- `/health` returns 503 when the parquet is unreadable.
- Lat/lng range validation (−90..90, −180..180) yields 422.

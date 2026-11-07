# Schwammstadt-Score Pforzheim – Backend-API

REST-API (FastAPI + DuckDB), die den Sponge Score je Quadratmeter für das Rechengebiet Pforzheim ausliefert. Sie bedient das Karten-Frontend mit Zellwerten, Regionsumrissen und Kennzahlen.

## Voraussetzungen

Die Datendateien müssen im Ordner `./data` liegen:

- `zellen.parquet`
- `regionen.geojson`
- `kennzahlen.json`

Sie sind nicht im Git-Repository enthalten (`data/` ist in `.gitignore`). Quelle: Hackathon-Datenpaket `10_backend`.

## Start mit Docker

```bash
docker compose up --build
```

Die API läuft danach auf `http://localhost:8000`. Die Daten werden read-only eingebunden.

## Lokale Entwicklung

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
DATA_DIR=data uvicorn app.main:app --reload
```

Tests:

```bash
pytest
```

## Endpunkte

Basis-URL: `http://localhost:8000/api/v1`

```bash
# Health-Check
curl "http://localhost:8000/api/v1/health"

# Zelle an einer Koordinate (WGS84)
curl "http://localhost:8000/api/v1/cell?lat=48.9127069&lng=8.7206437"

# Regionen als GeoJSON
curl "http://localhost:8000/api/v1/regions"

# Kennzahlen zum Datensatz
curl "http://localhost:8000/api/v1/stats"
```

## Dokumentation

- Interaktive Doku (Swagger): `http://localhost:8000/docs`
- API-Vertrag mit Feldern, Wertelisten und Fehlerformaten: [`docs/api.md`](docs/api.md)

import logging
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import duckdb
from fastapi import APIRouter, HTTPException, Query

from app.schemas import CellResponse, ErrorResponse, HealthResponse, StatsResponse

logger = logging.getLogger(__name__)

RAIN_MM = (30, 40, 50, 60, 70, 80)

CELL_SQL = f"""
SELECT id, region, klasse, aussagekraft, bodengruppe,
       round(neigung_prozent::DOUBLE, 1), annahmen,
       {", ".join(f"round(score_prozent_{mm}mm::DOUBLE, 1)" for mm in RAIN_MM)},
       {", ".join(f"round(abfluss_mm_{mm}mm::DOUBLE, 1)" for mm in RAIN_MM)}
FROM zellen
WHERE breitengrad BETWEEN $lat - 0.000015 AND $lat + 0.000015
  AND laengengrad BETWEEN $lng - 0.000015 AND $lng + 0.000015
ORDER BY power(breitengrad - $lat, 2) + power((laengengrad - $lng) * cos(radians($lat)), 2)
LIMIT 1
"""

router = APIRouter(prefix="/api/v1")


def data_dir() -> Path:
    return Path(os.environ.get("DATA_DIR", "data"))


@lru_cache(maxsize=1)
def connection() -> duckdb.DuckDBPyConnection:
    parquet_path = str(data_dir() / "zellen.parquet").replace("'", "''")
    con = duckdb.connect()
    con.execute(f"CREATE VIEW zellen AS SELECT * FROM read_parquet('{parquet_path}')")
    return con


@lru_cache(maxsize=1)
def load_stats() -> StatsResponse:
    return StatsResponse.model_validate_json(
        (data_dir() / "kennzahlen.json").read_text(encoding="utf-8")
    )


def fetch_one(
    sql: str, parameters: dict[str, float] | None = None
) -> tuple[Any, ...] | None:
    try:
        return connection().cursor().execute(sql, parameters).fetchone()
    except (duckdb.Error, OSError) as error:
        logger.warning("Parquet query failed: %s", error)
        raise HTTPException(status_code=503, detail="Zelldaten nicht lesbar") from error


@router.get(
    "/health",
    response_model=HealthResponse,
    responses={503: {"model": ErrorResponse}},
)
def health() -> HealthResponse:
    row = fetch_one("SELECT count(*) FROM zellen")
    if row is None:
        raise HTTPException(status_code=503, detail="Zelldaten nicht lesbar")
    return HealthResponse(status="ok", zellen=row[0])


@router.get(
    "/cell",
    response_model=CellResponse,
    responses={404: {"model": ErrorResponse}, 503: {"model": ErrorResponse}},
)
def cell(
    lat: float = Query(ge=-90, le=90),
    lng: float = Query(ge=-180, le=180),
) -> CellResponse:
    row = fetch_one(CELL_SQL, {"lat": lat, "lng": lng})
    if row is None:
        raise HTTPException(
            status_code=404, detail="Keine Zelle im Rechengebiet an dieser Koordinate"
        )
    rain_count = len(RAIN_MM)
    scores = row[7 : 7 + rain_count]
    runoffs = row[7 + rain_count :]
    return CellResponse(
        id=row[0],
        region=row[1],
        klasse=row[2],
        aussagekraft=row[3],
        bodengruppe=row[4],
        neigung_prozent=row[5],
        annahmen=[item for item in row[6].split(";") if item],
        score_prozent={str(mm): value for mm, value in zip(RAIN_MM, scores)},
        abfluss_mm={str(mm): value for mm, value in zip(RAIN_MM, runoffs)},
    )


@router.get(
    "/stats",
    response_model=StatsResponse,
    responses={503: {"model": ErrorResponse}},
)
def stats() -> StatsResponse:
    try:
        return load_stats()
    except (OSError, ValueError) as error:
        logger.warning("Stats not readable: %s", error)
        raise HTTPException(status_code=503, detail="Kennzahlen nicht lesbar") from error

import logging
import os
from functools import lru_cache
from pathlib import Path

import duckdb
from fastapi import APIRouter, HTTPException

from app.schemas import ErrorResponse, HealthResponse, StatsResponse

logger = logging.getLogger(__name__)

RAIN_MM = (30, 40, 50, 60, 70, 80)

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


@router.get(
    "/health",
    response_model=HealthResponse,
    responses={503: {"model": ErrorResponse}},
)
def health() -> HealthResponse:
    try:
        row = connection().cursor().execute("SELECT count(*) FROM zellen").fetchone()
    except (duckdb.Error, OSError) as error:
        logger.warning("Cell data not readable: %s", error)
        raise HTTPException(status_code=503, detail="Zelldaten nicht lesbar") from error
    return HealthResponse(status="ok", zellen=row[0])


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

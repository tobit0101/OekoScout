import json
from pathlib import Path

import duckdb
import pytest
from fastapi.testclient import TestClient

import app.api as api_module
import app.tiles as tiles_module
from app.main import app

KENNZAHLEN = {
    "zeilen": 3,
    "mit_score": 2,
    "score_je_regenmenge": {
        f"{mm}mm": {"min": 50.0, "mittel": 58.0, "max": 66.5}
        for mm in (30, 40, 50, 60, 70, 80)
    },
    "je_region": {"1": 3},
    "aussagekraft": {"ANNAHME": 2, "WIDERSPRUCH": 1},
}

REGIONEN = {
    "type": "FeatureCollection",
    "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:EPSG::25832"}},
    "features": [
        {
            "type": "Feature",
            "properties": {
                "id": 1,
                "flaeche_m2": 100,
                "bbox_epsg25832": [479530, 5417780, 479540, 5417790],
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [479530, 5417780],
                        [479540, 5417780],
                        [479540, 5417790],
                        [479530, 5417790],
                        [479530, 5417780],
                    ]
                ],
            },
        }
    ],
}

PARQUET_SQL = """
COPY (
    SELECT
        id::VARCHAR AS id,
        rechtswert::INTEGER AS rechtswert,
        hochwert::INTEGER AS hochwert,
        region::TINYINT AS region,
        breitengrad::DOUBLE AS breitengrad,
        laengengrad::DOUBLE AS laengengrad,
        score_prozent_30mm::FLOAT AS score_prozent_30mm,
        score_prozent_40mm::FLOAT AS score_prozent_40mm,
        score_prozent_50mm::FLOAT AS score_prozent_50mm,
        score_prozent_60mm::FLOAT AS score_prozent_60mm,
        score_prozent_70mm::FLOAT AS score_prozent_70mm,
        score_prozent_80mm::FLOAT AS score_prozent_80mm,
        abfluss_mm_30mm::FLOAT AS abfluss_mm_30mm,
        abfluss_mm_40mm::FLOAT AS abfluss_mm_40mm,
        abfluss_mm_50mm::FLOAT AS abfluss_mm_50mm,
        abfluss_mm_60mm::FLOAT AS abfluss_mm_60mm,
        abfluss_mm_70mm::FLOAT AS abfluss_mm_70mm,
        abfluss_mm_80mm::FLOAT AS abfluss_mm_80mm,
        aussagekraft::VARCHAR AS aussagekraft,
        klasse::VARCHAR AS klasse,
        annahmen::VARCHAR AS annahmen,
        bodengruppe::VARCHAR AS bodengruppe,
        neigung_prozent::FLOAT AS neigung_prozent
    FROM (VALUES
        ('479531_5417789', 479531, 5417789, 1, 48.9127069, 8.7206437,
         66.5, 56.9, 49.6, 44.0, 39.5, 35.8,
         10.0, 17.2, 25.2, 33.6, 42.4, 51.3,
         'ANNAHME', 'BAUM', 'BAUM_ALS_BAUM_GRAS_MISCHUNG_SCHLECHT', 'UNDURCHLAESSIG', 62.4),
        ('479532_5417789', 479532, 5417789, 1, 48.9127069, 8.7206574,
         NULL, NULL, NULL, NULL, NULL, NULL,
         NULL, NULL, NULL, NULL, NULL, NULL,
         'WIDERSPRUCH', 'WIESE', '', 'DURCHLAESSIG', 3.0),
        ('479533_5417789', 479533, 5417789, 1, 48.9127069, 8.7206711,
         50.0, 50.0, 50.0, 50.0, 50.0, 50.0,
         5.0, 5.0, 5.0, 5.0, 5.0, 5.0,
         'ANNAHME', 'GRUENDACH',
         'GRUENDACH_MIT_ABFLUSSBEIWERT_0_4;VEGETATION_IN_STRASSE_LUFTBILD_GILT',
         'SEHR_DURCHLAESSIG', 0.0),
        ('479531_5417790', 479531, 5417790, 1, 48.9127159, 8.7206436,
         20.0, 20.0, 20.0, 20.0, 20.0, 20.0,
         24.0, 24.0, 24.0, 24.0, 24.0, 24.0,
         'BESTAETIGT', 'DACH', '', 'UNDURCHLAESSIG', 0.0)
    ) AS t(
        id, rechtswert, hochwert, region, breitengrad, laengengrad,
        score_prozent_30mm, score_prozent_40mm, score_prozent_50mm,
        score_prozent_60mm, score_prozent_70mm, score_prozent_80mm,
        abfluss_mm_30mm, abfluss_mm_40mm, abfluss_mm_50mm,
        abfluss_mm_60mm, abfluss_mm_70mm, abfluss_mm_80mm,
        aussagekraft, klasse, annahmen, bodengruppe, neigung_prozent
    )
) TO '{path}' (FORMAT parquet)
"""


def clear_api_caches() -> None:
    if api_module.connection.cache_info().currsize:
        api_module.connection().close()
    for module in (api_module, tiles_module):
        for attribute in vars(module).values():
            cache_clear = getattr(attribute, "cache_clear", None)
            if callable(cache_clear):
                cache_clear()


@pytest.fixture
def data_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    duckdb.sql(PARQUET_SQL.format(path=tmp_path / "zellen.parquet"))
    (tmp_path / "kennzahlen.json").write_text(json.dumps(KENNZAHLEN), encoding="utf-8")
    (tmp_path / "regionen.geojson").write_text(json.dumps(REGIONEN), encoding="utf-8")
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    clear_api_caches()
    yield tmp_path
    clear_api_caches()


@pytest.fixture
def client(data_dir: Path) -> TestClient:
    return TestClient(app)

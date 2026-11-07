from typing import Any, Literal

from pydantic import BaseModel


class ErrorResponse(BaseModel):
    detail: str


class HealthResponse(BaseModel):
    status: Literal["ok"]
    zellen: int


class CellResponse(BaseModel):
    id: str
    region: int
    klasse: str
    aussagekraft: str
    bodengruppe: str
    neigung_prozent: float
    annahmen: list[str]
    score_prozent: dict[str, float | None]
    abfluss_mm: dict[str, float | None]


class PolygonGeometry(BaseModel):
    type: Literal["Polygon"]
    coordinates: list[list[tuple[float, float]]]


class AreaRequest(BaseModel):
    geometry: PolygonGeometry


class AreaResponse(BaseModel):
    flaeche_m2: float
    zellen: int
    zellen_mit_score: int
    score_mittel: dict[str, float | None]
    rueckhalt_liter: dict[str, float]
    abfluss_liter: dict[str, float]
    aussagekraft: dict[str, int]
    klassen: dict[str, int]


class ScoreSummary(BaseModel):
    min: float
    mittel: float
    max: float


class StatsResponse(BaseModel):
    zeilen: int
    mit_score: int
    score_je_regenmenge: dict[str, ScoreSummary]
    je_region: dict[str, int]
    aussagekraft: dict[str, int]


class RegionProperties(BaseModel):
    id: int
    flaeche_m2: int
    bbox_epsg25832: list[int]


class RegionGeometry(BaseModel):
    type: Literal["Polygon", "MultiPolygon"]
    coordinates: list[Any]


class RegionFeature(BaseModel):
    type: Literal["Feature"]
    id: int
    properties: RegionProperties
    geometry: RegionGeometry


class RegionCollection(BaseModel):
    type: Literal["FeatureCollection"]
    features: list[RegionFeature]

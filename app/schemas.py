from typing import Literal

from pydantic import BaseModel


class ErrorResponse(BaseModel):
    detail: str


class HealthResponse(BaseModel):
    status: Literal["ok"]
    zellen: int


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

import logging
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.api import connection, load_regions, load_stats, router
from app.area import router as area_router
from app.simulation import router as simulation_router
from app.tiles import data_extent
from app.tiles import router as tiles_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    warm_ups: tuple[Callable[[], object], ...] = (
        connection,
        load_regions,
        load_stats,
        data_extent,
    )
    for warm_up in warm_ups:
        try:
            warm_up()
        except Exception as error:
            logger.warning("Warm-up %s failed: %s", warm_up.__name__, error)
    yield


app = FastAPI(
    title="Schwammstadt-Score Pforzheim API", version="1.0.0", lifespan=lifespan
)


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
app.include_router(router)
app.include_router(area_router)
app.include_router(tiles_router)
app.include_router(simulation_router)

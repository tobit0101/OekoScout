import logging
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import connection, load_regions, load_stats, router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    warm_ups: tuple[Callable[[], object], ...] = (connection, load_regions, load_stats)
    for warm_up in warm_ups:
        try:
            warm_up()
        except Exception as error:
            logger.warning("Warm-up %s failed: %s", warm_up.__name__, error)
    yield


app = FastAPI(
    title="Schwammstadt-Score Pforzheim API", version="1.0.0", lifespan=lifespan
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)
app.include_router(router)

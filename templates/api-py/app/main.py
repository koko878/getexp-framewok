from __future__ import annotations

import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from getexp_core import (
    AppError,
    configure_logging,
    get_logger,
    load_config,
    to_app_error,
    with_request_id,
)

from app.config import Settings

settings = load_config(Settings)
configure_logging(level=settings.log_level, pretty=settings.python_env != "production")
log = get_logger(service=settings.service_name)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    log.info("service.start", env=settings.python_env)
    yield
    log.info("service.stop")


app = FastAPI(title=settings.service_name, lifespan=lifespan)


@app.middleware("http")
async def request_context(
    request: Request, call_next: Callable[[Request], Awaitable[JSONResponse]]
) -> JSONResponse:
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    with_request_id(request_id, method=request.method, path=request.url.path)
    response = await call_next(request)
    response.headers["x-request-id"] = request_id
    return response


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.http_status,
        content=exc.to_problem_details(request.headers.get("x-request-id")),
        media_type="application/problem+json",
    )


@app.exception_handler(Exception)
async def unhandled_handler(request: Request, exc: Exception) -> JSONResponse:
    app_error = to_app_error(exc)
    log.error("request.unhandled", error=str(exc))
    return JSONResponse(
        status_code=app_error.http_status,
        content=app_error.to_problem_details(request.headers.get("x-request-id")),
        media_type="application/problem+json",
    )


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ready")
async def ready() -> dict[str, str]:
    return {"status": "ready"}


# Add your routes here. Raise AppError subclasses from getexp_core; the handlers
# above turn them into RFC 7807 Problem Details.

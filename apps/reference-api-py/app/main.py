"""Reference FastAPI service demonstrating the GetExp Golden Path.

Shows the baseline every GetExp service ships with:
  - config validated at boot (fail fast)
  - structured logging with a per-request correlation id
  - RFC 7807 Problem Details for every error
  - /health and /ready probes
  - an idempotent POST endpoint (Stripe-style Idempotency-Key)
"""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI, Header, Request
from fastapi.responses import JSONResponse
from getexp_core import (
    AppError,
    InMemoryIdempotencyStore,
    StoredResponse,
    ValidationError,
    configure_logging,
    get_logger,
    load_config,
    to_app_error,
    with_idempotency,
    with_request_id,
)
from pydantic import BaseModel

from app.config import Settings

settings = load_config(Settings)
configure_logging(level=settings.log_level, pretty=settings.python_env != "production")
log = get_logger(service=settings.service_name)

idempotency_store = InMemoryIdempotencyStore()


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
    request_id = request.headers.get("x-request-id")
    log.warning("request.error", code=exc.code, status=exc.http_status, detail=exc.message)
    return JSONResponse(
        status_code=exc.http_status,
        content=exc.to_problem_details(request_id),
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
    """Liveness probe — process is up."""
    return {"status": "ok"}


@app.get("/ready")
async def ready() -> dict[str, str]:
    """Readiness probe — dependencies are reachable (stubbed here)."""
    return {"status": "ready"}


class GreetRequest(BaseModel):
    name: str


@app.post("/greetings", status_code=201)
async def create_greeting(
    body: GreetRequest,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> JSONResponse:
    if not body.name.strip():
        raise ValidationError("name must not be empty", details={"field": "name"})

    async def operation() -> StoredResponse:
        log.info("greeting.created", name=body.name)
        return StoredResponse(status=201, body={"message": f"Hello, {body.name}!"})

    result = await with_idempotency(idempotency_store, idempotency_key, operation)
    return JSONResponse(status_code=result.status, content=result.body)

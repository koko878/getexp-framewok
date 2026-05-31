# Python conventions

- **Python 3.11+,** managed with **uv** (workspace). Add deps with
  `uv add`, never hand-edit lockfiles.
- **Typed and strict.** `mypy` runs in strict mode; annotate everything.
  `from __future__ import annotations` at the top of modules.
- **Validate at the boundary** with **Pydantic v2** / `pydantic-settings`. Config
  goes through `getexp_core.load_config` (fails fast on a bad env).
- **Errors:** raise `AppError` subclasses from `getexp_core`. The FastAPI
  exception handlers turn them into `application/problem+json`.
- **Result vs raise:** use `Result` for expected/recoverable outcomes; `raise`
  for exceptional cases.
- **Async-first.** Services and the `HttpClient` are async; use `httpx`, never
  blocking `requests`.
- **Logging:** `getexp_core.get_logger()`; bind the request id with
  `with_request_id`. Structured key/values, not f-string soup.
- **Lint/format:** **Ruff** (`uv run ruff check . --fix && uv run ruff format .`).
- **Tests:** `pytest` (async mode auto). Before committing:
  `uv run pytest && uv run ruff check . && uv run mypy python/getexp-core/getexp_core`.

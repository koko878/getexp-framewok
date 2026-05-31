import pytest
from getexp_core.result import (
    err,
    from_callable,
    is_err,
    is_ok,
    map_ok,
    ok,
    unwrap,
    unwrap_or,
)


def test_construct_ok_and_err() -> None:
    assert is_ok(ok(1))
    assert is_err(err("boom"))


def test_unwrap_and_fallback() -> None:
    assert unwrap(ok(42)) == 42
    assert unwrap_or(err("x"), 7) == 7
    with pytest.raises(ValueError, match="nope"):
        unwrap(err(ValueError("nope")))


def test_map_only_success() -> None:
    assert map_ok(ok(2), lambda n: n * 2) == ok(4)
    assert map_ok(err("e"), lambda n: n * 2) == err("e")


def test_from_callable_captures_exceptions() -> None:
    def boom() -> int:
        raise RuntimeError("bad")

    result = from_callable(boom)
    assert is_err(result)
    assert from_callable(lambda: 5) == ok(5)

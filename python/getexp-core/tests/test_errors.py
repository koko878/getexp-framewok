from getexp_core.errors import (
    InternalError,
    NotFoundError,
    ValidationError,
    to_app_error,
)


def test_problem_details_contract() -> None:
    error = ValidationError("email is required", details={"field": "email"})
    assert error.to_problem_details("req-1") == {
        "type": "validation_error",
        "title": "ValidationError",
        "status": 400,
        "detail": "email is required",
        "instance": "req-1",
        "details": {"field": "email"},
    }


def test_internal_error_hides_message() -> None:
    pd = InternalError("db connection string leaked").to_problem_details()
    assert pd["status"] == 500
    assert pd["detail"] == "An unexpected error occurred."


def test_to_app_error_normalizes() -> None:
    assert isinstance(to_app_error(NotFoundError("x")), NotFoundError)
    assert isinstance(to_app_error("plain string"), InternalError)
    assert isinstance(to_app_error(ValueError("raw")), InternalError)

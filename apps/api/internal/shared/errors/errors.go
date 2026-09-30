package errors

import (
	"errors"
	"fmt"
	"net/http"
)

// AppError is a structured application error with HTTP status and error code.
type AppError struct {
	Code       string        `json:"code"`
	Message    string        `json:"message"`
	Details    []FieldError  `json:"details,omitempty"`
	StatusCode int           `json:"-"`
	Cause      error         `json:"-"`
}

// FieldError represents a validation error on a specific field.
type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

func (e *AppError) Error() string {
	if e.Cause != nil {
		return fmt.Sprintf("[%s] %s: %v", e.Code, e.Message, e.Cause)
	}
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

func (e *AppError) Unwrap() error {
	return e.Cause
}

// Common error constructors

func New(code, message string, status int) *AppError {
	return &AppError{Code: code, Message: message, StatusCode: status}
}

func Wrap(err error, code, message string, status int) *AppError {
	return &AppError{Code: code, Message: message, StatusCode: status, Cause: err}
}

func NotFound(entity string) *AppError {
	return New("NOT_FOUND", fmt.Sprintf("%s not found", entity), http.StatusNotFound)
}

func Conflict(message string) *AppError {
	return New("CONFLICT", message, http.StatusConflict)
}

func Unauthorized(message string) *AppError {
	return New("AUTH_REQUIRED", message, http.StatusUnauthorized)
}

func Forbidden(message string) *AppError {
	return New("PERMISSION_DENIED", message, http.StatusForbidden)
}

func BadRequest(message string) *AppError {
	return New("BAD_REQUEST", message, http.StatusBadRequest)
}

func ValidationError(fields []FieldError) *AppError {
	e := New("VALIDATION_ERROR", "Validation failed", http.StatusUnprocessableEntity)
	e.Details = fields
	return e
}

func Internal(err error) *AppError {
	return Wrap(err, "INTERNAL_ERROR", "An internal server error occurred", http.StatusInternalServerError)
}

func RateLimited() *AppError {
	return New("RATE_LIMITED", "Too many requests. Please slow down.", http.StatusTooManyRequests)
}

// Is checks if the target error is an AppError with a matching code.
func Is(err error, code string) bool {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr.Code == code
	}
	return false
}

// AsAppError extracts the AppError from an error chain.
func AsAppError(err error) (*AppError, bool) {
	var appErr *AppError
	ok := errors.As(err, &appErr)
	return appErr, ok
}

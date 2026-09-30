package middleware

import (
	"encoding/json"
	"log/slog"
	"net/http"

	apperrors "github.com/gigabill/isp/internal/shared/errors"
	"github.com/gigabill/isp/internal/shared/pagination"
)

// Response is the standard API response envelope.
type Response struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Meta    interface{} `json:"meta,omitempty"`
	Error   *ErrorBody  `json:"error,omitempty"`
}

// ErrorBody is the error detail embedded in failed responses.
type ErrorBody struct {
	Code    string                 `json:"code"`
	Message string                 `json:"message"`
	Details []apperrors.FieldError `json:"details,omitempty"`
}

// JSON writes a JSON success response with the given status code.
func JSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(Response{Success: true, Data: data})
}

// JSONList writes a paginated JSON list response.
func JSONList(w http.ResponseWriter, data interface{}, meta pagination.Meta) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(Response{Success: true, Data: data, Meta: meta})
}

// JSONError writes a JSON error response, translating AppErrors to structured output.
func JSONError(w http.ResponseWriter, logger *slog.Logger, err error) {
	appErr, ok := apperrors.AsAppError(err)
	if !ok {
		// Unknown error — log it and return generic 500
		if logger != nil {
			logger.Error("unhandled error", "error", err)
		}
		appErr = apperrors.Internal(err)
	}

	// Log 5xx errors
	if appErr.StatusCode >= 500 && logger != nil {
		logger.Error("internal server error",
			"code", appErr.Code,
			"error", appErr.Cause,
		)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(appErr.StatusCode)
	_ = json.NewEncoder(w).Encode(Response{
		Success: false,
		Error: &ErrorBody{
			Code:    appErr.Code,
			Message: appErr.Message,
			Details: appErr.Details,
		},
	})
}

// DecodeJSON decodes a JSON request body into v, returning a BadRequest AppError on failure.
func DecodeJSON(r *http.Request, v interface{}) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(v); err != nil {
		return apperrors.BadRequest("Invalid JSON request body: " + err.Error())
	}
	return nil
}

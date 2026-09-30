package auth

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	apperrors "github.com/gigabill/isp/internal/shared/errors"
	"github.com/gigabill/isp/internal/shared/middleware"
)

// Handler provides HTTP handlers for authentication endpoints.
type Handler struct {
	service *Service
	logger  *slog.Logger
}

// NewHandler creates a new auth HTTP handler.
func NewHandler(service *Service, logger *slog.Logger) *Handler {
	return &Handler{service: service, logger: logger}
}

// Routes registers auth routes on the given chi router.
func (h *Handler) Routes(r chi.Router, authMW *Middleware, loginMW func(http.Handler) http.Handler) {
	if loginMW != nil {
		r.With(loginMW).Post("/login", h.Login)
	} else {
		r.Post("/login", h.Login)
	}
	r.Post("/refresh", h.Refresh)

	// Protected routes
	r.Group(func(r chi.Router) {
		r.Use(authMW.Authenticate)
		r.Post("/logout", h.Logout)
		r.Get("/me", h.GetMe)
		r.Put("/me/password", h.ChangePassword)
	})
}

// Login handles POST /api/v1/auth/login
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	session, err := h.service.Login(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, session)
}

// Refresh handles POST /api/v1/auth/refresh
func (h *Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req RefreshRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	session, err := h.service.Refresh(r.Context(), req)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, session)
}

// Logout handles POST /api/v1/auth/logout
func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	claims := ClaimsFromContext(r.Context())
	if claims == nil {
		middleware.JSONError(w, h.logger, apperrors.Unauthorized("Not authenticated"))
		return
	}

	if err := h.service.Logout(r.Context(), claims); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]string{"message": "Logged out successfully"})
}

// GetMe handles GET /api/v1/auth/me
func (h *Handler) GetMe(w http.ResponseWriter, r *http.Request) {
	claims := ClaimsFromContext(r.Context())
	if claims == nil {
		middleware.JSONError(w, h.logger, apperrors.Unauthorized("Not authenticated"))
		return
	}

	user, err := h.service.GetCurrentUser(r.Context(), claims.UserID)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, user)
}

// ChangePassword handles PUT /api/v1/auth/me/password
func (h *Handler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	claims := ClaimsFromContext(r.Context())
	if claims == nil {
		middleware.JSONError(w, h.logger, apperrors.Unauthorized("Not authenticated"))
		return
	}

	var req ChangePasswordRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	userID, err := uuid.Parse(claims.UserID.String())
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("Invalid user ID"))
		return
	}

	if err := h.service.ChangePassword(r.Context(), userID, req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	// SECURITY: Log password change without logging the password itself
	h.logger.Info("password changed", "user_id", userID)

	middleware.JSON(w, http.StatusOK, map[string]string{"message": "Password changed successfully"})
}

// UserRoutes registers user management routes on the router.
func (h *Handler) UserRoutes(r chi.Router, authMW *Middleware) {
	r.Group(func(r chi.Router) {
		r.Use(authMW.Authenticate)
		r.With(authMW.RequirePermission("admin:users")).Get("/", h.ListUsers)
		r.With(authMW.RequirePermission("admin:users")).Post("/", h.CreateUser)
		r.With(authMW.RequirePermission("admin:users")).Get("/roles", h.ListRoles)
		r.With(authMW.RequirePermission("admin:users")).Get("/{id}", h.GetUser)
		r.With(authMW.RequirePermission("admin:users")).Put("/{id}", h.UpdateUser)
		r.With(authMW.RequirePermission("admin:users")).Put("/{id}/password", h.AdminResetPassword)
		r.With(authMW.RequirePermission("admin:users")).Delete("/{id}", h.DeleteUser)
	})
}

// ListUsers handles GET /api/v1/users
func (h *Handler) ListUsers(w http.ResponseWriter, r *http.Request) {
	search := r.URL.Query().Get("search")
	roleSlug := r.URL.Query().Get("role")

	users, err := h.service.ListUsers(r.Context(), search, roleSlug)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]interface{}{
		"users": users,
		"total": len(users),
	})
}

// CreateUser handles POST /api/v1/users
func (h *Handler) CreateUser(w http.ResponseWriter, r *http.Request) {
	claims := ClaimsFromContext(r.Context())
	creatorID := uuid.Nil
	if claims != nil {
		creatorID = claims.UserID
	}

	var req CreateUserRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	u, err := h.service.CreateUser(r.Context(), req, creatorID)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusCreated, u)
}

// GetUser handles GET /api/v1/users/{id}
func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("Invalid user ID"))
		return
	}

	u, err := h.service.GetCurrentUser(r.Context(), id)
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, u)
}

// UpdateUser handles PUT /api/v1/users/{id}
func (h *Handler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	claims := ClaimsFromContext(r.Context())
	updaterID := uuid.Nil
	if claims != nil {
		updaterID = claims.UserID
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("Invalid user ID"))
		return
	}

	var req UpdateUserRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	if err := h.service.UpdateUser(r.Context(), id, req, updaterID); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]string{"message": "User updated successfully"})
}

// AdminResetPassword handles PUT /api/v1/users/{id}/password
func (h *Handler) AdminResetPassword(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("Invalid user ID"))
		return
	}

	var req AdminResetPasswordRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	if err := h.service.AdminResetPassword(r.Context(), id, req.NewPassword); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]string{"message": "Password reset successfully"})
}

// DeleteUser handles DELETE /api/v1/users/{id}
func (h *Handler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	claims := ClaimsFromContext(r.Context())
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("Invalid user ID"))
		return
	}

	// Prevent user from deleting themselves
	if claims != nil && claims.UserID == id {
		middleware.JSONError(w, h.logger, apperrors.BadRequest("Cannot delete your own user account"))
		return
	}

	if err := h.service.DeleteUser(r.Context(), id); err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]string{"message": "User deleted successfully"})
}

// ListRoles handles GET /api/v1/users/roles or GET /api/v1/roles
func (h *Handler) ListRoles(w http.ResponseWriter, r *http.Request) {
	roles, err := h.service.ListRoles(r.Context())
	if err != nil {
		middleware.JSONError(w, h.logger, err)
		return
	}

	middleware.JSON(w, http.StatusOK, map[string]interface{}{
		"roles": roles,
	})
}

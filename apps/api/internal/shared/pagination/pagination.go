package pagination

import (
	"math"
	"net/http"
	"strconv"
)

const (
	DefaultPage  = 1
	DefaultLimit = 20
	MaxLimit     = 500
)

// Params holds pagination parameters extracted from query string.
type Params struct {
	Page   int
	Limit  int
	Offset int
	Sort   string
	Order  string // asc | desc
}

// Meta holds pagination metadata included in list responses.
type Meta struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

// FromRequest extracts and validates pagination parameters from an HTTP request.
func FromRequest(r *http.Request) Params {
	q := r.URL.Query()

	page := parseInt(q.Get("page"), DefaultPage)
	if page < 1 {
		page = 1
	}

	limit := parseInt(q.Get("limit"), DefaultLimit)
	if limit < 1 {
		limit = DefaultLimit
	}
	if limit > MaxLimit {
		limit = MaxLimit
	}

	sort := q.Get("sort")
	order := q.Get("order")
	if order != "asc" && order != "desc" {
		order = "desc"
	}

	return Params{
		Page:   page,
		Limit:  limit,
		Offset: (page - 1) * limit,
		Sort:   sort,
		Order:  order,
	}
}

// NewMeta creates pagination metadata given total record count.
func NewMeta(params Params, total int) Meta {
	totalPages := int(math.Ceil(float64(total) / float64(params.Limit)))
	if totalPages < 1 {
		totalPages = 1
	}
	return Meta{
		Page:       params.Page,
		Limit:      params.Limit,
		Total:      total,
		TotalPages: totalPages,
	}
}

func parseInt(s string, fallback int) int {
	if s == "" {
		return fallback
	}
	n, err := strconv.Atoi(s)
	if err != nil {
		return fallback
	}
	return n
}

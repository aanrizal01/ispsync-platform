package middleware_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"ispsync/internal/domain"
	"ispsync/internal/middleware"
	"ispsync/internal/repository"
)

type mockStorage struct {
	repository.Storage
}

func (m *mockStorage) GetTenantBySlug(ctx context.Context, slug string) (*domain.Tenant, error) {
	return &domain.Tenant{
		ID:         "test-id-" + slug,
		Slug:       slug,
		Name:       "Tenant " + slug,
		PrefixID:   slug,
		BrandColor: "#0ea5e9",
		Status:     "ACTIVE",
	}, nil
}

func (m *mockStorage) GetTenantByCustomDomain(ctx context.Context, domainName string) (*domain.Tenant, error) {
	return nil, nil
}

func (m *mockStorage) ListTenants(ctx context.Context) ([]domain.Tenant, error) {
	return nil, nil
}

func (m *mockStorage) ValidateDomainForTLS(ctx context.Context, domainName string) bool {
	return true
}

func TestNexusSubdomainResolution(t *testing.T) {
	mock := &mockStorage{}
	handler := middleware.TenantResolver(mock, "ispsync.id")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tCtx := middleware.GetTenantContext(r)
		if tCtx == nil {
			t.Fatal("expected tenant context, got nil")
		}
		if expected := r.Header.Get("X-Expected-App"); expected != "" && string(tCtx.AppType) != expected {
			t.Errorf("Host %s: expected app %s, got %s", r.Host, expected, tCtx.AppType)
		}
		if expected := r.Header.Get("X-Expected-Slug"); expected != "" && tCtx.Tenant.Slug != expected {
			t.Errorf("Host %s: expected slug %s, got %s", r.Host, expected, tCtx.Tenant.Slug)
		}
	}))

	tests := []struct {
		host         string
		expectedApp  domain.AppType
		expectedSlug string
	}{
		{"nexus.ispku.ispsync.id", domain.AppNOC, "ispku"},
		{"nexus.dev.ispsync.id", domain.AppNOC, "dev"},
		{"nexus.ispmu.ispsync.id", domain.AppNOC, "ispmu"},
		{"portal.ispku.ispsync.id", domain.AppPortal, "ispku"},
		{"sales.ispku.ispsync.id", domain.AppSales, "ispku"},
		{"teknisi.ispku.ispsync.id", domain.AppTeknisi, "ispku"},
		{"noc.ispku.ispsync.id", domain.AppNOC, "ispku"},
	}

	for _, tt := range tests {
		req := httptest.NewRequest("GET", "http://"+tt.host+"/", nil)
		req.Header.Set("X-Expected-App", string(tt.expectedApp))
		req.Header.Set("X-Expected-Slug", tt.expectedSlug)
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, req)
	}
}

func TestDeprecatedSingleLevelSubdomainsBlocked(t *testing.T) {
	mock := &mockStorage{}
	handler := middleware.TenantResolver(mock, "ispsync.id")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	}))

	blockedHosts := []string{
		"portal.ispsync.id",
		"nexus.ispsync.id",
		"cms.ispsync.id",
		"sales.ispsync.id",
		"teknisi.ispsync.id",
		"billing.ispsync.id",
		"ledger.ispsync.id",
		"noc.ispsync.id",
		"fttx.ispsync.id",
		"fibergrid.ispsync.id",
		"wifi.ispsync.id",
		"hotspot.ispsync.id",
		"passpoint.ispsync.id",
		"rekan.ispsync.id",
		"carrier.ispsync.id",
		"admin.ispsync.id",
	}

	for _, host := range blockedHosts {
		req := httptest.NewRequest("GET", "http://"+host+"/", nil)
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, req)

		if w.Code != http.StatusNotFound {
			t.Errorf("Host %s: expected status 404, got %d", host, w.Code)
		}
	}
}

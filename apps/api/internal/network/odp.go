package network

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type ODPNode struct {
	ID              string    `json:"id"`
	Code            string    `json:"code"`
	Name            string    `json:"name"`
	Latitude        float64   `json:"latitude"`
	Longitude       float64   `json:"longitude"`
	TotalPorts      int       `json:"total_ports"`
	UsedPorts       int       `json:"used_ports"`
	Status          string    `json:"status"` // AVAILABLE, FULL, MAINTENANCE
	ClusterArea     string    `json:"cluster_area"`
	ProviderID      string    `json:"provider_id"`
	ProviderName    string    `json:"provider_name"`
	IsClusterActive bool      `json:"is_cluster_active"`
	SplitterSpec    string    `json:"splitter_spec"`
	OpticalPowerDBM float64   `json:"optical_power_dbm"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type FiberRoute struct {
	ID          string      `json:"id"`
	RouteCode   string      `json:"route_code"`
	RouteName   string      `json:"route_name"`
	CableType   string      `json:"cable_type"` // BACKBONE, FEEDER, DISTRIBUTION, DROPCORE
	CoreCount   int         `json:"core_count"`
	ClusterArea string      `json:"cluster_area"`
	Status      string      `json:"status"`
	ColorHex    string      `json:"color_hex"`
	Coordinates [][]float64 `json:"coordinates"` // [[lat, lng], [lat, lng]]
	CreatedAt   time.Time   `json:"created_at"`
}

type FTTXStats struct {
	TotalODP        int     `json:"total_odp"`
	TotalPorts      int     `json:"total_ports"`
	UsedPorts       int     `json:"used_ports"`
	AvailablePorts  int     `json:"available_ports"`
	UtilizationRate float64 `json:"utilization_rate"`
	TotalRoutes     int     `json:"total_routes"`
	TotalCableKm    float64 `json:"total_cable_km"`
}

type CreateODPRequest struct {
	Code         string  `json:"code"`
	Name         string  `json:"name"`
	Latitude     float64 `json:"latitude"`
	Longitude    float64 `json:"longitude"`
	TotalPorts   int     `json:"total_ports"`
	SplitterSpec string  `json:"splitter_spec"`
	ClusterArea  string  `json:"cluster_area"`
}

// ──────────────────────────────────────────
// Repository ODP & Fiber Methods
// ──────────────────────────────────────────

type nexusODPItem struct {
	ID                string  `json:"id"`
	TenantID          string  `json:"tenant_id"`
	Code              string  `json:"code"`
	Name              string  `json:"name"`
	Latitude          float64 `json:"latitude"`
	Longitude         float64 `json:"longitude"`
	TotalPorts        int     `json:"total_ports"`
	UsedPorts         int     `json:"used_ports"`
	Status            string  `json:"status"`
	IsSharedJartaplok bool    `json:"is_shared_jartaplok"`
	OwnerTenantSlug   string  `json:"owner_tenant_slug"`
	OwnerTenantName   string  `json:"owner_tenant_name"`
}

type tenantCtxKey struct{}

// WithTenantSlug attaches tenant slug to context
func WithTenantSlug(ctx context.Context, slug string) context.Context {
	return context.WithValue(ctx, tenantCtxKey{}, slug)
}

func (r *Repository) fetchFromNexus(ctx context.Context) ([]ODPNode, bool) {
	baseURL := os.Getenv("NEXUS_API_URL")
	if baseURL == "" {
		baseURL = os.Getenv("ISP_BASE_URL")
	}
	if baseURL == "" {
		baseURL = "http://nexus:8081"
	}
	req, err := http.NewRequestWithContext(ctx, "GET", strings.TrimRight(baseURL, "/")+"/api/v1/odps", nil)
	if err != nil {
		return nil, false
	}

	tenantSlug, _ := ctx.Value(tenantCtxKey{}).(string)
	if tenantSlug == "" {
		tenantSlug = "dev"
	}
	host := fmt.Sprintf("nexus.%s.ispsync.id", tenantSlug)
	req.Host = host
	req.Header.Set("Host", host)
	req.Header.Set("X-Tenant-Slug", tenantSlug)

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		return nil, false
	}
	defer resp.Body.Close()

	var rawItems []nexusODPItem
	if err := json.NewDecoder(resp.Body).Decode(&rawItems); err != nil {
		return nil, false
	}

	result := make([]ODPNode, 0, len(rawItems))
	for _, it := range rawItems {
		clusterArea := "Lokal"
		providerName := "Internal ISP"
		upperCode := strings.ToUpper(it.Code)
		if strings.HasPrefix(upperCode, "ODP-HRU") || strings.HasPrefix(upperCode, "OPD-HRU") || strings.HasPrefix(upperCode, "ODP-HR") {
			clusterArea = "Cluster Harau (FiberGrid In-House)"
			providerName = "GOGIGA In-House FO"
		} else if strings.HasPrefix(upperCode, "ODP-PYK") {
			clusterArea = "Cluster Payakumbuh"
			providerName = "Mitra Rekanan Payakumbuh"
		} else if strings.HasPrefix(upperCode, "ODP-BIO") {
			clusterArea = "Cluster Biaro (Golden Net)"
			providerName = "Mitra Golden Net Biaro"
		} else if strings.HasPrefix(upperCode, "ODP-SGG") {
			clusterArea = "Cluster Suliki Guguk"
			providerName = "Mitra Rekanan 50 Kota"
		} else if strings.HasPrefix(upperCode, "ODP-PDG") {
			clusterArea = "Cluster Padang"
			providerName = "Mitra Rekanan Padang"
		} else if strings.HasPrefix(upperCode, "ODP-BKT") {
			clusterArea = "Cluster Bukittinggi"
			providerName = "Mitra Rekanan Bukittinggi"
		}
		if it.IsSharedJartaplok {
			clusterArea = "Jartaplok " + strings.ToUpper(it.OwnerTenantSlug)
			if it.OwnerTenantName != "" {
				providerName = it.OwnerTenantName
			} else {
				providerName = "Mitra Jartaplok " + it.OwnerTenantSlug
			}
		}

		result = append(result, ODPNode{
			ID:              it.ID,
			Code:            it.Code,
			Name:            it.Name,
			Latitude:        it.Latitude,
			Longitude:       it.Longitude,
			TotalPorts:      it.TotalPorts,
			UsedPorts:       it.UsedPorts,
			Status:          it.Status,
			ClusterArea:     clusterArea,
			ProviderID:      it.OwnerTenantSlug,
			ProviderName:    providerName,
			IsClusterActive: true,
			SplitterSpec:    fmt.Sprintf("1:%d PLC", it.TotalPorts),
			OpticalPowerDBM: -16.8 - float64(it.UsedPorts)*0.55,
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
		})
	}
	return result, true
}

func (r *Repository) fetchFromFiberGrid(ctx context.Context) ([]ODPNode, bool) {
	tenantSlug, _ := ctx.Value(tenantCtxKey{}).(string)
	if tenantSlug == "" {
		tenantSlug = "dev"
	}

	apiURL := os.Getenv("FTTX_BASE_URL")
	if apiURL == "" {
		apiURL = "http://172.18.0.1:8082"
	}
	apiKey := os.Getenv("FTTX_ADMIN_KEY")
	if apiKey == "" {
		apiKey = "gogiga-noc-admin-99a8f27c3d14"
	}
	targetTenant := tenantSlug

	settingsKey := "fibergrid_integration"
	if tenantSlug != "" && tenantSlug != "dev" {
		var exists bool
		_ = r.db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM app_settings WHERE key = $1)", "fibergrid_integration_"+tenantSlug).Scan(&exists)
		if exists {
			settingsKey = "fibergrid_integration_" + tenantSlug
		}
	}

	var valBytes []byte
	err := r.db.QueryRow(ctx, "SELECT value FROM app_settings WHERE key = $1", settingsKey).Scan(&valBytes)
	if err == nil {
		var cfg struct {
			Enabled    bool   `json:"enabled"`
			APIURL     string `json:"api_url"`
			APIKey     string `json:"api_key"`
			TenantCode string `json:"tenant_code"`
		}
		if jsonErr := json.Unmarshal(valBytes, &cfg); jsonErr == nil && cfg.Enabled {
			if cfg.APIURL != "" {
				apiURL = cfg.APIURL
			}
			if cfg.APIKey != "" {
				apiKey = cfg.APIKey
			}
			if cfg.TenantCode != "" {
				targetTenant = cfg.TenantCode
			}
		}
	}

	reqURL := strings.TrimRight(apiURL, "/") + "/api/v1/fttx/odp"
	req, err := http.NewRequestWithContext(ctx, "GET", reqURL, nil)
	if err != nil {
		return nil, false
	}

	if apiKey != "" {
		req.Header.Set("X-Admin-Key", apiKey)
		req.Header.Set("Authorization", "Bearer "+apiKey)
	}
	if targetTenant != "" {
		req.Header.Set("X-Tenant-Slug", targetTenant)
	}

	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		return nil, false
	}
	defer resp.Body.Close()

	var fttxResp struct {
		Success bool `json:"success"`
		Data    []struct {
			ID         string  `json:"id"`
			Code       string  `json:"code"`
			Name       string  `json:"name"`
			Latitude   float64 `json:"latitude"`
			Longitude  float64 `json:"longitude"`
			TotalPorts int     `json:"total_ports"`
			UsedPorts  int     `json:"used_ports"`
			Status     string  `json:"status"`
			Notes      string  `json:"notes"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&fttxResp); err != nil || !fttxResp.Success || len(fttxResp.Data) == 0 {
		return nil, false
	}

	result := make([]ODPNode, 0, len(fttxResp.Data))
	for _, it := range fttxResp.Data {
		result = append(result, ODPNode{
			ID:              it.ID,
			Code:            it.Code,
			Name:            it.Name,
			Latitude:        it.Latitude,
			Longitude:       it.Longitude,
			TotalPorts:      it.TotalPorts,
			UsedPorts:       it.UsedPorts,
			Status:          it.Status,
			ClusterArea:     "Cluster Harau (FiberGrid In-House)",
			ProviderID:      targetTenant,
			ProviderName:    "GOGIGA In-House FO",
			IsClusterActive: true,
			SplitterSpec:    fmt.Sprintf("1:%d PLC", it.TotalPorts),
			OpticalPowerDBM: -17.5 - float64(it.UsedPorts)*0.5,
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
		})
	}
	return result, true
}

func (r *Repository) ListODPNodes(ctx context.Context, cluster string) ([]ODPNode, error) {
	// If cluster or scope is inhouse, strictly fetch from FiberGrid engine
	if cluster == "inhouse" {
		if fttxNodes, ok := r.fetchFromFiberGrid(ctx); ok {
			return fttxNodes, nil
		}
	}

	// 1. First attempt to fetch from EngineNexus (which aggregates own ODPs + Jartaplok partner ODPs)
	nexusNodes, ok := r.fetchFromNexus(ctx)
	if ok {
		// Also merge any FiberGrid in-house nodes if not present in Nexus
		if fttxNodes, fttxOk := r.fetchFromFiberGrid(ctx); fttxOk {
			existingCodes := make(map[string]bool)
			for _, n := range nexusNodes {
				existingCodes[strings.ToUpper(strings.TrimSpace(n.Code))] = true
			}
			for _, fn := range fttxNodes {
				if !existingCodes[strings.ToUpper(strings.TrimSpace(fn.Code))] {
					nexusNodes = append(nexusNodes, fn)
				}
			}
		}

		if cluster != "" && cluster != "all" {
			filtered := make([]ODPNode, 0)
			for _, n := range nexusNodes {
				if strings.Contains(strings.ToLower(n.ClusterArea), strings.ToLower(cluster)) ||
					strings.Contains(strings.ToLower(n.Name), strings.ToLower(cluster)) ||
					strings.Contains(strings.ToLower(n.Code), strings.ToLower(cluster)) {
					filtered = append(filtered, n)
				}
			}
			return filtered, nil
		}
		return nexusNodes, nil
	}

	// 2. Fallback to FiberGrid if Nexus is not configured
	if fttxNodes, ok := r.fetchFromFiberGrid(ctx); ok {
		return fttxNodes, nil
	}

	// 3. Fallback to local PostgreSQL odp_nodes table
	_ = r.SeedDefaultODPsIfEmpty(ctx)

	query := `
		SELECT id, code, name, latitude, longitude, total_ports, used_ports,
		       status, cluster_area, provider_id, provider_name, is_cluster_active,
		       splitter_spec, created_at, updated_at
		FROM odp_nodes
	`
	var rows pgx.Rows
	var err error

	if cluster != "" {
		query += ` WHERE cluster_area ILIKE $1 ORDER BY code ASC`
		rows, err = r.db.Query(ctx, query, "%"+cluster+"%")
	} else {
		query += ` ORDER BY code ASC`
		rows, err = r.db.Query(ctx, query)
	}

	if err != nil {
		return nil, fmt.Errorf("list odp_nodes: %w", err)
	}
	defer rows.Close()

	nodes := make([]ODPNode, 0)
	for rows.Next() {
		var n ODPNode
		err := rows.Scan(
			&n.ID, &n.Code, &n.Name, &n.Latitude, &n.Longitude,
			&n.TotalPorts, &n.UsedPorts, &n.Status, &n.ClusterArea,
			&n.ProviderID, &n.ProviderName, &n.IsClusterActive,
			&n.SplitterSpec, &n.CreatedAt, &n.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan odp_node: %w", err)
		}
		n.OpticalPowerDBM = -16.5 - float64(n.UsedPorts)*0.6
		nodes = append(nodes, n)
	}

	return nodes, nil
}

func (r *Repository) CreateODPNode(ctx context.Context, req CreateODPRequest) (*ODPNode, error) {
	if req.Code == "" {
		return nil, fmt.Errorf("kode ODP wajib diisi")
	}
	if req.TotalPorts <= 0 {
		req.TotalPorts = 8
	}
	if req.SplitterSpec == "" {
		req.SplitterSpec = "1:8 PLC"
	}
	if req.ClusterArea == "" {
		req.ClusterArea = "Cluster Utama"
	}

	id := "odp_" + uuid.New().String()[:8]
	now := time.Now()

	const q = `
		INSERT INTO odp_nodes (
			id, code, name, latitude, longitude, total_ports, used_ports,
			status, cluster_area, provider_id, provider_name, is_cluster_active,
			splitter_spec, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, 0, 'AVAILABLE', $7, 'ISPSYNC-CORE', 'PT Inovasi Sistem Pintar', TRUE, $8, $9, $9
		)
		RETURNING id, code, name, latitude, longitude, total_ports, used_ports,
		          status, cluster_area, provider_id, provider_name, is_cluster_active,
		          splitter_spec, created_at, updated_at
	`
	var n ODPNode
	err := r.db.QueryRow(ctx, q,
		id, req.Code, req.Name, req.Latitude, req.Longitude,
		req.TotalPorts, req.ClusterArea, req.SplitterSpec, now,
	).Scan(
		&n.ID, &n.Code, &n.Name, &n.Latitude, &n.Longitude,
		&n.TotalPorts, &n.UsedPorts, &n.Status, &n.ClusterArea,
		&n.ProviderID, &n.ProviderName, &n.IsClusterActive,
		&n.SplitterSpec, &n.CreatedAt, &n.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("create odp_node: %w", err)
	}

	n.OpticalPowerDBM = -17.2
	return &n, nil
}

func (r *Repository) DeleteODPNode(ctx context.Context, id string) error {
	const q = `DELETE FROM odp_nodes WHERE id = $1 OR code = $1`
	_, err := r.db.Exec(ctx, q, id)
	return err
}

func (r *Repository) ListFiberRoutes(ctx context.Context) ([]FiberRoute, error) {
	tenantSlug, _ := ctx.Value(tenantCtxKey{}).(string)
	if tenantSlug == "" {
		tenantSlug = "dev"
	}

	// 1. Check custom FiberGrid integration settings in app_settings
	settingsKey := "fibergrid_integration"
	if tenantSlug != "" && tenantSlug != "dev" {
		var exists bool
		_ = r.db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM app_settings WHERE key = $1)", "fibergrid_integration_"+tenantSlug).Scan(&exists)
		if exists {
			settingsKey = "fibergrid_integration_" + tenantSlug
		}
	}

	var valBytes []byte
	err := r.db.QueryRow(ctx, "SELECT value FROM app_settings WHERE key = $1", settingsKey).Scan(&valBytes)
	if err == nil {
		var cfg struct {
			Enabled        bool   `json:"enabled"`
			APIURL         string `json:"api_url"`
			APIKey         string `json:"api_key"`
			TenantCode     string `json:"tenant_code"`
			AutoSyncRoutes bool   `json:"auto_sync_routes"`
		}
		if jsonErr := json.Unmarshal(valBytes, &cfg); jsonErr == nil && cfg.Enabled && cfg.APIURL != "" {
			reqURL := strings.TrimRight(cfg.APIURL, "/") + "/api/v1/fttx/routes"
			req, reqErr := http.NewRequestWithContext(ctx, "GET", reqURL, nil)
			if reqErr == nil {
				if cfg.APIKey != "" {
					req.Header.Set("X-Admin-Key", cfg.APIKey)
					req.Header.Set("Authorization", "Bearer "+cfg.APIKey)
				}
				targetTenant := strings.TrimSpace(cfg.TenantCode)
				if targetTenant == "" {
					targetTenant = tenantSlug
				}
				if targetTenant != "" {
					req.Header.Set("X-Tenant-Slug", targetTenant)
				}
				client := &http.Client{Timeout: 3 * time.Second}
				resp, doErr := client.Do(req)
				if doErr == nil && resp.StatusCode == http.StatusOK {
					defer resp.Body.Close()
					var fttxResp struct {
						Success bool `json:"success"`
						Data    []struct {
							ID          string `json:"id"`
							Code        string `json:"code"`
							CableType   string `json:"cable_type"`
							LengthMeters int   `json:"length_meters"`
							CoreCount   int    `json:"core_count"`
							Status      string `json:"status"`
							Coordinates string `json:"coordinates"` // JSON string "[[-0.17, 100.65], ...]"
							Notes       string `json:"notes"`
						} `json:"data"`
					}
					if decodeErr := json.NewDecoder(resp.Body).Decode(&fttxResp); decodeErr == nil && fttxResp.Success {
						routes := make([]FiberRoute, 0, len(fttxResp.Data))
						for _, item := range fttxResp.Data {
							var coords [][]float64
							_ = json.Unmarshal([]byte(item.Coordinates), &coords)
							if len(coords) < 2 {
								continue
							}

							color := "#10b981" // emerald green (distribution)
							cableType := "DISTRIBUTION"
							upType := strings.ToUpper(item.CableType)
							if strings.Contains(upType, "24C") || strings.Contains(upType, "48C") || strings.Contains(upType, "FEEDER") {
								color = "#06b6d4" // cyan (feeder)
								cableType = "FEEDER"
							}
							if strings.Contains(strings.ToUpper(item.Code), "OLT") {
								color = "#3b82f6" // blue (backbone)
								cableType = "BACKBONE"
							}

							routes = append(routes, FiberRoute{
								ID:          item.ID,
								RouteCode:   item.Code,
								RouteName:   item.Code,
								CableType:   cableType,
								CoreCount:   item.CoreCount,
								ClusterArea: "FiberGrid",
								Status:      item.Status,
								ColorHex:    color,
								Coordinates: coords,
								CreatedAt:   time.Now(),
							})
						}
						return routes, nil
					}
				}
			}
		}
	}

	// 2. Fallback: if not integrated, return empty (clean state)
	return []FiberRoute{}, nil
}

func (r *Repository) GetFTTXStats(ctx context.Context) (*FTTXStats, error) {
	nexusNodes, ok := r.fetchFromNexus(ctx)
	if ok {
		var totalPorts, usedPorts int
		for _, n := range nexusNodes {
			totalPorts += n.TotalPorts
			usedPorts += n.UsedPorts
		}
		avail := totalPorts - usedPorts
		if avail < 0 {
			avail = 0
		}
		rate := 0.0
		if totalPorts > 0 {
			rate = float64(usedPorts) / float64(totalPorts) * 100.0
		}
		return &FTTXStats{
			TotalODP:        len(nexusNodes),
			TotalPorts:      totalPorts,
			UsedPorts:       usedPorts,
			AvailablePorts:  avail,
			UtilizationRate: rate,
			TotalRoutes:     0,
			TotalCableKm:    0.0,
		}, nil
	}

	const q = `
		SELECT COUNT(*),
		       COALESCE(SUM(total_ports), 0),
		       COALESCE(SUM(used_ports), 0)
		FROM odp_nodes
	`
	var totalODP, totalPorts, usedPorts int
	err := r.db.QueryRow(ctx, q).Scan(&totalODP, &totalPorts, &usedPorts)
	if err != nil {
		return nil, err
	}

	avail := totalPorts - usedPorts
	if avail < 0 {
		avail = 0
	}

	rate := 0.0
	if totalPorts > 0 {
		rate = float64(usedPorts) / float64(totalPorts) * 100.0
	}

	return &FTTXStats{
		TotalODP:        totalODP,
		TotalPorts:      totalPorts,
		UsedPorts:       usedPorts,
		AvailablePorts:  avail,
		UtilizationRate: rate,
		TotalRoutes:     0,
		TotalCableKm:    0.0,
	}, nil
}

func (r *Repository) SeedDefaultODPsIfEmpty(ctx context.Context) error {
	// Disabled: Tenants should only see real ODPs owned or shared via Jartaplok wholesale agreement.
	return nil
}

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

func (r *Repository) fetchFromNexus(ctx context.Context) []ODPNode {
	baseURL := os.Getenv("NEXUS_API_URL")
	if baseURL == "" {
		baseURL = "http://172.18.0.1:8081"
	}
	req, err := http.NewRequestWithContext(ctx, "GET", baseURL+"/api/v1/odps", nil)
	if err != nil {
		return nil
	}
	// Query current tenant ODPs and Jartaplok shared ODPs
	req.Header.Set("Host", "nexus.ispku.ispsync.id")

	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		return nil
	}
	defer resp.Body.Close()

	var rawItems []nexusODPItem
	if err := json.NewDecoder(resp.Body).Decode(&rawItems); err != nil {
		return nil
	}

	result := make([]ODPNode, 0, len(rawItems))
	for _, it := range rawItems {
		clusterArea := "Lokal"
		providerName := "Internal ISP"
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
	return result
}

func (r *Repository) ListODPNodes(ctx context.Context, cluster string) ([]ODPNode, error) {
	// 1. First attempt to fetch from EngineNexus (which aggregates own ODPs + Jartaplok partner ODPs)
	nexusNodes := r.fetchFromNexus(ctx)
	if len(nexusNodes) > 0 {
		if cluster != "" {
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

	// 2. Fallback to local PostgreSQL odp_nodes table
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
	// Sample backbone & distribution fiber lines in operational cluster
	routes := []FiberRoute{
		{
			ID:          "fb_bb_01",
			RouteCode:   "BB-HRU-01",
			RouteName:   "Backbone Feeder ODC Harau - Simpang 3",
			CableType:   "BACKBONE",
			CoreCount:   48,
			ClusterArea: "Cluster Harau",
			Status:      "ACTIVE",
			ColorHex:    "#3b82f6", // Royal Blue
			Coordinates: [][]float64{
				{-0.2298, 100.6300},
				{-0.2260, 100.6350},
				{-0.2220, 100.6400},
				{-0.2180, 100.6450},
			},
			CreatedAt: time.Now(),
		},
		{
			ID:          "fb_dist_01",
			RouteCode:   "DST-HRU-01",
			RouteName:   "Distribusi Simpang 3 - Perum Harau Asri",
			CableType:   "DISTRIBUTION",
			CoreCount:   24,
			ClusterArea: "Cluster Harau",
			Status:      "ACTIVE",
			ColorHex:    "#10b981", // Emerald Green
			Coordinates: [][]float64{
				{-0.2180, 100.6450},
				{-0.2150, 100.6480},
				{-0.2120, 100.6510},
			},
			CreatedAt: time.Now(),
		},
		{
			ID:          "fb_feeder_02",
			RouteCode:   "FDR-SRL-01",
			RouteName:   "Feeder Jalur Sarilamak Kantor Bupati",
			CableType:   "FEEDER",
			CoreCount:   24,
			ClusterArea: "Cluster Sarilamak",
			Status:      "ACTIVE",
			ColorHex:    "#06b6d4", // Cyan
			Coordinates: [][]float64{
				{-0.2298, 100.6300},
				{-0.2350, 100.6250},
				{-0.2400, 100.6200},
			},
			CreatedAt: time.Now(),
		},
	}
	return routes, nil
}

func (r *Repository) GetFTTXStats(ctx context.Context) (*FTTXStats, error) {
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
		TotalRoutes:     3,
		TotalCableKm:    18.4,
	}, nil
}

func (r *Repository) SeedDefaultODPsIfEmpty(ctx context.Context) error {
	var count int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM odp_nodes`).Scan(&count)
	if err != nil || count > 0 {
		return err
	}

	defaultODPs := []ODPNode{
		{
			ID: "odp_hru_01", Code: "ODP-HRU-01", Name: "Tiang ODC Simpang Tiga Harau",
			Latitude: -0.2180, Longitude: 100.6450, TotalPorts: 8, UsedPorts: 6,
			Status: "AVAILABLE", ClusterArea: "Cluster Harau", SplitterSpec: "1:8 PLC",
		},
		{
			ID: "odp_hru_02", Code: "ODP-HRU-02", Name: "Depan Masjid Raya Harau",
			Latitude: -0.2150, Longitude: 100.6480, TotalPorts: 8, UsedPorts: 8,
			Status: "FULL", ClusterArea: "Cluster Harau", SplitterSpec: "1:8 PLC",
		},
		{
			ID: "odp_hru_03", Code: "ODP-HRU-03", Name: "Gerbang Wisata Lembah Harau",
			Latitude: -0.2120, Longitude: 100.6510, TotalPorts: 16, UsedPorts: 9,
			Status: "AVAILABLE", ClusterArea: "Cluster Harau", SplitterSpec: "1:16 PLC",
		},
		{
			ID: "odp_srl_01", Code: "ODP-SRL-01", Name: "Simpang Sarilamak Kompleks Pemda",
			Latitude: -0.2350, Longitude: 100.6250, TotalPorts: 16, UsedPorts: 11,
			Status: "AVAILABLE", ClusterArea: "Cluster Sarilamak", SplitterSpec: "1:16 PLC",
		},
		{
			ID: "odp_srl_02", Code: "ODP-SRL-02", Name: "Jl. Raya Negara Tanjung Pati",
			Latitude: -0.2400, Longitude: 100.6200, TotalPorts: 8, UsedPorts: 5,
			Status: "AVAILABLE", ClusterArea: "Cluster Sarilamak", SplitterSpec: "1:8 PLC",
		},
		{
			ID: "odp_pyk_01", Code: "ODP-PYK-01", Name: "Koto Nan Ampek Payakumbuh",
			Latitude: -0.2298, Longitude: 100.6300, TotalPorts: 16, UsedPorts: 14,
			Status: "AVAILABLE", ClusterArea: "Cluster Payakumbuh", SplitterSpec: "1:16 PLC",
		},
	}

	for _, o := range defaultODPs {
		_, _ = r.db.Exec(ctx, `
			INSERT INTO odp_nodes (
				id, code, name, latitude, longitude, total_ports, used_ports,
				status, cluster_area, provider_id, provider_name, is_cluster_active,
				splitter_spec, created_at, updated_at
			) VALUES (
				$1, $2, $3, $4, $5, $6, $7, $8, $9, 'ISPSYNC-CORE', 'PT Inovasi Sistem Pintar', TRUE, $10, NOW(), NOW()
			) ON CONFLICT (code) DO NOTHING
		`, o.ID, o.Code, o.Name, o.Latitude, o.Longitude, o.TotalPorts, o.UsedPorts, o.Status, o.ClusterArea, o.SplitterSpec)
	}

	return nil
}

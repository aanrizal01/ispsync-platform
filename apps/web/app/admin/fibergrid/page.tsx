"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  MapPin,
  Layers,
  Search,
  Filter,
  Navigation,
  Eye,
  RefreshCw,
  Network,
  Activity,
  CheckCircle2,
} from "lucide-react";
import {
  networkApi,
  ODPNode,
  FiberRoute,
  FTTXStats,
} from "@/lib/api/network";
import { settingsApi } from "@/lib/api/settings";

export default function AdminFibergridPage() {
  const [tenantSlug, setTenantSlug] = useState("dev");
  const [baseDomain, setBaseDomain] = useState("dev.ispsync.id");

  // FTTX & GIS Data
  const [odpNodes, setOdpNodes] = useState<ODPNode[]>([]);
  const [fiberRoutes, setFiberRoutes] = useState<FiberRoute[]>([]);
  const [fttxStats, setFttxStats] = useState<FTTXStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [clusterFilter, setClusterFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchOdp, setSearchOdp] = useState<string>("");

  // Google Maps refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: { marker: any; infoWindow: any } }>({});
  const polylinesRef = useRef<any[]>([]);
  const activeInfoWindowRef = useRef<any>(null);

  // 1. Dynamic Host & Domain Resolution
  useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      const parts = host.split(".");
      let slug = "dev";
      if (parts.length >= 4) {
        slug = parts[1];
      } else if (parts.length === 3 && parts[1] === "ispsync") {
        slug = parts[0];
      }
      setTenantSlug(slug);

      let d = host.replace(/^(ledger|billing|nexus|portal|fibergrid|fttx|wifi|hotspot)\./, "");
      if (d.includes("localhost") || /^[0-9.]+$/.test(d)) {
        d = "dev.ispsync.id";
      }
      setBaseDomain(d);
    }
  }, []);

  // 2. Fetch ODP, Routes & Stats (Connected to EngineNexus)
  const fetchFTTXData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [odpRes, routesRes, statsRes] = await Promise.all([
        networkApi.listODPs(),
        networkApi.listFiberRoutes(),
        networkApi.getFTTXStats(),
      ]);
      setOdpNodes(odpRes.data || []);
      setFiberRoutes(routesRes.data || []);
      setFttxStats(statsRes || null);
    } catch (err: any) {
      console.error("Gagal memuat data FTTX dari EngineNexus:", err);
      setError(err.message || "Gagal memuat data spasial ODP");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFTTXData();
  }, []);

  // 3. Initialize Interactive Google Maps GIS Map
  useEffect(() => {
    let isMounted = true;

    const initGoogleMap = () => {
      const google = (window as any).google;
      if (!google || !google.maps || !mapContainerRef.current) return;

      // Clean up previous markers and polylines
      Object.values(markersRef.current).forEach(({ marker }) => {
        if (marker && marker.setMap) marker.setMap(null);
      });
      markersRef.current = {};

      polylinesRef.current.forEach((poly) => {
        if (poly && poly.setMap) poly.setMap(null);
      });
      polylinesRef.current = [];

      if (activeInfoWindowRef.current) {
        activeInfoWindowRef.current.close();
        activeInfoWindowRef.current = null;
      }

      // Initialize map instance if not already created
      let map = mapInstanceRef.current;
      if (!map) {
        map = new google.maps.Map(mapContainerRef.current, {
          center: { lat: -0.2185, lng: 100.655 },
          zoom: 14,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          mapTypeControl: true,
          mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: google.maps.ControlPosition.TOP_RIGHT,
          },
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
        });
        mapInstanceRef.current = map;
      }

      // Render Fiber Cable Routes (Polylines)
      fiberRoutes.forEach((route) => {
        if (!route.coordinates || route.coordinates.length < 2) return;

        let strokeColor = route.color || "#0284c7";
        let strokeWeight = 3.5;

        if (route.cable_type === "BACKBONE") {
          strokeColor = "#d97706";
          strokeWeight = 5;
        } else if (route.cable_type === "FEEDER") {
          strokeColor = "#0284c7";
          strokeWeight = 3.5;
        } else {
          strokeColor = "#059669";
          strokeWeight = 2.5;
        }

        if (route.status === "CUT") {
          strokeColor = "#dc2626";
        } else if (route.status === "DEGRADED") {
          strokeColor = "#ea580c";
        }

        const path = route.coordinates.map((c: [number, number]) => ({
          lat: c[0],
          lng: c[1],
        }));

        const polyline = new google.maps.Polyline({
          path,
          strokeColor,
          strokeOpacity: 0.85,
          strokeWeight,
          map,
        });
        polylinesRef.current.push(polyline);

        const routeInfoWindow = new google.maps.InfoWindow({
          content: `
            <div style="font-family: inherit; font-size: 12px; min-width: 200px; padding: 4px; color: #1e293b;">
              <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px; font-size: 13px;">${route.name}</div>
              <div style="display: flex; gap: 4px; margin-bottom: 6px;">
                <span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #f1f5f9; color: #334155;">${route.cable_type}</span>
                <span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #e0f2fe; color: #0369a1;">${route.core_count} Core</span>
                <span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: ${route.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2'}; color: ${route.status === 'ACTIVE' ? '#15803d' : '#b91c1c'};">${route.status}</span>
              </div>
              <div style="font-size: 11px; color: #64748b;">Panjang Jalur: <strong style="color: #0f172a;">${(route.length_meters / 1000).toFixed(2)} km (${route.length_meters} m)</strong></div>
            </div>
          `,
        });

        polyline.addListener("click", (e: any) => {
          if (activeInfoWindowRef.current) activeInfoWindowRef.current.close();
          routeInfoWindow.setPosition(e.latLng);
          routeInfoWindow.open(map);
          activeInfoWindowRef.current = routeInfoWindow;
        });
      });

      // Filter ODP nodes based on UI filters
      const filtered = odpNodes.filter((odp) => {
        if (clusterFilter !== "ALL" && odp.cluster !== clusterFilter) return false;
        if (statusFilter !== "ALL" && odp.status !== statusFilter) return false;
        if (searchOdp.trim() !== "") {
          const q = searchOdp.toLowerCase();
          const matchCode = odp.code.toLowerCase().includes(q);
          const matchName = odp.name.toLowerCase().includes(q);
          const matchAddr = odp.address.toLowerCase().includes(q);
          if (!matchCode && !matchName && !matchAddr) return false;
        }
        return true;
      });

      const bounds = new google.maps.LatLngBounds();

      filtered.forEach((odp) => {
        const pct = odp.total_ports > 0 ? (odp.used_ports / odp.total_ports) * 100 : 0;
        let pinBg = "#10b981";
        let statusBadgeBg = "#dcfce7";
        let statusBadgeText = "#15803d";

        if (odp.status === "MAINTENANCE") {
          pinBg = "#f97316";
          statusBadgeBg = "#ffedd5";
          statusBadgeText = "#c2410c";
        } else if (odp.status === "FULL" || odp.used_ports >= odp.total_ports) {
          pinBg = "#ef4444";
          statusBadgeBg = "#fee2e2";
          statusBadgeText = "#b91c1c";
        } else if (pct >= 80) {
          pinBg = "#f59e0b";
          statusBadgeBg = "#fef3c7";
          statusBadgeText = "#b45309";
        }

        const pinSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 34 42">
            <defs>
              <filter id="sh" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.35"/>
              </filter>
            </defs>
            <path d="M17 0 C7.6 0 0 7.6 0 17 C0 29.5 17 42 17 42 C17 42 34 29.5 34 17 C34 7.6 26.4 0 17 0 Z" fill="${pinBg}" stroke="#ffffff" stroke-width="2" filter="url(#sh)"/>
            <circle cx="17" cy="17" r="12" fill="#ffffff" opacity="0.25"/>
          </svg>
        `;

        const marker = new google.maps.Marker({
          position: { lat: odp.latitude, lng: odp.longitude },
          map,
          title: `${odp.code} - ${odp.name}`,
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(pinSvg)}`,
            scaledSize: new google.maps.Size(34, 42),
            anchor: new google.maps.Point(17, 42),
            labelOrigin: new google.maps.Point(17, 16),
          },
          label: {
            text: `${odp.used_ports}/${odp.total_ports}`,
            color: "#ffffff",
            fontSize: "9px",
            fontWeight: "700",
          },
        });

        const popupContent = `
          <div style="font-family: inherit; font-size: 12px; min-width: 240px; padding: 4px; color: #1e293b;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:6px; margin-bottom:8px;">
              <span style="font-weight:700; color:#0f172a; font-size:13px;">${odp.code}</span>
              <span style="font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; background:${statusBadgeBg}; color:${statusBadgeText};">${odp.status}</span>
            </div>
            <div style="color:#0f172a; font-weight:600; margin-bottom:4px;">${odp.name}</div>
            <div style="color:#64748b; font-size:11px; margin-bottom:6px;">Cluster: <strong style="color:#0f172a;">${odp.cluster}</strong> | Splitter: <strong style="color:#0f172a;">${odp.splitter_spec}</strong></div>
            
            <div style="background:#f8fafc; border: 1px solid #e2e8f0; padding:6px 8px; border-radius:6px; margin-bottom:8px;">
              <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px;">
                <span>Port Terpakai:</span>
                <strong>${odp.used_ports} / ${odp.total_ports} (${Math.round(pct)}%)</strong>
              </div>
              <div style="background:#e2e8f0; height:6px; border-radius:3px; overflow:hidden;">
                <div style="background:${pinBg}; width:${Math.min(100, Math.round(pct))}%; height:100%;"></div>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:10px; color:#64748b; margin-top:5px;">
                <span>Port Bebas: <strong style="color:#0f172a;">${odp.available_ports}</strong></span>
                <span>Redaman Optik: <strong style="color:#0f172a;">${odp.optical_power_dbm !== undefined ? odp.optical_power_dbm + ' dBm' : '-'}</strong></span>
              </div>
            </div>

            <div style="color:#64748b; font-size:11px; line-height: 1.4; margin-bottom: 6px;">
              Lokasi: <span style="color:#334155;">${odp.address || '-'}</span>
            </div>
            <div style="font-size:10px; color:#94a3b8; font-family: monospace;">
              Lat: ${odp.latitude.toFixed(6)}, Lng: ${odp.longitude.toFixed(6)}
            </div>
          </div>
        `;

        const infoWindow = new google.maps.InfoWindow({
          content: popupContent,
        });

        marker.addListener("click", () => {
          if (activeInfoWindowRef.current) activeInfoWindowRef.current.close();
          infoWindow.open(map, marker);
          activeInfoWindowRef.current = infoWindow;
        });

        markersRef.current[odp.id] = { marker, infoWindow };
        bounds.extend({ lat: odp.latitude, lng: odp.longitude });
      });

      if (filtered.length > 0) {
        map.fitBounds(bounds);
        const listener = google.maps.event.addListener(map, "idle", () => {
          if (map.getZoom() > 16) {
            map.setZoom(16);
          }
          google.maps.event.removeListener(listener);
        });
      }
    };

    const loadScriptWithKey = (key: string) => {
      if (!isMounted) return;
      if ((window as any).google && (window as any).google.maps) {
        initGoogleMap();
        return;
      }
      const scriptId = "google-maps-js";
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places,geometry`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          if (isMounted) initGoogleMap();
        };
        document.head.appendChild(script);
      } else {
        script.addEventListener("load", () => {
          if (isMounted) initGoogleMap();
        });
        if ((window as any).google && (window as any).google.maps) {
          initGoogleMap();
        }
      }
    };

    if ((window as any).google && (window as any).google.maps) {
      initGoogleMap();
    } else {
      settingsApi
        .getMapsSettings()
        .then((res) => {
          const key = res?.google_maps_api_key || "AIzaSyBJQS0oth3gW6P0aKsZGG5FiDbVhmZI6yA";
          loadScriptWithKey(key);
        })
        .catch(() => {
          loadScriptWithKey("AIzaSyBJQS0oth3gW6P0aKsZGG5FiDbVhmZI6yA");
        });
    }

    return () => {
      isMounted = false;
    };
  }, [odpNodes, fiberRoutes, clusterFilter, statusFilter, searchOdp]);

  const focusOnODP = (odp: ODPNode) => {
    const item = markersRef.current[odp.id];
    if (item && mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat: odp.latitude, lng: odp.longitude });
      mapInstanceRef.current.setZoom(17);
      if (activeInfoWindowRef.current) {
        activeInfoWindowRef.current.close();
      }
      item.infoWindow.open(mapInstanceRef.current, item.marker);
      activeInfoWindowRef.current = item.infoWindow;
    }
  };

  const clusters = Array.from(new Set(odpNodes.map((o) => o.cluster).filter(Boolean)));

  const filteredODPs = odpNodes.filter((odp) => {
    if (clusterFilter !== "ALL" && odp.cluster !== clusterFilter) return false;
    if (statusFilter !== "ALL" && odp.status !== statusFilter) return false;
    if (searchOdp.trim() !== "") {
      const q = searchOdp.toLowerCase();
      const matchCode = odp.code.toLowerCase().includes(q);
      const matchName = odp.name.toLowerCase().includes(q);
      const matchAddr = odp.address.toLowerCase().includes(q);
      if (!matchCode && !matchName && !matchAddr) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
              FIBERGRID &amp; NEXUS GIS
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Single-Source GIS Database
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Network className="w-6 h-6 text-blue-600" />
            Fibergrid &amp; Nexus GIS — Topologi &amp; Sebaran ODP
          </h1>
          <p className="text-sm text-slate-500">
            Monitoring sebaran titik ODP, ketersediaan port, dan uji kelayakan jangkauan pelanggan (Coverage Feasibility) berbasis data spasial dari EngineNexus &amp; Wholesale Jartaplok.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchFTTXData}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
            title="Segarkan data ODP"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Total Titik ODP</div>
            <div className="text-xl font-bold text-slate-900">{fttxStats?.total_odp || odpNodes.length} Node</div>
            <div className="text-[11px] text-emerald-600 font-medium">Tersebar di {clusters.length || 1} Cluster</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Port Distribusi Terpakai</div>
            <div className="text-xl font-bold text-slate-900">
              {fttxStats?.used_ports || 0} / {fttxStats?.total_ports || 0}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Sisa bebas: {(fttxStats?.total_ports || 0) - (fttxStats?.used_ports || 0)} Port
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Rata-rata Utilisasi Port</div>
            <div className="text-xl font-bold text-slate-900">
              {fttxStats && fttxStats.total_ports > 0
                ? ((fttxStats.used_ports / fttxStats.total_ports) * 100).toFixed(1)
                : "0"}%
            </div>
            <div className="text-[11px] text-blue-600 font-medium">Kapasitas Splitter 1:8 / 1:16</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Total Jalur Fiber Optik</div>
            <div className="text-xl font-bold text-slate-900">
              {fttxStats?.total_fiber_km ? fttxStats.total_fiber_km.toFixed(1) : "0"} km
            </div>
            <div className="text-[11px] text-amber-700 font-medium">{fiberRoutes.length} Rute Terpasang</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex-1 w-full md:w-auto relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari kode ODP (ODP-HR-01), nama titik, atau alamat jalan..."
            value={searchOdp}
            onChange={(e) => setSearchOdp(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Cluster:</span>
          </div>
          <select
            value={clusterFilter}
            onChange={(e) => setClusterFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Semua Cluster</option>
            {clusters.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 text-xs text-slate-500 ml-2">
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">ACTIVE (Normal)</option>
            <option value="FULL">FULL (Penuh)</option>
            <option value="MAINTENANCE">MAINTENANCE</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setClusterFilter("ALL");
              setStatusFilter("ALL");
              setSearchOdp("");
            }}
            className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Interactive GIS Map */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800">
              Peta Topologi Geospasial Fiber Optik &amp; Titik ODP
            </h2>
          </div>
          <span className="text-[11px] text-slate-500">
            Klik ikon ODP untuk melihat info teknis port &amp; redaman sinyal. Klik peta untuk salin koordinat.
          </span>
        </div>

        <div className="relative">
          <div
            ref={mapContainerRef}
            className="w-full h-[540px] bg-slate-100 z-0"
            style={{ minHeight: "540px" }}
          />

          {/* Map Legend Overlay */}
          <div className="absolute bottom-4 right-4 z-[400] bg-white/95 backdrop-blur-sm p-3.5 rounded-xl border border-slate-200 shadow-md text-xs space-y-2 max-w-xs pointer-events-auto">
            <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider pb-1 border-b border-slate-100">
              Legenda Topologi FTTX
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="text-slate-600">ODP Normal (&lt;80%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0"></span>
                <span className="text-slate-600">ODP Padat (&ge;80%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0"></span>
                <span className="text-slate-600">ODP Penuh (100%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500 shrink-0"></span>
                <span className="text-slate-600">Maintenance</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-1 bg-amber-600 rounded shrink-0"></span>
                <span className="text-slate-600">FO Backbone</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-1 bg-sky-600 rounded shrink-0"></span>
                <span className="text-slate-600">FO Feeder</span>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <span className="w-4 h-1 bg-emerald-600 rounded shrink-0"></span>
                <span className="text-slate-600">FO Distribusi Pelanggan</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ODP Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              Daftar Titik Distribusi ODP (Optical Distribution Point)
            </h2>
            <p className="text-xs text-slate-500">
              {filteredODPs.length} titik ODP aktif tercatat dalam sistem spasial EngineNexus &amp; FiberGrid
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Single Source of Truth: EngineNexus
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3">Kode ODP</th>
                <th className="px-6 py-3">Nama &amp; Cluster</th>
                <th className="px-6 py-3">Kapasitas &amp; Utilisasi Port</th>
                <th className="px-6 py-3">Splitter</th>
                <th className="px-6 py-3">Redaman Optik</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Lokasi Fisik</th>
                <th className="px-6 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                    Memuat data ODP dan jalur FTTX dari EngineNexus...
                  </td>
                </tr>
              ) : filteredODPs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                    Tidak ada titik ODP yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredODPs.map((odp) => {
                  const pct = odp.total_ports > 0 ? (odp.used_ports / odp.total_ports) * 100 : 0;
                  let barColor = "bg-emerald-500";
                  if (pct >= 100 || odp.status === "FULL") barColor = "bg-rose-500";
                  else if (pct >= 80) barColor = "bg-amber-500";

                  return (
                    <tr key={odp.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-800 border border-slate-200">
                          {odp.code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{odp.name}</div>
                        <div className="text-xs text-slate-500">Cluster {odp.cluster}</div>
                      </td>
                      <td className="px-6 py-4 min-w-[160px]">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-slate-800">
                            {odp.used_ports} / {odp.total_ports} Port
                          </span>
                          <span className="text-slate-500 font-medium">{Math.round(pct)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${barColor}`}
                            style={{ width: `${Math.min(100, Math.round(pct))}%` }}
                          />
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Tersedia: <strong className="text-slate-700">{odp.available_ports} port</strong>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-700">
                        {odp.splitter_spec}
                      </td>
                      <td className="px-6 py-4">
                        {odp.optical_power_dbm !== undefined ? (
                          <span
                            className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                              odp.optical_power_dbm >= -24
                                ? "bg-emerald-50 text-emerald-700"
                                : odp.optical_power_dbm >= -27
                                ? "bg-amber-50 text-amber-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {odp.optical_power_dbm.toFixed(1)} dBm
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            odp.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : odp.status === "FULL"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {odp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-[200px] truncate text-xs text-slate-500" title={odp.address}>
                        {odp.address || "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => focusOnODP(odp)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                            title="Arahkan kamera GIS ke titik ODP ini"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Fokus Peta</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

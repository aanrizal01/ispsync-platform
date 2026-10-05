"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Server,
  Plus,
  Activity,
  Cpu,
  HardDrive,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Shield,
  Clock,
  Wifi,
  Radio,
  Signal,
  Power,
  MapPin,
  Layers,
  Search,
  Filter,
  Navigation,
  Eye,
  Info,
  ExternalLink,
  Network,
} from "lucide-react";
import {
  networkApi,
  NetworkDevice,
  CreateDeviceInput,
  TestConnectionResponse,
  ODPNode,
  FiberRoute,
  FTTXStats,
  CreateODPInput,
} from "@/lib/api/network";
import { acsApi, CustomerONT } from "@/lib/api/acs";

export default function AdminNetworkPage() {
  const [networkTab, setNetworkTab] = useState<"routers" | "onts" | "fttx_map">("routers");
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [onts, setOnts] = useState<CustomerONT[]>([]);
  const [odpNodes, setOdpNodes] = useState<ODPNode[]>([]);
  const [fiberRoutes, setFiberRoutes] = useState<FiberRoute[]>([]);
  const [fttxStats, setFttxStats] = useState<FTTXStats | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingOnts, setLoadingOnts] = useState(false);
  const [loadingFTTX, setLoadingFTTX] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ODP Filters & Search
  const [clusterFilter, setClusterFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchOdp, setSearchOdp] = useState<string>("");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddODPModal, setShowAddODPModal] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResponse | null>(null);
  const [testingDeviceId, setTestingDeviceId] = useState<string | null>(null);

  // Leaflet map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});

  // Edit WiFi Modal for ONT
  const [selectedOnt, setSelectedOnt] = useState<CustomerONT | null>(null);
  const [showEditWifiModal, setShowEditWifiModal] = useState(false);
  const [editWifiForm, setEditWifiForm] = useState({ ssid: "", password: "" });
  const [savingWifi, setSavingWifi] = useState(false);

  // Router Form State
  const [form, setForm] = useState<CreateDeviceInput>({
    name: "",
    vendor: "MIKROTIK",
    model: "CCR2004-1G-12S+2XS",
    ip_address: "",
    api_port: 8728,
    auth_type: "BASIC",
    username: "admin",
    password: "",
    use_tls: false,
  });
  const [submitting, setSubmitting] = useState(false);

  // ODP Form State
  const [odpForm, setOdpForm] = useState<CreateODPInput>({
    name: "",
    code: "",
    cluster: "Harau",
    latitude: -0.2185,
    longitude: 100.655,
    total_ports: 8,
    used_ports: 0,
    status: "ACTIVE",
    splitter_spec: "1:8 PLC",
    optical_power_dbm: -19.5,
    address: "",
    notes: "",
  });
  const [submittingODP, setSubmittingODP] = useState(false);

  const fetchDevices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await networkApi.list();
      setDevices(res.data || []);
    } catch (err: any) {
      setError(err.message || "Gagal memuat daftar perangkat");
    } finally {
      setLoading(false);
    }
  };

  const fetchONTs = async () => {
    setLoadingOnts(true);
    try {
      const res = await acsApi.list();
      setOnts(res || []);
    } catch (err: any) {
      console.error("Gagal memuat daftar ONT:", err);
    } finally {
      setLoadingOnts(false);
    }
  };

  const fetchFTTXData = async () => {
    setLoadingFTTX(true);
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
      console.error("Gagal memuat data FTTX:", err);
    } finally {
      setLoadingFTTX(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    fetchONTs();
    fetchFTTXData();
  }, []);

  const handleRebootOnt = async (id: string) => {
    if (!confirm("Kirim perintah restart ke modem ONT pelanggan via TR-069?")) return;
    try {
      await acsApi.reboot(id);
      alert("Perintah reboot berhasil dikirim via TR-069!");
      fetchONTs();
    } catch (err: any) {
      alert(err.message || "Gagal mengirim perintah reboot");
    }
  };

  const handleSaveOntWifi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOnt) return;
    setSavingWifi(true);
    try {
      await acsApi.updateWiFi(selectedOnt.id, editWifiForm);
      alert("Konfigurasi WiFi berhasil dikirim ke ONT via TR-069 SetParameterValues!");
      setShowEditWifiModal(false);
      fetchONTs();
    } catch (err: any) {
      alert(err.message || "Gagal memperbarui WiFi ONT");
    } finally {
      setSavingWifi(false);
    }
  };

  const handleVendorChange = (vendor: "MIKROTIK" | "JUNIPER" | "GENERIC") => {
    if (vendor === "JUNIPER") {
      setForm({
        ...form,
        vendor,
        model: "MX204-BNG",
        api_port: 3443,
        username: "admin",
        use_tls: true,
      });
    } else if (vendor === "MIKROTIK") {
      setForm({
        ...form,
        vendor,
        model: "CCR2004-1G-12S+2XS",
        api_port: 8728,
        username: "admin",
        use_tls: false,
      });
    } else {
      setForm({
        ...form,
        vendor,
        model: "Generic-Gateway",
        api_port: 443,
        use_tls: true,
      });
    }
  };

  const handleCreateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await networkApi.create(form);
      setShowAddModal(false);
      setForm({
        name: "",
        vendor: "MIKROTIK",
        model: "CCR2004-1G-12S+2XS",
        ip_address: "",
        api_port: 8728,
        auth_type: "BASIC",
        username: "admin",
        password: "",
        use_tls: false,
      });
      fetchDevices();
    } catch (err: any) {
      alert(err.message || "Gagal menambahkan router");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestConnection = async (id: string) => {
    setTestingDeviceId(id);
    setTestResult(null);
    try {
      const res = await networkApi.testConnection(id);
      setTestResult(res);
      fetchDevices();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Uji koneksi gagal",
        latency_ms: 0,
      });
    } finally {
      setTestingDeviceId(null);
    }
  };

  const handleDeleteDevice = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus router ini dari platform?")) return;
    try {
      await networkApi.delete(id);
      fetchDevices();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus router");
    }
  };

  // Dynamically load Leaflet and render map when tab is fttx_map
  useEffect(() => {
    if (networkTab !== "fttx_map") return;

    let isMounted = true;

    const initLeafletMap = () => {
      const L = (window as any).L;
      if (!L || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Default center around Harau / Payakumbuh (-0.2185, 100.655)
      const map = L.map(mapContainerRef.current).setView([-0.2185, 100.655], 13);
      mapInstanceRef.current = map;

      // Add OpenStreetMap tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Render Fiber Cable Routes (Polylines)
      fiberRoutes.forEach((route) => {
        if (!route.coordinates || route.coordinates.length < 2) return;

        let strokeColor = route.color || "#0284c7";
        let weight = 3.5;
        let dashArray = undefined;

        if (route.cable_type === "BACKBONE") {
          strokeColor = "#d97706";
          weight = 5;
        } else if (route.cable_type === "FEEDER") {
          strokeColor = "#0284c7";
          weight = 3.5;
        } else {
          strokeColor = "#059669";
          weight = 2.5;
        }

        if (route.status === "CUT") {
          strokeColor = "#dc2626";
          dashArray = "6, 6";
        } else if (route.status === "DEGRADED") {
          strokeColor = "#ea580c";
        }

        const polyline = L.polyline(route.coordinates, {
          color: strokeColor,
          weight: weight,
          opacity: 0.85,
          dashArray: dashArray,
        }).addTo(map);

        const routePopup = `
          <div style="font-family: inherit; font-size: 12px; min-width: 200px; padding: 2px;">
            <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px; font-size: 13px;">${route.name}</div>
            <div style="display: flex; gap: 4px; margin-bottom: 6px;">
              <span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #f1f5f9; color: #334155;">${route.cable_type}</span>
              <span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #e0f2fe; color: #0369a1;">${route.core_count} Core</span>
              <span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: ${route.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2'}; color: ${route.status === 'ACTIVE' ? '#15803d' : '#b91c1c'};">${route.status}</span>
            </div>
            <div style="font-size: 11px; color: #64748b;">Panjang Jalur: <strong style="color: #0f172a;">${(route.length_meters / 1000).toFixed(2)} km (${route.length_meters} m)</strong></div>
          </div>
        `;
        polyline.bindPopup(routePopup);
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

      markersRef.current = {};
      const markerGroup: any[] = [];

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

        const iconHtml = `
          <div style="
            background: ${pinBg};
            border: 2px solid #ffffff;
            box-shadow: 0 2px 6px rgba(0,0,0,0.35);
            border-radius: 9999px;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-weight: 800;
            font-size: 10px;
            cursor: pointer;
          " title="${odp.code} - ${odp.name}">
            ${odp.used_ports}/${odp.total_ports}
          </div>
        `;

        const customIcon = L.divIcon({
          className: "custom-odp-pin",
          html: iconHtml,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16],
        });

        const marker = L.marker([odp.latitude, odp.longitude], { icon: customIcon }).addTo(map);
        markersRef.current[odp.id] = marker;
        markerGroup.push([odp.latitude, odp.longitude]);

        const popupContent = `
          <div style="font-family: inherit; font-size: 12px; min-width: 230px; padding: 2px;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:6px; margin-bottom:8px;">
              <span style="font-weight:700; color:#0f172a; font-size:13px;">${odp.code}</span>
              <span style="font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; background:${statusBadgeBg}; color:${statusBadgeText};">${odp.status}</span>
            </div>
            <div style="color:#1e293b; font-weight:600; margin-bottom:4px;">${odp.name}</div>
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
        marker.bindPopup(popupContent);
      });

      if (markerGroup.length > 0) {
        map.fitBounds(markerGroup, { padding: [50, 50], maxZoom: 15 });
      }

      map.on("click", (e: any) => {
        setOdpForm((prev) => ({
          ...prev,
          latitude: Number(e.latlng.lat.toFixed(6)),
          longitude: Number(e.latlng.lng.toFixed(6)),
        }));
      });
    };

    if ((window as any).L) {
      initLeafletMap();
    } else {
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      if (!document.getElementById("leaflet-js")) {
        const script = document.createElement("script");
        script.id = "leaflet-js";
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = () => {
          if (isMounted) initLeafletMap();
        };
        document.head.appendChild(script);
      } else {
        const existing = document.getElementById("leaflet-js");
        existing?.addEventListener("load", () => {
          if (isMounted) initLeafletMap();
        });
      }
    }

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [networkTab, odpNodes, fiberRoutes, clusterFilter, statusFilter, searchOdp]);

  const focusOnODP = (odp: ODPNode) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([odp.latitude, odp.longitude], 17);
    const marker = markersRef.current[odp.id];
    if (marker) {
      marker.openPopup();
    }
  };

  const handleDeleteODP = async (id: string, code: string) => {
    if (!confirm(`Hapus titik ODP ${code}? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      await networkApi.deleteODP(id);
      fetchFTTXData();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus titik ODP");
    }
  };

  const handleCreateODP = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingODP(true);
    try {
      await networkApi.createODP(odpForm);
      setShowAddODPModal(false);
      setOdpForm({
        name: "",
        code: "",
        cluster: "Harau",
        latitude: -0.2185,
        longitude: 100.655,
        total_ports: 8,
        used_ports: 0,
        status: "ACTIVE",
        splitter_spec: "1:8 PLC",
        optical_power_dbm: -19.5,
        address: "",
        notes: "",
      });
      fetchFTTXData();
    } catch (err: any) {
      alert(err.message || "Gagal menambahkan titik ODP");
    } finally {
      setSubmittingODP(false);
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

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 MB";
    const mb = bytes / (1024 * 1024);
    if (mb > 1024) {
      return (mb / 1024).toFixed(1) + " GB";
    }
    return mb.toFixed(1) + " MB";
  };

  const onlineCount = devices.filter((d) => d.status === "ONLINE").length;
  const offlineCount = devices.filter((d) => d.status === "OFFLINE" || d.status === "ERROR").length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Server className="w-6 h-6 text-blue-600" />
            Perangkat Jaringan &amp; Router Core
          </h1>
          <p className="text-sm text-slate-500">
            Adapter vendor-neutral untuk MikroTik RouterOS v7 REST API, Juniper MX BNG, Simple Queues, dan modem ONT TR-069.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (networkTab === "fttx_map") fetchFTTXData();
              else if (networkTab === "routers") fetchDevices();
              else fetchONTs();
            }}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
            title="Segarkan data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {networkTab === "fttx_map" && (
            <button
              onClick={() => setShowAddODPModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Tambah Titik ODP
            </button>
          )}

          {networkTab === "routers" && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Tambah Router
            </button>
          )}

          {networkTab === "onts" && (
            <button
              onClick={fetchONTs}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2 shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Segarkan ONT
            </button>
          )}
        </div>
      </div>

      {/* Hub Banner: EngineFibergrid NOC & GIS */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950 p-4 rounded-xl border border-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Peta NexusGIS</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                FTTX &amp; NEXUS
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Topologi kabel FO end-to-end, OLT multi-vendor, ODC, rute tiang, dan agregasi data sebaran ODP mitra Jartaplok.
            </p>
          </div>
        </div>
        <Link
          href="/admin/nexusgis"
          className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-lg transition shrink-0 flex items-center gap-2 text-center justify-center"
        >
          <span>Buka NexusGIS</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Metrics Cards based on Active Tab */}
      {networkTab === "fttx_map" ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total ODP</p>
              <p className="text-xl font-bold text-slate-900">{fttxStats?.total_odp ?? odpNodes.length} Titik</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Kapasitas Port</p>
              <p className="text-xl font-bold text-slate-900">{fttxStats?.total_ports ?? 0} Port</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Port Terpakai</p>
              <p className="text-xl font-bold text-amber-600">
                {fttxStats?.used_ports ?? 0}{" "}
                <span className="text-xs font-semibold text-slate-400">
                  ({Math.round(((fttxStats?.used_ports ?? 0) / (fttxStats?.total_ports || 1)) * 100)}%)
                </span>
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Port Bebas</p>
              <p className="text-xl font-bold text-emerald-600">{fttxStats?.available_ports ?? 0} Port</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5 col-span-2 sm:col-span-1">
            <div className="w-11 h-11 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Jalur Kabel FO</p>
              <p className="text-xl font-bold text-cyan-600">{(fttxStats?.total_fiber_km ?? 0).toFixed(1)} km</p>
            </div>
          </div>
        </div>
      ) : networkTab === "routers" ? (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Router</p>
              <p className="text-2xl font-bold text-slate-900">{devices.length}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Router Online</p>
              <p className="text-2xl font-bold text-emerald-600">{onlineCount}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Offline / Masalah</p>
              <p className="text-2xl font-bold text-rose-600">{offlineCount}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Vendor &amp; Versi</p>
              <p className="text-lg font-bold text-slate-900 truncate">
                {devices.length === 0 ? "MikroTik" : Array.from(new Set(devices.map(d => d.model || d.vendor))).join(", ")}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Modem ONT</p>
              <p className="text-2xl font-bold text-slate-900">{onts.length}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">ONT Online (TR-069)</p>
              <p className="text-2xl font-bold text-emerald-600">
                {onts.filter((o) => o.connection_status === "ONLINE").length}
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">ONT Offline</p>
              <p className="text-2xl font-bold text-rose-600">
                {onts.filter((o) => o.connection_status !== "ONLINE").length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Switcher: Router Gateway vs Modem ONT vs Ringkasan ODP */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setNetworkTab("routers")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
            networkTab === "routers"
              ? "border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Router Utama &amp; BNG (MikroTik / Juniper)</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
            {devices.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setNetworkTab("onts")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
            networkTab === "onts"
              ? "border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Modem ONT Pelanggan (GenieACS TR-069)</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">
            {onts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setNetworkTab("fttx_map")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
            networkTab === "fttx_map"
              ? "border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Ringkasan Titik ODP</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">
            {odpNodes.length}
          </span>
        </button>
      </div>

      {/* Main Content: FTTX Map & ODP Table */}
      {networkTab === "fttx_map" && (
        <div className="space-y-6">
          {/* Filter Toolbar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari kode ODP / nama..."
                  value={searchOdp}
                  onChange={(e) => setSearchOdp(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={clusterFilter}
                  onChange={(e) => setClusterFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">Semua Cluster ({odpNodes.length})</option>
                  {clusters.map((c) => (
                    <option key={c} value={c}>
                      Cluster {c} ({odpNodes.filter((o) => o.cluster === c).length})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="ACTIVE">ACTIVE (Normal)</option>
                  <option value="FULL">FULL (Penuh)</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-3 text-xs text-slate-500">
              <span>Menampilkan <strong>{filteredODPs.length}</strong> dari <strong>{odpNodes.length}</strong> titik ODP</span>
              <button
                type="button"
                onClick={() => {
                  setClusterFilter("ALL");
                  setStatusFilter("ALL");
                  setSearchOdp("");
                }}
                className="text-blue-600 hover:underline font-semibold"
              >
                Reset Filter
              </button>
            </div>
          </div>

          {/* Interactive GIS Map */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-800">Peta Topologi Distribusi Jalur Fiber Optik & Titik ODP</h2>
              </div>
              <span className="text-[11px] text-slate-500">
                Klik ikon ODP untuk melihat info teknis port & redaman sinyal
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
                <h2 className="text-base font-semibold text-slate-800">Daftar Titik Distribusi ODP (Optical Distribution Point)</h2>
                <p className="text-xs text-slate-500">
                  {filteredODPs.length} titik ODP aktif tercatat dalam sistem spasial PostGIS
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddODPModal(true)}
                className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah ODP
              </button>
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
                  {loadingFTTX ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                        Memuat data ODP dan jalur FTTX...
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
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => focusOnODP(odp)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Fokus di Peta"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteODP(odp.id, odp.code)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Hapus Titik ODP"
                              >
                                <Trash2 className="w-4 h-4" />
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
      )}


      {/* Main Table Card (Routers) */}
      {networkTab === "routers" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">Daftar Router Gateway & Core</h2>
            <span className="text-xs text-slate-400">{devices.length} perangkat terdaftar</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">Nama Perangkat</th>
                  <th className="px-6 py-3">Vendor / Model</th>
                  <th className="px-6 py-3">Alamat IP & Port</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Terakhir Dilihat</th>
                  <th className="px-6 py-3 text-right">Aksi</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Memuat daftar router...
                  </td>
                </tr>
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Belum ada router yang ditambahkan. Silakan klik tombol "+ Tambah Router".
                  </td>
                </tr>
              ) : (
                devices.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        <Server className="w-4 h-4 text-blue-600 shrink-0" />
                        {d.name}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">User: {d.username}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold mr-2 ${
                          d.vendor === "MIKROTIK"
                            ? "bg-blue-100 text-blue-800"
                            : d.vendor === "JUNIPER"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {d.vendor}
                      </span>
                      <span className="text-xs text-slate-600">{d.model || "-"}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      <div>
                        {d.ip_address}:{d.api_port}
                      </div>
                      <div className="text-slate-400">
                        {d.api_port === 8728 || d.api_port === 8729
                          ? (d.use_tls ? "RouterOS API (SSL)" : "RouterOS API (TCP)")
                          : (d.use_tls ? "HTTPS (TLS)" : "HTTP")}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          d.status === "ONLINE"
                            ? "bg-emerald-100 text-emerald-800"
                            : d.status === "OFFLINE"
                            ? "bg-rose-100 text-rose-800"
                            : d.status === "ERROR"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            d.status === "ONLINE"
                              ? "bg-emerald-500 animate-pulse"
                              : d.status === "OFFLINE"
                              ? "bg-rose-500"
                              : "bg-slate-400"
                          }`}
                        />
                        {d.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {d.last_seen_at ? new Date(d.last_seen_at).toLocaleString("id-ID") : "-"}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleTestConnection(d.id)}
                        disabled={testingDeviceId === d.id}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded border border-blue-200 transition disabled:opacity-50"
                      >
                        <Activity className={`w-3.5 h-3.5 ${testingDeviceId === d.id ? "animate-spin" : ""}`} />
                        {testingDeviceId === d.id ? "Menguji..." : "Test Koneksi"}
                      </button>
                      <button
                        onClick={() => handleDeleteDevice(d.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded border border-rose-200 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Main Table Card (Customer ONTs via GenieACS TR-069) */}
      {networkTab === "onts" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Daftar Modem ONT Pelanggan (TR-069 CWMP)</h2>
              <p className="text-xs text-slate-500">
                Terhubung ke GenieACS Server (Mendukung ZTE, Huawei, Fiberhome, VSOL, XPON).
              </p>
            </div>
            <button
              type="button"
              onClick={fetchONTs}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition flex items-center gap-1 text-xs font-bold"
              title="Segarkan data ONT"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingOnts ? "animate-spin text-blue-600" : ""}`} />
              <span>Segarkan</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">Pelanggan</th>
                  <th className="px-6 py-3">PON Serial / Model</th>
                  <th className="px-6 py-3">Vendor</th>
                  <th className="px-6 py-3">Sinyal Fiber (RX)</th>
                  <th className="px-6 py-3">Status CWMP</th>
                  <th className="px-6 py-3">WiFi SSID</th>
                  <th className="px-6 py-3 text-right">Aksi TR-069</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loadingOnts ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                      Memuat data ONT pelanggan...
                    </td>
                  </tr>
                ) : onts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                      Belum ada modem ONT yang terdaftar atau mengirim Inform ke GenieACS.
                    </td>
                  </tr>
                ) : (
                  onts.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900 block">{o.customer_name || "Pelanggan"}</span>
                        <span className="text-xs text-slate-400 font-mono">{o.customer_phone || "-"}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-blue-700 block">{o.serial_number}</span>
                        <span className="text-xs text-slate-500">{o.model}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {o.vendor}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
                          <Signal className={`w-3.5 h-3.5 ${o.rx_optical_power > -24 ? "text-emerald-500" : o.rx_optical_power > -27 ? "text-amber-500" : "text-rose-500"}`} />
                          <span className={o.rx_optical_power > -24 ? "text-emerald-700" : o.rx_optical_power > -27 ? "text-amber-700" : "text-rose-700"}>
                            {o.rx_optical_power} dBm
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          ONLINE
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-800">
                        {o.wifi_ssid}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOnt(o);
                            setEditWifiForm({ ssid: o.wifi_ssid, password: o.wifi_password || "" });
                            setShowEditWifiModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded border border-blue-200 transition"
                        >
                          <Wifi className="w-3.5 h-3.5" />
                          Set WiFi
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRebootOnt(o.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded border border-slate-300 transition"
                        >
                          <Power className="w-3.5 h-3.5" />
                          Reboot
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Edit ONT WiFi via TR-069 */}
      {showEditWifiModal && selectedOnt && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Wifi className="w-5 h-5 text-blue-600" />
              Ubah Konfigurasi WiFi ONT
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Push parameter TR-069 <b>SetParameterValues</b> ke modem {selectedOnt.vendor} ({selectedOnt.serial_number}).
            </p>

            <form onSubmit={handleSaveOntWifi} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama SSID WiFi</label>
                <input
                  type="text"
                  required
                  value={editWifiForm.ssid}
                  onChange={(e) => setEditWifiForm({ ...editWifiForm, ssid: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kata Sandi (WPA2 PreSharedKey)</label>
                <input
                  type="text"
                  required
                  minLength={8}
                  value={editWifiForm.password}
                  onChange={(e) => setEditWifiForm({ ...editWifiForm, password: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditWifiModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingWifi}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
                >
                  {savingWifi ? "Mengirim TR-069..." : "Terapkan ke Modem"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Test Result Details */}
      {testResult && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600" />
                )}
                Hasil Uji Koneksi Router
              </h3>
              <span className="text-xs font-mono text-slate-400">Latency: {testResult.latency_ms}ms</span>
            </div>

            <div
              className={`p-3 rounded-xl mb-4 text-sm ${
                testResult.success
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border border-rose-200 text-rose-800"
              }`}
            >
              {testResult.message}
            </div>

            {testResult.system_info && (
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div className="flex justify-between border-b pb-1">
                  <span className="text-slate-500">Board Name:</span>
                  <span className="font-semibold text-slate-800">{testResult.system_info.board_name || "MikroTik"}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-slate-500">RouterOS Version:</span>
                  <span className="font-semibold text-blue-700">{testResult.system_info.version || "v7.x"}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-slate-500">CPU Usage:</span>
                  <span className="font-semibold text-slate-800">{testResult.system_info.cpu_load}%</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-slate-500">Free / Total RAM:</span>
                  <span className="font-semibold text-slate-800">
                    {formatBytes(testResult.system_info.free_memory)} / {formatBytes(testResult.system_info.total_memory)}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-slate-500">Free / Total Storage:</span>
                  <span className="font-semibold text-slate-800">
                    {formatBytes(testResult.system_info.free_hdd)} / {formatBytes(testResult.system_info.total_hdd)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Uptime:</span>
                  <span className="font-semibold text-slate-800">{testResult.system_info.uptime || "-"}</span>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setTestResult(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-lg"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Device */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Tambah Router Jaringan</h3>
            <p className="text-xs text-slate-500 mb-4">
              Konfigurasi router MikroTik RouterOS v6/v7 menggunakan antarmuka RouterOS API (Port 8728) atau REST API.
            </p>

            <form onSubmit={handleCreateDevice} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Perangkat</label>
                  <input
                    type="text"
                    placeholder="Core-CCR2004-Edge"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vendor</label>
                  <select
                    value={form.vendor}
                    onChange={(e) => handleVendorChange(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    <option value="MIKROTIK">MikroTik RouterOS</option>
                    <option value="JUNIPER">Juniper Junos</option>
                    <option value="GENERIC">Generic Router</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat IP Router</label>
                  <input
                    type="text"
                    placeholder="192.168.88.1"
                    value={form.ip_address}
                    onChange={(e) => setForm({ ...form, ip_address: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Port API</label>
                  <input
                    type="number"
                    value={form.api_port}
                    onChange={(e) => setForm({ ...form, api_port: parseInt(e.target.value) || 443 })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Username API</label>
                  <input
                    type="text"
                    placeholder="admin"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="use_tls"
                  checked={form.use_tls}
                  onChange={(e) => setForm({ ...form, use_tls: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="use_tls" className="text-xs font-medium text-slate-700">
                  Gunakan Protokol Aman (HTTPS / TLS)
                </label>
              </div>

              {/* RADIUS NAS Unified Attach Section */}
              <div className="mt-3 p-3 bg-blue-50/60 rounded-xl border border-blue-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enable_radius"
                      checked={form.enable_radius ?? true}
                      onChange={(e) => setForm({ ...form, enable_radius: e.target.checked })}
                      className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="enable_radius" className="text-xs font-bold text-blue-900 cursor-pointer">
                      Hubungkan ke FreeRADIUS (Otomatis Tambah ke NAS)
                    </label>
                  </div>
                  <span className="text-[10px] font-semibold bg-blue-200/70 text-blue-800 px-2 py-0.5 rounded-full">
                    Rekomendasi
                  </span>
                </div>
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  Router ini akan langsung didaftarkan ke server FreeRADIUS AAA untuk menangani login Hotspot, PPPoE, Passpoint, dan eksekusi isolir otomatis.
                </p>

                {(form.enable_radius ?? true) && (
                  <div className="pt-1">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      RADIUS Shared Secret:
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: testing123"
                      value={form.radius_shared_secret ?? "testing123"}
                      onChange={(e) => setForm({ ...form, radius_shared_secret: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                      required
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      *Kunci rahasia ini yang dimasukkan pada menu <code>/radius add secret=...</code> di MikroTik Anda.
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan Router"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Titik ODP Baru */}
      {showAddODPModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Tambah Titik ODP Baru</h3>
                  <p className="text-xs text-slate-500">
                    Daftarkan titik Optical Distribution Point ke sistem GIS PostGIS
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddODPModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateODP} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode ODP <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: ODP-HRU-07"
                    value={odpForm.code}
                    onChange={(e) => setOdpForm({ ...odpForm, code: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cluster Wilayah <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Harau / Sarilamak / dsb"
                    value={odpForm.cluster}
                    onChange={(e) => setOdpForm({ ...odpForm, cluster: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Titik ODP <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: ODP Harau Lembah Blok C3"
                  value={odpForm.name}
                  onChange={(e) => setOdpForm({ ...odpForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Spesifikasi Splitter
                  </label>
                  <select
                    value={odpForm.splitter_spec}
                    onChange={(e) => {
                      const spec = e.target.value;
                      let ports = 8;
                      if (spec.includes("1:4")) ports = 4;
                      else if (spec.includes("1:8")) ports = 8;
                      else if (spec.includes("1:16")) ports = 16;
                      else if (spec.includes("1:32")) ports = 32;
                      setOdpForm({ ...odpForm, splitter_spec: spec, total_ports: ports });
                    }}
                    className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="1:4 PLC">1:4 PLC</option>
                    <option value="1:8 PLC">1:8 PLC</option>
                    <option value="1:16 PLC">1:16 PLC</option>
                    <option value="1:32 PLC">1:32 PLC</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Port
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="64"
                    value={odpForm.total_ports}
                    onChange={(e) => setOdpForm({ ...odpForm, total_ports: parseInt(e.target.value) || 8 })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Port Terpakai
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={odpForm.total_ports}
                    value={odpForm.used_ports ?? 0}
                    onChange={(e) => setOdpForm({ ...odpForm, used_ports: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Redaman Optik Estimasi (dBm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="-19.5"
                    value={odpForm.optical_power_dbm ?? -19.5}
                    onChange={(e) => setOdpForm({ ...odpForm, optical_power_dbm: parseFloat(e.target.value) || -19.5 })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Titik ODP
                  </label>
                  <select
                    value={odpForm.status ?? "ACTIVE"}
                    onChange={(e) => setOdpForm({ ...odpForm, status: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="ACTIVE">ACTIVE (Normal)</option>
                    <option value="FULL">FULL (Penuh)</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                  </select>
                </div>
              </div>

              {/* Coordinates */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-blue-600" />
                    Koordinat Geospasial (WGS84)
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Bisa klik di peta untuk mengisi
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="-0.218500"
                      value={odpForm.latitude}
                      onChange={(e) => setOdpForm({ ...odpForm, latitude: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="100.655000"
                      value={odpForm.longitude}
                      onChange={(e) => setOdpForm({ ...odpForm, longitude: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat Fisik / Lokasi Tiang
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Tiang FO No. 12 Depan Gerbang Komplek Harau Indah"
                  value={odpForm.address}
                  onChange={(e) => setOdpForm({ ...odpForm, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddODPModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingODP}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50"
                >
                  {submittingODP ? "Menyimpan..." : "Simpan Titik ODP"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

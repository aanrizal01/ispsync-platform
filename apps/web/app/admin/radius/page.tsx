"use client";

import { useEffect, useState, useCallback } from "react";
import { Terminal, Search, X, Copy, Check, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { radiusApi, type RadiusSession, type NAS, type AuthLog, type CreateNASInput } from "@/lib/api/radius";
import { networkApi } from "@/lib/api/network";
import { formatDate, cn } from "@/lib/utils";
import { MikrotikScriptModal } from "@/components/radius/MikrotikScriptModal";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}j ${m}m`;
  if (m > 0) return `${m}m ${s}d`;
  return `${s} detik`;
}

export default function RadiusPage() {
  const [activeTab, setActiveTab] = useState<"sessions" | "nas" | "logs">("sessions");
  const [sessions, setSessions] = useState<RadiusSession[]>([]);
  const [nasList, setNasList] = useState<NAS[]>([]);
  const [authLogs, setAuthLogs] = useState<AuthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [logSearch, setLogSearch] = useState("");
  const [copiedMac, setCopiedMac] = useState<string | null>(null);

  // Pagination State - Sesi Online
  const [sessionPage, setSessionPage] = useState(1);
  const [sessionLimit, setSessionLimit] = useState(25);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionTotalPages, setSessionTotalPages] = useState(1);

  // Pagination State - Log Autentikasi
  const [logPage, setLogPage] = useState(1);
  const [logLimit, setLogLimit] = useState(25);
  const [logTotal, setLogTotal] = useState(0);
  const [logTotalPages, setLogTotalPages] = useState(1);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMac(text);
    setTimeout(() => setCopiedMac(null), 2000);
  };

  const [isNasModalOpen, setIsNasModalOpen] = useState(false);
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [selectedNasForScript, setSelectedNasForScript] = useState<{
    routerName?: string;
    nasIp?: string;
    secret?: string;
    apiUser?: string;
  } | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State NAS
  const [nasForm, setNasForm] = useState<CreateNASInput>({
    nasname: "",
    shortname: "",
    type: "mikrotik",
    secret: "",
    description: "",
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [sessRes, nRes, logRes] = await Promise.all([
        radiusApi.listSessions({ page: sessionPage, limit: sessionLimit, search: search || undefined }),
        radiusApi.listNAS(),
        radiusApi.listAuthLogs({ page: logPage, limit: logLimit, search: logSearch || undefined }),
      ]);
      setSessions(sessRes.data || []);
      if (sessRes.meta) {
        setSessionTotal(sessRes.meta.total);
        setSessionTotalPages(sessRes.meta.total_pages);
      }
      setNasList(nRes || []);
      setAuthLogs(logRes.data || []);
      if (logRes.meta) {
        setLogTotal(logRes.meta.total);
        setLogTotalPages(logRes.meta.total_pages);
      }
    } catch (err) {
      console.error("Failed to load RADIUS data:", err);
    } finally {
      setLoading(false);
    }
  }, [search, sessionPage, sessionLimit, logSearch, logPage, logLimit]);

  const renderPagination = (
    currPage: number,
    currLimit: number,
    total: number,
    totalPages: number,
    onPageChange: (p: number) => void,
    onLimitChange: (l: number) => void,
    label: string
  ) => (
    <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="text-xs text-slate-500">
        Menampilkan{" "}
        <span className="font-semibold text-slate-700">
          {total > 0 ? (currPage - 1) * currLimit + 1 : 0}
        </span>{" "}
        -{" "}
        <span className="font-semibold text-slate-700">
          {Math.min(currPage * currLimit, total)}
        </span>{" "}
        dari <span className="font-semibold text-slate-700">{total}</span> {label}
        {totalPages > 1 && ` (Halaman ${currPage} dari ${totalPages})`}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span>Baris:</span>
          <select
            value={currLimit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="px-2 py-1 border border-slate-200 rounded-md bg-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currPage - 1))}
            disabled={currPage <= 1 || loading}
            className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
            title="Halaman Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700">
            {currPage} / {Math.max(1, totalPages)}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currPage + 1))}
            disabled={currPage >= totalPages || loading}
            className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
            title="Halaman Selanjutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const handleDisconnect = async (s: RadiusSession) => {
    if (!confirm(`Kirim permintaan pemutusan sesi (CoA Disconnect) untuk pengguna "${s.username}"?`)) return;
    try {
      await radiusApi.disconnectSession({
        nas_ip_address: s.nasipaddress,
        username: s.username,
        framed_ip: s.framedipaddress,
        acct_session_id: s.acctsessionid,
      });
      alert("Permintaan pemutusan sesi terkirim");
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal memutuskan sesi");
    }
  };

  const handleCreateNAS = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await radiusApi.createNAS(nasForm);

      // Auto-sync into Network Devices table for live monitoring
      try {
        await networkApi.create({
          name: nasForm.shortname || nasForm.nasname,
          vendor: nasForm.type === "juniper" ? "JUNIPER" : "MIKROTIK",
          model: "RouterOS v7",
          ip_address: nasForm.nasname,
          api_port: 8728,
          auth_type: "BASIC",
          username: "ispsync_api",
          password: nasForm.secret,
          use_tls: false,
        });
      } catch (netErr) {
        console.warn("Auto-sync to network devices notice:", netErr);
      }

      setIsNasModalOpen(false);
      setNasForm({
        nasname: "",
        shortname: "",
        type: "mikrotik",
        secret: "",
        description: "",
      });
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal mendaftarkan NAS");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">FreeRADIUS & Akses Jaringan (AAA)</h1>
          <p className="text-slate-500 text-sm mt-1">
            Monitoring sesi online real-time, manajemen router NAS, dan log otentikasi RADIUS
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            title="Muat Ulang Sesi"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={() => {
              setSelectedNasForScript(undefined);
              setIsScriptModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors shadow-sm"
          >
            <Terminal className="w-4 h-4" />
            Generator Script MikroTik
          </button>
          <button
            onClick={() => setIsNasModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Router NAS
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-6">
        <button
          onClick={() => setActiveTab("sessions")}
          className={cn(
            "pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer",
            activeTab === "sessions"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          Sesi Online Aktif ({sessionTotal || sessions.length})
        </button>
        <button
          onClick={() => setActiveTab("nas")}
          className={cn(
            "pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer",
            activeTab === "nas"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          Daftar Router NAS ({nasList.length})
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={cn(
            "pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer",
            activeTab === "logs"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          Log Autentikasi ({logTotal || authLogs.length})
        </button>
      </div>

      {/* Tab 1: Sessions */}
      {activeTab === "sessions" && (
        <div>
          {/* Search bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 shadow-sm">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Cari username, IP client, atau MAC address..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSessionPage(1);
                }}
                className="w-full pl-10 pr-10 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSessionPage(1);
                  }}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Hapus pencarian"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">User / Voucher</th>
                    <th className="px-5 py-3.5">IP & MAC Address</th>
                    <th className="px-5 py-3.5">NAS Router</th>
                    <th className="px-5 py-3.5">Durasi Online</th>
                    <th className="px-5 py-3.5">Trafik (Up / Down)</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                        Memuat sesi aktif...
                      </td>
                    </tr>
                  ) : sessions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                        Tidak ada sesi pengguna aktif saat ini
                      </td>
                    </tr>
                  ) : (
                    sessions.map((s) => (
                      <tr key={s.radacctid} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-mono font-bold text-blue-600">{s.username}</div>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">{s.groupname || "DEFAULT"}</span>
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-slate-700">
                          <div>{(s.framedipaddress || "—").replace(/\/.*$/, "")}</div>
                          <div className="text-slate-400">{s.callingstationid}</div>
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-slate-600">
                          {s.nasipaddress.replace(/\/.*$/, "")}
                        </td>
                        <td className="px-5 py-4 text-xs font-semibold text-slate-800">
                          {formatDuration(s.acctsessiontime)}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-700">
                          <div>↑ {formatBytes(s.acctinputoctets)}</div>
                          <div>↓ {formatBytes(s.acctoutputoctets)}</div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => handleDisconnect(s)}
                            className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200"
                          >
                            Disconnect
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination(
              sessionPage,
              sessionLimit,
              sessionTotal,
              sessionTotalPages,
              setSessionPage,
              (l) => {
                setSessionLimit(l);
                setSessionPage(1);
              },
              "sesi aktif"
            )}
          </div>
        </div>
      )}

      {/* Tab 2: NAS Routers */}
      {activeTab === "nas" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-5 py-3.5">IP NAS / Hostname</th>
                <th className="px-5 py-3.5">Nama Singkat</th>
                <th className="px-5 py-3.5">Status Konektivitas</th>
                <th className="px-5 py-3.5">Tipe Gateway</th>
                <th className="px-5 py-3.5">Keterangan</th>
                <th className="px-5 py-3.5">Tanggal Ditambahkan</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {nasList.map((n) => {
                const cleanIp = (ip?: string) => ip?.replace(/\/.*$/, "").trim() || "";
                const activeSessionCount = sessions.filter((s) => cleanIp(s.nasipaddress) === cleanIp(n.nasname)).length;
                const lastLog = authLogs.find((l) => cleanIp(l.nasipaddress) === cleanIp(n.nasname));

                return (
                  <tr key={n.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-mono font-bold text-slate-900">{n.nasname}</td>
                    <td className="px-5 py-4 text-slate-700 font-medium">{n.shortname || "—"}</td>
                    <td className="px-5 py-4">
                      {activeSessionCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          Online ({activeSessionCount} Sesi Aktif)
                        </span>
                      ) : lastLog ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          Terkoneksi (Auth Terakhir: {formatDate(lastLog.authdate, "HH:mm")})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200" title="Router terdaftar dan standby menerima request pelanggan pertama kali">
                          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                          Standby (Menunggu Sesi)
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 uppercase">
                        {n.type}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">{n.description || "—"}</td>
                    <td className="px-5 py-4 text-xs text-slate-400">{formatDate(n.created_at)}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedNasForScript({
                            routerName: n.shortname || n.nasname,
                            nasIp: n.nasname,
                            secret: n.secret,
                          });
                          setIsScriptModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs border border-emerald-200 transition-colors"
                        title="Generate script sinkronisasi MikroTik (ROS 6/7)"
                      >
                        <Terminal className="w-3.5 h-3.5" />
                        Script ROS 6/7
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Auth Logs */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          {/* Search bar & Refresh */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Cari User/Voucher, MAC Address, IP NAS, atau Nama Router..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              {logSearch && (
                <button
                  type="button"
                  onClick={() => setLogSearch("")}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Hapus pencarian"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => loadData()}
              disabled={loading}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
              title="Perbarui data log autentikasi"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              <span>Refresh Log</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">Waktu Login</th>
                    <th className="px-5 py-3.5">User / Voucher</th>
                    <th className="px-5 py-3.5">MAC Address (Perangkat)</th>
                    <th className="px-5 py-3.5">Router NAS (Asal Request)</th>
                    <th className="px-5 py-3.5 text-right">Hasil Autentikasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                        Memuat riwayat log autentikasi...
                      </td>
                    </tr>
                  ) : authLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                        {logSearch ? (
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-600">Tidak ada log autentikasi yang cocok dengan &quot;{logSearch}&quot;</p>
                            <button
                              type="button"
                              onClick={() => setLogSearch("")}
                              className="text-xs text-blue-600 hover:underline font-medium cursor-pointer"
                            >
                              Hapus filter pencarian
                            </button>
                          </div>
                        ) : (
                          "Belum ada log autentikasi"
                        )}
                      </td>
                    </tr>
                  ) : (
                    authLogs.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                          {formatDate(l.authdate, "dd MMM yyyy HH:mm:ss")}
                        </td>
                        <td className="px-5 py-3.5 font-mono font-bold text-slate-900 text-xs">
                          {l.username}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {l.callingstationid ? (
                            <div className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              <span>{l.callingstationid}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(l.callingstationid!)}
                                className="text-slate-400 hover:text-slate-700 cursor-pointer"
                                title="Salin MAC address"
                              >
                                {copiedMac === l.callingstationid ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Tidak terdeteksi</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[11px] font-bold">
                              {l.nas_shortname || "ROUTER-NAS"}
                            </span>
                            {l.nasipaddress && (
                              <span className="font-mono text-slate-500 text-[11px]">
                                ({l.nasipaddress})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <span
                            className={cn(
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
                              l.reply === "Access-Accept"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            )}
                          >
                            {l.reply}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination(
              logPage,
              logLimit,
              logTotal,
              logTotalPages,
              setLogPage,
              (l) => {
                setLogLimit(l);
                setLogPage(1);
              },
              "log autentikasi"
            )}
          </div>
        </div>
      )}

      {/* Modal Tambah Router NAS */}
      {isNasModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Daftarkan Router NAS Baru</h2>
            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                {errorMessage}
              </div>
            )}
            <form onSubmit={handleCreateNAS} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium text-slate-700 mb-1">IP Address / Hostname *</label>
                <input
                  type="text"
                  required
                  placeholder="192.168.88.1"
                  value={nasForm.nasname}
                  onChange={(e) => setNasForm({ ...nasForm, nasname: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nama Singkat</label>
                  <input
                    type="text"
                    placeholder="RB-CORE-01"
                    value={nasForm.shortname || ""}
                    onChange={(e) => setNasForm({ ...nasForm, shortname: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tipe Router</label>
                  <select
                    value={nasForm.type}
                    onChange={(e) => setNasForm({ ...nasForm, type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="mikrotik">MikroTik</option>
                    <option value="juniper">Juniper</option>
                    <option value="cisco">Cisco</option>
                    <option value="other">Other / IETF</option>
                  </select>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-medium text-slate-700">RADIUS Secret *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedNasForScript({
                        routerName: nasForm.shortname || "ROUTER-01",
                        nasIp: nasForm.nasname || "192.168.88.1",
                        secret: nasForm.secret,
                      });
                      setIsScriptModalOpen(true);
                    }}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    Generator Script MikroTik
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Shared secret RADIUS"
                  value={nasForm.secret}
                  onChange={(e) => setNasForm({ ...nasForm, secret: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Deskripsi Lokasi</label>
                <input
                  type="text"
                  placeholder="POP Sudirman Tower LT 5"
                  value={nasForm.description || ""}
                  onChange={(e) => setNasForm({ ...nasForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNasModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {submitting ? "Menyimpan..." : "Daftarkan Router"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mikrotik Script Generator Modal */}
      <MikrotikScriptModal
        isOpen={isScriptModalOpen}
        onClose={() => setIsScriptModalOpen(false)}
        initialData={selectedNasForScript}
        onApplyToForm={(appliedData) => {
          setNasForm((prev) => ({
            ...prev,
            nasname: appliedData.nasname || prev.nasname,
            shortname: appliedData.shortname || prev.shortname,
            secret: appliedData.secret || prev.secret,
          }));
          setIsNasModalOpen(true);
        }}
      />
    </div>
  );
}

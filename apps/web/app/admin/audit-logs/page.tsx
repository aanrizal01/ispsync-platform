"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Calendar,
  User,
  Shield,
  Clock,
  ArrowRight,
  Database,
  Terminal,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { auditApi, AuditLog, AuditFilterParams } from "@/lib/api/audit";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected Log for Modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: AuditFilterParams = {
        page,
        limit,
        search: search.trim() || undefined,
        entity_type: entityType || undefined,
        action: action || undefined,
      };
      const res = await auditApi.list(params);
      setLogs(res.data || []);
      if (res.meta) {
        setTotalPages(res.meta.total_pages || 1);
        setTotalCount(res.meta.total || 0);
      }
    } catch (err: any) {
      console.error("Failed to fetch audit logs:", err);
      setError(err?.message || "Gagal memuat log audit aktivitas");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, entityType, action]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const getActionBadge = (act: string) => {
    const actUpper = act.toUpperCase();
    if (actUpper.includes("CREATE") || actUpper.includes("REGISTER") || actUpper.includes("ADD")) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
          {act}
        </span>
      );
    }
    if (actUpper.includes("UPDATE") || actUpper.includes("EDIT") || actUpper.includes("MODIFY")) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
          {act}
        </span>
      );
    }
    if (actUpper.includes("DELETE") || actUpper.includes("TERMINATE") || actUpper.includes("SUSPEND")) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 border border-rose-200">
          {act}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
        {act}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Audit Log Aktivitas</h1>
              <p className="text-sm text-slate-500">
                Pencatatan menyeluruh setiap perubahan data, aksi pengguna, dan histori sistem billing.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchLogs()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari deskripsi, ID entitas, aktor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <select
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            >
              <option value="">Semua Tipe Entitas</option>
              <option value="Customer">Customer (Pelanggan)</option>
              <option value="Device">Device (Perangkat)</option>
              <option value="Address">Address (Alamat)</option>
              <option value="Subscription">Subscription (Langganan)</option>
              <option value="Invoice">Invoice (Tagihan)</option>
              <option value="Payment">Payment (Pembayaran)</option>
              <option value="User">User (Pengguna)</option>
            </select>
          </div>

          <div>
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            >
              <option value="">Semua Aksi</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="ADD_ADDRESS">ADD_ADDRESS</option>
              <option value="REGISTER_DEVICE">REGISTER_DEVICE</option>
              <option value="LOGIN">LOGIN</option>
            </select>
          </div>
        </form>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {error && (
          <div className="p-4 bg-rose-50 border-b border-rose-100 text-rose-700 text-sm">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-3.5">Waktu</th>
                <th className="px-6 py-3.5">Aktor</th>
                <th className="px-6 py-3.5">Aksi</th>
                <th className="px-6 py-3.5">Entitas</th>
                <th className="px-6 py-3.5">Deskripsi</th>
                <th className="px-6 py-3.5">IP & Client</th>
                <th className="px-6 py-3.5 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Memuat log audit...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    Tidak ada log audit yang sesuai dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(log.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs uppercase">
                          {log.actor_email ? log.actor_email[0] : log.actor_type[0]}
                        </div>
                        <div className="text-xs">
                          <p className="font-medium text-slate-800">
                            {log.actor_email || log.actor_type}
                          </p>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                            {log.actor_type}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs">
                        <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] mr-1.5">
                          {log.entity_type}
                        </span>
                        {log.entity_type === "Customer" ? (
                          <Link
                            href={`/admin/customers/${log.entity_id}`}
                            className="font-mono text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                          >
                            {log.entity_id.slice(0, 8)}...
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        ) : (
                          <span className="font-mono text-slate-500 text-[11px]">
                            {log.entity_id.length > 12 ? `${log.entity_id.slice(0, 10)}...` : log.entity_id}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-700 line-clamp-2 max-w-sm">
                        {log.description}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                      <p className="font-mono text-[11px]">{log.ip_address || "-"}</p>
                      <p className="text-[10px] text-slate-400 truncate max-w-[120px]" title={log.user_agent}>
                        {log.user_agent ? log.user_agent.split(" ")[0] : "-"}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors font-medium"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            Menampilkan <span className="font-medium">{logs.length}</span> dari{" "}
            <span className="font-medium">{totalCount}</span> log aktivitas (Halaman {page} dari {totalPages})
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold px-2 py-1 bg-white border border-slate-200 rounded-md">
              {page}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Detail Log Audit #{selectedLog.id.slice(0, 8)}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {formatDate(selectedLog.created_at)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <p className="text-slate-400 font-medium">Aktor</p>
                  <p className="font-semibold text-slate-800 break-all">
                    {selectedLog.actor_email || selectedLog.actor_type}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Aksi</p>
                  <div className="mt-0.5">{getActionBadge(selectedLog.action)}</div>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Entitas Target</p>
                  <p className="font-semibold text-slate-800">
                    {selectedLog.entity_type}
                  </p>
                  <p className="font-mono text-[10px] text-slate-500 truncate" title={selectedLog.entity_id}>
                    {selectedLog.entity_id}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">IP Address</p>
                  <p className="font-mono text-slate-800">
                    {selectedLog.ip_address || "N/A"}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-1.5">
                  Deskripsi Perubahan
                </h4>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-700">
                  {selectedLog.description}
                </div>
              </div>

              {/* Old vs New Values Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-semibold uppercase text-amber-700 tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Nilai Sebelumnya (Old Values)
                  </h4>
                  <pre className="p-3 bg-slate-900 text-amber-300 rounded-xl text-xs font-mono overflow-x-auto max-h-60 border border-slate-800">
                    {selectedLog.old_values && Object.keys(selectedLog.old_values).length > 0
                      ? JSON.stringify(selectedLog.old_values, null, 2)
                      : "null (tidak ada data lama)"}
                  </pre>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase text-emerald-700 tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Nilai Baru (New Values)
                  </h4>
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto max-h-60 border border-slate-800">
                    {selectedLog.new_values && Object.keys(selectedLog.new_values).length > 0
                      ? JSON.stringify(selectedLog.new_values, null, 2)
                      : "null (tidak ada data baru)"}
                  </pre>
                </div>
              </div>

              {/* Extra Metadata & User Agent */}
              {(selectedLog.metadata || selectedLog.user_agent) && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                    Metadata & Client Info
                  </h4>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 font-mono text-slate-600">
                    {selectedLog.user_agent && (
                      <p>
                        <span className="text-slate-400 font-sans">User-Agent: </span>
                        {selectedLog.user_agent}
                      </p>
                    )}
                    {selectedLog.request_id && (
                      <p>
                        <span className="text-slate-400 font-sans">Request-ID: </span>
                        {selectedLog.request_id}
                      </p>
                    )}
                    {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                      <pre className="mt-2 text-slate-700 font-mono text-[11px] overflow-x-auto">
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Zap, Globe, RefreshCw, Search, X, ChevronLeft, ChevronRight, ArrowUpCircle, CreditCard } from "lucide-react";
import { subscriptionApi, type Subscription, type CreateSubscriptionInput, type AccessAccount } from "@/lib/api/subscriptions";
import { customerApi, type Customer } from "@/lib/api/customers";
import { planApi, type Plan } from "@/lib/api/plans";
import { ipamApi } from "@/lib/api/ipam";
import { settingsApi, type BillingAddonSettings, defaultBillingAddonSettings } from "@/lib/api/settings";
import { formatDate, formatRupiah, cn } from "@/lib/utils";

function formatDuration(seconds?: number) {
  if (!seconds || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}j ${m}m`;
  if (m > 0) return `${m}m`;
  return `${seconds}d`;
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, total_pages: 1 });
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Upgrade / Change Plan State
  const [isChangePlanModalOpen, setIsChangePlanModalOpen] = useState(false);
  const [selectedSubForChange, setSelectedSubForChange] = useState<Subscription | null>(null);
  const [targetPlanId, setTargetPlanId] = useState("");
  const [changePlanClusterFilter, setChangePlanClusterFilter] = useState<string>("");
  const [changingPlan, setChangingPlan] = useState(false);
  const [changePlanError, setChangePlanError] = useState<string | null>(null);

  // Modal Atur IP Publik State
  const [isIPModalOpen, setIsIPModalOpen] = useState(false);
  const [selectedAccountForIP, setSelectedAccountForIP] = useState<{
    account: AccessAccount;
    customerName: string;
    subId: string;
  } | null>(null);
  const [ipAddressInput, setIpAddressInput] = useState("");
  const [disconnectSession, setDisconnectSession] = useState(true);
  const [savingIP, setSavingIP] = useState(false);
  const [ipModalError, setIpModalError] = useState<string | null>(null);
  const [fetchingIpamIP, setFetchingIpamIP] = useState(false);
  const [addonSettings, setAddonSettings] = useState<BillingAddonSettings>(defaultBillingAddonSettings);

  const handleFetchFirstFreeIP = async () => {
    setFetchingIpamIP(true);
    try {
      const res = await ipamApi.getFirstFreeIP();
      if (res && res.ip) {
        setIpAddressInput(res.ip);
      }
    } catch (err: any) {
      alert(err.message || "Gagal mengambil IP dari phpIPAM. Pastikan integrasi phpIPAM sudah disetel di menu Pengaturan.");
    } finally {
      setFetchingIpamIP(false);
    }
  };

  const handleFetchFirstFreeIPForCreate = async () => {
    setFetchingIpamIP(true);
    try {
      const res = await ipamApi.getFirstFreeIP();
      if (res && res.ip) {
        setForm((prev) => ({ ...prev, static_ip: res.ip }));
      }
    } catch (err: any) {
      alert(err.message || "Gagal mengambil IP dari phpIPAM. Pastikan integrasi phpIPAM sudah disetel di menu Pengaturan.");
    } finally {
      setFetchingIpamIP(false);
    }
  };

  // Form State
  const [form, setForm] = useState<{
    customer_id: string;
    plan_id: string;
    createAccessAccount: boolean;
    access_type: "PPPOE" | "HOTSPOT";
    username: string;
    password: string;
    static_ip: string;
    notes: string;
  }>({
    customer_id: "",
    plan_id: "",
    createAccessAccount: true,
    access_type: "PPPOE",
    username: "",
    password: "",
    static_ip: "",
    notes: "",
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load customer and plan options for modals
  const loadOptions = useCallback(async () => {
    try {
      const [custsRes, plansRes] = await Promise.all([
        customerApi.list({ limit: 200 }),
        planApi.list({ status: "ACTIVE", limit: 200 }),
      ]);
      setCustomers(custsRes || []);
      setPlans(plansRes || []);
    } catch (err) {
      console.error("Failed to load options:", err);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  // Load subscriptions with pagination & search
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const subsRes = await subscriptionApi.list({
        page,
        limit,
        search: debouncedSearch.trim() || undefined,
        status: statusFilter || undefined,
      });
      setSubscriptions(subsRes.data || []);
      if (subsRes.meta) {
        setMeta(subsRes.meta);
      }
    } catch (err) {
      console.error("Failed to load subscription data:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    settingsApi
      .getBillingAddons()
      .then((data) => {
        if (data && data.public_ip_monthly_price !== undefined) {
          setAddonSettings(data);
        }
      })
      .catch(() => {});
  }, []);

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const payload: CreateSubscriptionInput = {
        customer_id: form.customer_id,
        plan_id: form.plan_id,
        notes: form.notes || undefined,
      };

      if (form.createAccessAccount) {
        payload.initial_access_type = form.access_type;
        payload.initial_username = form.username;
        payload.initial_password = form.password;
        if (form.static_ip.trim()) {
          payload.initial_static_ip = form.static_ip.trim();
        }
      }

      await subscriptionApi.create(payload);
      setIsModalOpen(false);
      setForm({
        customer_id: "",
        plan_id: "",
        createAccessAccount: true,
        access_type: "PPPOE",
        username: "",
        password: "",
        static_ip: "",
        notes: "",
      });
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal membuat langganan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (action: "activate" | "revert_pending" | "suspend" | "reactivate" | "cancel", id: string) => {
    try {
      const sub = subscriptions.find((item) => item.id === id);
      if (action === "activate") {
        const confirmed = confirm(
          `⚠️ KONFIRMASI AKTIVASI LAYANAN (PRABAYAR):\n\n` +
          `Pelanggan: ${sub?.customer_name || "Pelanggan"}\n` +
          `Paket: ${sub?.plan_name || "Internet"}\n\n` +
          `PENTING — KETENTUAN SKEMA PRABAYAR:\n` +
          `1. Pastikan kabel dropcore & modem ONT sudah SELESAI dipasang oleh teknisi di rumah pelanggan.\n` +
          `2. Pastikan pelanggan SUDAH MEMBAYAR tagihan awal (bulan ke-1) via QRIS atau Tunai/Kasir.\n\n` +
          `Mengaktifkan layanan akan langsung menghitung masa aktif 30 hari dan mengaktifkan akun PPPoE di MikroTik.\n\n` +
          `Apakah Anda yakin ingin mengaktifkan layanan ini sekarang?`
        );
        if (!confirmed) return;
        await subscriptionApi.activate(id);
      }
      if (action === "revert_pending") {
        const confirmed = confirm(
          `⚠️ KEMBALIKAN KE STATUS PENDING:\n\n` +
          `Pelanggan: ${sub?.customer_name || "Pelanggan"}\n\n` +
          `Apakah Anda yakin ingin membatalkan aktivasi dan mengembalikan status ke PENDING (Belum Aktif)?\n\n` +
          `Perhitungan masa aktif 30 hari akan direset kembali menjadi belum berjalan.`
        );
        if (!confirmed) return;
        await subscriptionApi.revertPending(id);
      }
      if (action === "suspend") await subscriptionApi.suspend(id);
      if (action === "reactivate") await subscriptionApi.reactivate(id);
      if (action === "cancel") {
        const reason = prompt("Masukkan alasan pembatalan langganan:");
        if (!reason) return;
        await subscriptionApi.cancel(id, reason);
      }
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal memproses aksi langganan");
    }
  };

  const handleOpenChangePlan = (sub: Subscription) => {
    setSelectedSubForChange(sub);
    setTargetPlanId(sub.plan_id);
    setChangePlanError(null);
    const curPlan = plans.find((p) => p.id === sub.plan_id);
    setChangePlanClusterFilter(curPlan?.package_group || curPlan?.group_name || "");
    setIsChangePlanModalOpen(true);
  };

  const handleChangePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubForChange || !targetPlanId) return;
    setChangingPlan(true);
    setChangePlanError(null);

    try {
      await subscriptionApi.changePlan(selectedSubForChange.id, targetPlanId);
      setIsChangePlanModalOpen(false);
      setSelectedSubForChange(null);
      loadData();
    } catch (err: any) {
      setChangePlanError(err.message || "Gagal mengubah paket pelanggan");
    } finally {
      setChangingPlan(false);
    }
  };

  const openIPModal = (account: AccessAccount, customerName: string, subId: string) => {
    setSelectedAccountForIP({ account, customerName, subId });
    setIpAddressInput(account.static_ip || "");
    setDisconnectSession(true);
    setIpModalError(null);
    setIsIPModalOpen(true);
  };

  const handleSaveIP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountForIP) return;
    setSavingIP(true);
    setIpModalError(null);
    try {
      await subscriptionApi.updateAccessAccountIP(selectedAccountForIP.account.id, {
        static_ip: ipAddressInput.trim() || undefined,
        disconnect_session: disconnectSession,
      });
      setIsIPModalOpen(false);
      setSelectedAccountForIP(null);
      loadData();
    } catch (err: any) {
      setIpModalError(err.message || "Gagal memperbarui IP Publik");
    } finally {
      setSavingIP(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Langganan Pelanggan</h1>
          <p className="text-slate-500 text-sm mt-1">
            Status siklus hidup langganan dan akun akses jaringan (PPPoE/Hotspot)
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Langganan Baru
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 mb-6 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="relative w-full sm:flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pelanggan, ID pelanggan, username PPPoE, nama paket..."
            className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
          >
            <option value="">Semua Status</option>
            <option value="ACTIVE">Aktif (ACTIVE)</option>
            <option value="PENDING">Menunggu (PENDING)</option>
            <option value="SUSPENDED">Ditangguhkan (SUSPENDED)</option>
            <option value="CANCELLED">Dibatalkan (CANCELLED)</option>
          </select>

          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
          >
            <option value={10}>10 / hal</option>
            <option value={20}>20 / hal</option>
            <option value={50}>50 / hal</option>
            <option value={100}>100 / hal</option>
          </select>

          <button
            onClick={() => loadData()}
            title="Muat Ulang"
            className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Subscription Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Pelanggan</th>
                <th className="px-5 py-3">Paket & Tarif</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Mulai / Tagihan Berikutnya</th>
                <th className="px-5 py-3">Akun Akses (AAA)</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Memuat data langganan...
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Belum ada langganan yang terdaftar
                  </td>
                </tr>
              ) : (
                subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">{s.customer_name}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{s.customer_number}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{s.plan_name}</span>
                        <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          PRABAYAR
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-xs font-medium text-slate-700">
                          {s.price_snapshot ? formatRupiah(s.price_snapshot.monthly_price) : "—"} / {s.billing_cycle}
                        </span>
                        {(() => {
                          const p = plans.find((plan) => plan.id === s.plan_id);
                          const cluster = p?.package_group || p?.group_name;
                          return cluster ? (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 border border-slate-200">
                              {cluster}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                          s.status === "ACTIVE" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                          s.status === "PENDING" && "bg-slate-100 text-slate-700 border border-slate-200",
                          s.status === "SUSPENDED" && "bg-rose-50 text-rose-700 border border-rose-200",
                          s.status === "CANCELLED" && "bg-slate-100 text-slate-500 border border-slate-200"
                        )}
                      >
                        {s.status}
                      </span>
                      {s.status === "PENDING" && (
                        <div className="text-[11px] text-slate-400 mt-1">
                          Tunggu pasang & bayar
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      <div>Mulai: {s.start_date ? formatDate(s.start_date) : "Belum aktif"}</div>
                      {s.next_billing_date && (
                        <div className="text-slate-400 mt-0.5">Tagihan: {formatDate(s.next_billing_date)}</div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      {s.access_accounts && s.access_accounts.length > 0 ? (
                        s.access_accounts.map((a) => (
                          <div key={a.id} className="space-y-1.5">
                            <div className="flex items-center gap-1.5 font-mono text-xs flex-wrap">
                              <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded border border-slate-200">
                                {a.access_type}
                              </span>
                              <span className="font-semibold text-slate-800 select-all" title="Username">
                                {a.identity}
                              </span>
                              {a.is_online ? (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 font-sans shadow-2xs"
                                  title={`Status: Online\nIP Sesi: ${a.current_ip || "—"}${a.online_duration_seconds ? `\nUptime: ${formatDuration(a.online_duration_seconds)}` : ""}${a.calling_station_id ? `\nMAC ONT: ${a.calling_station_id}` : ""}`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Online
                                  {a.online_duration_seconds ? (
                                    <span className="text-[9px] text-emerald-600/90 font-normal">
                                      ({formatDuration(a.online_duration_seconds)})
                                    </span>
                                  ) : null}
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200 font-sans"
                                  title="Pelanggan Offline (Modem/ONT terputus)"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                  Offline
                                </span>
                              )}
                            </div>
                            {a.password && (
                              <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
                                <span>Pass:</span>
                                <span className="font-medium text-slate-700 select-all">
                                  {a.password}
                                </span>
                              </div>
                            )}
                            {a.static_ip ? (
                              <div className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                <span>IP Publik:</span>
                                <span className="select-all font-semibold text-blue-700">{a.static_ip}</span>
                                <button
                                  type="button"
                                  onClick={() => openIPModal(a, s.customer_name || "Pelanggan", s.id)}
                                  className="ml-1 text-[10px] text-blue-600 hover:underline cursor-pointer"
                                  title="Ubah IP Publik"
                                >
                                  (Ubah)
                                </button>
                              </div>
                            ) : a.is_online && a.current_ip ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                  <span>IP Sesi:</span>
                                  <span className="select-all font-medium text-slate-800">{a.current_ip}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => openIPModal(a, s.customer_name || "Pelanggan", s.id)}
                                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-medium cursor-pointer"
                                  title="Pasang IP Publik Statik"
                                >
                                  <span>+ Atur IP Publik</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openIPModal(a, s.customer_name || "Pelanggan", s.id)}
                                className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-medium cursor-pointer"
                                title="Pasang IP Publik Statik"
                              >
                                <span>+ Atur IP Publik</span>
                              </button>
                            )}
                          </div>
                        ))
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {s.status === "PENDING" && (
                          <button
                            onClick={() => handleAction("activate", s.id)}
                            className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 cursor-pointer"
                          >
                            Aktivasi
                          </button>
                        )}
                        {s.status === "ACTIVE" && (
                          <>
                            <button
                              onClick={() => handleAction("suspend", s.id)}
                              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 rounded-md border border-slate-200 cursor-pointer"
                            >
                              Suspend
                            </button>
                            <button
                              onClick={() => handleAction("revert_pending", s.id)}
                              className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 rounded-md border border-slate-200 cursor-pointer"
                              title="Kembalikan ke PENDING"
                            >
                              Reset Pending
                            </button>
                          </>
                        )}
                        {s.status === "SUSPENDED" && (
                          <button
                            onClick={() => handleAction("reactivate", s.id)}
                            className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 cursor-pointer"
                          >
                            Reactivate
                          </button>
                        )}
                        {s.status !== "CANCELLED" && (
                          <button
                            onClick={() => handleOpenChangePlan(s)}
                            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 rounded-md border border-slate-200 transition-colors cursor-pointer"
                            title="Upgrade / Ganti Paket"
                          >
                            Ganti Paket
                          </button>
                        )}
                        {s.status !== "CANCELLED" && (
                          <button
                            onClick={() => handleAction("cancel", s.id)}
                            className="px-2 py-1 text-xs font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          >
                            Batal
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            {meta.total > 0 ? (
              <span>
                Menampilkan <span className="font-semibold text-slate-700">{(meta.page - 1) * meta.limit + 1}</span> -{" "}
                <span className="font-semibold text-slate-700">
                  {Math.min(meta.page * meta.limit, meta.total)}
                </span>{" "}
                dari <span className="font-semibold text-slate-700">{meta.total}</span> langganan
              </span>
            ) : (
              <span>Total 0 langganan</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="mr-2 text-slate-500">
              Hal. {meta.page} dari {meta.total_pages || 1}
            </span>
            <button
              disabled={meta.page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Sebelumnya</span>
            </button>

            {/* Page numbers */}
            {Array.from({ length: meta.total_pages || 1 }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === meta.total_pages || Math.abs(p - meta.page) <= 1)
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                return (
                  <div key={p} className="flex items-center">
                    {prev && p - prev > 1 && <span className="px-1 text-slate-400">...</span>}
                    <button
                      onClick={() => setPage(p)}
                      className={cn(
                        "w-7 h-7 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                        meta.page === p
                          ? "bg-blue-600 text-white font-semibold"
                          : "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
                      )}
                    >
                      {p}
                    </button>
                  </div>
                );
              })}

            <button
              disabled={meta.page >= meta.total_pages || loading}
              onClick={() => setPage((p) => Math.min(meta.total_pages, p + 1))}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <span>Selanjutnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Langganan Baru */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h2 className="text-lg font-bold text-slate-900">Langganan Paket Baru</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreateSubscription} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Pilih Pelanggan *</label>
                <select
                  required
                  value={form.customer_id}
                  onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- Pilih Pelanggan --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customer_number} — {c.full_name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Pilih Paket Layanan *</label>
                <select
                  required
                  value={form.plan_id}
                  onChange={(e) => setForm({ ...form, plan_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- Pilih Paket Internet --</option>
                  {Object.entries(
                    plans.reduce((acc, p) => {
                      const group = p.package_group || p.group_name || "Umum / Standar";
                      if (!acc[group]) acc[group] = [];
                      acc[group].push(p);
                      return acc;
                    }, {} as Record<string, typeof plans>)
                  ).map(([clusterName, clusterPlans]) => (
                    <optgroup key={clusterName} label={clusterName}>
                      {clusterPlans
                        .sort((a, b) => a.download_kbps - b.download_kbps)
                        .map((p) => {
                          const speedMbps = Math.round(p.download_kbps / 1024);
                          const price = p.current_price?.monthly_price || 0;
                          return (
                            <option key={p.id} value={p.id}>
                              {p.name} ({speedMbps} Mbps) — {price > 0 ? `${formatRupiah(price)}/bln` : "Custom"}
                            </option>
                          );
                        })}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Tipe Penagihan Prabayar Notice */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <span>Skema Penagihan: PRABAYAR (Bayar di Muka 30 Hari)</span>
                </div>
                <p className="text-[11px] text-emerald-700 mt-1 leading-relaxed">
                  Langganan baru dibuat dengan status <b>PENDING</b>. Sistem otomatis menerbitkan tagihan awal (bulan ke-1 + promo pasang gratis). Koneksi internet akan aktif dan perhitungan masa aktif 30 hari berjalan setelah tagihan dilunasi via QRIS / Kasir.
                </p>
              </div>

              {/* Inisialisasi Akun Akses */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    id="createAccess"
                    checked={form.createAccessAccount}
                    onChange={(e) => setForm({ ...form, createAccessAccount: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <label htmlFor="createAccess" className="font-semibold text-slate-800">
                    Buat Akun Akses Jaringan (PPPoE / Hotspot)
                  </label>
                </div>

                {form.createAccessAccount && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Tipe Akses</label>
                      <select
                        value={form.access_type}
                        onChange={(e) => setForm({ ...form, access_type: e.target.value as any })}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm"
                      >
                        <option value="PPPOE">PPPoE</option>
                        <option value="HOTSPOT">Hotspot</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Username / Identity *</label>
                        <input
                          type="text"
                          required={form.createAccessAccount}
                          placeholder="user_budi"
                          value={form.username}
                          onChange={(e) => setForm({ ...form, username: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Password *</label>
                        <input
                          type="password"
                          required={form.createAccessAccount}
                          placeholder="••••••••"
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-sm"
                        />
                      </div>
                      <div className="col-span-2 pt-1">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-slate-700">
                            IP Publik / IP Statik (Framed-IP-Address)
                          </label>
                          <button
                            type="button"
                            onClick={handleFetchFirstFreeIPForCreate}
                            disabled={fetchingIpamIP}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-2 py-0.5 rounded border border-sky-200 transition cursor-pointer disabled:opacity-50"
                          >
                            <Zap className="w-2.5 h-2.5 text-amber-500" />
                            <span>{fetchingIpamIP ? "Meminta..." : "Ambil dari phpIPAM"}</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Contoh: 103.179.65.100"
                          value={form.static_ip}
                          onChange={(e) => setForm({ ...form, static_ip: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-xs bg-white text-slate-900"
                        />
                        <p className="text-[11px] text-slate-500 mt-1">
                          Kosongkan jika pelanggan menggunakan IP dinamis dari pool MikroTik.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  placeholder="Catatan langganan / instalasi"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {submitting ? "Memproses..." : "Buat Langganan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ganti / Upgrade Paket */}
      {isChangePlanModalOpen && selectedSubForChange && (() => {
        const curPlan = plans.find((p) => p.id === selectedSubForChange.plan_id);
        const curCluster = curPlan?.package_group || curPlan?.group_name || "";

        // Distinct list of clusters from all active plans
        const allClusters = Array.from(
          new Set(plans.map((p) => p.package_group || p.group_name).filter(Boolean))
        ) as string[];

        // Effective cluster: user filter if selected, else default to current plan's cluster
        const effectiveCluster = changePlanClusterFilter || curCluster;

        // Filter plans by effective cluster
        let availablePlans = plans.filter((p) => {
          if (!effectiveCluster || effectiveCluster === "ALL") return true;
          return (p.package_group || p.group_name) === effectiveCluster;
        });

        // Fallback: if empty for any reason, show all plans
        if (availablePlans.length === 0) {
          availablePlans = plans;
        }

        availablePlans.sort((a, b) => a.download_kbps - b.download_kbps);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                    <ArrowUpCircle className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Ganti / Upgrade Paket</h2>
                    <p className="text-xs text-slate-500">Sesuaikan kecepatan dan paket internet pelanggan</p>
                  </div>
                </div>
                <button onClick={() => setIsChangePlanModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {changePlanError && (
                <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {changePlanError}
                </div>
              )}

              <form onSubmit={handleChangePlanSubmit} className="space-y-4 text-sm">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pelanggan:</span>
                    <span className="font-semibold text-slate-800">{selectedSubForChange.customer_name || selectedSubForChange.customer_number}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Cluster Wilayah:</span>
                    <span className="font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                      {curCluster || "Umum / Standar"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Paket Saat Ini:</span>
                    <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {selectedSubForChange.plan_name || "—"}
                    </span>
                  </div>
                  {selectedSubForChange.price_snapshot && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tarif Saat Ini:</span>
                      <span className="font-medium text-slate-700">{formatRupiah(selectedSubForChange.price_snapshot.monthly_price)} / bln</span>
                    </div>
                  )}
                </div>

                {/* Cluster filter selector (if admin wants to see another cluster) */}
                {allClusters.length > 1 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-600">Wilayah / Cluster Paket:</label>
                      {effectiveCluster !== curCluster && (
                        <button
                          type="button"
                          onClick={() => setChangePlanClusterFilter(curCluster)}
                          className="text-[11px] text-indigo-600 hover:underline font-medium"
                        >
                          Reset ke Cluster Pelanggan
                        </button>
                      )}
                    </div>
                    <select
                      value={effectiveCluster}
                      onChange={(e) => {
                        setChangePlanClusterFilter(e.target.value);
                        // Reset targetPlanId if not available in selected cluster
                        const inCluster = plans.find(
                          (p) => (e.target.value === "ALL" || (p.package_group || p.group_name) === e.target.value) && p.id === targetPlanId
                        );
                        if (!inCluster) {
                          setTargetPlanId("");
                        }
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {allClusters.map((cl) => (
                        <option key={cl} value={cl}>
                          {cl} {cl === curCluster ? "(Cluster Pelanggan)" : ""}
                        </option>
                      ))}
                      <option value="ALL">Semua Cluster ({plans.length} paket)</option>
                    </select>
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block font-medium text-slate-700">Pilih Paket Baru *</label>
                    <span className="text-[11px] text-slate-500">
                      Tersedia: {availablePlans.length} paket
                    </span>
                  </div>
                  <select
                    required
                    value={targetPlanId}
                    onChange={(e) => setTargetPlanId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                  >
                    <option value="">-- Pilih Paket Baru --</option>
                    {availablePlans.map((p) => {
                      const speedMbps = Math.round(p.download_kbps / 1024);
                      const price = p.current_price?.monthly_price || 0;
                      const isCurrent = p.id === selectedSubForChange.plan_id;
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name} ({speedMbps} Mbps) — {price > 0 ? `${formatRupiah(price)}/bln` : "Custom / Dedicated"} {isCurrent ? " (Saat Ini)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-slate-800">
                    <Zap className="w-3.5 h-3.5 text-indigo-600" />
                    <span>MikroTik Real-Time Sync</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Setelah disimpan, profil kecepatan di FreeRADIUS akan diperbarui seketika dan sesi PPPoE/Hotspot pelanggan di-reset otomatis agar router MikroTik langsung menerapkan limit kecepatan yang baru.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsChangePlanModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={changingPlan || !targetPlanId || targetPlanId === selectedSubForChange.plan_id}
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium text-xs hover:bg-indigo-700 disabled:bg-slate-300 transition-colors shadow-sm"
                  >
                    {changingPlan ? "Menyimpan..." : "Simpan Perubahan Paket"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Modal Atur Add-on IP Publik */}
      {isIPModalOpen && selectedAccountForIP && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                  <Globe className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Atur Addon IP Publik (PPPoE)</h2>
                  <p className="text-xs text-slate-500">Pasang atau ubah IP Publik Statik pelanggan</p>
                </div>
              </div>
              <button onClick={() => setIsIPModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {ipModalError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {ipModalError}
              </div>
            )}

            <form onSubmit={handleSaveIP} className="space-y-4 text-sm">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Pelanggan:</span>
                  <span className="font-bold text-slate-800">{selectedAccountForIP.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Username PPPoE:</span>
                  <span className="font-mono font-bold text-blue-700">{selectedAccountForIP.account.identity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Saat Ini:</span>
                  <span className="font-semibold text-slate-700">
                    {selectedAccountForIP.account.static_ip ? `IP Statik (${selectedAccountForIP.account.static_ip})` : "IP Dinamis (Default Pool)"}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Alamat IP Publik Statis (Framed-IP-Address)
                  </label>
                  <button
                    type="button"
                    onClick={handleFetchFirstFreeIP}
                    disabled={fetchingIpamIP}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-md border border-sky-200 transition cursor-pointer disabled:opacity-50"
                  >
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span>{fetchingIpamIP ? "Meminta IP..." : "Ambil IP Kosong dari phpIPAM"}</span>
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Contoh: 103.179.65.100 (atau kosongkan untuk cabut)"
                  value={ipAddressInput}
                  onChange={(e) => setIpAddressInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Kosongkan kolom ini jika ingin mencabut addon IP Publik dan mengembalikan pelanggan ke IP dinamis pool router.
                </p>
              </div>

              {/* Info Penagihan Addon */}
              <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-xl space-y-1 text-xs">
                <div className="flex items-center justify-between font-bold text-amber-900">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-amber-800" /> Penagihan Add-on IP Publik:
                  </span>
                  <span className="text-amber-800 font-extrabold font-mono">
                    {formatRupiah(addonSettings.public_ip_monthly_price)} / bulan
                  </span>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Pelanggan yang menggunakan IP Publik statik otomatis ditagihkan biaya sewa ini pada setiap faktur berkala (tarif dapat diatur di menu Pengaturan).
                </p>
              </div>

              <div className="flex items-center gap-2 p-2.5 bg-blue-50/60 border border-blue-100 rounded-lg">
                <input
                  type="checkbox"
                  id="disconnect_session_cb"
                  checked={disconnectSession}
                  onChange={(e) => setDisconnectSession(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="disconnect_session_cb" className="text-xs text-blue-900 cursor-pointer">
                  <strong>Reset koneksi sekarang (CoA Disconnect)</strong>
                  <br />
                  <span className="text-[11px] text-blue-700">Modem pelanggan langsung dial ulang untuk menerima IP baru otomatis.</span>
                </label>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                {selectedAccountForIP.account.static_ip && (
                  <button
                    type="button"
                    onClick={() => {
                      setIpAddressInput("");
                    }}
                    className="text-xs text-rose-600 hover:text-rose-800 font-medium cursor-pointer"
                  >
                    Cabut IP Publik
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsIPModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingIP}
                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm disabled:bg-amber-400"
                  >
                    {savingIP ? "Menerapkan ke MikroTik..." : "Simpan & Terapkan"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

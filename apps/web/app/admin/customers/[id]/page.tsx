"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { customerApi, type Customer, type CustomerDocumentsResponse, type DocumentSite } from "@/lib/api/customers";
import { billingApi } from "@/lib/api/billing";
import { auditApi, type AuditLog } from "@/lib/api/audit";
import { formatDate, formatRupiah, cn } from "@/lib/utils";

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "addresses" | "devices" | "documents" | "activity">("overview");

  // Document & BAST state
  const [docsData, setDocsData] = useState<CustomerDocumentsResponse | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Activity / Audit Logs state
  const [activityLogs, setActivityLogs] = useState<AuditLog[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);

  // Device modal
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [macAddress, setMacAddress] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [passpointCapable, setPasspointCapable] = useState(false);
  const [submittingDevice, setSubmittingDevice] = useState(false);

  // Credit Note & Deposit state
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [creditNotes, setCreditNotes] = useState<any[]>([]);

  // Edit Customer modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<{
    full_name: string;
    email: string;
    phone: string;
    status: "LEAD" | "ACTIVE" | "SUSPENDED" | "TERMINATED";
    notes: string;
  }>({
    full_name: "",
    email: "",
    phone: "",
    status: "ACTIVE",
    notes: "",
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);

  const loadDocs = async () => {
    try {
      setLoadingDocs(true);
      const res = await customerApi.getDocuments(resolvedParams.id);
      setDocsData(res);
    } catch (err) {
      console.error("Failed to load customer documents:", err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const loadActivityLogs = async () => {
    try {
      setLoadingActivity(true);
      const res = await auditApi.getByEntity("Customer", resolvedParams.id, 50);
      setActivityLogs(res || []);
    } catch (err) {
      console.error("Failed to load customer audit logs:", err);
    } finally {
      setLoadingActivity(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await customerApi.getByID(resolvedParams.id);
      setCustomer(res);
      // Load documents and activity in background
      loadDocs();
      loadActivityLogs();
      if (res.phone || res.customer_number) {
        billingApi.publicLookup(res.phone || res.customer_number)
          .then((bRes) => {
            if (bRes.credit_balance !== undefined) setCreditBalance(bRes.credit_balance);
            if (bRes.credit_notes) setCreditNotes(bRes.credit_notes);
          })
          .catch(() => {});
      }
    } catch (err) {
      console.error("Failed to load customer details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [resolvedParams.id]);

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    setSubmittingDevice(true);
    try {
      await customerApi.registerDevice(customer.id, {
        mac_address: macAddress,
        device_name: deviceName || undefined,
        passpoint_capable: passpointCapable,
      });
      setIsDeviceModalOpen(false);
      setMacAddress("");
      setDeviceName("");
      setPasspointCapable(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal mendaftarkan perangkat");
    } finally {
      setSubmittingDevice(false);
    }
  };

  const handleOpenEdit = () => {
    if (!customer) return;
    setEditFormData({
      full_name: customer.full_name,
      email: customer.email || "",
      phone: customer.phone,
      status: customer.status,
      notes: customer.notes || "",
    });
    setEditErrorMessage(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    setSubmittingEdit(true);
    setEditErrorMessage(null);

    try {
      await customerApi.update(customer.id, {
        ...editFormData,
        email: editFormData.email ? editFormData.email : undefined,
      });
      setIsEditModalOpen(false);
      loadData();
    } catch (err: any) {
      setEditErrorMessage(err.message || "Gagal memperbarui data pelanggan");
    } finally {
      setSubmittingEdit(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Memuat profil pelanggan...</div>;
  }

  if (!customer) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500 mb-4">Pelanggan tidak ditemukan</p>
        <Link href="/admin/customers" className="text-blue-600 hover:underline">
          Kembali ke Daftar Pelanggan
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/customers"
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{customer.full_name}</h1>
              <span className="font-mono text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
                {customer.customer_number}
              </span>
              <span
                className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                  customer.status === "ACTIVE" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                  customer.status === "LEAD" && "bg-blue-50 text-blue-700 border border-blue-200",
                  customer.status === "SUSPENDED" && "bg-amber-50 text-amber-700 border border-amber-200",
                  customer.status === "TERMINATED" && "bg-rose-50 text-rose-700 border border-rose-200"
                )}
              >
                {customer.status}
              </span>
              {Boolean(creditBalance && creditBalance > 0) && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
                  💰 Saldo Deposit: {formatRupiah(creditBalance || 0)}
                </span>
              )}
            </div>
            <p className="text-slate-500 text-xs mt-1">Terdaftar sejak {formatDate(customer.created_at)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenEdit}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-sm flex items-center gap-2 transition-colors"
          >
            <span>✏️</span>
            <span>Edit Data Pelanggan</span>
          </button>
          <Link
            href={`/admin/subscriptions?customer_id=${customer.id}`}
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 shadow-sm"
          >
            Lihat Langganan
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-6">
        <button
          onClick={() => setActiveTab("overview")}
          className={cn(
            "pb-3 text-sm font-medium border-b-2 transition-colors",
            activeTab === "overview"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          Informasi Utama
        </button>
        <button
          onClick={() => setActiveTab("addresses")}
          className={cn(
            "pb-3 text-sm font-medium border-b-2 transition-colors",
            activeTab === "addresses"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          Alamat ({customer.addresses?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("devices")}
          className={cn(
            "pb-3 text-sm font-medium border-b-2 transition-colors",
            activeTab === "devices"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          Perangkat MAC ({customer.devices?.length || 0})
        </button>
        <button
          onClick={() => {
            setActiveTab("documents");
            if (!docsData && !loadingDocs) loadDocs();
          }}
          className={cn(
            "pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5",
            activeTab === "documents"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          <span>📁</span>
          <span>Dokumen & BAST</span>
          {docsData && docsData.sites.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-700 font-bold">
              {docsData.sites.length}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            setActiveTab("activity");
            if (activityLogs.length === 0 && !loadingActivity) loadActivityLogs();
          }}
          className={cn(
            "pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5",
            activeTab === "activity"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          <span>⏱️</span>
          <span>Log Aktivitas</span>
          {activityLogs.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700 font-bold">
              {activityLogs.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Boolean(creditBalance && creditBalance > 0) && (
            <div className="md:col-span-2 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/30 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💰</span>
                  <h3 className="text-base font-bold text-slate-900">Saldo Deposit / Credit Note Pelanggan</h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  ✓ AKTIF SIAP PAKAI
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-500">Total Saldo Tersedia:</p>
                  <p className="text-2xl font-mono font-extrabold text-emerald-700">{formatRupiah(creditBalance || 0)}</p>
                </div>
                {creditNotes && creditNotes.length > 0 && (
                  <div className="text-xs text-slate-600 bg-white/80 p-3 rounded-lg border border-emerald-200">
                    <p className="font-semibold text-slate-800">Rincian Credit Note:</p>
                    <p className="mt-0.5">{creditNotes[0].reason}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Kontak Pelanggan</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Nomor Telepon</span>
                <span className="font-medium text-slate-900">{customer.phone}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Email</span>
                <span className="font-medium text-slate-900">{customer.email || "—"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Catatan</span>
                <span className="font-medium text-slate-900">{customer.notes || "—"}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Alamat Utama</h2>
            {customer.addresses && customer.addresses.length > 0 ? (
              <div className="text-sm space-y-1">
                <p className="font-medium text-slate-900">{customer.addresses[0].street}</p>
                <p className="text-slate-500">
                  {customer.addresses[0].city}
                  {customer.addresses[0].district ? `, ${customer.addresses[0].district}` : ""}
                </p>
                <p className="text-slate-500">
                  {customer.addresses[0].province} {customer.addresses[0].postal_code}
                </p>
                <p className="text-slate-500">{customer.addresses[0].country}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Belum ada data alamat</p>
            )}
          </div>
        </div>
      )}

      {activeTab === "addresses" && (
        <div className="space-y-4">
          {customer.addresses && customer.addresses.length > 0 ? (
            customer.addresses.map((a) => (
              <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm text-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                    {a.address_type}
                  </span>
                  {a.is_primary && (
                    <span className="text-xs text-blue-600 font-medium">Alamat Utama</span>
                  )}
                </div>
                <p className="font-medium text-slate-900">{a.street}</p>
                <p className="text-slate-500">
                  {a.city}, {a.district} {a.province} {a.postal_code}
                </p>
              </div>
            ))
          ) : (
            <div className="bg-white p-6 rounded-xl border text-center text-slate-500">
              Belum ada alamat tambahan
            </div>
          )}
        </div>
      )}

      {activeTab === "devices" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-800 text-sm">Daftar Perangkat MAC Terdaftar</h3>
            <button
              onClick={() => setIsDeviceModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 rounded-lg text-xs"
            >
              + Daftarkan Perangkat
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="px-5 py-3">MAC Address</th>
                  <th className="px-5 py-3">Nama Perangkat</th>
                  <th className="px-5 py-3">Passpoint / HS2.0</th>
                  <th className="px-5 py-3">Tanggal Didaftarkan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {customer.devices && customer.devices.length > 0 ? (
                  customer.devices.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-mono text-slate-900">{d.mac_address}</td>
                      <td className="px-5 py-3 text-slate-700">{d.device_name || "—"}</td>
                      <td className="px-5 py-3">
                        {d.passpoint_capable ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs border border-emerald-200">
                            Didukung
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs">{formatDate(d.registered_at)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-center text-slate-400">
                      Belum ada perangkat MAC terdaftar
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "documents" && (
        <div className="space-y-6">
          {/* Header Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
                📑
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Dokumen Onboarding & Berita Acara (BAST)</h3>
                <p className="text-xs text-slate-500">
                  Foto e-KTP, Foto Rumah/Lokasi, Tanda Tangan Kontrak Digital, dan Hasil BAST Teknisi Lapangan.
                </p>
              </div>
            </div>
            <button
              onClick={loadDocs}
              disabled={loadingDocs}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span className={cn(loadingDocs && "animate-spin")}>🔄</span>
              <span>{loadingDocs ? "Memuat..." : "Refresh Dokumen"}</span>
            </button>
          </div>

          {loadingDocs && !docsData ? (
            <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
              <div className="inline-block animate-spin text-2xl mb-2">⏳</div>
              <p className="text-sm">Menghubungkan ke Gateway Lapangan & memuat berkas pelanggan...</p>
            </div>
          ) : !docsData || docsData.sites.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
              <div className="text-3xl mb-2">📂</div>
              <p className="font-medium text-slate-700 text-sm">Belum Ada Dokumen Pendaftaran / BAST</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Pelanggan ini belum memiliki catatan pendaftaran online atau BAST lapangan yang terhubung.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {docsData.sites.map((site, index) => (
                <div key={site.registration_id || index} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Card Location Header */}
                  <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900 text-sm">
                          📍 Lokasi {index + 1}: {site.address}
                        </span>
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 font-medium">
                          {site.registration_no}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-700">
                          {site.selected_plan_name}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[11px] font-medium",
                          site.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" :
                          site.status === "INSTALLATION_SCHEDULED" ? "bg-amber-100 text-amber-800" :
                          "bg-slate-200 text-slate-700"
                        )}>
                          Status: {site.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        {site.nearest_odp_code && (
                          <span>ODP: <strong className="text-slate-700 font-mono">{site.nearest_odp_code}</strong> ({site.distance_to_odp_meters ? site.distance_to_odp_meters.toFixed(1) + ' m' : '-'})</span>
                        )}
                        {site.latitude !== 0 && (
                          <a
                            href={`https://www.google.com/maps?q=${site.latitude},${site.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <span>🗺️ Buka Peta ({site.latitude.toFixed(4)}, {site.longitude.toFixed(4)})</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3 Sections Grid */}
                  <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Section 1: Berkas Identitas */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <span className="text-base">🪪</span>
                        <h4 className="font-semibold text-slate-900 text-sm">Berkas Identitas</h4>
                      </div>

                      {/* e-KTP Photo */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5 text-xs">
                          <span className="font-medium text-slate-700">Foto e-KTP Pelanggan</span>
                          <span className="font-mono text-slate-500 text-[11px]">{site.id_card_number ? `NIK: ${site.id_card_number}` : ""}</span>
                        </div>
                        {site.ktp_photo_url ? (
                          <div
                            onClick={() => setPreviewImage({ url: site.ktp_photo_url!, title: `Foto e-KTP - ${site.full_name} (${site.id_card_number || site.registration_no})` })}
                            className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-video cursor-pointer hover:border-blue-400 transition-colors"
                          >
                            <img
                              src={site.ktp_photo_url}
                              alt="e-KTP Pelanggan"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-medium transition-opacity">
                              🔍 Klik untuk Perbesar
                            </div>
                          </div>
                        ) : (
                          <div className="p-6 rounded-lg border border-dashed border-slate-300 text-center text-xs text-slate-400">
                            Foto e-KTP belum diunggah
                          </div>
                        )}
                      </div>

                      {/* House Photo */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5 text-xs">
                          <span className="font-medium text-slate-700">Foto Rumah / Lokasi Pasang</span>
                        </div>
                        {site.house_photo_url ? (
                          <div
                            onClick={() => setPreviewImage({ url: site.house_photo_url!, title: `Foto Lokasi / Rumah - ${site.address}` })}
                            className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-video cursor-pointer hover:border-blue-400 transition-colors"
                          >
                            <img
                              src={site.house_photo_url}
                              alt="Foto Rumah / Tempat Tinggal"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-medium transition-opacity">
                              🔍 Klik untuk Perbesar
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 rounded-lg border border-dashed border-slate-200 text-center text-xs text-slate-400">
                            Foto rumah tidak tersedia
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Section 2: Kontrak Berlangganan Digital */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <span className="text-base">✍️</span>
                        <h4 className="font-semibold text-slate-900 text-sm">Kontrak Digital</h4>
                      </div>

                      <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Status Perjanjian:</span>
                          {site.contract_signed_at ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                              ✓ Ditandatangani
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                              ⏳ Menunggu Tanda Tangan
                            </span>
                          )}
                        </div>
                        {site.contract_signed_at && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Waktu Penandatanganan:</span>
                            <span className="font-medium text-slate-800">{formatDate(site.contract_signed_at)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Paket Disepakati:</span>
                          <span className="font-medium text-slate-800">{site.selected_plan_name}</span>
                        </div>
                      </div>

                      {/* Signature canvas preview */}
                      <div>
                        <span className="block font-medium text-slate-700 text-xs mb-1.5">Tanda Tangan Digital Pelanggan</span>
                        {site.contract_signature_url ? (
                          <div
                            onClick={() => setPreviewImage({ url: site.contract_signature_url!, title: `Tanda Tangan Digital Kontrak - ${site.full_name}` })}
                            className="relative group p-2 rounded-lg border border-slate-200 bg-white aspect-[3/1] flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors shadow-inner"
                          >
                            <img
                              src={site.contract_signature_url}
                              alt="Tanda Tangan Digital"
                              className="max-h-full max-w-full object-contain filter contrast-125"
                            />
                            <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-medium transition-opacity rounded-lg">
                              🔍 Perbesar Tanda Tangan
                            </div>
                          </div>
                        ) : (
                          <div className="p-6 rounded-lg border border-dashed border-slate-300 text-center text-xs text-slate-400">
                            Belum ada goresan tanda tangan digital
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Section 3: BAST Teknisi Lapangan */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <span className="text-base">🛠️</span>
                        <h4 className="font-semibold text-slate-900 text-sm">BAST & Teknisi Lapangan</h4>
                      </div>

                      {site.work_order ? (
                        <div className="space-y-3 text-xs">
                          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                            <div className="flex justify-between">
                              <span className="text-slate-500">No. SPK / Work Order:</span>
                              <span className="font-mono font-medium text-slate-900">{site.work_order.order_no}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Teknisi Bertugas:</span>
                              <span className="font-medium text-slate-800">{site.work_order.technician_name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Status Pekerjaan:</span>
                              <span className={cn(
                                "px-2 py-0.5 rounded font-medium text-[11px]",
                                site.work_order.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800 font-semibold" :
                                site.work_order.status === "ASSIGNED" ? "bg-blue-100 text-blue-800" :
                                "bg-amber-100 text-amber-800"
                              )}>
                                {site.work_order.status}
                              </span>
                            </div>
                          </div>

                          {site.work_order.bast ? (
                            <div className="space-y-3 pt-1">
                              {/* Optical Power & ONT details */}
                              <div className="grid grid-cols-2 gap-2">
                                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                                  <span className="text-slate-500 block text-[11px]">Redaman Optik</span>
                                  <span className={cn(
                                    "font-mono font-bold text-sm",
                                    site.work_order.bast.optical_power_dbm >= -24 && site.work_order.bast.optical_power_dbm <= -14
                                      ? "text-emerald-700" : "text-amber-700"
                                  )}>
                                    {site.work_order.bast.optical_power_dbm} dBm
                                  </span>
                                </div>
                                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                                  <span className="text-slate-500 block text-[11px]">Dropcore</span>
                                  <span className="font-mono font-bold text-slate-900 text-sm">
                                    {site.work_order.bast.dropcore_length_meters} meter
                                  </span>
                                </div>
                              </div>

                              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-slate-500">SN ONT:</span>
                                  <span className="font-mono font-bold text-slate-900">{site.work_order.bast.ont_serial_number}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">MAC ONT:</span>
                                  <span className="font-mono text-slate-700">{site.work_order.bast.ont_mac_address}</span>
                                </div>
                                {(site.work_order.bast.speedtest_down_mbps > 0 || site.work_order.bast.speedtest_up_mbps > 0) && (
                                  <div className="flex justify-between pt-1 border-t border-slate-200">
                                    <span className="text-slate-500">Speedtest:</span>
                                    <span className="font-semibold text-emerald-700">
                                      ↓ {site.work_order.bast.speedtest_down_mbps} Mbps / ↑ {site.work_order.bast.speedtest_up_mbps} Mbps
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Proof photo & customer signature in BAST */}
                              <div className="grid grid-cols-2 gap-2 pt-1">
                                {site.work_order.bast.proof_photo_url && (
                                  <div>
                                    <span className="block font-medium text-slate-700 text-[11px] mb-1">Bukti Pemasangan</span>
                                    <div
                                      onClick={() => setPreviewImage({ url: site.work_order!.bast!.proof_photo_url!, title: `Bukti Pemasangan BAST - ${site.work_order!.order_no}` })}
                                      className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-video cursor-pointer"
                                    >
                                      <img
                                        src={site.work_order.bast.proof_photo_url}
                                        alt="Bukti Instalasi"
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-medium transition-opacity">
                                        🔍 Zoom
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {site.work_order.bast.customer_signature_url && (
                                  <div>
                                    <span className="block font-medium text-slate-700 text-[11px] mb-1">Tanda Tangan BAST</span>
                                    <div
                                      onClick={() => setPreviewImage({ url: site.work_order!.bast!.customer_signature_url!, title: `Tanda Tangan Pelanggan BAST - ${site.work_order!.order_no}` })}
                                      className="relative group p-1 rounded-lg border border-slate-200 bg-white aspect-video flex items-center justify-center cursor-pointer shadow-inner"
                                    >
                                      <img
                                        src={site.work_order.bast.customer_signature_url}
                                        alt="Tanda Tangan BAST"
                                        className="max-h-full max-w-full object-contain"
                                      />
                                      <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-medium transition-opacity rounded-lg">
                                        🔍 Zoom
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {site.work_order.bast.notes && (
                                <p className="text-slate-500 italic text-[11px] bg-slate-50 p-2 rounded border border-slate-100">
                                  "{site.work_order.bast.notes}"
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-xs">
                              Teknisi sedang bertugas di lapangan. BAST belum diserahkan.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-6 rounded-lg border border-dashed border-slate-200 text-center text-xs text-slate-400">
                          Surat Perintah Kerja (SPK) belum diterbitkan untuk lokasi ini
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Log Aktivitas */}
      {activeTab === "activity" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Riwayat & Log Audit Pelanggan</h2>
              <p className="text-xs text-slate-500">
                Jejak rekam seluruh perubahan data, pendaftaran alamat, perangkat, dan modifikasi pelanggan.
              </p>
            </div>
            <button
              onClick={() => loadActivityLogs()}
              disabled={loadingActivity}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <span className={loadingActivity ? "animate-spin" : ""}>🔄</span>
              Refresh
            </button>
          </div>

          {loadingActivity && activityLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <div className="animate-spin text-2xl mb-2">🔄</div>
              Memuat log aktivitas...
            </div>
          ) : activityLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <span className="text-3xl block mb-2">⏱️</span>
              Belum ada riwayat aktivitas yang tercatat untuk pelanggan ini.
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-200 ml-4 space-y-6">
              {activityLogs.map((log) => (
                <div key={log.id} className="relative pl-6">
                  {/* Timeline dot */}
                  <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-blue-600 border-2 border-white ring-2 ring-blue-100" />
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 hover:border-slate-300 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-xs font-bold font-mono uppercase",
                          log.action.includes("CREATE") || log.action.includes("REGISTER") || log.action.includes("ADD")
                            ? "bg-emerald-100 text-emerald-800"
                            : log.action.includes("UPDATE")
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-200 text-slate-800"
                        )}>
                          {log.action}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <span className="text-slate-400">Oleh:</span>
                        <span className="font-semibold text-slate-700">{log.actor_email || log.actor_type}</span>
                      </div>
                    </div>

                    <p className="text-sm text-slate-800 font-medium">
                      {log.description}
                    </p>

                    {(log.old_values || log.new_values) && (
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => setSelectedAuditLog(log)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 hover:underline"
                        >
                          <span>🔍</span> Lihat Detail Perubahan Data
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {/* Modal Tambah Device */}
      {isDeviceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Daftarkan Perangkat Baru</h2>
            <form onSubmit={handleAddDevice} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium text-slate-700 mb-1">MAC Address *</label>
                <input
                  type="text"
                  required
                  placeholder="AA:BB:CC:DD:EE:FF"
                  value={macAddress}
                  onChange={(e) => setMacAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nama Perangkat</label>
                <input
                  type="text"
                  placeholder="Laptop Kerja / iPhone Budi"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="passpoint_capable"
                  checked={passpointCapable}
                  onChange={(e) => setPasspointCapable(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600"
                />
                <label htmlFor="passpoint_capable" className="text-slate-700 font-medium">
                  Mendukung Hotspot 2.0 / Passpoint
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsDeviceModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingDevice}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {submittingDevice ? "Menyimpan..." : "Daftarkan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Pelanggan */}
      {isEditModalOpen && customer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-50 text-blue-600 rounded-lg text-lg">✏️</span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Edit Data Pelanggan</h2>
                  <p className="text-xs text-slate-500 font-mono">{customer.customer_number}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {editErrorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                {editErrorMessage}
              </div>
            )}

            <form onSubmit={handleUpdateCustomer} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={editFormData.full_name}
                  onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nomor Telepon / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Status Pelanggan *</label>
                <select
                  required
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="LEAD">LEAD (Prospek)</option>
                  <option value="ACTIVE">ACTIVE (Aktif Berlangganan)</option>
                  <option value="SUSPENDED">SUSPENDED (Ditangguhkan / Isolir)</option>
                  <option value="TERMINATED">TERMINATED (Berhenti Berlangganan)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Keterangan pelanggan, PIC, atau catatan khusus"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-blue-400 text-xs shadow-sm transition-colors"
                >
                  {submittingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Preview Gambar / Tanda Tangan */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate pr-4">
                {previewImage.title}
              </h3>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-medium flex items-center gap-1"
                >
                  <span>⬇️</span>
                  <span className="hidden sm:inline">Buka Ukuran Asli</span>
                </a>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-950/5 rounded-xl p-2 min-h-[300px]">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Audit Log */}
      {selectedAuditLog && (
        <div
          onClick={() => setSelectedAuditLog(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Detail Perubahan: {selectedAuditLog.action}
                </h3>
                <p className="text-xs text-slate-500">
                  {formatDate(selectedAuditLog.created_at)} • {selectedAuditLog.actor_email || selectedAuditLog.actor_type}
                </p>
              </div>
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700">
                {selectedAuditLog.description}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-amber-700 mb-1">Nilai Sebelumnya (Old):</h4>
                  <pre className="p-3 bg-slate-900 text-amber-300 rounded-lg overflow-x-auto max-h-56 font-mono text-[11px]">
                    {selectedAuditLog.old_values && Object.keys(selectedAuditLog.old_values).length > 0
                      ? JSON.stringify(selectedAuditLog.old_values, null, 2)
                      : "null"}
                  </pre>
                </div>
                <div>
                  <h4 className="font-semibold text-emerald-700 mb-1">Nilai Baru (New):</h4>
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg overflow-x-auto max-h-56 font-mono text-[11px]">
                    {selectedAuditLog.new_values && Object.keys(selectedAuditLog.new_values).length > 0
                      ? JSON.stringify(selectedAuditLog.new_values, null, 2)
                      : "null"}
                  </pre>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
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

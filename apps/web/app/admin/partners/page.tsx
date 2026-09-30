"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Plus,
  ArrowUpRight,
  Wallet,
  TrendingUp,
  Percent,
  Search,
  CheckCircle2,
  Clock,
  Building,
  Phone,
  CreditCard,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import {
  partnerApi,
  Partner,
  RevenueShare,
  Settlement,
  CreatePartnerInput,
  CreateSettlementInput,
} from "@/lib/api/partners";
import { formatRupiah, formatDate } from "@/lib/utils";

export default function AdminPartnersPage() {
  const [activeTab, setActiveTab] = useState<"partners" | "settlements">("partners");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isAddPartnerOpen, setIsAddPartnerOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [sharesModalOpen, setSharesModalOpen] = useState(false);
  const [partnerShares, setPartnerShares] = useState<RevenueShare[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);

  // Form State Partner
  const [partnerForm, setPartnerForm] = useState<CreatePartnerInput>({
    code: "",
    name: "",
    company_name: "",
    contact_person: "",
    phone: "",
    email: "",
    share_type: "PERCENTAGE",
    partner_share_bps: 5000, // 50%
    isp_share_bps: 5000,     // 50%
    flat_fee_amount: 0,
    bank_name: "BCA",
    bank_account_number: "",
    bank_account_holder: "",
    notes: "",
  });

  // Form State Settlement
  const [settlementForm, setSettlementForm] = useState<CreateSettlementInput>({
    partner_id: "",
    amount: 100000,
    bank_name: "",
    bank_account_number: "",
    bank_account_holder: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, sRes] = await Promise.all([
        partnerApi.list(),
        partnerApi.listSettlements(),
      ]);
      setPartners(pRes || []);
      setSettlements(sRes || []);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data mitra & bagi hasil");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await partnerApi.create(partnerForm);
      setIsAddPartnerOpen(false);
      setPartnerForm({
        code: "",
        name: "",
        company_name: "",
        contact_person: "",
        phone: "",
        email: "",
        share_type: "PERCENTAGE",
        partner_share_bps: 7000,
        isp_share_bps: 3000,
        flat_fee_amount: 0,
        bank_name: "BCA",
        bank_account_number: "",
        bank_account_holder: "",
        notes: "",
      });
      loadData();
    } catch (err: any) {
      setError(err.message || "Gagal mendaftarkan mitra baru");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await partnerApi.createSettlement(settlementForm);
      setIsWithdrawOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || "Gagal mengajukan penarikan saldo bagi hasil");
    } finally {
      setSubmitting(false);
    }
  };

  const openShares = async (p: Partner) => {
    setSelectedPartner(p);
    setSharesModalOpen(true);
    setLoadingShares(true);
    try {
      const shares = await partnerApi.listRevenueShares(p.id);
      setPartnerShares(shares || []);
    } catch (err: any) {
      alert(err.message || "Gagal memuat riwayat bagi hasil");
    } finally {
      setLoadingShares(false);
    }
  };

  const openWithdrawModal = (p: Partner) => {
    setSelectedPartner(p);
    setSettlementForm({
      partner_id: p.id,
      amount: p.balance > 50000 ? p.balance : 50000,
      bank_name: p.bank_name || "BCA",
      bank_account_number: p.bank_account_number || "",
      bank_account_holder: p.bank_account_holder || p.contact_person,
      notes: "Pencairan bagi hasil bulan berjalan",
    });
    setIsWithdrawOpen(true);
  };

  const handleApproveSettlement = async (s: Settlement) => {
    if (!confirm(`Konfirmasi pembayaran pencairan dana sebesar ${formatRupiah(s.amount)} ke rekening ${s.bank_name} ${s.bank_account_number}?`)) return;
    try {
      await partnerApi.processSettlement(s.id, {
        status: "PAID",
        notes: "Ditransfer melalui rekening kasir utama",
      });
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal memproses pencairan");
    }
  };

  // Metrics
  const totalPartnerBalance = partners.reduce((sum, p) => sum + p.balance, 0);
  const totalPartnerCustomers = partners.reduce((sum, p) => sum + p.customer_count, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kemitraan ISP & Bagi Hasil</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manajemen mitra reseller, sub-ISP wilayah, sistem revenue sharing otomatis, dan pencairan saldo
          </p>
        </div>
        <button
          onClick={() => setIsAddPartnerOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tambah Mitra Baru</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Total Mitra Reseller</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{partners.length} Mitra</span>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Building className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Pelanggan di Bawah Mitra</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{totalPartnerCustomers} Pelanggan</span>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Total Saldo Dompet Mitra</span>
            <span className="text-2xl font-black text-emerald-700 mt-1 block">{formatRupiah(totalPartnerBalance)}</span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab("partners")}
          className={`pb-3 font-bold text-sm border-b-2 transition ${
            activeTab === "partners"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Daftar Mitra Reseller ({partners.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("settlements")}
          className={`pb-3 font-bold text-sm border-b-2 transition ${
            activeTab === "settlements"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Riwayat Pencairan Dana ({settlements.length})
        </button>
      </div>

      {/* TAB 1: PARTNERS LIST */}
      {activeTab === "partners" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-4">Kode & Nama Mitra</th>
                  <th className="p-4">Penanggung Jawab</th>
                  <th className="p-4">Skema Bagi Hasil</th>
                  <th className="p-4 text-center">Pelanggan</th>
                  <th className="p-4 text-right">Saldo Dompet</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Memuat daftar mitra...
                    </td>
                  </tr>
                ) : partners.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Belum ada mitra reseller terdaftar. Klik "+ Tambah Mitra Baru" untuk mulai.
                    </td>
                  </tr>
                ) : (
                  partners.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition">
                      <td className="p-4">
                        <span className="font-extrabold text-sm text-slate-900 block">{p.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[11px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">
                            {p.code}
                          </span>
                          {p.company_name && (
                            <span className="text-slate-500 text-[11px]">{p.company_name}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-slate-800 block">{p.contact_person}</span>
                        <span className="text-slate-500 font-mono text-[11px]">{p.phone}</span>
                      </td>
                      <td className="p-4">
                        {p.share_type === "PERCENTAGE" ? (
                          <div>
                            <span className="font-extrabold text-emerald-700">
                              {p.partner_share_bps / 100}% Mitra
                            </span>
                            <span className="text-slate-400 text-[11px] block">
                              ({p.isp_share_bps / 100}% Core ISP)
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="font-extrabold text-blue-700">Flat Bandwidth</span>
                            <span className="text-slate-500 text-[11px] block">
                              ISP: {formatRupiah(p.flat_fee_amount)}/user
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-full text-xs">
                          {p.customer_count} User
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-black text-sm text-emerald-700 block">
                          {formatRupiah(p.balance)}
                        </span>
                        {p.bank_name && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {p.bank_name} {p.bank_account_number}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800">
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => openShares(p)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
                        >
                          Riwayat Bagi Hasil
                        </button>
                        <button
                          type="button"
                          onClick={() => openWithdrawModal(p)}
                          disabled={p.balance < 10000}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold rounded-lg text-xs"
                        >
                          Cairkan Dana
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

      {/* TAB 2: SETTLEMENTS */}
      {activeTab === "settlements" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-4">Nomor & Tanggal</th>
                  <th className="p-4">Nama Mitra</th>
                  <th className="p-4">Rekening Tujuan</th>
                  <th className="p-4 text-right">Nominal Pencairan</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Aksi Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {settlements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      Belum ada permohonan pencairan dana bagi hasil.
                    </td>
                  </tr>
                ) : (
                  settlements.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition">
                      <td className="p-4">
                        <span className="font-mono font-bold text-slate-800 block">{s.settlement_number}</span>
                        <span className="text-slate-400 text-[11px]">{formatDate(s.requested_at)}</span>
                      </td>
                      <td className="p-4 font-bold text-slate-900">{s.partner_name}</td>
                      <td className="p-4">
                        <span className="font-semibold text-slate-800 block">{s.bank_name} - {s.bank_account_number}</span>
                        <span className="text-slate-500 text-[11px]">a.n. {s.bank_account_holder}</span>
                      </td>
                      <td className="p-4 text-right font-black text-sm text-slate-900">
                        {formatRupiah(s.amount)}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            s.status === "PAID"
                              ? "bg-emerald-100 text-emerald-800"
                              : s.status === "PENDING"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {s.status === "PENDING" && (
                          <button
                            type="button"
                            onClick={() => handleApproveSettlement(s)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs"
                          >
                            Konfirmasi Transfer
                          </button>
                        )}
                        {s.status === "PAID" && (
                          <span className="text-emerald-600 font-semibold flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Lunas Ditransfer
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Tambah Mitra Baru */}
      {isAddPartnerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-slate-900 mb-1">Daftarkan Mitra Reseller Baru</h3>
            <p className="text-xs text-slate-500 mb-4">
              Konfigurasi skema revenue sharing otomatis untuk mitra regional atau ISP Lokal & Mitra Distribusi.
            </p>

            <form onSubmit={handleCreatePartner} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kode Unik Mitra *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PTR-SBY-01"
                    value={partnerForm.code}
                    onChange={(e) => setPartnerForm({ ...partnerForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Brand Mitra *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: NetKilat Surabaya"
                    value={partnerForm.name}
                    onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Penanggung Jawab *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Pemilik Mitra"
                    value={partnerForm.contact_person}
                    onChange={(e) => setPartnerForm({ ...partnerForm, contact_person: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    placeholder="08123456789"
                    value={partnerForm.phone}
                    onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Skema Bagi Hasil */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">Skema Pembagian Hasil</label>
                  <div className="flex gap-1">
                    {[
                      { label: "50:50", partner: 50, isp: 50 },
                      { label: "60:40", partner: 60, isp: 40 },
                      { label: "70:30", partner: 70, isp: 30 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() =>
                          setPartnerForm({
                            ...partnerForm,
                            partner_share_bps: preset.partner * 100,
                            isp_share_bps: preset.isp * 100,
                          })
                        }
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all ${
                          partnerForm.partner_share_bps === preset.partner * 100
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1 font-medium">Porsi Mitra (%):</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={partnerForm.partner_share_bps / 100}
                      onChange={(e) => {
                        const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                        setPartnerForm({
                          ...partnerForm,
                          partner_share_bps: val * 100,
                          isp_share_bps: (100 - val) * 100,
                        });
                      }}
                      className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1 font-medium">Porsi Core ISP (%):</label>
                    <input
                      type="number"
                      disabled
                      value={partnerForm.isp_share_bps / 100}
                      className="w-full px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg bg-slate-100 text-slate-500"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  *Dihitung dari <b>Subtotal (sebelum PPN)</b>. Mitra menerima {partnerForm.partner_share_bps / 100}% dan Core ISP menerima {partnerForm.isp_share_bps / 100}%.
                </p>
              </div>

              {/* Rekening Bank Mitra */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Bank</label>
                  <input
                    type="text"
                    placeholder="BCA/Mandiri"
                    value={partnerForm.bank_name || ""}
                    onChange={(e) => setPartnerForm({ ...partnerForm, bank_name: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nomor Rekening</label>
                  <input
                    type="text"
                    placeholder="1234567890"
                    value={partnerForm.bank_account_number || ""}
                    onChange={(e) => setPartnerForm({ ...partnerForm, bank_account_number: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddPartnerOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-sm"
                >
                  {submitting ? "Menyimpan..." : "Daftarkan Mitra"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Permohonan Pencairan Dana (Withdraw) */}
      {isWithdrawOpen && selectedPartner && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-black text-slate-900 mb-1">Pencairan Saldo Bagi Hasil</h3>
            <p className="text-xs text-slate-500 mb-4">
              Mitra: <strong>{selectedPartner.name}</strong> (Saldo Tersedia: <strong>{formatRupiah(selectedPartner.balance)}</strong>)
            </p>

            <form onSubmit={handleCreateSettlement} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nominal Pencairan (Rp) *</label>
                <input
                  type="number"
                  required
                  min={50000}
                  max={selectedPartner.balance}
                  value={settlementForm.amount}
                  onChange={(e) => setSettlementForm({ ...settlementForm, amount: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm font-black text-emerald-700 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bank Tujuan *</label>
                <input
                  type="text"
                  required
                  value={settlementForm.bank_name}
                  onChange={(e) => setSettlementForm({ ...settlementForm, bank_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Rekening & Atas Nama *</label>
                <input
                  type="text"
                  required
                  placeholder="Nomor Rekening"
                  value={settlementForm.bank_account_number}
                  onChange={(e) => setSettlementForm({ ...settlementForm, bank_account_number: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl mb-2"
                />
                <input
                  type="text"
                  required
                  placeholder="Nama Pemilik Rekening"
                  value={settlementForm.bank_account_holder}
                  onChange={(e) => setSettlementForm({ ...settlementForm, bank_account_holder: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsWithdrawOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || settlementForm.amount > selectedPartner.balance}
                  className="px-5 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-sm"
                >
                  {submitting ? "Memproses..." : "Ajukan Pencairan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Riwayat Bagi Hasil Per Transaksi */}
      {sharesModalOpen && selectedPartner && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Riwayat Bagi Hasil Transaksi</h3>
                <p className="text-xs text-slate-500">Mitra: {selectedPartner.name} ({selectedPartner.code})</p>
              </div>
              <button
                type="button"
                onClick={() => setSharesModalOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg"
              >
                Tutup
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {loadingShares ? (
                <div className="p-8 text-center text-slate-400 text-xs">Memuat riwayat...</div>
              ) : partnerShares.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">Belum ada transaksi pembayaran dari pelanggan mitra ini.</div>
              ) : (
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                      <tr>
                        <th className="p-3">Faktur & Pelanggan</th>
                        <th className="p-3 text-right">Nilai Tagihan</th>
                        <th className="p-3 text-right text-emerald-700">Hak Mitra</th>
                        <th className="p-3 text-right text-blue-700">Hak Core ISP</th>
                        <th className="p-3 text-center">Tanggal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {partnerShares.map((rs) => (
                        <tr key={rs.id}>
                          <td className="p-3">
                            <span className="font-mono font-bold text-slate-800 block">{rs.invoice_number}</span>
                            <span className="text-slate-500 text-[11px]">{rs.customer_name}</span>
                          </td>
                          <td className="p-3 text-right font-semibold">{formatRupiah(rs.gross_amount)}</td>
                          <td className="p-3 text-right font-black text-emerald-700">+{formatRupiah(rs.partner_amount)}</td>
                          <td className="p-3 text-right font-bold text-blue-700">+{formatRupiah(rs.isp_amount)}</td>
                          <td className="p-3 text-center text-[11px] text-slate-400">{formatDate(rs.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

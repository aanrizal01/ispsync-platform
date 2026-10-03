"use client";

import React, { useState, useEffect } from "react";
import {
  Wifi,
  Plus,
  Download,
  Ban,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Globe,
  Radio,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  UserPlus,
  Check,
  KeyRound,
  QrCode,
  Info,
} from "lucide-react";
import {
  passpointApi,
  PasspointProfile,
  PasspointCredential,
  CreatePasspointProfileInput,
} from "@/lib/api/passpoint";
import { customerApi, Customer } from "@/lib/api/customers";

export default function AdminPasspointPage() {
  const [activeTab, setActiveTab] = useState<"credentials" | "profiles">("credentials");
  const [profiles, setProfiles] = useState<PasspointProfile[]>([]);
  const [credentials, setCredentials] = useState<PasspointCredential[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [issuedCredential, setIssuedCredential] = useState<PasspointCredential | null>(null);

  // Password visibility map & copy indicator
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Issue Credential Form
  const [issueMode, setIssueMode] = useState<"existing" | "new">("existing");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [issueLoading, setIssueLoading] = useState(false);

  // Create Profile Form
  const [profileForm, setProfileForm] = useState<CreatePasspointProfileInput>({
    name: "",
    operator_friendly_name: "",
    domain_name: "",
    realm: "",
    roaming_consortium_ois: ["BAA2D00000"],
    eap_method: "EAP-TTLS",
    inner_auth: "MSCHAPv2",
    is_default: false,
  });
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profRes, credRes] = await Promise.all([
        passpointApi.getProfiles(),
        passpointApi.getCredentials(1, 50),
      ]);
      const profList = Array.isArray(profRes) ? profRes : (profRes as any)?.data || [];
      const credList = Array.isArray(credRes) ? credRes : (credRes as any)?.data || [];
      setProfiles(profList);
      setCredentials(credList);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data Passpoint");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswordMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openIssueModal = async () => {
    setShowIssueModal(true);
    try {
      const res: any = await customerApi.list({ limit: 100 });
      setCustomers(Array.isArray(res) ? res : res?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleIssueCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    setIssueLoading(true);
    try {
      let customerIdToUse = selectedCustomerId;

      // Jika mode 'new' (buat pelanggan / tamu baru cepat)
      if (issueMode === "new") {
        if (!newCustomerName || !newCustomerPhone) {
          alert("Silakan isi nama dan nomor HP terlebih dahulu!");
          setIssueLoading(false);
          return;
        }
        const createdCustomer = await customerApi.create({
          full_name: newCustomerName,
          phone: newCustomerPhone,
          street: "Passpoint User",
          city: "Pekanbaru",
        });
        customerIdToUse = createdCustomer.id;
      }

      if (!customerIdToUse) {
        alert("Pilih atau masukkan pelanggan terlebih dahulu!");
        setIssueLoading(false);
        return;
      }

      const newCred = await passpointApi.issueCredential(customerIdToUse, {
        profile_id: selectedProfileId || undefined,
      });

      setShowIssueModal(false);
      setSelectedCustomerId("");
      setNewCustomerName("");
      setNewCustomerPhone("");
      setSelectedProfileId("");
      fetchData();

      // Langsung buka modal detail kredensial agar admin bisa salin & download profil
      setIssuedCredential(newCred);
    } catch (err: any) {
      alert(err.message || "Gagal menerbitkan kredensial");
    } finally {
      setIssueLoading(false);
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      await passpointApi.createProfile(profileForm);
      setShowProfileModal(false);
      setProfileForm({
        name: "",
        operator_friendly_name: "",
        domain_name: "",
        realm: "",
        roaming_consortium_ois: ["BAA2D00000"],
        eap_method: "EAP-TTLS",
        inner_auth: "MSCHAPv2",
        is_default: false,
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || "Gagal membuat profil");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleRevokeCredential = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin mencabut kredensial Passpoint ini?")) return;
    try {
      await passpointApi.revokeCredential(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Gagal mencabut kredensial");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Radio className="w-6 h-6 text-blue-600" />
            Passpoint / Hotspot 2.0 (EAP-TTLS)
          </h1>
          <p className="text-sm text-slate-500">
            Akses Wi-Fi otomatis terenkripsi WPA2/WPA3 Enterprise, profil Apple .mobileconfig, dan OpenRoaming.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowProfileModal(true)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-lg transition"
          >
            + Profil Jaringan
          </button>
          <button
            onClick={openIssueModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Terbitkan Kredensial
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Profil Passpoint</p>
            <p className="text-2xl font-bold text-slate-900">{profiles.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Kredensial Aktif</p>
            <p className="text-2xl font-bold text-emerald-600">
              {credentials.filter((c) => c.status === "ACTIVE").length}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Portal Onboarding</p>
            <a
              href="/passpoint"
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1 mt-1"
            >
              Buka Halaman Publik <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 px-6 pt-4 gap-6">
          <button
            onClick={() => setActiveTab("credentials")}
            className={`pb-3 text-sm font-semibold border-b-2 transition ${
              activeTab === "credentials"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Kredensial Pengguna ({credentials.length})
          </button>
          <button
            onClick={() => setActiveTab("profiles")}
            className={`pb-3 text-sm font-semibold border-b-2 transition ${
              activeTab === "profiles"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Profil Jaringan / Realm ({profiles.length})
          </button>
        </div>

        {/* Tab 1: Credentials */}
        {activeTab === "credentials" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">Pelanggan</th>
                  <th className="px-6 py-3">Username EAP (Identity)</th>
                  <th className="px-6 py-3">Password WiFi (EAP)</th>
                  <th className="px-6 py-3">Profil &amp; Paket</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Masa Aktif &amp; Kadaluarsa</th>
                  <th className="px-6 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                      Memuat daftar kredensial...
                    </td>
                  </tr>
                ) : credentials.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                      Belum ada kredensial Passpoint yang diterbitkan.
                    </td>
                  </tr>
                ) : (
                  credentials.map((c) => {
                    const expDate = c.expires_at ? new Date(c.expires_at) : null;
                    const createdDate = new Date(c.created_at);
                    const now = new Date();
                    const isExpired = expDate ? expDate.getTime() < now.getTime() : false;
                    const daysRemaining = expDate ? Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

                    return (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{c.customer_name || "-"}</div>
                        <div className="text-xs text-slate-400">{c.customer_number}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-blue-700 font-semibold">{c.username}</td>
                      <td className="px-6 py-4 font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-800 font-bold">
                            {showPasswordMap[c.id] ? c.password : "••••••••••••"}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(c.id)}
                            className="p-1 text-slate-400 hover:text-slate-700"
                            title={showPasswordMap[c.id] ? "Sembunyikan Password" : "Lihat Password"}
                          >
                            {showPasswordMap[c.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          {c.password && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(c.password!, `pwd-${c.id}`)}
                              className="p-1 text-slate-400 hover:text-blue-600"
                              title="Salin Password"
                            >
                              {copiedField === `pwd-${c.id}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-xs text-slate-800">{c.package_name || "Passpoint Standar"}</div>
                        <div className="text-[11px] text-slate-400">{c.profile_name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            c.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-800"
                              : c.status === "REVOKED"
                              ? "bg-red-100 text-red-800"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            {isExpired ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Kadaluarsa
                              </span>
                            ) : daysRemaining !== null ? (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                daysRemaining <= 3 
                                  ? "bg-amber-50 text-amber-700 border border-amber-200" 
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}>
                                {daysRemaining} Hari Lagi
                              </span>
                            ) : null}
                          </div>
                          <div className="text-[11.5px] font-semibold text-slate-700">
                            <span className="text-slate-400 font-normal">Exp:</span> {expDate ? expDate.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Dibuat: {createdDate.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setIssuedCredential(c)}
                          title="Lihat Detail Kredensial & Panduan Setup"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 rounded border border-slate-200 shadow-2xs"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                          Detail
                        </button>
                        <a
                          href={passpointApi.getAppleProfileUrl(c.id)}
                          download
                          title="Unduh Apple .mobileconfig"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded border border-blue-200"
                        >
                          <Download className="w-3.5 h-3.5" />
                          .mobileconfig
                        </a>
                        {c.status === "ACTIVE" && (
                          <button
                            onClick={() => handleRevokeCredential(c.id)}
                            title="Cabut Akses"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded border border-red-200"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            Cabut
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Profiles */}
        {activeTab === "profiles" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">Nama Profil</th>
                  <th className="px-6 py-3">Operator Name</th>
                  <th className="px-6 py-3">Domain / Realm</th>
                  <th className="px-6 py-3">Metode EAP</th>
                  <th className="px-6 py-3">Roaming OIs</th>
                  <th className="px-6 py-3">Default</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {profiles.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 font-semibold text-slate-900">{p.name}</td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-700">{p.operator_friendly_name}</td>
                    <td className="px-6 py-4 text-xs font-mono">
                      <div>{p.domain_name}</div>
                      <div className="text-slate-400">{p.realm}</div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="font-semibold text-indigo-700">{p.eap_method}</span> / {p.inner_auth}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-500">
                      {p.roaming_consortium_ois ? p.roaming_consortium_ois.join(", ") : "-"}
                    </td>
                    <td className="px-6 py-4">
                      {p.is_default ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Default
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Issue Credential */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-600" />
              Terbitkan Kredensial Passpoint
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Kredensial otomatis disinkronisasi ke AAA FreeRADIUS dengan metode autentikasi WPA2-Enterprise (EAP-TTLS/MSCHAPv2).
            </p>

            {/* Mode Selector */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setIssueMode("existing")}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  issueMode === "existing"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Pilih Pelanggan ({customers.length})
              </button>
              <button
                type="button"
                onClick={() => setIssueMode("new")}
                className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
                  issueMode === "new"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                Buat Tamu / Tester Baru
              </button>
            </div>

            <form onSubmit={handleIssueCredential} className="space-y-3.5">
              {issueMode === "existing" ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Pelanggan *</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required={issueMode === "existing"}
                  >
                    <option value="">-- Pilih Pelanggan --</option>
                    {customers.map((cust) => (
                      <option key={cust.id} value={cust.id}>
                        {cust.full_name} ({cust.customer_number})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap / Identitas *</label>
                    <input
                      type="text"
                      placeholder="e.g. Tester HP Grandstream / Tamu Kantor"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      required={issueMode === "new"}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor WhatsApp / HP *</label>
                    <input
                      type="text"
                      placeholder="e.g. 081234567890"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      required={issueMode === "new"}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Profil Jaringan (Opsional)</label>
                <select
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Gunakan Profil Default Sistem</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.operator_friendly_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={issueLoading}
                  className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50 shadow-sm"
                >
                  {issueLoading ? "Menerbitkan..." : "Terbitkan Kredensial"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Issued Credential Detail & Guide */}
      {issuedCredential && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Kredensial Passpoint Siap!</h3>
                  <p className="text-xs text-slate-500">
                    Akun Passpoint aktif & terdaftar di AAA FreeRADIUS.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIssuedCredential(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
              <div className="text-xs font-semibold text-blue-900">Informasi Kredensial Pengguna:</div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Nama Pelanggan:</label>
                <div className="text-sm font-bold text-slate-900">
                  {issuedCredential.customer_name || "Pelanggan Passpoint"} ({issuedCredential.customer_number || "-"})
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Username EAP (Identity):</label>
                <div className="flex items-center justify-between bg-white border border-blue-200 rounded-xl px-3 py-2">
                  <span className="font-mono text-xs font-bold text-blue-700 select-all">
                    {issuedCredential.username}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(issuedCredential.username, "pop-user")}
                    className="p-1 text-slate-400 hover:text-blue-600"
                    title="Salin Username"
                  >
                    {copiedField === "pop-user" ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Password WiFi / EAP:</label>
                <div className="flex items-center justify-between bg-white border border-blue-200 rounded-xl px-3 py-2">
                  <span className="font-mono text-xs font-bold text-slate-900 select-all">
                    {showPasswordMap["pop-pwd"] ? issuedCredential.password : "••••••••••••"}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility("pop-pwd")}
                      className="p-1 text-slate-400 hover:text-slate-700"
                      title={showPasswordMap["pop-pwd"] ? "Sembunyikan" : "Tampilkan"}
                    >
                      {showPasswordMap["pop-pwd"] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-blue-600" />}
                    </button>
                    {issuedCredential.password && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(issuedCredential.password!, "pop-pwd-btn")}
                        className="p-1 text-slate-400 hover:text-blue-600"
                        title="Salin Password"
                      >
                        {copiedField === "pop-pwd-btn" ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div>
                  <span className="text-slate-500">Paket:</span> <span className="font-bold text-slate-800">{issuedCredential.package_name || "Passpoint Standar"}</span>
                </div>
                <div>
                  <span className="text-slate-500">Masa Berlaku:</span>{" "}
                  <span className="font-bold text-emerald-700">
                    {issuedCredential.expires_at ? new Date(issuedCredential.expires_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "30 Hari"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-blue-200/60">
                <div>
                  <span className="text-slate-500">Domain:</span> <span className="font-bold text-slate-800">wifi.ispsync.id</span>
                </div>
                <div>
                  <span className="text-slate-500">Metode:</span> <span className="font-bold text-slate-800">TTLS / MSCHAPv2</span>
                </div>
              </div>
            </div>

            {/* Quick Actions & Setup */}
            <div className="space-y-2">
              <a
                href={passpointApi.getAppleProfileUrl(issuedCredential.id)}
                download
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                Unduh Profil Apple (.mobileconfig) untuk iPhone / iPad / Mac
              </a>
              <p className="text-[11px] text-slate-500 text-center">
                *Buka file di Safari / Pengaturan iOS untuk langsung menghubungkan otomatis.
              </p>
            </div>

            {/* Android Instructions */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-slate-600" />
                Panduan untuk HP Android:
              </div>
              <div>1. Sambungkan ke WiFi SSID: <b>Passpoint / Hotspot 2.0</b></div>
              <div>2. EAP Method: <b>TTLS</b>, Phase 2: <b>MSCHAPV2</b></div>
              <div>3. CA Certificate: <b>Do not validate</b></div>
              <div>4. Identity: <b>{issuedCredential.username}</b></div>
              <div>5. Password: Masukkan password di atas</div>
              <div>6. Domain: <b>wifi.ispsync.id</b></div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIssuedCredential(null)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Profile */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Buat Profil Jaringan Passpoint</h3>
            <form onSubmit={handleCreateProfile} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Profil Internal</label>
                <input
                  type="text"
                  placeholder="e.g. Profil Mall & Public Hubs"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Operator Friendly Name</label>
                <input
                  type="text"
                  placeholder="e.g. GigaBill Ultra WiFi"
                  value={profileForm.operator_friendly_name}
                  onChange={(e) => setProfileForm({ ...profileForm, operator_friendly_name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Domain Name</label>
                  <input
                    type="text"
                    placeholder="wifi.isp.local"
                    value={profileForm.domain_name}
                    onChange={(e) => setProfileForm({ ...profileForm, domain_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">NAI Realm</label>
                  <input
                    type="text"
                    placeholder="isp.local"
                    value={profileForm.realm}
                    onChange={(e) => setProfileForm({ ...profileForm, realm: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono text-xs"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={profileForm.is_default}
                  onChange={(e) => setProfileForm({ ...profileForm, is_default: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_default" className="text-xs font-medium text-slate-700">
                  Jadikan sebagai Profil Default Sistem
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50"
                >
                  {profileLoading ? "Menyimpan..." : "Simpan Profil"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

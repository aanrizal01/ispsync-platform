"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { agentApi } from "@/lib/api/agents";
import {
  Store,
  Wallet,
  Percent,
  Lock,
  Mail,
  User,
  Phone,
  MapPin,
  CreditCard,
  UploadCloud,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  Check,
  Building,
} from "lucide-react";

export default function AgentRegisterPage() {
  const router = useRouter();

  // Tenant profile
  const [tenantName, setTenantName] = useState("ISPSYNC");
  const [tenantLegalName, setTenantLegalName] = useState("");
  const [tenantLogo, setTenantLogo] = useState("");

  // Form states
  const [form, setForm] = useState({
    name: "",
    company_name: "",
    referral_code: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    id_card_number: "",
    address: "",
    bank_name: "BCA",
    bank_account_number: "",
    bank_account_holder: "",
  });

  const [ktpUrl, setKtpUrl] = useState<string>("");
  const [businessPhotoUrl, setBusinessPhotoUrl] = useState<string>("");
  const [ktpUploading, setKtpUploading] = useState(false);
  const [businessPhotoUploading, setBusinessPhotoUploading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [agreedPks, setAgreedPks] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    code: string;
    name: string;
    company_name?: string;
  } | null>(null);

  const ktpInputRef = useRef<HTMLInputElement>(null);
  const businessInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Detect tenant from host
    if (typeof window !== "undefined") {
      const parts = window.location.hostname.split(".");
      let detectedSlug = "dev";
      if (parts.length >= 4 && (parts[0] === "ledger" || parts[0] === "hotspot" || parts[0] === "agent")) {
        detectedSlug = parts[1].toLowerCase();
      } else if (parts.length >= 3 && parts[0] !== "www") {
        detectedSlug = parts[0].toLowerCase();
      }
      if (detectedSlug && detectedSlug !== "localhost" && detectedSlug !== "127") {
        setTenantLogo(`/web/${detectedSlug}_logo.svg`);
        setTenantName(detectedSlug.toUpperCase());
      }
    }

    fetch("/api/tenant/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success) {
          if (data.brandName) setTenantName(data.brandName);
          if (data.companyName) setTenantLegalName(data.companyName);
          if (data.logoUrl) setTenantLogo(data.logoUrl);
        }
      })
      .catch(() => {});
  }, []);

  // Upload handler
  const handleFileUpload = async (file: File, type: "ktp" | "business") => {
    if (!file) return;

    if (type === "ktp") setKtpUploading(true);
    else setBusinessPhotoUploading(true);

    try {
      // Instant base64 preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        if (type === "ktp") setKtpUrl(base64);
        else setBusinessPhotoUrl(base64);
      };
      reader.readAsDataURL(file);

      // Server upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "agents");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data && data.success && data.url) {
        if (type === "ktp") setKtpUrl(data.url);
        else setBusinessPhotoUrl(data.url);
      }
    } catch (err: any) {
      console.warn("Upload failed, keeping base64 preview", err);
    } finally {
      if (type === "ktp") setKtpUploading(false);
      else setBusinessPhotoUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!form.name.trim()) return setErrorMessage("Nama lengkap pemilik wajib diisi");
    if (!form.phone.trim()) return setErrorMessage("Nomor WhatsApp wajib diisi");
    if (!form.email.trim()) return setErrorMessage("Email aktif wajib diisi");
    if (form.password.length < 6) return setErrorMessage("Kata sandi minimal 6 karakter");
    if (form.password !== form.confirmPassword) return setErrorMessage("Konfirmasi kata sandi tidak cocok");
    if (!form.id_card_number.trim()) return setErrorMessage("Nomor NIK KTP wajib diisi");
    if (!form.address.trim()) return setErrorMessage("Alamat gerai/loket wajib diisi");
    if (!ktpUrl) return setErrorMessage("Silakan unggah foto KTP untuk verifikasi identitas");
    if (!businessPhotoUrl) return setErrorMessage("Silakan unggah foto lokasi usaha/konter untuk verifikasi loket");
    if (!agreedPks) return setErrorMessage("Anda harus menyetujui Perjanjian Kerja Sama (PKS) kemitraan untuk melanjutkan");

    setSubmitting(true);
    try {
      const res = await agentApi.register({
        name: form.name.trim(),
        company_name: form.company_name.trim() || undefined,
        referral_code: form.referral_code.trim() ? form.referral_code.trim().toUpperCase() : undefined,
        phone: form.phone.trim(),
        email: form.email.trim(),
        password: form.password,
        id_card_number: form.id_card_number.trim() || undefined,
        address: form.address.trim() || undefined,
        ktp_url: ktpUrl || undefined,
        business_photo_url: businessPhotoUrl || undefined,
        bank_name: form.bank_name.trim() || undefined,
        bank_account_number: form.bank_account_number.trim() || undefined,
        bank_account_holder: form.bank_account_holder.trim() || undefined,
      });

      setSuccessResult({
        code: res.code,
        name: res.name,
        company_name: res.company_name,
      });
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal mengirimkan pendaftaran agen. Silakan periksa kembali data Anda.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-950 font-sans selection:bg-cyan-500 selection:text-white">
      {/* ========================================================
          LEFT SIDE: CARRIER-GRADE TELCO DARK BRAND PANEL
         ======================================================== */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-5/12 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/40 p-12 xl:p-16 flex-col justify-between relative overflow-hidden border-r border-slate-800/60 shrink-0">
        {/* Ambient Radial Glows (Aurora Effect) */}
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 left-1/4 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top: Brand Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3.5 mb-8">
            {tenantLogo ? (
              <img
                src={tenantLogo}
                alt={tenantName}
                className="h-10 w-auto object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-cyan-950/50">
                <Store className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
                OFFICIAL PARTNERSHIP
              </span>
              <p className="text-[11px] text-slate-400 font-mono mt-1">PORTAL KEMITRAAN AGEN RESMI</p>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl xl:text-4xl font-black text-white tracking-tight leading-tight">
              Bergabung Menjadi Mitra Agen{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-400">
                {tenantName}
              </span>
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed font-sans">
              Buka peluang usaha loket internet digital di wilayah Anda. Dapatkan penghasilan dari penjualan voucher WiFi, aktivasi Passpoint Roaming, dan loket pembayaran tagihan resmi.
            </p>
          </div>
        </div>

        {/* Middle: Key Benefits Showcase */}
        <div className="relative z-10 py-6 space-y-3">
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex items-start gap-3.5 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
              <Percent className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-100">Bagi Hasil &amp; Komisi Hingga 20%</h4>
              <p className="text-[11px] text-slate-400 leading-normal">
                Cashback grosir langsung saat tembak voucher fisik dan komisi otomatis saat transaksi online menggunakan kode promo unik Anda.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex items-start gap-3.5 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-100">Legalitas Resmi &amp; Terlindungi PKS</h4>
              <p className="text-[11px] text-slate-400 leading-normal">
                Diakui resmi sebagai Mitra Saluran Distribusi ISP berizin Kominfo RI, terlindungi dari risiko hukum penyalahgunaan bandwidth liar.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex items-start gap-3.5 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-100">Layanan Lengkap di Satu Dashboard</h4>
              <p className="text-[11px] text-slate-400 leading-normal">
                Akses cetak voucher, aktivasi Passpoint HS2.0, serta loket pembayaran tagihan bulanan pelanggan langsung dari smartphone.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom: Legal Footer */}
        <div className="relative z-10 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <p>
            &copy; {new Date().getFullYear()} {tenantLegalName || `PT. ${tenantName} Data Nusantara`}. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Pendaftaran Mitra Terverifikasi</span>
          </div>
        </div>
      </div>

      {/* ========================================================
          RIGHT SIDE: REGISTRATION FORM / SUCCESS CARD
         ======================================================== */}
      <div className="w-full lg:w-7/12 xl:w-7/12 bg-white flex flex-col justify-between p-6 sm:p-10 lg:p-14 overflow-y-auto">
        {/* Top Header & Back to Login */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
          <Link
            href="/agent/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-cyan-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Halaman Masuk
          </Link>
          <span className="text-[11px] font-mono text-slate-400">REGISTRASI ONLINE MITRA</span>
        </div>

        {successResult ? (
          /* ================= SUCCESS STATE ================= */
          <div className="max-w-xl w-full mx-auto my-auto py-8">
            <div className="p-8 sm:p-10 rounded-3xl bg-slate-50 border border-slate-200 text-center space-y-6 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                  STATUS: MENUNGGU VERIFIKASI ADMINISTRATOR
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight pt-2">
                  Pendaftaran Berhasil Dikirim!
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans max-w-md mx-auto">
                  Terima kasih <strong>{successResult.name}</strong> ({successResult.company_name || "Gerai Agen"}). Data dan dokumen pendaftaran Anda telah kami terima dengan aman.
                </p>
              </div>

              {/* Data Box */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 text-left space-y-2.5 max-w-sm mx-auto text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Nomor Registrasi:</span>
                  <span className="font-mono font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                    {successResult.code}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Nama Pemilik:</span>
                  <strong className="text-slate-900">{successResult.name}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Estimasi Verifikasi:</span>
                  <span className="text-slate-700 font-medium">1 x 24 Jam Kerja</span>
                </div>
              </div>

              <div className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto space-y-1">
                <p>
                  Tim Administrator <strong>{tenantName}</strong> akan meninjau foto KTP dan dokumen outlet Anda. Anda akan menerima pemberitahuan WhatsApp saat akun Anda telah diaktifkan.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
                <Link
                  href="/agent/login"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-sm transition-all text-center"
                >
                  Masuk ke Portal Agen
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setSuccessResult(null);
                    setForm({
                      name: "",
                      company_name: "",
                      referral_code: "",
                      phone: "",
                      email: "",
                      password: "",
                      confirmPassword: "",
                      id_card_number: "",
                      address: "",
                      bank_name: "BCA",
                      bank_account_number: "",
                      bank_account_holder: "",
                    });
                    setKtpUrl("");
                    setBusinessPhotoUrl("");
                  }}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-all text-center"
                >
                  Daftarkan Gerai Lain
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ================= REGISTRATION FORM ================= */
          <div className="max-w-xl w-full mx-auto py-2">
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Formulir Pendaftaran Mitra Agen
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-sans">
                Lengkapi data identitas, informasi gerai, dan unggah dokumen verifikasi untuk mengaktifkan akun kemitraan resmi {tenantName}.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5 shadow-sm">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{errorMessage}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ── BAGIAN 1: IDENTITAS PEMILIK & LOGIN ── */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <User className="w-4 h-4 text-cyan-600" />
                  <span>1. Informasi Pemilik &amp; Akun Login</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nama Lengkap Pemilik (PIC) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="contoh: Budi Santoso"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nomor WhatsApp / HP <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="tel"
                        required
                        placeholder="081234567890"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all bg-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email Aktif (Login Akun) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        placeholder="agen@domain.com"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kata Sandi <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Minimal 6 karakter"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all bg-white font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ulangi Kata Sandi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Ketik ulang kata sandi Anda"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all bg-white font-mono"
                  />
                </div>
              </div>

              {/* ── BAGIAN 2: DATA USAHA & LOKET ── */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <Building className="w-4 h-4 text-cyan-600" />
                  <span>2. Informasi Gerai / Usaha &amp; KTP</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nama Gerai / Konter / Usaha <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="contoh: Berkah Cell / Warung Bu Siti"
                      value={form.company_name}
                      onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nomor NIK KTP (16 Digit) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={16}
                      placeholder="3201xxxxxxxxxxxx"
                      value={form.id_card_number}
                      onChange={(e) => setForm({ ...form, id_card_number: e.target.value.replace(/\D/g, "") })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all bg-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kode Referral Master Agen <span className="text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="contoh: AGN-123 (Kosongkan jika bukan binaan distributor)"
                    value={form.referral_code}
                    onChange={(e) => setForm({ ...form, referral_code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all bg-white font-mono uppercase"
                  />
                  <p className="text-[10.5px] text-slate-500 mt-1">
                    Jika Anda diajak oleh Master Agen / Koordinator Wilayah, masukkan kode mereka di sini.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Alamat Lengkap Lokasi Usaha / Gerai <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <textarea
                      required
                      rows={2}
                      placeholder="Jalan, No. RT/RW, Dusun/Kelurahan, Kecamatan, Kota/Kabupaten"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* ── BAGIAN 3: UNGGAH DOKUMEN (KTP & FOTO USAHA) ── */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <UploadCloud className="w-4 h-4 text-cyan-600" />
                  <span>3. Unggah Dokumen Verifikasi (KTP &amp; Foto Usaha)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Upload KTP */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Foto KTP Asli Pemilik <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="file"
                      ref={ktpInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, "ktp");
                      }}
                    />
                    <div
                      onClick={() => ktpInputRef.current?.click()}
                      className={`h-36 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all ${
                        ktpUrl
                          ? "border-emerald-400 bg-emerald-50/40"
                          : "border-slate-300 hover:border-cyan-500 bg-white"
                      }`}
                    >
                      {ktpUrl ? (
                        <div className="relative w-full h-full flex flex-col items-center justify-center">
                          <img
                            src={ktpUrl}
                            alt="Preview KTP"
                            className="max-h-24 max-w-full rounded-lg object-contain shadow-sm mb-1"
                          />
                          <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                            <Check className="w-3 h-3" /> KTP Terunggah (Klik untuk ganti)
                          </span>
                        </div>
                      ) : ktpUploading ? (
                        <div className="flex flex-col items-center gap-2 text-slate-500">
                          <svg className="animate-spin w-6 h-6 text-cyan-600" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span className="text-[11px] font-medium">Mengunggah KTP...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-500">
                          <CreditCard className="w-7 h-7 text-slate-400" />
                          <span className="text-xs font-bold text-slate-800">Pilih / Jepret Foto KTP</span>
                          <span className="text-[10px] text-slate-400">JPG, PNG, atau WEBP maks 5MB</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upload Foto Usaha */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Foto Usaha / Tampak Depan Loket <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="file"
                      ref={businessInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, "business");
                      }}
                    />
                    <div
                      onClick={() => businessInputRef.current?.click()}
                      className={`h-36 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all ${
                        businessPhotoUrl
                          ? "border-emerald-400 bg-emerald-50/40"
                          : "border-slate-300 hover:border-cyan-500 bg-white"
                      }`}
                    >
                      {businessPhotoUrl ? (
                        <div className="relative w-full h-full flex flex-col items-center justify-center">
                          <img
                            src={businessPhotoUrl}
                            alt="Preview Foto Usaha"
                            className="max-h-24 max-w-full rounded-lg object-contain shadow-sm mb-1"
                          />
                          <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Foto Usaha Terunggah (Klik untuk ganti)
                          </span>
                        </div>
                      ) : businessPhotoUploading ? (
                        <div className="flex flex-col items-center gap-2 text-slate-500">
                          <svg className="animate-spin w-6 h-6 text-cyan-600" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span className="text-[11px] font-medium">Mengunggah Foto...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-500">
                          <ImageIcon className="w-7 h-7 text-slate-400" />
                          <span className="text-xs font-bold text-slate-800">Pilih Foto Tampak Gerai/Usaha</span>
                          <span className="text-[10px] text-slate-400">Etalase / Tampak Depan Konter</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── BAGIAN 4: REKENING BANK ── */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <CreditCard className="w-4 h-4 text-cyan-600" />
                  <span>4. Rekening Penampungan Komisi &amp; Pencairan</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nama Bank</label>
                    <select
                      value={form.bank_name}
                      onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                    >
                      <option value="BCA">Bank BCA</option>
                      <option value="BRI">Bank BRI</option>
                      <option value="Mandiri">Bank Mandiri</option>
                      <option value="BNI">Bank BNI</option>
                      <option value="BSI">Bank Syariah Indonesia (BSI)</option>
                      <option value="CIMB">CIMB Niaga</option>
                      <option value="Permata">Bank Permata</option>
                      <option value="Dana">DANA / E-Wallet</option>
                      <option value="Lainnya">Bank Lainnya</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Rekening</label>
                    <input
                      type="text"
                      placeholder="Nomor rekening"
                      value={form.bank_account_number}
                      onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Atas Nama Rekening</label>
                    <input
                      type="text"
                      placeholder="Nama pemilik buku tabungan"
                      value={form.bank_account_holder}
                      onChange={(e) => setForm({ ...form, bank_account_holder: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* ── BAGIAN 5: PERSETUJUAN PKS KEMITRAAN ── */}
              <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={agreedPks}
                    onChange={(e) => setAgreedPks(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 border-slate-300"
                  />
                  <div className="leading-relaxed font-sans">
                    <span className="font-bold text-slate-900">
                      Persetujuan Syarat &amp; Ketentuan Perjanjian Kerja Sama (PKS) Resmi
                    </span>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Saya menyatakan bahwa data yang diisi adalah benar, bersedia bertindak semata-mata sebagai <strong>Mitra Saluran Distribusi Resmi</strong> {tenantName}, <strong>dilarang keras menyelenggarakan RT/RW Net liar</strong> atau menjual bandwidth mentah di luar izin resmi (UU Telekomunikasi No. 36/1999), dan menyetujui seluruh ketentuan kemitraan yang berlaku.
                    </p>
                  </div>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !agreedPks}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 active:scale-[0.99] text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-950/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Mengirimkan Pendaftaran Agen...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>KIRIM PENDAFTARAN MITRA AGEN</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="pt-6 border-t border-slate-100 mt-8 text-center text-xs text-slate-400">
          <p>
            Memerlukan bantuan pendaftaran kemitraan? Hubungi Pusat Bantuan Operasional {tenantName}.
          </p>
        </div>
      </div>
    </div>
  );
}

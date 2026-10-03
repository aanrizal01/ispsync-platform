"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  DollarSign,
  CreditCard,
  MessageSquare,
  ShieldCheck,
  Save,
  CheckCircle2,
  RefreshCw,
  Globe,
  Mail,
  Phone,
  Clock,
  Key,
  Server,
  Zap,
  HelpCircle,
  Wifi,
  Radio,
  ExternalLink,
  Activity,
  AlertTriangle,
  FileText,
  Palette,
  Printer,
  Image as ImageIcon,
  Layout,
  Check,
  QrCode,
  Copy,
  Plus,
  Trash2,
  Smartphone,
  Receipt,
} from "lucide-react";
import {
  settingsApi,
  InvoiceTemplateSettings,
  defaultInvoiceTemplateSettings,
  BillingAddonSettings,
  defaultBillingAddonSettings,
  SecuritySettings,
  defaultSecuritySettings,
  PaymentGatewaySettings,
  defaultPaymentGatewaySettings,
} from "@/lib/api/settings";
import { ipamApi, type IPAMSettings, type Subnet, type TestResult } from "@/lib/api/ipam";
import { InvoicePrintDocument } from "@/components/invoice/InvoicePrintDocument";

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<
    "general" | "invoice_template" | "billing" | "payment" | "notification" | "security"
  >("general");

  const [invoiceTemplate, setInvoiceTemplate] =
    useState<InvoiceTemplateSettings>(defaultInvoiceTemplateSettings);
  const [billingAddons, setBillingAddons] =
    useState<BillingAddonSettings>(defaultBillingAddonSettings);
  const [securitySettings, setSecuritySettings] =
    useState<SecuritySettings>(defaultSecuritySettings);
  const [pgSettings, setPgSettings] =
    useState<PaymentGatewaySettings>(defaultPaymentGatewaySettings);
  const [copiedWebhook, setCopiedWebhook] = useState<string | null>(null);
  const [clientIP, setClientIP] = useState<string>("");
  const [showSecurityHelp, setShowSecurityHelp] = useState<boolean>(true);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  // phpIPAM State
  const [ipamSettings, setIpamSettings] = useState<IPAMSettings>({
    enabled: false,
    server_url: "",
    app_id: "gigabill",
    app_code: "",
    default_subnet_id: 0,
    auto_sync: true,
  });
  const [ipamTesting, setIpamTesting] = useState(false);
  const [ipamTestResult, setIpamTestResult] = useState<TestResult | null>(null);
  const [ipamSubnets, setIpamSubnets] = useState<Subnet[]>([]);
  const [ipamLoadingSubnets, setIpamLoadingSubnets] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Settings Form State
  const [settings, setSettings] = useState({
    // General
    companyName: "",
    brandName: "",
    npwp: "",
    address: "",
    phone: "",
    whatsappCS: "",
    emailSupport: "",
    website: "",
    invoiceFooterNote: "",

    // Billing Engine
    defaultTaxBps: 1100, // 11%
    gracePeriodDays: 7,
    autoInvoiceHour: "00:01",
    autoSuspendHour: "01:00",
    invoicePrefix: "INV/{YYYY}/{MM}/{SEQ}",
    defaultPartnerShareBps: 5000, // 50%
    lateFeeAmount: 15000,
    autoUnsuspendOnPaid: true,

    // Payment Gateway
    paymentProvider: "QRIS_DYNAMIC",
    environment: "SANDBOX",
    merchantId: "",
    apiKey: "",
    secretKey: "",
    bankName: "BCA (Bank Central Asia)",
    bankAccountNumber: "8001234567",
    bankAccountHolder: "",

    // Notification
    waProvider: "FONNTE",
    waApiToken: "",
    notifyDueDateH3: true,
    notifyInvoiceIssued: true,
    notifyPaymentPaid: true,
    notifyAccountSuspended: true,
    smtpHost: "",
    smtpPort: "587",
    smtpUser: "",
    smtpPass: "",

    // Security & AAA
    jwtExpiryHours: 24,
    requireStrongPassword: true,
    walledGardenHost: "",
    allowedNOCSubnet: "10.0.0.0/8, 172.16.0.0/12",

    // ACS & FTTH TR-069
    acsIntegrationMode: "FTTX_ENGINE",
    acsNbiUrl: "http://localhost:8082",
    acsCwmpUrl: "http://acs.isp.local:7547/",
    acsWebUiUrl: "http://fttx.ispsync.id",
    acsAutoSyncTelemetry: true,
    acsSyncIntervalMin: 15,
    acsAllowCustomerWifiChange: true,
    acsAllowCustomerReboot: true,
    acsDefaultVendor: "ZTE",
  });

  const [saasProfile, setSaasProfile] = useState<{
    slug: string;
    companyName: string;
    brandName: string;
    npwp: string;
    phone: string;
    whatsappCS: string;
    emailSupport: string;
    website: string;
    address: string;
    logoUrl: string;
    invoiceFooterNote: string;
    isFromSaaS: boolean;
  } | null>(null);
  const [syncingSaaS, setSyncingSaaS] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const handleSyncFromSaaS = (profileToUse?: any) => {
    const prof = profileToUse || saasProfile;
    if (!prof) return;
    setSyncingSaaS(true);

    setSettings((prev) => ({
      ...prev,
      companyName: prof.companyName || prev.companyName,
      brandName: prof.brandName || prev.brandName,
      npwp: prof.npwp || prev.npwp,
      phone: prof.phone || prev.phone,
      whatsappCS: prof.whatsappCS || prof.phone || prev.whatsappCS,
      emailSupport: prof.emailSupport || prev.emailSupport,
      website: prof.website || prev.website,
      address: prof.address || prev.address,
      invoiceFooterNote: prof.invoiceFooterNote || prev.invoiceFooterNote,
      bankAccountHolder: prev.bankAccountHolder || prof.companyName,
    }));

    setInvoiceTemplate((prev) => ({
      ...prev,
      brand_name: prof.brandName || prev.brand_name,
      company_name: prof.companyName || prev.company_name,
      tax_id: prof.npwp || prev.tax_id,
      phone: prof.phone || prev.phone,
      email: prof.emailSupport || prev.email,
      website: prof.website || prev.website,
      address: prof.address || prev.address,
      logo_url: prof.logoUrl || prev.logo_url,
      footer_notes: prof.invoiceFooterNote || prev.footer_notes,
      bank_account_holder: prev.bank_account_holder || prof.companyName,
    }));

    setSyncNotice(`Data profil resmi dari SaaS Admin (${prof.companyName}) berhasil disinkronkan ke formulir!`);
    setTimeout(() => {
      setSyncingSaaS(false);
    }, 500);
    setTimeout(() => {
      setSyncNotice(null);
    }, 6000);
  };

  useEffect(() => {
    // 1. Fetch SaaS Tenant Profile based on current host/subdomain
    fetch("/api/tenant/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success) {
          setSaasProfile(data);

          // Check if localStorage has non-obsolete saved settings
          let hasValidSaved = false;
          try {
            const saved = localStorage.getItem("gigabill_system_settings");
            if (saved) {
              const parsed = JSON.parse(saved);
              if (
                parsed.companyName &&
                parsed.companyName !== "PT Giga Nusantara Digital" &&
                parsed.companyName.trim() !== ""
              ) {
                setSettings(parsed);
                hasValidSaved = true;
              }
            }
          } catch (e) {
            // ignore
          }

          // If no custom saved profile, auto-populate immediately from SaaS
          if (!hasValidSaved) {
            setSettings((prev) => ({
              ...prev,
              companyName: data.companyName,
              brandName: data.brandName,
              npwp: data.npwp,
              phone: data.phone,
              whatsappCS: data.whatsappCS,
              emailSupport: data.emailSupport,
              website: data.website,
              address: data.address,
              invoiceFooterNote: data.invoiceFooterNote,
              bankAccountHolder: data.companyName,
            }));
          }

          // Auto-populate invoice template if not yet customized
          setInvoiceTemplate((prev) => {
            const isDefault =
              !prev.company_name ||
              prev.company_name === "PT Inovasi Sistem Pintar" ||
              prev.company_name === "PT Giga Nusantara Digital" ||
              prev.company_name === "PT CITRA MEDIA NUSANTARA";

            if (isDefault) {
              return {
                ...prev,
                brand_name: data.brandName,
                company_name: data.companyName,
                tax_id: data.npwp,
                phone: data.phone,
                email: data.emailSupport,
                website: data.website,
                address: data.address,
                logo_url: data.logoUrl || prev.logo_url,
                footer_notes: data.invoiceFooterNote,
                bank_account_holder: data.companyName,
              };
            }
            return prev;
          });
        }
      })
      .catch((err) => {
        console.error("Failed to load SaaS tenant profile:", err);
      });
  }, []);


  useEffect(() => {
    // Load invoice template settings from backend API
    setLoadingTemplate(true);
    settingsApi
      .getInvoiceTemplate()
      .then((data) => {
        if (data && data.brand_name) {
          setInvoiceTemplate({
            ...defaultInvoiceTemplateSettings,
            ...data,
            enable_qr_verification: data.enable_qr_verification !== false,
          });
        }
      })
      .catch((err) => {
        console.error("Failed to load invoice template settings:", err);
      })
      .finally(() => setLoadingTemplate(false));

    // Load phpIPAM settings
    ipamApi
      .getSettings()
      .then((data) => {
        if (data) {
          setIpamSettings(data);
          if (data.server_url) {
            ipamApi
              .getSubnets()
              .then((res) => {
                if (res && res.subnets) setIpamSubnets(res.subnets);
              })
              .catch(() => {});
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load IPAM settings:", err);
      });

    // Load billing addons settings (e.g. public IP pricing)
    settingsApi
      .getBillingAddons()
      .then((data) => {
        if (data && data.public_ip_monthly_price !== undefined) {
          setBillingAddons(data);
        }
      })
      .catch((err) => {
        console.error("Failed to load billing addons settings:", err);
      });

    // Load security settings
    settingsApi
      .getSecuritySettings()
      .then((data) => {
        if (data && data.jwt_expiry_hours !== undefined) {
          setSecuritySettings(data);
        }
      })
      .catch((err) => {
        console.error("Failed to load security settings:", err);
      });

    // Load payment gateway settings
    settingsApi
      .getPaymentGatewaySettings()
      .then((data) => {
        if (data && (data.pppoe_provider || data.voucher_provider)) {
          setPgSettings(data);
        }
      })
      .catch((err) => {
        console.error("Failed to load payment gateway settings:", err);
      });

    // Detect current client IP
    settingsApi
      .getClientIP()
      .then((res) => {
        if (res && res.ip) setClientIP(res.ip);
      })
      .catch(() => {});
  }, []);

  const handleTestIPAM = async () => {
    setIpamTesting(true);
    setIpamTestResult(null);
    try {
      const res = await ipamApi.testConnection(ipamSettings);
      setIpamTestResult(res);
      if (res.success) {
        setIpamSettings((prev) => ({ ...prev, enabled: true }));
        handleFetchIPAMSubnets();
      }
    } catch (err: any) {
      setIpamTestResult({
        success: false,
        message: err.message || "Gagal menghubungi phpIPAM",
      });
    } finally {
      setIpamTesting(false);
    }
  };

  const handleFetchIPAMSubnets = async () => {
    setIpamLoadingSubnets(true);
    try {
      const res = await ipamApi.getSubnets();
      if (res && res.subnets) {
        setIpamSubnets(res.subnets);
        if (res.subnets.length > 0) {
          setIpamSettings((prev) => {
            if (!prev.default_subnet_id || prev.default_subnet_id === 0) {
              return { ...prev, default_subnet_id: res.subnets[0].id };
            }
            return prev;
          });
        }
      }
    } catch (err: any) {
      console.warn("Could not fetch subnets:", err);
    } finally {
      setIpamLoadingSubnets(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      // Save invoice template settings to PostgreSQL database
      await settingsApi.updateInvoiceTemplate(invoiceTemplate);

      // Save billing addons settings to PostgreSQL database
      await settingsApi.updateBillingAddons(billingAddons);

      // Save security settings to PostgreSQL database
      await settingsApi.updateSecuritySettings(securitySettings);

      // Save payment gateway & routing settings to PostgreSQL database
      await settingsApi.updatePaymentGatewaySettings(pgSettings);

      // Save phpIPAM settings to database
      await ipamApi.saveSettings(ipamSettings);

      // Local storage fallback / cache
      try {
        localStorage.setItem("gigabill_system_settings", JSON.stringify(settings));
        localStorage.setItem("gigabill_invoice_template", JSON.stringify(invoiceTemplate));
      } catch (e) {}

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      alert("Gagal menyimpan pengaturan: " + (err.message || "Terjadi kesalahan"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Pengaturan Sistem
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Konfigurasi profil ISP, parameter billing, gateway pembayaran, dan integrasi notifikasi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {saasProfile && (
            <button
              type="button"
              onClick={() => handleSyncFromSaaS()}
              disabled={syncingSaaS}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-700 text-xs font-bold rounded-2xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              title="Tarik data profil perusahaan dari pendaftaran SaaS Admin"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingSaaS ? "animate-spin text-cyan-300" : ""}`} />
              {syncingSaaS ? "Menyinkronkan..." : "Tarik Data SaaS"}
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-2xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : saveSuccess ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Menyimpan..." : saveSuccess ? "Tersimpan!" : "Simpan Pengaturan"}
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-medium animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Pengaturan sistem berhasil disimpan dan langsung diterapkan ke seluruh modul!</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-px">
        {[
          { id: "general", label: "Profil & Identitas ISP", icon: Building2 },
          { id: "invoice_template", label: "Template Faktur & Kop Surat", icon: FileText },
          { id: "billing", label: "Aturan Billing & Pajak", icon: DollarSign },
          { id: "payment", label: "Payment Gateway", icon: CreditCard },
          { id: "notification", label: "WhatsApp & Email", icon: MessageSquare },
          { id: "security", label: "Keamanan & Jaringan", icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
                isActive
                  ? "border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: General Profile */}
      {activeTab === "general" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          {/* SaaS Profile Integration Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm relative overflow-hidden">
            <div className="absolute -top-12 -left-12 w-40 h-40 bg-cyan-600/20 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-center gap-3.5 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                <RefreshCw className={`w-5 h-5 ${syncingSaaS ? "animate-spin text-cyan-300" : ""}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-100">
                    Sinkronisasi Profil SaaS Admin
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
                    Otomatis Terhubung
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tenant aktif: <strong className="text-cyan-300 font-semibold">{saasProfile?.companyName || "Memuat..."}</strong> ({saasProfile?.brandName || "..."}) • Data pendaftaran dari portal SaaS otomatis mengisi formulir di bawah.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSyncFromSaaS()}
              disabled={syncingSaaS || !saasProfile}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white shadow-xs flex items-center justify-center gap-2 cursor-pointer transition shrink-0 disabled:opacity-50 relative z-10"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingSaaS ? "animate-spin" : ""}`} />
              Tarik Ulang Data SaaS
            </button>
          </div>

          {syncNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncNotice}</span>
            </div>
          )}

          <div>
            <h2 className="text-base font-black text-slate-900">Identitas Resmi ISP</h2>
            <p className="text-xs text-slate-500">
              Data ini akan dicetak pada kop surat faktur, tanda terima kasir, dan portal pelanggan mandiri.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nama Perusahaan (PT/CV)</label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                placeholder="Contoh: PT Mitra Usaha Data"
                className="w-full px-3.5 py-2 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nama Brand Layanan</label>
              <input
                type="text"
                value={settings.brandName}
                onChange={(e) => setSettings({ ...settings, brandName: e.target.value })}
                placeholder="Contoh: ISPMU FIBER"
                className="w-full px-3.5 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Pokok Wajib Pajak (NPWP)</label>
              <input
                type="text"
                value={settings.npwp}
                onChange={(e) => setSettings({ ...settings, npwp: e.target.value })}
                placeholder="01.234.567.8-901.000"
                className="w-full px-3.5 py-2 text-xs font-mono border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nomor WhatsApp Customer Service</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={settings.whatsappCS}
                  onChange={(e) => setSettings({ ...settings, whatsappCS: e.target.value })}
                  placeholder="+62 812-3456-7890"
                  className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-300 rounded-xl"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Dukungan Teknis</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={settings.emailSupport}
                  onChange={(e) => setSettings({ ...settings, emailSupport: e.target.value })}
                  placeholder="support@domainisp.net.id"
                  className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-300 rounded-xl"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Situs Web Resmi</label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="url"
                  value={settings.website}
                  onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                  placeholder="https://domainisp.net.id"
                  className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-300 rounded-xl"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Kantor Operasional</label>
              <textarea
                rows={2}
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                placeholder="Contoh: Jl. Sudirman No. 12, RT 02/04, Padang, Sumatera Barat"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Footer Faktur Cetak</label>
              <textarea
                rows={2}
                value={settings.invoiceFooterNote}
                onChange={(e) => setSettings({ ...settings, invoiceFooterNote: e.target.value })}
                placeholder="Contoh: Pembayaran tepat waktu menjaga kelancaran koneksi internet Anda. Hubungi WA CS kami bila membutuhkan bantuan."
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Invoice Template & Letterhead Customization */}
      {activeTab === "invoice_template" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">
                  Kustomisasi Template Faktur &amp; Kop Surat Resmi
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800">
                  LIVE REAL-TIME
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Atur identitas kop surat, izin resmi, rekening bank, catatan hukum, dan warna aksen faktur. Perubahan ini otomatis tersinkronisasi ke portal publik pelanggan maupun kasir admin.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setInvoiceTemplate(defaultInvoiceTemplateSettings)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shrink-0"
              title="Kembalikan nilai ke bawaan sistem"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset ke Default</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Form Controls */}
            <div className="lg:col-span-6 space-y-6">
              {/* Box 0: Pilihan Model / Gaya Template Faktur */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Layout className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900">Model &amp; Gaya Desain Faktur</h3>
                  </div>
                  <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    4 Pilihan Tersedia
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: "modern",
                      name: "Modern Minimalist",
                      badge: "Populer",
                      desc: "Tampilan bersih, kontemporer, dan elegan dengan layout grid 2 kolom.",
                    },
                    {
                      id: "classic",
                      name: "Kop Surat Klasik",
                      badge: "Resmi / Dinas",
                      desc: "Format resmi korporat / dinas dengan kop surat tengah, garis ganda, dan kolom tanda tangan.",
                    },
                    {
                      id: "banner",
                      name: "Bold Banner",
                      badge: "Eksklusif",
                      desc: "Header balok warna tebal dengan kontras tinggi, modern rounded cards, dan total yang mencolok.",
                    },
                    {
                      id: "compact",
                      name: "Struk Kasir / Slip",
                      badge: "Hemat Kertas",
                      desc: "Format ringkas font monospace dengan garis putus-putus, cocok untuk cetak cepat / slip.",
                    },
                  ].map((tpl) => {
                    const isSelected = (invoiceTemplate.layout || "modern") === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() =>
                          setInvoiceTemplate({
                            ...invoiceTemplate,
                            layout: tpl.id as any,
                          })
                        }
                        className={`text-left p-3.5 rounded-2xl border-2 transition relative flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/50 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-xs font-bold text-slate-900">{tpl.name}</span>
                            <span
                              className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                                isSelected
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {tpl.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-snug">{tpl.desc}</p>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between text-[11px] font-bold">
                          <span
                            className={
                              isSelected ? "text-blue-600" : "text-slate-400"
                            }
                          >
                            {isSelected ? "✓ Aktif Digunakan" : "Pilih Model Ini"}
                          </span>
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                              ✓
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Box 1: Kop Surat & Legalitas */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">1. Kop Surat &amp; Identitas Usaha</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nama Brand Layanan</label>
                    <input
                      type="text"
                      value={invoiceTemplate.brand_name}
                      onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, brand_name: e.target.value })}
                      placeholder="Contoh: NUSANET / CEPATNET"
                      className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nama Badan Usaha (PT / CV)</label>
                    <input
                      type="text"
                      value={invoiceTemplate.company_name}
                      onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, company_name: e.target.value })}
                      placeholder="Contoh: PT Citra Media Nusantara"
                      className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Izin Kominfo / KBLI</label>
                    <input
                      type="text"
                      value={invoiceTemplate.license_no}
                      onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, license_no: e.target.value })}
                      placeholder="Contoh: Izin Penyelenggaraan Jasa Telekomunikasi & Jaringan Internet (ISP)"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Pokok Wajib Pajak (NPWP)</label>
                    <input
                      type="text"
                      value={invoiceTemplate.tax_id}
                      onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, tax_id: e.target.value })}
                      placeholder="01.234.567.8-901.000"
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">URL Logo Perusahaan</label>
                    <input
                      type="text"
                      value={invoiceTemplate.logo_url}
                      onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, logo_url: e.target.value })}
                      placeholder="/logo.png atau https://domain.com/logo.png"
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                       URL Gambar Header / Banner (Opsional)
                    </label>
                    <input
                      type="text"
                      value={invoiceTemplate.header_image_url || ""}
                      onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, header_image_url: e.target.value })}
                      placeholder="https://... atau /uploads/kop.png (menggantikan logo default jika diisi)"
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Gunakan gambar logo/header beresolusi tinggi untuk dicetak di lembar faktur resmi.
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      HTML Kustom Kop Surat A4 (Opsional / Letterhead HTML)
                    </label>
                    <textarea
                      rows={3}
                      value={invoiceTemplate.letterhead_html || ""}
                      onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, letterhead_html: e.target.value })}
                      placeholder="Contoh: <div style='text-align:center;'><h2>PT NAMA PERUSAHAAN INTERNET</h2><p>Alamat & Kontak</p></div>"
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Format HTML khusus untuk menggantikan kop surat bawaan pada model <strong>Kop Surat Klasik</strong>.
                    </p>
                  </div>
                  <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/80">
                      <div>
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <QrCode className="w-4 h-4 text-blue-600" />
                          QR Code Verifikasi Keabsahan Faktur
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Tampilkan barcode/QR verifikasi otomatis yang dapat dipindai pelanggan menggunakan kamera HP untuk cek keaslian faktur secara online.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setInvoiceTemplate({
                            ...invoiceTemplate,
                            enable_qr_verification: invoiceTemplate.enable_qr_verification === false ? true : false,
                          })
                        }
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          invoiceTemplate.enable_qr_verification !== false ? "bg-blue-600" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            invoiceTemplate.enable_qr_verification !== false ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Box 2: Alamat & Kontak */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">2. Alamat &amp; Kontak Bantuan</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Kantor Operasional</label>
                    <textarea
                      rows={2}
                      value={invoiceTemplate.address}
                      onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, address: e.target.value })}
                      placeholder="Alamat kantor yang dicetak pada lembar faktur"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">No. WhatsApp / Call Center</label>
                      <input
                        type="text"
                        value={invoiceTemplate.phone}
                        onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, phone: e.target.value })}
                        placeholder="+62 812-3456-7890"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Email Billing Resmi</label>
                      <input
                        type="email"
                        value={invoiceTemplate.email}
                        onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, email: e.target.value })}
                        placeholder="billing@perusahaan.net.id"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Situs Web Resmi / Portal</label>
                    <input
                      type="url"
                      value={invoiceTemplate.website}
                      onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, website: e.target.value })}
                      placeholder="https://billing.perusahaan.net.id"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Box 3: Rekening Pembayaran Manual (Multi-Rekening) */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">3. Rekening Pembayaran Resmi (Multi-Rekening Bank)</h3>
                      <p className="text-[11px] text-slate-500">
                        Tambahkan rekening bank untuk transfer manual pelanggan. Seluruh rekening aktif akan otomatis tercetak di faktur.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const current = invoiceTemplate.bank_accounts && invoiceTemplate.bank_accounts.length > 0
                        ? [...invoiceTemplate.bank_accounts]
                        : [{
                            bank_name: invoiceTemplate.bank_name || "Bank Central Asia (BCA)",
                            bank_account_number: invoiceTemplate.bank_account_number || "8001234567",
                            bank_account_holder: invoiceTemplate.bank_account_holder || invoiceTemplate.company_name || "",
                            branch: "",
                          }];
                      current.push({
                        bank_name: "",
                        bank_account_number: "",
                        bank_account_holder: invoiceTemplate.bank_account_holder || invoiceTemplate.company_name || "",
                        branch: "",
                      });
                      setInvoiceTemplate({
                        ...invoiceTemplate,
                        bank_accounts: current,
                        bank_name: current[0].bank_name,
                        bank_account_number: current[0].bank_account_number,
                        bank_account_holder: current[0].bank_account_holder,
                      });
                    }}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1.5 cursor-pointer transition shrink-0 self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Rekening Bank
                  </button>
                </div>

                <div className="space-y-3">
                  {((invoiceTemplate.bank_accounts && invoiceTemplate.bank_accounts.length > 0)
                    ? invoiceTemplate.bank_accounts
                    : [{
                        bank_name: invoiceTemplate.bank_name || "",
                        bank_account_number: invoiceTemplate.bank_account_number || "",
                        bank_account_holder: invoiceTemplate.bank_account_holder || "",
                        branch: "",
                      }]
                  ).map((acc, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 space-y-3 relative transition hover:border-slate-300"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">
                            {index + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {index === 0 ? "Rekening Utama (Default)" : `Rekening Tambahan #${index + 1}`}
                          </span>
                          {acc.bank_name && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                              {acc.bank_name}
                            </span>
                          )}
                        </div>

                        {(invoiceTemplate.bank_accounts?.length || 1) > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const current = [...(invoiceTemplate.bank_accounts || [])];
                              current.splice(index, 1);
                              setInvoiceTemplate({
                                ...invoiceTemplate,
                                bank_accounts: current,
                                bank_name: current[0]?.bank_name || "",
                                bank_account_number: current[0]?.bank_account_number || "",
                                bank_account_holder: current[0]?.bank_account_holder || "",
                              });
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Hapus rekening ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Bank</label>
                          <input
                            type="text"
                            value={acc.bank_name}
                            onChange={(e) => {
                              const current = invoiceTemplate.bank_accounts && invoiceTemplate.bank_accounts.length > 0
                                ? [...invoiceTemplate.bank_accounts]
                                : [{
                                    bank_name: invoiceTemplate.bank_name || "",
                                    bank_account_number: invoiceTemplate.bank_account_number || "",
                                    bank_account_holder: invoiceTemplate.bank_account_holder || "",
                                    branch: "",
                                  }];
                              current[index] = { ...current[index], bank_name: e.target.value };
                              setInvoiceTemplate({
                                ...invoiceTemplate,
                                bank_accounts: current,
                                bank_name: current[0].bank_name,
                                bank_account_number: current[0].bank_account_number,
                                bank_account_holder: current[0].bank_account_holder,
                              });
                            }}
                            placeholder="Contoh: BCA / BRI / Mandiri"
                            className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Nomor Rekening</label>
                          <input
                            type="text"
                            value={acc.bank_account_number}
                            onChange={(e) => {
                              const current = invoiceTemplate.bank_accounts && invoiceTemplate.bank_accounts.length > 0
                                ? [...invoiceTemplate.bank_accounts]
                                : [{
                                    bank_name: invoiceTemplate.bank_name || "",
                                    bank_account_number: invoiceTemplate.bank_account_number || "",
                                    bank_account_holder: invoiceTemplate.bank_account_holder || "",
                                    branch: "",
                                  }];
                              current[index] = { ...current[index], bank_account_number: e.target.value };
                              setInvoiceTemplate({
                                ...invoiceTemplate,
                                bank_accounts: current,
                                bank_name: current[0].bank_name,
                                bank_account_number: current[0].bank_account_number,
                                bank_account_holder: current[0].bank_account_holder,
                              });
                            }}
                            placeholder="8001234567"
                            className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Atas Nama Pemilik</label>
                          <input
                            type="text"
                            value={acc.bank_account_holder}
                            onChange={(e) => {
                              const current = invoiceTemplate.bank_accounts && invoiceTemplate.bank_accounts.length > 0
                                ? [...invoiceTemplate.bank_accounts]
                                : [{
                                    bank_name: invoiceTemplate.bank_name || "",
                                    bank_account_number: invoiceTemplate.bank_account_number || "",
                                    bank_account_holder: invoiceTemplate.bank_account_holder || "",
                                    branch: "",
                                  }];
                              current[index] = { ...current[index], bank_account_holder: e.target.value };
                              setInvoiceTemplate({
                                ...invoiceTemplate,
                                bank_accounts: current,
                                bank_name: current[0].bank_name,
                                bank_account_number: current[0].bank_account_number,
                                bank_account_holder: current[0].bank_account_holder,
                              });
                            }}
                            placeholder="PT CITRA MEDIA NUSANTARA"
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Cabang / Kode (Opsional)</label>
                          <input
                            type="text"
                            value={acc.branch || ""}
                            onChange={(e) => {
                              const current = invoiceTemplate.bank_accounts && invoiceTemplate.bank_accounts.length > 0
                                ? [...invoiceTemplate.bank_accounts]
                                : [{
                                    bank_name: invoiceTemplate.bank_name || "",
                                    bank_account_number: invoiceTemplate.bank_account_number || "",
                                    bank_account_holder: invoiceTemplate.bank_account_holder || "",
                                    branch: "",
                                  }];
                              current[index] = { ...current[index], branch: e.target.value };
                              setInvoiceTemplate({
                                ...invoiceTemplate,
                                bank_accounts: current,
                              });
                            }}
                            placeholder="Contoh: KCU Sudirman / Cabang Utama"
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Box 4: Catatan Kaki & T&C */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-900">4. Catatan Kaki &amp; Ketentuan Faktur (T&amp;C)</h3>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Teks Ketentuan &amp; Informasi Penting (Gunakan baris baru untuk memisahkan poin)
                  </label>
                  <textarea
                    rows={4}
                    value={invoiceTemplate.footer_notes}
                    onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, footer_notes: e.target.value })}
                    placeholder="Contoh: Faktur ini diterbitkan secara elektronik dan sah..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Teks ini akan otomatis dicetak pada bagian bawah lembar faktur resmi.
                  </p>
                </div>
              </div>

              {/* Box 5: Warna Aksen Tema Faktur */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Palette className="w-4 h-4 text-cyan-600" />
                  <h3 className="text-sm font-bold text-slate-900">5. Warna Aksen Lembar Faktur</h3>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700">Pilih Warna Aksen Identitas Brand:</label>
                  <div className="flex flex-wrap items-center gap-3">
                    {[
                      { name: "Biru ISPSYNC", hex: "#2563eb" },
                      { name: "Biru Navy", hex: "#1e3a8a" },
                      { name: "Emerald Hijau", hex: "#059669" },
                      { name: "Teal Tosca", hex: "#0d9488" },
                      { name: "Indigo Ungu", hex: "#4f46e5" },
                      { name: "Dark Slate", hex: "#0f172a" },
                      { name: "Amber Emas", hex: "#d97706" },
                    ].map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setInvoiceTemplate({ ...invoiceTemplate, accent_color: c.hex })}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          invoiceTemplate.accent_color.toLowerCase() === c.hex.toLowerCase()
                            ? "border-slate-900 ring-2 ring-slate-900/20 shadow-xs bg-slate-50"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: c.hex }} />
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <label className="text-xs text-slate-500 font-medium">Custom Kode Warna HEX:</label>
                    <input
                      type="text"
                      value={invoiceTemplate.accent_color}
                      onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, accent_color: e.target.value })}
                      placeholder="#0284c7"
                      className="w-24 px-2 py-1 text-xs font-mono font-bold border border-slate-300 rounded-lg text-center"
                    />
                    <div
                      className="w-6 h-6 rounded-lg border border-slate-300"
                      style={{ backgroundColor: invoiceTemplate.accent_color }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Interactive Real Paper Studio Preview */}
            <div className="lg:col-span-6 sticky top-6 space-y-3">
              {/* Studio Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                <div>
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                    {invoiceTemplate.layout === "compact" ? (
                      <Receipt className="w-4 h-4 text-amber-600" />
                    ) : (
                      <Printer className="w-4 h-4 text-blue-600" />
                    )}
                    <span>
                      {invoiceTemplate.layout === "compact"
                        ? "Pratinjau Kertas Roll Kasir POS (80mm)"
                        : "Pratinjau Lembar Kertas Fisik A4"}
                    </span>
                  </span>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {invoiceTemplate.layout === "compact"
                      ? "Format Struk Thermal Roll • Monospace Kasir POS"
                      : "Standar Fisik ISO 216 (210 × 297 mm) • HVS 80 GSM"}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ● Realtime Sync
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const printContent = document.getElementById("preview-invoice-sheet");
                      if (!printContent) return;
                      const win = window.open("", "_blank");
                      if (!win) return;
                      win.document.write(`
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <title>Cetak Faktur - ${invoiceTemplate.brand_name || "ISPSYNC"}</title>
                            <meta charset="utf-8" />
                            <style>
                              @page {
                                size: ${invoiceTemplate.layout === "compact" ? "80mm auto" : "A4 portrait"};
                                margin: ${invoiceTemplate.layout === "compact" ? "0mm" : "10mm"};
                              }
                              body {
                                margin: 0;
                                padding: 0;
                                background: #ffffff;
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                              }
                            </style>
                            <script src="https://cdn.tailwindcss.com"></script>
                          </head>
                          <body onload="window.print();">
                            ${printContent.outerHTML}
                          </body>
                        </html>
                      `);
                      win.document.close();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-mono font-bold text-[10px] flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                    title="Coba simulasi cetak dokumen ini ke printer atau PDF"
                  >
                    <Printer className="w-3.5 h-3.5 text-blue-400" />
                    <span>Cetak Contoh</span>
                  </button>
                </div>
              </div>

              {/* Realistic Document Workbench / Desk Canvas */}
              <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-5 sm:p-7 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
                {/* Desk Texture Grid Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:18px_18px] opacity-35 pointer-events-none" />
                
                {/* Ambient Radial Aurora Glow */}
                <div className="absolute -top-24 -right-24 w-60 h-60 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

                {/* Desk Workspace Container */}
                <div className="relative z-10 flex justify-center items-start overflow-y-auto max-h-[820px] scrollbar-thin scrollbar-thumb-slate-700">
                  {invoiceTemplate.layout === "compact" ? (
                    /* ── THERMAL RECEIPT ROLL PAPER ──────────────── */
                    <div className="relative w-full max-w-[340px] bg-white text-slate-900 rounded-none shadow-[0_2px_4px_rgba(0,0,0,0.2),0_12px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(0,0,0,0.12)] border-x border-t border-slate-300 select-none overflow-hidden my-2">
                      {/* Top Thermal Feed Indicator */}
                      <div className="bg-slate-100/90 px-3 py-1 border-b border-dashed border-slate-300 flex items-center justify-between text-[8px] font-mono text-slate-500">
                        <span className="font-bold text-slate-700">ROLL THERMAL POS (80 MM)</span>
                        <span>AUTO CUT READY</span>
                      </div>

                      <InvoicePrintDocument
                        template={invoiceTemplate}
                        invoice={{
                          invoice_number: "INV-2026-09-DEMO",
                          issue_date: new Date().toISOString(),
                          due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
                          status: "UNPAID",
                          billing_period_start: "2026-10-01",
                          billing_period_end: "2026-10-31",
                          subtotal: 250000,
                          tax_amount: 27500,
                          total_amount: 277500,
                          amount_paid: 0,
                          amount_due: 277500,
                          notes: "Pembayaran tepat waktu menjaga koneksi internet tetap optimal.",
                          items: [
                            {
                              description: "Langganan Internet Dedicated Fiber 50 Mbps (Oktober 2026)",
                              quantity: 1,
                              unit_price: 250000,
                              total: 250000,
                            },
                          ],
                        }}
                        customer={{
                          customer_name: "Budi Santoso",
                          customer_number: "CUS-2026-DEMO",
                          phone: "0812-3456-7890",
                          email: "budi.santoso@example.com",
                          address: "Jl. Sudirman No. 42, RT 02/04, Harau",
                        }}
                        elementId="preview-invoice-sheet"
                        isCompactPreview={true}
                      />

                      {/* Authentic Serrated Paper Tear-Off Edge (Zig-zag Cutter) */}
                      <div
                        className="w-full h-3.5 bg-white -mt-0.5 border-t border-dashed border-slate-200"
                        style={{
                          clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 96% 35%, 92% 100%, 88% 35%, 84% 100%, 80% 35%, 76% 100%, 72% 35%, 68% 100%, 64% 35%, 60% 100%, 56% 35%, 52% 100%, 48% 35%, 44% 100%, 40% 35%, 36% 100%, 32% 35%, 28% 100%, 24% 35%, 20% 100%, 16% 35%, 12% 100%, 8% 35%, 4% 100%, 0% 35%)"
                        }}
                      />
                    </div>
                  ) : (
                    /* ── STANDARD PHYSICAL A4 PAPER SHEET ───────── */
                    <div className="relative w-full max-w-[560px] bg-white text-slate-900 rounded-none shadow-[0_1px_3px_rgba(0,0,0,0.15),0_14px_32px_-4px_rgba(0,0,0,0.45),0_28px_64px_-12px_rgba(0,0,0,0.55),0_0_0_1px_rgba(0,0,0,0.08)] border border-slate-300/80 select-none overflow-hidden my-2">
                      {/* Paper Top Spec Header Line */}
                      <div className="bg-slate-100/90 px-4 py-1 border-b border-slate-200 flex items-center justify-between text-[9px] font-mono text-slate-500">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          LEMBAR KERTAS A4 (210 × 297 MM)
                        </span>
                        <span>HVS 80 GSM &bull; MARGIN STANDAR 15MM</span>
                      </div>

                      {/* Paper 2-Hole Binder Punch Marks (Left Edge) */}
                      <div className="absolute left-2 top-[32%] w-3 h-3 rounded-full bg-slate-900 shadow-inner border border-slate-400/40 pointer-events-none opacity-75 z-20" title="Lubang Binder Filing A4" />
                      <div className="absolute left-2 top-[68%] w-3 h-3 rounded-full bg-slate-900 shadow-inner border border-slate-400/40 pointer-events-none opacity-75 z-20" title="Lubang Binder Filing A4" />

                      <InvoicePrintDocument
                        template={invoiceTemplate}
                        invoice={{
                          invoice_number: "INV-2026-09-DEMO",
                          issue_date: new Date().toISOString(),
                          due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
                          status: "UNPAID",
                          billing_period_start: "2026-10-01",
                          billing_period_end: "2026-10-31",
                          subtotal: 250000,
                          tax_amount: 27500,
                          total_amount: 277500,
                          amount_paid: 0,
                          amount_due: 277500,
                          notes: "Pembayaran tepat waktu menjaga koneksi internet tetap optimal.",
                          items: [
                            {
                              description: "Langganan Internet Dedicated Fiber 50 Mbps (Oktober 2026)",
                              quantity: 1,
                              unit_price: 250000,
                              total: 250000,
                            },
                          ],
                        }}
                        customer={{
                          customer_name: "Budi Santoso",
                          customer_number: "CUS-2026-DEMO",
                          phone: "0812-3456-7890",
                          email: "budi.santoso@example.com",
                          address: "Jl. Sudirman No. 42, RT 02/04, Harau",
                        }}
                        elementId="preview-invoice-sheet"
                        isCompactPreview={true}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Billing & Tax */}
      {activeTab === "billing" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-black text-slate-900">Parameter Perhitungan Billing & Pajak</h2>
            <p className="text-xs text-slate-500">
              Menentukan aturan perhitungan PPN, siklus penerbitan otomatis, dan skema kemitraan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Tarif PPN (Basis Points)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.defaultTaxBps / 100}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultTaxBps: (parseInt(e.target.value) || 0) * 100,
                    })
                  }
                  placeholder="11"
                  className="w-24 px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                />
                <span className="text-xs font-bold text-slate-600">% (1100 bps = 11%)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Pajak titipan negara dihitung dari Subtotal (DPP) dan tidak dipotongkan ke mitra.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Masa Tenggang (*Grace Period*)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.gracePeriodDays}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      gracePeriodDays: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="3"
                  className="w-24 px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                />
                <span className="text-xs font-bold text-slate-600">Hari setelah Due Date</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Jumlah hari dispensasi sebelum router melakukan isolir (*suspend*).
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Format Penomoran Faktur
              </label>
              <input
                type="text"
                value={settings.invoicePrefix}
                onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                placeholder="INV/{YYYY}/{MM}/{SEQ}"
                className="w-full px-3.5 py-2 text-xs font-mono border border-slate-300 rounded-xl"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Tersedia variabel: {"{YYYY}"}, {"{MM}"}, {"{SEQ}"}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Default Rasio Bagi Hasil Mitra (%)
              </label>
              <input
                type="number"
                value={settings.defaultPartnerShareBps / 100}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaultPartnerShareBps: (parseInt(e.target.value) || 0) * 100,
                  })
                }
                placeholder="50"
                className="w-full px-3.5 py-2 text-xs font-bold border border-slate-300 rounded-xl"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Contoh: 50 untuk pembagian 50:50 antara Mitra dan ISP Utama.
              </span>
            </div>

            <div className="md:col-span-2 pt-2 border-t border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoUnsuspendOnPaid}
                  onChange={(e) =>
                    setSettings({ ...settings, autoUnsuspendOnPaid: e.target.checked })
                  }
                  className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-slate-800">
                  Otomatis Pulihkan Koneksi Pelanggan (*Auto-Unsuspend*) Begitu Pembayaran Lunas
                </span>
              </label>
              <p className="text-[11px] text-slate-500 ml-5 mt-0.5">
                Mengirim perintah CoA / Radius Disconnect session seketika saat verifikasi QRIS / kasir sukses.
              </p>
            </div>

            {/* Section Addon IP Publik Statik */}
            <div className="md:col-span-2 pt-4 border-t border-slate-200">
              <div className="p-5 bg-gradient-to-br from-amber-50/70 to-orange-50/40 rounded-2xl border border-amber-200/80 space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-amber-500 text-white rounded-xl shadow-xs text-base">🌐</span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Tarif Add-on Layanan & IP Publik Statik</h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Biaya sewa bulanan yang otomatis disisipkan ke faktur berkala jika pelanggan memiliki IP Publik statik.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Tarif Sewa IP Publik Statik (Rp / bulan)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={billingAddons.public_ip_monthly_price}
                        onChange={(e) =>
                          setBillingAddons({
                            ...billingAddons,
                            public_ip_monthly_price: parseInt(e.target.value) || 0,
                          })
                        }
                        placeholder="50000"
                        className="w-full pl-10 pr-3.5 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Default: Rp 50.000 / bulan. Masukkan 0 jika IP Publik gratis (tidak ditagihkan).
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Deskripsi Item pada Faktur Tagihan
                    </label>
                    <input
                      type="text"
                      value={billingAddons.public_ip_description}
                      onChange={(e) =>
                        setBillingAddons({
                          ...billingAddons,
                          public_ip_description: e.target.value,
                        })
                      }
                      placeholder="Contoh: Sewa Add-on IP Publik Statik"
                      className="w-full px-3.5 py-2 text-xs font-medium border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Teks yang tercetak di faktur (misal: Sewa Add-on IP Publik Statik).
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Link to Payment Gateway & Routing Settings */}
            <div className="md:col-span-2 pt-2">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    💳
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">Konfigurasi Gateway Pembayaran (Midtrans &amp; Duitku)</h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Routing aktif: PPPoE via <strong>{pgSettings.pppoe_provider.toUpperCase()}</strong> &bull; Voucher via <strong>{pgSettings.voucher_provider.toUpperCase()}</strong> &bull; Passpoint via <strong>{pgSettings.passpoint_provider.toUpperCase()}</strong>.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("payment")}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs shrink-0 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Buka Tab Payment Gateway</span>
                  <span>&rarr;</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Payment Gateway & Dynamic Routing Matrix */}
      {activeTab === "payment" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-8">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  Multi-Gateway Routing &amp; Integrasi Pembayaran
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Atur alokasi payment gateway secara independen untuk tiap jenis layanan (PPPoE, Voucher Hotspot, Passpoint HS2.0).
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[11px] font-bold">
                <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  PPPoE: {pgSettings.pppoe_provider.toUpperCase()}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Voucher: {pgSettings.voucher_provider.toUpperCase()}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                  Passpoint: {pgSettings.passpoint_provider.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: Gateway Routing Matrix */}
          <div className="p-5 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
              <Zap className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                1. Matriks Alokasi Payment Gateway per Layanan
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* PPPoE Service */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    🌐 Pelanggan PPPoE
                  </span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    Faktur Bulanan
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Gateway untuk pembayaran tagihan berkala di Portal Pelanggan.
                </p>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    Gateway yang Dipakai:
                  </label>
                  <select
                    value={pgSettings.pppoe_provider}
                    onChange={(e) =>
                      setPgSettings({
                        ...pgSettings,
                        pppoe_provider: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="midtrans">Midtrans (Snap QRIS, VA Bank &amp; E-Wallet)</option>
                    <option value="duitku">Duitku (POP Checkout, VA &amp; Retail)</option>
                    <option value="xendit">Xendit (Invoice XenPlatform, QRIS &amp; VA)</option>
                    <option value="tripay">Tripay (Payment Channel &amp; Open QRIS)</option>
                    <option value="nicepay">Nicepay (Enterprise VA, Cards &amp; QRIS)</option>
                    <option value="manual">Manual Kasir / Transfer Rekening Saja</option>
                  </select>
                </div>
              </div>

              {/* Hotspot Voucher */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    📶 Voucher Hotspot
                  </span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    WiFi Publik
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Gateway untuk pembelian voucher mandiri di landing portal WiFi.
                </p>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    Gateway yang Dipakai:
                  </label>
                  <select
                    value={pgSettings.voucher_provider}
                    onChange={(e) =>
                      setPgSettings({
                        ...pgSettings,
                        voucher_provider: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="duitku">Duitku (POP Checkout, VA &amp; Retail)</option>
                    <option value="midtrans">Midtrans (Snap QRIS, VA Bank &amp; E-Wallet)</option>
                    <option value="xendit">Xendit (Invoice XenPlatform, QRIS &amp; VA)</option>
                    <option value="tripay">Tripay (Payment Channel &amp; Open QRIS)</option>
                    <option value="nicepay">Nicepay (Enterprise VA, Cards &amp; QRIS)</option>
                    <option value="manual">Manual Kasir / Offline Saja</option>
                  </select>
                </div>
              </div>

              {/* Passpoint HS2.0 */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    🛡️ Passpoint HS2.0
                  </span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                    Seamless WiFi
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Gateway saat pengguna membeli paket profil Passpoint (.mobileconfig).
                </p>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    Gateway yang Dipakai:
                  </label>
                  <select
                    value={pgSettings.passpoint_provider}
                    onChange={(e) =>
                      setPgSettings({
                        ...pgSettings,
                        passpoint_provider: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="duitku">Duitku (POP Checkout, VA &amp; Retail)</option>
                    <option value="midtrans">Midtrans (Snap QRIS, VA Bank &amp; E-Wallet)</option>
                    <option value="xendit">Xendit (Invoice XenPlatform, QRIS &amp; VA)</option>
                    <option value="tripay">Tripay (Payment Channel &amp; Open QRIS)</option>
                    <option value="nicepay">Nicepay (Enterprise VA, Cards &amp; QRIS)</option>
                    <option value="manual">Manual Kasir / Offline Saja</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Gateways Credentials (Side by Side) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Midtrans Config Card */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 text-sm font-black">
                    MT
                  </span>
                  <div>
                    <h3 className="text-xs font-black text-slate-900">Midtrans Gateway</h3>
                    <p className="text-[10px] text-slate-400">Snap API, Core QRIS &amp; Virtual Account</p>
                  </div>
                </div>
                <select
                  value={pgSettings.midtrans_env}
                  onChange={(e) =>
                    setPgSettings({
                      ...pgSettings,
                      midtrans_env: e.target.value as any,
                    })
                  }
                  className="px-2 py-1 text-[11px] font-bold border border-slate-300 rounded-lg bg-white"
                >
                  <option value="sandbox">Sandbox (Test)</option>
                  <option value="production">Production (Live)</option>
                </select>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Midtrans Merchant ID
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: G857510249"
                    value={pgSettings.midtrans_merchant_id || ""}
                    onChange={(e) =>
                      setPgSettings({
                        ...pgSettings,
                        midtrans_merchant_id: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Midtrans Server Key (Secret)
                  </label>
                  <input
                    type="password"
                    placeholder="Contoh: Mid-server-xxx atau SB-Mid-server-xxx"
                    value={pgSettings.midtrans_server_key}
                    onChange={(e) =>
                      setPgSettings({
                        ...pgSettings,
                        midtrans_server_key: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Midtrans Client Key (Public)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Mid-client-xxx atau SB-Mid-client-xxx"
                    value={pgSettings.midtrans_client_key}
                    onChange={(e) =>
                      setPgSettings({
                        ...pgSettings,
                        midtrans_client_key: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Webhook notification URL */}
                <div className="pt-2">
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    Notification / Webhook URL (Salin ke Dashboard Midtrans):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={
                        typeof window !== "undefined"
                          ? `${window.location.protocol}//${window.location.host}/api/v1/payments/webhook/midtrans`
                          : "https://your-domain.com/api/v1/payments/webhook/midtrans"
                      }
                      className="w-full px-2.5 py-1.5 text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-600 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${window.location.protocol}//${window.location.host}/api/v1/payments/webhook/midtrans`;
                        navigator.clipboard.writeText(url);
                        setCopiedWebhook("midtrans");
                        setTimeout(() => setCopiedWebhook(null), 2000);
                      }}
                      className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 hover:bg-slate-100 flex items-center gap-1 shrink-0"
                    >
                      {copiedWebhook === "midtrans" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600 text-[11px]">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-[11px]">Salin</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Duitku Config Card */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-black">
                    DK
                  </span>
                  <div>
                    <h3 className="text-xs font-black text-slate-900">Duitku Gateway</h3>
                    <p className="text-[10px] text-slate-400">Inquiry API, POP Checkout &amp; Callback MD5</p>
                  </div>
                </div>
                <select
                  value={pgSettings.duitku_env}
                  onChange={(e) =>
                    setPgSettings({
                      ...pgSettings,
                      duitku_env: e.target.value as any,
                    })
                  }
                  className="px-2 py-1 text-[11px] font-bold border border-slate-300 rounded-lg bg-white"
                >
                  <option value="sandbox">Sandbox (Test)</option>
                  <option value="production">Production (Live)</option>
                </select>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Duitku Merchant Code
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: D12345"
                    value={pgSettings.duitku_merchant_code}
                    onChange={(e) =>
                      setPgSettings({
                        ...pgSettings,
                        duitku_merchant_code: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Duitku API Key / Secret Key
                  </label>
                  <input
                    type="password"
                    placeholder="Contoh: 32 karakter kunci API dari Merchant Duitku"
                    value={pgSettings.duitku_api_key}
                    onChange={(e) =>
                      setPgSettings({
                        ...pgSettings,
                        duitku_api_key: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Webhook notification URL */}
                <div className="pt-2">
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    Callback / Webhook URL (Salin ke Dashboard Duitku):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={
                        typeof window !== "undefined"
                          ? `${window.location.protocol}//${window.location.host}/api/v1/payments/webhook/duitku`
                          : "https://your-domain.com/api/v1/payments/webhook/duitku"
                      }
                      className="w-full px-2.5 py-1.5 text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-600 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${window.location.protocol}//${window.location.host}/api/v1/payments/webhook/duitku`;
                        navigator.clipboard.writeText(url);
                        setCopiedWebhook("duitku");
                        setTimeout(() => setCopiedWebhook(null), 2000);
                      }}
                      className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 hover:bg-slate-100 flex items-center gap-1 shrink-0"
                    >
                      {copiedWebhook === "duitku" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600 text-[11px]">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-[11px]">Salin</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Xendit Config Card */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 text-sm font-black">
                    XN
                  </span>
                  <div>
                    <h3 className="text-xs font-black text-slate-900">Xendit Gateway</h3>
                    <p className="text-[10px] text-slate-400">Invoice API, XenPlatform QRIS &amp; Virtual Account</p>
                  </div>
                </div>
                <span className="px-2 py-1 text-[11px] font-bold rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                  Global API
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Xendit Secret API Key
                  </label>
                  <input
                    type="password"
                    placeholder="Contoh: xnd_production_xxx atau xnd_development_xxx"
                    value={pgSettings.xendit_secret_key || ""}
                    onChange={(e) =>
                      setPgSettings({
                        ...pgSettings,
                        xendit_secret_key: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Webhook Verification Token
                  </label>
                  <input
                    type="password"
                    placeholder="Token verifikasi callback dari menu Callbacks Xendit"
                    value={pgSettings.xendit_webhook_token || ""}
                    onChange={(e) =>
                      setPgSettings({
                        ...pgSettings,
                        xendit_webhook_token: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Webhook notification URL */}
                <div className="pt-2">
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    Webhook URL (Salin ke Dashboard Xendit):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={
                        typeof window !== "undefined"
                          ? `${window.location.protocol}//${window.location.host}/api/v1/payments/webhook/xendit`
                          : "https://your-domain.com/api/v1/payments/webhook/xendit"
                      }
                      className="w-full px-2.5 py-1.5 text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-600 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${window.location.protocol}//${window.location.host}/api/v1/payments/webhook/xendit`;
                        navigator.clipboard.writeText(url);
                        setCopiedWebhook("xendit");
                        setTimeout(() => setCopiedWebhook(null), 2000);
                      }}
                      className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 hover:bg-slate-100 flex items-center gap-1 shrink-0"
                    >
                      {copiedWebhook === "xendit" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600 text-[11px]">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-[11px]">Salin</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tripay Config Card */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700 text-sm font-black">
                    TP
                  </span>
                  <div>
                    <h3 className="text-xs font-black text-slate-900">Tripay Payment Gateway</h3>
                    <p className="text-[10px] text-slate-400">Open Payment, Multi-Channel &amp; Signature HMAC</p>
                  </div>
                </div>
                <select
                  value={pgSettings.tripay_env || "sandbox"}
                  onChange={(e) =>
                    setPgSettings({
                      ...pgSettings,
                      tripay_env: e.target.value as any,
                    })
                  }
                  className="px-2 py-1 text-[11px] font-bold border border-slate-300 rounded-lg bg-white"
                >
                  <option value="sandbox">Sandbox (Test)</option>
                  <option value="production">Production (Live)</option>
                </select>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Merchant Code
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: T12345"
                      value={pgSettings.tripay_merchant_code || ""}
                      onChange={(e) =>
                        setPgSettings({
                          ...pgSettings,
                          tripay_merchant_code: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      API Key
                    </label>
                    <input
                      type="password"
                      placeholder="DEV-xxx atau Live API Key"
                      value={pgSettings.tripay_api_key || ""}
                      onChange={(e) =>
                        setPgSettings({
                          ...pgSettings,
                          tripay_api_key: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Private Key (Validasi Signature Callback)
                  </label>
                  <input
                    type="password"
                    placeholder="Tripay Private Key"
                    value={pgSettings.tripay_private_key || ""}
                    onChange={(e) =>
                      setPgSettings({
                        ...pgSettings,
                        tripay_private_key: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Webhook notification URL */}
                <div className="pt-2">
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    Callback / Webhook URL (Salin ke Dashboard Tripay):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={
                        typeof window !== "undefined"
                          ? `${window.location.protocol}//${window.location.host}/api/v1/payments/webhook/tripay`
                          : "https://your-domain.com/api/v1/payments/webhook/tripay"
                      }
                      className="w-full px-2.5 py-1.5 text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-600 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${window.location.protocol}//${window.location.host}/api/v1/payments/webhook/tripay`;
                        navigator.clipboard.writeText(url);
                        setCopiedWebhook("tripay");
                        setTimeout(() => setCopiedWebhook(null), 2000);
                      }}
                      className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 hover:bg-slate-100 flex items-center gap-1 shrink-0"
                    >
                      {copiedWebhook === "tripay" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600 text-[11px]">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-[11px]">Salin</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Nicepay Config Card */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-teal-100 text-teal-700 text-sm font-black">
                    NP
                  </span>
                  <div>
                    <h3 className="text-xs font-black text-slate-900">Nicepay Gateway</h3>
                    <p className="text-[10px] text-slate-400">Enterprise VA, Card Processing &amp; SHA256 Token</p>
                  </div>
                </div>
                <select
                  value={pgSettings.nicepay_env || "sandbox"}
                  onChange={(e) =>
                    setPgSettings({
                      ...pgSettings,
                      nicepay_env: e.target.value as any,
                    })
                  }
                  className="px-2 py-1 text-[11px] font-bold border border-slate-300 rounded-lg bg-white"
                >
                  <option value="sandbox">Sandbox (Test)</option>
                  <option value="production">Production (Live)</option>
                </select>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Merchant iMid
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: IONPAYTEST"
                      value={pgSettings.nicepay_imid || ""}
                      onChange={(e) =>
                        setPgSettings({
                          ...pgSettings,
                          nicepay_imid: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Merchant Key
                    </label>
                    <input
                      type="password"
                      placeholder="Kunci Merchant Rahasia"
                      value={pgSettings.nicepay_merchant_key || ""}
                      onChange={(e) =>
                        setPgSettings({
                          ...pgSettings,
                          nicepay_merchant_key: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {/* Webhook notification URL */}
                <div className="pt-2">
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    Notification / DBProcess URL (Salin ke Nicepay):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={
                        typeof window !== "undefined"
                          ? `${window.location.protocol}//${window.location.host}/api/v1/payments/webhook/nicepay`
                          : "https://your-domain.com/api/v1/payments/webhook/nicepay"
                      }
                      className="w-full px-2.5 py-1.5 text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-600 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${window.location.protocol}//${window.location.host}/api/v1/payments/webhook/nicepay`;
                        navigator.clipboard.writeText(url);
                        setCopiedWebhook("nicepay");
                        setTimeout(() => setCopiedWebhook(null), 2000);
                      }}
                      className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 hover:bg-slate-100 flex items-center gap-1 shrink-0"
                    >
                      {copiedWebhook === "nicepay" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600 text-[11px]">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-[11px]">Salin</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Manual Bank Accounts (Multi-Rekening Kasir / Transfer Bank) */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
              <div>
                <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  3. Rekening Penampungan Kasir / Manual Transfer Bank (Multi-Rekening)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Daftar rekening bank penerima pembayaran manual pelanggan. Rekening ini tersinkronisasi otomatis dengan faktur tagihan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const current = invoiceTemplate.bank_accounts && invoiceTemplate.bank_accounts.length > 0
                    ? [...invoiceTemplate.bank_accounts]
                    : [{
                        bank_name: invoiceTemplate.bank_name || settings.bankName || "Bank Central Asia (BCA)",
                        bank_account_number: invoiceTemplate.bank_account_number || settings.bankAccountNumber || "8001234567",
                        bank_account_holder: invoiceTemplate.bank_account_holder || settings.bankAccountHolder || invoiceTemplate.company_name || "",
                        branch: "",
                      }];
                  current.push({
                    bank_name: "",
                    bank_account_number: "",
                    bank_account_holder: invoiceTemplate.company_name || settings.bankAccountHolder || "",
                    branch: "",
                  });
                  setInvoiceTemplate({
                    ...invoiceTemplate,
                    bank_accounts: current,
                    bank_name: current[0].bank_name,
                    bank_account_number: current[0].bank_account_number,
                    bank_account_holder: current[0].bank_account_holder,
                  });
                  setSettings({
                    ...settings,
                    bankName: current[0].bank_name,
                    bankAccountNumber: current[0].bank_account_number,
                    bankAccountHolder: current[0].bank_account_holder,
                  });
                }}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-300 flex items-center gap-1.5 cursor-pointer transition shrink-0 self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Rekening Bank
              </button>
            </div>

            <div className="space-y-3">
              {((invoiceTemplate.bank_accounts && invoiceTemplate.bank_accounts.length > 0)
                ? invoiceTemplate.bank_accounts
                : [{
                    bank_name: invoiceTemplate.bank_name || settings.bankName || "",
                    bank_account_number: invoiceTemplate.bank_account_number || settings.bankAccountNumber || "",
                    bank_account_holder: invoiceTemplate.bank_account_holder || settings.bankAccountHolder || "",
                    branch: "",
                  }]
              ).map((acc, index) => (
                <div
                  key={index}
                  className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3 relative transition hover:border-slate-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">
                        {index + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {index === 0 ? "Rekening Utama (Default)" : `Rekening Tambahan #${index + 1}`}
                      </span>
                      {acc.bank_name && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {acc.bank_name}
                        </span>
                      )}
                    </div>

                    {(invoiceTemplate.bank_accounts?.length || 1) > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const current = [...(invoiceTemplate.bank_accounts || [])];
                          current.splice(index, 1);
                          setInvoiceTemplate({
                            ...invoiceTemplate,
                            bank_accounts: current,
                            bank_name: current[0]?.bank_name || "",
                            bank_account_number: current[0]?.bank_account_number || "",
                            bank_account_holder: current[0]?.bank_account_holder || "",
                          });
                          if (current.length > 0) {
                            setSettings({
                              ...settings,
                              bankName: current[0].bank_name,
                              bankAccountNumber: current[0].bank_account_number,
                              bankAccountHolder: current[0].bank_account_holder,
                            });
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Hapus rekening ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Bank</label>
                      <input
                        type="text"
                        value={acc.bank_name}
                        onChange={(e) => {
                          const current = invoiceTemplate.bank_accounts && invoiceTemplate.bank_accounts.length > 0
                            ? [...invoiceTemplate.bank_accounts]
                            : [{
                                bank_name: invoiceTemplate.bank_name || settings.bankName || "",
                                bank_account_number: invoiceTemplate.bank_account_number || settings.bankAccountNumber || "",
                                bank_account_holder: invoiceTemplate.bank_account_holder || settings.bankAccountHolder || "",
                                branch: "",
                              }];
                          current[index] = { ...current[index], bank_name: e.target.value };
                          setInvoiceTemplate({
                            ...invoiceTemplate,
                            bank_accounts: current,
                            bank_name: current[0].bank_name,
                            bank_account_number: current[0].bank_account_number,
                            bank_account_holder: current[0].bank_account_holder,
                          });
                          if (index === 0) {
                            setSettings({
                              ...settings,
                              bankName: e.target.value,
                            });
                          }
                        }}
                        placeholder="Contoh: BCA / BRI / Mandiri"
                        className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Nomor Rekening</label>
                      <input
                        type="text"
                        value={acc.bank_account_number}
                        onChange={(e) => {
                          const current = invoiceTemplate.bank_accounts && invoiceTemplate.bank_accounts.length > 0
                            ? [...invoiceTemplate.bank_accounts]
                            : [{
                                bank_name: invoiceTemplate.bank_name || settings.bankName || "",
                                bank_account_number: invoiceTemplate.bank_account_number || settings.bankAccountNumber || "",
                                bank_account_holder: invoiceTemplate.bank_account_holder || settings.bankAccountHolder || "",
                                branch: "",
                              }];
                          current[index] = { ...current[index], bank_account_number: e.target.value };
                          setInvoiceTemplate({
                            ...invoiceTemplate,
                            bank_accounts: current,
                            bank_name: current[0].bank_name,
                            bank_account_number: current[0].bank_account_number,
                            bank_account_holder: current[0].bank_account_holder,
                          });
                          if (index === 0) {
                            setSettings({
                              ...settings,
                              bankAccountNumber: e.target.value,
                            });
                          }
                        }}
                        placeholder="8001234567"
                        className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Atas Nama Rekening</label>
                      <input
                        type="text"
                        value={acc.bank_account_holder}
                        onChange={(e) => {
                          const current = invoiceTemplate.bank_accounts && invoiceTemplate.bank_accounts.length > 0
                            ? [...invoiceTemplate.bank_accounts]
                            : [{
                                bank_name: invoiceTemplate.bank_name || settings.bankName || "",
                                bank_account_number: invoiceTemplate.bank_account_number || settings.bankAccountNumber || "",
                                bank_account_holder: invoiceTemplate.bank_account_holder || settings.bankAccountHolder || "",
                                branch: "",
                              }];
                          current[index] = { ...current[index], bank_account_holder: e.target.value };
                          setInvoiceTemplate({
                            ...invoiceTemplate,
                            bank_accounts: current,
                            bank_name: current[0].bank_name,
                            bank_account_number: current[0].bank_account_number,
                            bank_account_holder: current[0].bank_account_holder,
                          });
                          if (index === 0) {
                            setSettings({
                              ...settings,
                              bankAccountHolder: e.target.value,
                            });
                          }
                        }}
                        placeholder="PT CITRA MEDIA NUSANTARA"
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Cabang / Kode Bank</label>
                      <input
                        type="text"
                        value={acc.branch || ""}
                        onChange={(e) => {
                          const current = invoiceTemplate.bank_accounts && invoiceTemplate.bank_accounts.length > 0
                            ? [...invoiceTemplate.bank_accounts]
                            : [{
                                bank_name: invoiceTemplate.bank_name || settings.bankName || "",
                                bank_account_number: invoiceTemplate.bank_account_number || settings.bankAccountNumber || "",
                                bank_account_holder: invoiceTemplate.bank_account_holder || settings.bankAccountHolder || "",
                                branch: "",
                              }];
                          current[index] = { ...current[index], branch: e.target.value };
                          setInvoiceTemplate({
                            ...invoiceTemplate,
                            bank_accounts: current,
                          });
                        }}
                        placeholder="Contoh: KCU Sudirman / Cabang Utama"
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Notifications */}
      {activeTab === "notification" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-black text-slate-900">Notifikasi Otomatis (WhatsApp & Email)</h2>
            <p className="text-xs text-slate-500">
              Konfigurasi pengiriman notifikasi pengingat tagihan, struk bayar, dan peringatan isolir.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                WhatsApp Gateway API
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Provider WA</label>
                  <select
                    value={settings.waProvider}
                    onChange={(e) => setSettings({ ...settings, waProvider: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="FONNTE">Fonnte WhatsApp API</option>
                    <option value="WABLAS">Wablas Gateway</option>
                    <option value="INTERNAL">Baileys Internal Gateway</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Token API WhatsApp</label>
                  <input
                    type="password"
                    value={settings.waApiToken}
                    onChange={(e) => setSettings({ ...settings, waApiToken: e.target.value })}
                    placeholder="Contoh: token_api_fonnte_atau_wablas"
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifyDueDateH3}
                    onChange={(e) => setSettings({ ...settings, notifyDueDateH3: e.target.checked })}
                    className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-700">
                    Kirim pesan WhatsApp pengingat tagihan 3 hari sebelum jatuh tempo (H-3)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifyPaymentPaid}
                    onChange={(e) => setSettings({ ...settings, notifyPaymentPaid: e.target.checked })}
                    className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-700">
                    Kirim pesan bukti lunas WhatsApp seketika saat pelanggan menyelesaikan pembayaran
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifyAccountSuspended}
                    onChange={(e) => setSettings({ ...settings, notifyAccountSuspended: e.target.checked })}
                    className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-700">
                    Kirim pesan peringatan isolir jika pelanggan melewati masa tenggang (*grace period*)
                  </span>
                </label>
              </div>
            </div>

            {/* SMTP Mailer */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-blue-600" />
                Mail Server SMTP (Pengiriman Faktur PDF via Email)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Host SMTP</label>
                  <input
                    type="text"
                    value={settings.smtpHost}
                    onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                    placeholder="Contoh: mail.perusahaan.net.id atau smtp.gmail.com"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Port</label>
                  <input
                    type="text"
                    value={settings.smtpPort}
                    onChange={(e) => setSettings({ ...settings, smtpPort: e.target.value })}
                    placeholder="587 / 465"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Username SMTP</label>
                  <input
                    type="text"
                    value={settings.smtpUser}
                    onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                    placeholder="billing@perusahaan.net.id"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Security & Network */}
      {activeTab === "security" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                Keamanan & Kebijakan Jaringan
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kontrol autentikasi staf, pembatasan subnet IP NOC, dan host domain isolir walled-garden.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowSecurityHelp(!showSecurityHelp)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-colors border border-blue-200/60"
            >
              <HelpCircle className="w-4 h-4" />
              {showSecurityHelp ? "Sembunyikan Panduan" : "Buka Panduan Bantuan"}
            </button>
          </div>

          {/* Interactive Help & Guidance Box */}
          {showSecurityHelp && (
            <div className="p-4 bg-gradient-to-br from-blue-50/80 via-slate-50 to-indigo-50/50 rounded-2xl border border-blue-200/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-blue-600" />
                  Panduan & Petunjuk Keamanan Sistem
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                  Bantuan Fitur
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-slate-700">
                <div className="p-3 bg-white/90 rounded-xl border border-blue-100 space-y-1 shadow-2xs">
                  <p className="font-bold text-slate-900 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-600" /> Sesi Login JWT
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    Menentukan berapa lama staf tetap login sebelum token kadaluarsa. Rekomendasi: <strong>8 Jam</strong> untuk jam kerja operasional harian, atau <strong>1-2 Jam</strong> untuk audit ketat.
                  </p>
                </div>

                <div className="p-3 bg-white/90 rounded-xl border border-blue-100 space-y-1 shadow-2xs">
                  <p className="font-bold text-slate-900 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Pembatasan IP NOC
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    <strong>Default: Nonaktif</strong>. Jika diaktifkan, hanya perangkat dengan IP yang terdaftar yang bisa mengakses panel admin & login staf. Pastikan IP Anda masuk daftar sebelum mengaktifkannya!
                  </p>
                </div>

                <div className="p-3 bg-white/90 rounded-xl border border-blue-100 space-y-1 shadow-2xs">
                  <p className="font-bold text-slate-900 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-purple-600" /> Walled Garden
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    <strong>Default: Nonaktif</strong>. Domain yang tetap bisa diakses oleh pelanggan saat status internet <strong>TERISOLIR</strong>, wajib menyertakan portal tagihan dan gateway Midtrans.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Feature 1: Subnet IP Whitelist for NOC Management */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-xs font-black text-slate-900 flex items-center gap-2">
                  <Server className="w-4 h-4 text-slate-700" />
                  Pembatasan Subnet IP Terpercaya (NOC Whitelist)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Batasi akses login dan REST API admin hanya dari alamat IP/subnet kantor atau VPN NOC.
                </p>
              </div>

              {/* Toggle Switch */}
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    securitySettings.enable_ip_whitelist
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {securitySettings.enable_ip_whitelist ? "AKTIF" : "NONAKTIF (Akses Bebas)"}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={securitySettings.enable_ip_whitelist}
                    onChange={(e) =>
                      setSecuritySettings({
                        ...securitySettings,
                        enable_ip_whitelist: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>

            {/* Detected Current IP & Auto-Add button */}
            <div className="p-3 bg-white rounded-xl border border-slate-200/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-xs flex items-center gap-2">
                <span className="text-slate-500 text-[11px]">IP Anda Saat Ini:</span>
                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  {clientIP || "Mendeteksi..."}
                </span>
              </div>
              {clientIP && (
                <button
                  type="button"
                  onClick={() => {
                    const current = securitySettings.allowed_noc_subnets || "";
                    if (!current.includes(clientIP)) {
                      const updated = current
                        ? `${current.trim().replace(/,\s*$/, "")}, ${clientIP}/32`
                        : `${clientIP}/32`;
                      setSecuritySettings({
                        ...securitySettings,
                        allowed_noc_subnets: updated,
                      });
                    }
                  }}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 self-start sm:self-auto"
                >
                  + Tambahkan IP Saya ke Daftar
                </button>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Daftar Subnet / IP Terpercaya (Pisahkan dengan koma)
              </label>
              <textarea
                rows={2}
                value={securitySettings.allowed_noc_subnets}
                onChange={(e) =>
                  setSecuritySettings({
                    ...securitySettings,
                    allowed_noc_subnets: e.target.value,
                  })
                }
                placeholder="103.179.64.0/24, 10.0.0.0/8, 172.16.0.0/12, 192.168.1.50/32"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Format yang didukung: Notasi CIDR (misal <code>10.0.0.0/8</code>, <code>103.179.64.0/24</code>) atau IP tunggal (misal <code>192.168.1.100</code>). Loopback <code>127.0.0.1</code> selalu diizinkan secara otomatis sebagai pengaman anti-lockout.
              </span>
            </div>
          </div>

          {/* Feature 2: Walled Garden Hosts */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-xs font-black text-slate-900 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-purple-600" />
                  Host Domain Walled Garden (Bypass Akses Saat Terisolir)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Daftar domain/website yang diizinkan diakses pelanggan saat koneksi internet diblokir/isolir tagihan.
                </p>
              </div>

              {/* Toggle Switch */}
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    securitySettings.enable_walled_garden
                      ? "bg-purple-100 text-purple-800"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {securitySettings.enable_walled_garden ? "AKTIF" : "NONAKTIF"}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={securitySettings.enable_walled_garden}
                    onChange={(e) =>
                      setSecuritySettings({
                        ...securitySettings,
                        enable_walled_garden: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  Daftar Host Domain (Pisahkan dengan koma)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setSecuritySettings({
                      ...securitySettings,
                      walled_garden_hosts:
                        typeof window !== "undefined"
                          ? `${window.location.host}, api.midtrans.com, app.midtrans.com`
                          : "billing.domainisp.net, portal.domainisp.net, api.midtrans.com, app.midtrans.com",
                    })
                  }
                  className="text-[10px] font-bold text-purple-600 hover:text-purple-800 hover:underline"
                >
                  Gunakan Rekomendasi Standar
                </button>
              </div>
              <textarea
                rows={2}
                value={securitySettings.walled_garden_hosts}
                onChange={(e) =>
                  setSecuritySettings({
                    ...securitySettings,
                    walled_garden_hosts: e.target.value,
                  })
                }
                placeholder="billing.domainisp.net, portal.domainisp.net, api.midtrans.com, app.midtrans.com"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Daftar ini dapat dikonsumsi otomatis oleh router MikroTik melalui endpoint: <code>/api/v1/settings/walled-garden</code>
              </span>
            </div>
          </div>

          {/* Feature 3: JWT Session Lifetime */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Masa Berlaku Sesi Login Token JWT (Staf & Admin)
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-full sm:w-48">
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={72}
                    value={securitySettings.jwt_expiry_hours}
                    onChange={(e) =>
                      setSecuritySettings({
                        ...securitySettings,
                        jwt_expiry_hours: parseInt(e.target.value) || 1,
                      })
                    }
                    placeholder="24"
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white pr-12 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">
                    Jam
                  </span>
                </div>
              </div>

              {/* Quick presets */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500 font-medium mr-1">Preset:</span>
                {[4, 8, 12, 24].map((hrs) => (
                  <button
                    key={hrs}
                    type="button"
                    onClick={() =>
                      setSecuritySettings({
                        ...securitySettings,
                        jwt_expiry_hours: hrs,
                      })
                    }
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                      securitySettings.jwt_expiry_hours === hrs
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {hrs} Jam
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-slate-500">
              Setelah masa berlaku habis, pengguna wajib memasukkan ulang kredensial login demi keamanan sistem.
            </p>
          </div>

          {/* Feature 4: Device Lock / MAC Binding for Hotspot Vouchers */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-xs font-black text-slate-900 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  Kuncian MAC Perangkat Voucher (MAC Binding &amp; Anti-Maling)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Kunci voucher hotspot hanya pada 1 perangkat saat pertama kali login. Mencegah voucher dicuri atau dipakai bergantian.
                </p>
              </div>

              {/* Toggle Switch */}
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    securitySettings.enable_mac_lock
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {securitySettings.enable_mac_lock ? "AKTIF (Terkunci)" : "NONAKTIF (Bebas / MAC Acak Diizinkan)"}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={securitySettings.enable_mac_lock}
                    onChange={(e) =>
                      setSecuritySettings({
                        ...securitySettings,
                        enable_mac_lock: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200/90 text-[11px] text-slate-600 space-y-1 leading-relaxed">
              <p>
                <strong>Cara Kerja Reset Mandiri:</strong>
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-500">
                <li><strong>Voucher Fisik / Gesek:</strong> Jika MAC berbeda, pelanggan cukup memasukkan Serial Number (SN) kartu voucher untuk mereset kuncian ke HP baru.</li>
                <li><strong>Voucher Online (QRIS):</strong> Jika MAC berbeda, pelanggan cukup memasukkan Nomor WhatsApp pembelian atau Order ID tanpa perlu menunggu OTP.</li>
                <li><strong>Jika dinonaktifkan:</strong> Seluruh voucher dapat login dari perangkat mana saja tanpa verifikasi kuncian MAC (cocok jika banyak pelanggan memakai MAC acak/randomized MAC).</li>
              </ul>
            </div>
          </div>

          {/* Security Standards Info */}
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/80 flex items-start gap-3">
            <Key className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <p className="font-bold">Standar Enkripsi & Audit Keamanan</p>
              <p className="text-amber-700 text-[11px] leading-relaxed">
                Sistem mewajibkan enkripsi kata sandi menggunakan <strong>Bcrypt (cost=12)</strong> untuk seluruh akun staf, serta tanda tangan asimetris <strong>RSA-256</strong> untuk token otentikasi API. Setiap perubahan konfigurasi keamanan dan pembayaran dicatat secara permanen di audit log database.
              </p>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

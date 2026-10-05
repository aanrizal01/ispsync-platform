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
  Send,
  MapPin,
  Eye,
  EyeOff,
  Calculator,
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
  DomainSettings,
  defaultDomainSettings,
  FiberGridIntegrationSettings,
  defaultFiberGridIntegrationSettings,
  TaxRegimeMode,
  TenantIntegrationSettings,
  defaultTenantIntegrationSettings,
} from "@/lib/api/settings";
import { ipamApi, type IPAMSettings, type Subnet, type TestResult } from "@/lib/api/ipam";
import { InvoicePrintDocument } from "@/components/invoice/InvoicePrintDocument";
import { useAuth } from "@/lib/auth/context";

export default function AdminSettingsPage() {
  const { hasPermission, isLoading: isAuthLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "general" | "invoice_template" | "billing" | "payment" | "domain" | "notification" | "security" | "fibergrid"
  >("general");

  const [invoiceTemplate, setInvoiceTemplate] =
    useState<InvoiceTemplateSettings>(defaultInvoiceTemplateSettings);
  const [billingAddons, setBillingAddons] =
    useState<BillingAddonSettings>(defaultBillingAddonSettings);
  const [securitySettings, setSecuritySettings] =
    useState<SecuritySettings>(defaultSecuritySettings);
  const [pgSettings, setPgSettings] =
    useState<PaymentGatewaySettings>(defaultPaymentGatewaySettings);
  const [domainSettings, setDomainSettings] =
    useState<DomainSettings>(defaultDomainSettings);
  const [copiedWebhook, setCopiedWebhook] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState<string | null>(null);
  const [clientIP, setClientIP] = useState<string>("");
  const [showSecurityHelp, setShowSecurityHelp] = useState<boolean>(true);
  const [showMapsKey, setShowMapsKey] = useState<boolean>(false);
  const [copiedMapsKey, setCopiedMapsKey] = useState<boolean>(false);
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

  const [waTestPhone, setWaTestPhone] = useState("");
  const [waTesting, setWaTesting] = useState(false);
  const [waTestResult, setWaTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // FiberGrid Custom Integration State
  const [fibergridSettings, setFibergridSettings] = useState<FiberGridIntegrationSettings>(defaultFiberGridIntegrationSettings);
  const [fibergridTesting, setFibergridTesting] = useState(false);
  const [fibergridTestResult, setFibergridTestResult] = useState<{
    success: boolean;
    message: string;
    latency_ms?: number;
    routes_count?: number;
  } | null>(null);
  const [showFibergridKey, setShowFibergridKey] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Settings Form State
  const [settings, setSettings] = useState({
    // General
    companyName: "",
    brandName: "",
    npwp: "",
    nib: "",
    sklo: "",
    address: "",
    phone: "",
    whatsappCS: "",
    emailSupport: "",
    website: "",
    invoiceFooterNote: "",

    // Billing Engine & Fiscal Profile
    taxMode: "NON_PKP" as TaxRegimeMode,
    taxRatePPN: 11.0,
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
    waServerUrl: "https://api.wablas.com",
    notifyDueDateH3: true,
    notifyInvoiceIssued: true,
    notifyPaymentPaid: true,
    notifyAccountSuspended: true,
    smtpHost: "",
    smtpPort: "587",
    smtpUser: "",
    smtpPass: "",
    smtpFrom: "",

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
              nib: data.nib || "0220208123456",
              sklo: data.sklo || "No. 128/TEL.04.02/KOMINFO",
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

    // Load domain & sub-brand settings
    settingsApi
      .getDomainSettings()
      .then((data) => {
        if (data && (data.wifi_domain || data.ledger_domain || data.wifi_brand_name)) {
          setDomainSettings(data);
        }
      })
      .catch((err) => {
        console.error("Failed to load domain settings:", err);
      });

    // Load notification & WhatsApp settings
    settingsApi
      .getNotificationSettings()
      .then((data) => {
        if (data && data.wa_provider) {
          setSettings((prev) => ({
            ...prev,
            waProvider: data.wa_provider,
            waApiToken: data.wa_api_token || prev.waApiToken,
            waServerUrl: data.wa_server_url || prev.waServerUrl || "https://api.wablas.com",
            notifyDueDateH3: data.notify_due_date_h3 !== undefined ? data.notify_due_date_h3 : prev.notifyDueDateH3,
            notifyInvoiceIssued: data.notify_invoice_issued !== undefined ? data.notify_invoice_issued : prev.notifyInvoiceIssued,
            notifyPaymentPaid: data.notify_payment_paid !== undefined ? data.notify_payment_paid : prev.notifyPaymentPaid,
            notifyAccountSuspended: data.notify_account_suspended !== undefined ? data.notify_account_suspended : prev.notifyAccountSuspended,
            smtpHost: data.smtp_host || prev.smtpHost,
            smtpPort: String(data.smtp_port || prev.smtpPort || "587"),
            smtpUser: data.smtp_user || prev.smtpUser,
            smtpFrom: data.smtp_from || prev.smtpFrom,
          }));
        }
      })
      .catch((err) => {
        console.error("Failed to load notification settings:", err);
      });

    // Load FiberGrid integration settings
    settingsApi
      .getFiberGridSettings()
      .then((data) => {
        if (data && data.api_url !== undefined) {
          setFibergridSettings(data);
        }
      })
      .catch((err) => {
        console.error("Failed to load FiberGrid settings:", err);
      });

    // Load Tenant Integration & Fiscal Tax settings
    settingsApi
      .getTenantSettings()
      .then((data) => {
        if (data) {
          const mode = (data.tax_mode as TaxRegimeMode) || "NON_PKP";
          const rate = data.tax_rate_ppn !== undefined ? Number(data.tax_rate_ppn) : 11.0;
          setSettings((prev) => ({
            ...prev,
            taxMode: mode,
            taxRatePPN: rate,
            defaultTaxBps: Math.round(rate * 100),
            npwp: data.npwp || prev.npwp,
          }));
          if (data.npwp) {
            setInvoiceTemplate((prev) => ({
              ...prev,
              tax_id: data.npwp || prev.tax_id,
            }));
          }
        }
      })
      .catch((err) => {
        console.warn("Failed to load tenant integration settings via settingsApi:", err);
      });

    // Detect current client IP
    settingsApi
      .getClientIP()
      .then((res) => {
        if (res && res.ip) setClientIP(res.ip);
      })
      .catch(() => {});
  }, []);

  const handleTestFiberGrid = async () => {
    if (!fibergridSettings.api_url?.trim()) {
      alert("Harap masukkan URL API Endpoint FiberGrid terlebih dahulu.");
      return;
    }
    setFibergridTesting(true);
    setFibergridTestResult(null);
    try {
      const res = await settingsApi.testFiberGrid({
        api_url: fibergridSettings.api_url.trim(),
        api_key: fibergridSettings.api_key?.trim() || "",
        tenant_code: fibergridSettings.tenant_code?.trim() || "",
      });
      setFibergridTestResult(res);
      if (res.success) {
        setFibergridSettings((prev) => ({ ...prev, enabled: true }));
      }
    } catch (err: any) {
      setFibergridTestResult({
        success: false,
        message: err.message || "Gagal menghubungi server FiberGrid.",
      });
    } finally {
      setFibergridTesting(false);
    }
  };

  const handleTestWhatsApp = async () => {
    if (!waTestPhone.trim()) {
      alert("Harap masukkan nomor WhatsApp tujuan uji coba.");
      return;
    }
    if (!settings.waApiToken) {
      alert("Harap isi Token API WhatsApp terlebih dahulu.");
      return;
    }
    setWaTesting(true);
    setWaTestResult(null);
    try {
      const res = await settingsApi.testWhatsApp({
        provider: settings.waProvider,
        api_token: settings.waApiToken,
        server_url: settings.waServerUrl,
        recipient: waTestPhone.trim(),
      });
      setWaTestResult({
        success: true,
        message: res.message || "Pesan uji coba berhasil dikirim. Silakan cek aplikasi WhatsApp tujuan.",
      });
    } catch (err: any) {
      setWaTestResult({
        success: false,
        message: err.message || "Gagal mengirim pesan uji coba WhatsApp.",
      });
    } finally {
      setWaTesting(false);
    }
  };

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
      // Save tenant integration & fiscal tax settings to PostgreSQL database
      await settingsApi
        .updateTenantSettings({
          tax_mode: settings.taxMode,
          tax_rate_ppn: settings.taxRatePPN,
          npwp: settings.npwp,
        })
        .catch((err) => {
          console.warn("Direct settingsApi update failed:", err);
        });

      // Save invoice template settings to PostgreSQL database
      const updatedInvoiceTemplate = {
        ...invoiceTemplate,
        tax_id: settings.npwp || invoiceTemplate.tax_id,
      };
      await settingsApi.updateInvoiceTemplate(updatedInvoiceTemplate);

      // Save billing addons settings to PostgreSQL database
      await settingsApi.updateBillingAddons(billingAddons);

      // Save security settings to PostgreSQL database
      await settingsApi.updateSecuritySettings(securitySettings);

      // Save payment gateway & routing settings to PostgreSQL database
      await settingsApi.updatePaymentGatewaySettings(pgSettings);

      // Save domain & sub-brand settings to PostgreSQL database
      await settingsApi.updateDomainSettings(domainSettings);

      // Save FiberGrid integration settings to database
      await settingsApi.updateFiberGridSettings(fibergridSettings);

      // Save phpIPAM settings to database
      await ipamApi.saveSettings(ipamSettings);

      // Save notification & WhatsApp settings to database
      await settingsApi.updateNotificationSettings({
        wa_provider: (settings.waProvider as any) || "FONNTE",
        wa_api_token: settings.waApiToken || "",
        wa_server_url: settings.waServerUrl || "https://api.wablas.com",
        notify_due_date_h3: !!settings.notifyDueDateH3,
        notify_invoice_issued: !!settings.notifyInvoiceIssued,
        notify_payment_paid: !!settings.notifyPaymentPaid,
        notify_account_suspended: !!settings.notifyAccountSuspended,
        smtp_host: settings.smtpHost || "",
        smtp_port: parseInt(settings.smtpPort, 10) || 587,
        smtp_user: settings.smtpUser || "",
        smtp_password: settings.smtpPass || "",
        smtp_from: settings.smtpFrom || "",
      });

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

  // Fiscal simulation calculation (Sample package Rp 200.000)
  const sampleGross = 200000;
  const currentTaxRate = settings.taxRatePPN || 11.0;
  let previewDpp = sampleGross;
  let previewPpn = 0;
  let previewTotal = sampleGross;

  if (settings.taxMode === "PKP_INCLUSIVE") {
    const divider = 1 + currentTaxRate / 100;
    previewDpp = Math.round(sampleGross / divider);
    previewPpn = sampleGross - previewDpp;
    previewTotal = sampleGross;
  } else if (settings.taxMode === "PKP_EXCLUSIVE") {
    previewDpp = sampleGross;
    previewPpn = Math.round(sampleGross * (currentTaxRate / 100));
    previewTotal = previewDpp + previewPpn;
  } else {
    // NON_PKP
    previewDpp = sampleGross;
    previewPpn = 0;
    previewTotal = sampleGross;
  }

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-500" />
          <p className="text-sm font-medium">Memverifikasi hak akses...</p>
        </div>
      </div>
    );
  }

  if (!hasPermission("admin:roles") && !hasPermission("admin:users")) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center backdrop-blur-sm">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Akses Ditolak</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            Anda tidak memiliki izin (hak akses) untuk mengelola atau melihat Pengaturan Sistem. Hubungi Administrator ISP Anda.
          </p>
        </div>
      </div>
    );
  }

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

      {/* Tabs Navigation (Carrier-Grade Segmented Pill Nav) */}
      <div className="p-1.5 bg-slate-100/90 border border-slate-200/80 rounded-2xl flex flex-wrap items-center gap-1.5 shadow-2xs">
        {[
          { id: "general", label: "Profil & Identitas ISP", icon: Building2 },
          { id: "invoice_template", label: "Template Faktur & Kop Surat", icon: FileText },
          { id: "billing", label: "Aturan Billing & Pajak", icon: DollarSign },
          { id: "payment", label: "Payment Gateway", icon: CreditCard },
          { id: "domain", label: "Domain & Sub-Brand WiFi", icon: Globe },
          { id: "fibergrid", label: "Integrasi FiberGrid & GIS", icon: Radio },
          { id: "notification", label: "WhatsApp & Email", icon: MessageSquare },
          { id: "security", label: "Keamanan & Jaringan", icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer select-none ${
                isActive
                  ? "bg-white text-blue-600 shadow-xs border border-slate-200/80 font-extrabold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
              <span>{tab.label}</span>
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
                placeholder="Contoh: NUSANET FIBER"
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
              <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Induk Berusaha (NIB OSS)</label>
              <input
                type="text"
                value={settings.nib}
                onChange={(e) => setSettings({ ...settings, nib: e.target.value })}
                placeholder="Contoh: 0220208123456"
                className="w-full px-3.5 py-2 text-xs font-mono border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Surat Keterangan Laik Operasi (SKLO Kominfo)</label>
              <input
                type="text"
                value={settings.sklo}
                onChange={(e) => setSettings({ ...settings, sklo: e.target.value })}
                placeholder="Contoh: No. 128/TEL.04.02/KOMINFO"
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
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
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
                  <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
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
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-md border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          invoiceTemplate.enable_qr_verification !== false ? "bg-blue-600" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-sm bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
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
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200">
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
                                margin: ${invoiceTemplate.layout === "compact" ? "0mm" : "8mm"};
                              }
                              * {
                                box-sizing: border-box !important;
                              }
                              html, body {
                                margin: 0 !important;
                                padding: 0 !important;
                                width: 100% !important;
                                height: 100% !important;
                                background: #ffffff !important;
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                              }
                              #preview-invoice-sheet {
                                border: none !important;
                                box-shadow: none !important;
                                margin: 0 !important;
                                padding: ${invoiceTemplate.layout === "compact" ? "4mm" : "0mm 4mm 2mm 4mm"} !important;
                                width: 100% !important;
                                max-width: 100% !important;
                                min-height: ${invoiceTemplate.layout === "compact" ? "auto" : "calc(297mm - 16mm)"} !important;
                                height: ${invoiceTemplate.layout === "compact" ? "auto" : "calc(297mm - 16mm)"} !important;
                                display: flex !important;
                                flex-direction: column !important;
                                justify-content: space-between !important;
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
                    <div className="relative w-full max-w-[560px] min-h-[792px] aspect-[210/297] bg-white text-slate-900 rounded-none shadow-[0_1px_3px_rgba(0,0,0,0.15),0_14px_32px_-4px_rgba(0,0,0,0.45),0_28px_64px_-12px_rgba(0,0,0,0.55),0_0_0_1px_rgba(0,0,0,0.08)] border border-slate-300/80 select-none overflow-hidden my-2 flex flex-col justify-between">
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
        <div className="space-y-6">
          {/* Card 1: PROFIL FISKAL & PERPAJAKAN ISP */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                  <Receipt className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-mono flex items-center gap-2">
                    PROFIL FISKAL &amp; PERPAJAKAN ISP
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Standarisasi Skema PPN, Integrasi e-Faktur Pajak, dan Kebijakan Faktur Tagihan
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md font-mono ${
                    settings.taxMode === "PKP_INCLUSIVE"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : settings.taxMode === "PKP_EXCLUSIVE"
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      : "bg-slate-100 text-slate-700 border border-slate-200"
                  }`}
                >
                  {settings.taxMode === "PKP_INCLUSIVE"
                    ? "PKP INCLUSIVE (NETT)"
                    : settings.taxMode === "PKP_EXCLUSIVE"
                    ? "PKP EXCLUSIVE (+PPN)"
                    : "NON-PKP (BEBAS PPN)"}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              Atur status kepatuhan perpajakan tenant ISP Anda. Sistem otomatis menyesuaikan kalkulasi faktur pelanggan, memisahkan Dasar Pengenaan Pajak (DPP), dan menjaga agar pembagian komisi mitra/sales terbebas dari potongan pajak.
            </p>

            {/* Configuration Grid (Tax Regime, Rate, NPWP) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Tax Regime / Mode */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 font-mono">
                  Status Pengusaha Kena Pajak (Status Fiskal ISP)
                </label>
                <select
                  value={settings.taxMode}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      taxMode: e.target.value as TaxRegimeMode,
                    })
                  }
                  className="w-full text-xs font-mono px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 cursor-pointer shadow-2xs font-semibold"
                >
                  <option value="NON_PKP">NON-PKP / Non-Pajak (Bebas PPN 0% • Default untuk RT/RW Net &amp; ISP Rintisan)</option>
                  <option value="PKP_INCLUSIVE">PKP - Harga Jual Sudah Termasuk PPN (Inclusive / Nett • All-in)</option>
                  <option value="PKP_EXCLUSIVE">PKP - Harga Jual Belum Termasuk PPN (Exclusive • Ditambah PPN 11%)</option>
                </select>
                <p className="text-[11px] text-slate-500 font-sans">
                  {settings.taxMode === "NON_PKP" &&
                    "Pelanggan ditagih murni sesuai nominal paket yang diinput tanpa penambahan PPN. Sesuai ketentuan untuk ISP non-PKP."}
                  {settings.taxMode === "PKP_INCLUSIVE" &&
                    "Harga paket yang diinput Sales/NOC sudah dianggap NETT (termasuk PPN). Sistem otomatis memecah DPP dan PPN saat cetak faktur/e-Faktur."}
                  {settings.taxMode === "PKP_EXCLUSIVE" &&
                    "Harga paket yang diinput Sales/NOC adalah Dasar Pengenaan Pajak (DPP). Sistem otomatis menambahkan PPN 11% di atas harga tersebut."}
                </p>
              </div>

              {/* 2. PPN Rate */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 font-mono">
                  Tarif PPN Efektif (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={settings.taxRatePPN}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setSettings({
                        ...settings,
                        taxRatePPN: val,
                        defaultTaxBps: Math.round(val * 100),
                      });
                    }}
                    min={0}
                    max={100}
                    step={0.5}
                    className="w-full text-xs font-mono px-3.5 py-2.5 pr-8 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition shadow-2xs font-bold"
                  />
                  <span className="absolute right-3 top-2.5 text-slate-400 font-mono text-xs">%</span>
                </div>
                <p className="text-[11px] text-slate-500 font-sans">Tarif PPN Indonesia saat ini 11% (UU HPP).</p>
              </div>
            </div>

            {/* NPWP Input Row */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 font-mono">
                Nomor Pokok Wajib Pajak (NPWP) Resmi ISP
              </label>
              <input
                type="text"
                value={settings.npwp}
                onChange={(e) => {
                  const val = e.target.value;
                  setSettings({ ...settings, npwp: val });
                  setInvoiceTemplate((prev) => ({ ...prev, tax_id: val }));
                }}
                placeholder="Contoh: 01.234.567.8-012.000"
                maxLength={24}
                className="w-full text-xs font-mono px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition shadow-2xs"
              />
              <p className="text-[11px] text-slate-500 font-sans">
                NPWP resmi perusahaan yang akan dicetak pada Header Faktur Penagihan &amp; lembar ekspor e-Faktur Pajak.
              </p>
            </div>

            {/* Simulation Box (Live Preview) */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-slate-800 flex items-center gap-1.5 uppercase">
                  <Calculator className="w-3.5 h-3.5 text-amber-600" />
                  <span>Simulasi Perhitungan Faktur Pelanggan (Contoh Paket Rp 200.000):</span>
                </span>
                <span className="text-[9.5px] font-mono font-bold text-slate-500 uppercase">
                  {settings.taxMode === "PKP_INCLUSIVE"
                    ? "SKEMA INCLUSIVE (NETT)"
                    : settings.taxMode === "PKP_EXCLUSIVE"
                    ? "SKEMA EXCLUSIVE (+PPN)"
                    : "SKEMA NON-PKP (BEBAS PPN)"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 block mb-0.5">DASAR PENGENAAN PAJAK (DPP):</span>
                  <strong className="text-slate-900 text-sm font-bold">
                    Rp {previewDpp.toLocaleString("id-ID")}
                  </strong>
                  <span className="text-[9.5px] text-slate-400 block mt-0.5">Dasar bagi hasil mitra</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 block mb-0.5">PPN TITIPAN NEGARA:</span>
                  <strong className="text-amber-800 text-sm font-bold">
                    {settings.taxMode === "NON_PKP" ? "Rp 0" : `+ Rp ${previewPpn.toLocaleString("id-ID")}`}
                  </strong>
                  <span className="text-[9.5px] text-slate-400 block mt-0.5">
                    {settings.taxMode === "NON_PKP" ? "Bebas PPN (0%)" : `PPN ${currentTaxRate}% titipan DJP`}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
                  <span className="text-[10px] text-emerald-800 block mb-0.5">TOTAL FAKTUR PELANGGAN:</span>
                  <strong className="text-emerald-900 text-base font-black">
                    Rp {previewTotal.toLocaleString("id-ID")}
                  </strong>
                  <span className="text-[9.5px] text-emerald-700 block mt-0.5">
                    {settings.taxMode === "PKP_INCLUSIVE"
                      ? "Sesuai harga paket (Nett)"
                      : settings.taxMode === "PKP_EXCLUSIVE"
                      ? `Paket + PPN ${currentTaxRate}%`
                      : "Murni tarif paket"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Parameter Operasional Billing & Kemitraan */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-black text-slate-900">Parameter Operasional Penagihan &amp; Isolir</h2>
              <p className="text-xs text-slate-500">
                Menentukan masa tenggang pembayaran (*grace period*), penomoran faktur, dan rasio bagi hasil kemitraan.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

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
                <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                  PPPoE: {pgSettings.pppoe_provider.toUpperCase()}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Voucher: {pgSettings.voucher_provider.toUpperCase()}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-800 border border-purple-200">
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
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
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

          {/* Quick Link Banner ke Editor Template Pesan */}
          <div className="p-4 rounded-2xl bg-cyan-950/5 border border-cyan-800/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-cyan-600" />
                Template Pesan Otomatis (Isolir, Tagihan, & Passpoint)
              </h3>
              <p className="text-[11px] text-slate-500">
                Susunan kata, variabel pelanggan, dan redaksi pesan WhatsApp dapat disesuaikan pada Pusat Notifikasi.
              </p>
            </div>
            <a
              href="/admin/notifications?tab=templates"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-700 text-xs font-bold rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
            >
              <span>Buka Editor Template</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
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

              {settings.waProvider === "WABLAS" && (
                <div className="pt-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    URL Server / Domain Wablas (Opsional)
                  </label>
                  <input
                    type="text"
                    value={settings.waServerUrl || ""}
                    onChange={(e) => setSettings({ ...settings, waServerUrl: e.target.value })}
                    placeholder="https://api.wablas.com (atau https://phone.wablas.com / https://solo.wablas.com)"
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Gunakan domain server sesuai akun Wablas Anda (misal: https://phone.wablas.com atau https://api.wablas.com). Kosongkan jika menggunakan domain default.
                  </p>
                </div>
              )}

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

            {/* Uji Coba WhatsApp Gateway (Test Message) */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Send className="w-4 h-4 text-emerald-600" />
                  Uji Coba WhatsApp Gateway (Test Message)
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
                  {settings.waProvider || "FONNTE"}
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Kirim pesan uji coba instan untuk memverifikasi apakah Token API dan Device WhatsApp ({settings.waProvider}) sudah aktif dan terkoneksi ke server gateway.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <div className="relative flex-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={waTestPhone}
                    onChange={(e) => setWaTestPhone(e.target.value)}
                    placeholder="Nomor HP Tujuan (contoh: 081234567890)"
                    className="w-full pl-8 pr-3 py-1.5 text-xs font-mono border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleTestWhatsApp}
                  disabled={waTesting || !settings.waApiToken}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 disabled:from-slate-400 disabled:to-slate-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed shrink-0"
                >
                  {waTesting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengirim Pesan...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim Pesan Uji Coba</span>
                    </>
                  )}
                </button>
              </div>

              {!settings.waApiToken && (
                <p className="text-[10px] text-amber-700 font-medium">
                  Harap masukkan Token API WhatsApp di atas terlebih dahulu untuk menjalankan uji coba pengiriman pesan.
                </p>
              )}

              {waTestResult && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2.5 border ${
                    waTestResult.success
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : "bg-rose-50 border-rose-200 text-rose-900"
                  }`}
                >
                  {waTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <p className="font-bold">
                      {waTestResult.success ? "Pengujian Berhasil" : "Pengujian Gagal"}
                    </p>
                    <p className="text-[11px] leading-relaxed opacity-90">{waTestResult.message}</p>
                  </div>
                </div>
              )}
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
                <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200 font-bold">
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
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                    securitySettings.enable_ip_whitelist
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-slate-100 text-slate-600 border-slate-300"
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
                  <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-md peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-sm after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
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
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                    securitySettings.enable_walled_garden
                      ? "bg-purple-50 text-purple-800 border-purple-300"
                      : "bg-slate-100 text-slate-600 border-slate-300"
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
                  <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-md peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-sm after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
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
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                    securitySettings.enable_mac_lock
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-slate-100 text-slate-600 border-slate-300"
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
                  <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-md peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-sm after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
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

          {/* Feature 5: Integrasi Google Maps Platform & Peta GIS (FiberGrid) */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs font-black text-slate-900">
                      Google Maps Platform &amp; Peta Topologi GIS (FiberGrid)
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
                      GIS &amp; Geocoding
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Kunci API Google Maps untuk pemetaan tiang/ODP, jalur fiber optik (FiberGrid), pencarian koordinat pelanggan, dan navigasi teknisi lapangan.
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                    securitySettings.google_maps_api_key && securitySettings.google_maps_api_key.trim() !== ""
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-amber-50 text-amber-800 border-amber-300"
                  }`}
                >
                  {securitySettings.google_maps_api_key && securitySettings.google_maps_api_key.trim() !== ""
                    ? "Kunci API Terkonfigurasi"
                    : "Default Fallback"}
                </span>
              </div>
            </div>

            {/* Input Form with Show/Hide and Copy */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                <span>Google Maps API Key (Browser / JavaScript API)</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Diperlukan: Maps JavaScript API, Places API, Geocoding API
                </span>
              </label>

              <div className="relative flex items-center">
                <input
                  type={showMapsKey ? "text" : "password"}
                  value={securitySettings.google_maps_api_key ?? ""}
                  onChange={(e) =>
                    setSecuritySettings({
                      ...securitySettings,
                      google_maps_api_key: e.target.value,
                    })
                  }
                  placeholder="Contoh: AIzaSy..."
                  className="w-full pl-3.5 pr-24 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all placeholder:text-slate-400 shadow-2xs"
                />

                <div className="absolute right-1.5 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowMapsKey(!showMapsKey)}
                    title={showMapsKey ? "Sembunyikan API Key" : "Tampilkan API Key"}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    {showMapsKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (securitySettings.google_maps_api_key) {
                        navigator.clipboard.writeText(securitySettings.google_maps_api_key);
                        setCopiedMapsKey(true);
                        setTimeout(() => setCopiedMapsKey(false), 2000);
                      }
                    }}
                    title="Salin API Key"
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    {copiedMapsKey ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Informational Guidance */}
            <div className="p-3 bg-white rounded-xl border border-slate-200/90 text-[11px] text-slate-600 space-y-1.5 leading-relaxed">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <Globe className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                <span>Panduan Integrasi Google Cloud Platform:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-500 pl-1">
                <li>Buka <strong>Google Cloud Console &gt; APIs &amp; Services &gt; Credentials</strong> untuk membuat atau menyalin API Key.</li>
                <li>Pastikan mengaktifkan 3 library API berikut di GCP project: <strong>Maps JavaScript API</strong>, <strong>Places API</strong>, dan <strong>Geocoding API</strong>.</li>
                <li>Pada <em>Application restrictions</em>, disarankan membatasi ke domain ISP Anda (misal: <code>*.ispsync.id/*</code>) agar kuota API aman.</li>
                <li>Jika kolom ini dikosongkan, sistem otomatis menerapkan kunci API bawaan platform ISPSYNC.</li>
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

      {/* Tab 5: Domain & Sub-Brand WiFi */}
      {activeTab === "domain" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          {/* Header & Sub-Brand Overview Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 text-white relative overflow-hidden shadow-sm">
            <div className="absolute -top-16 -left-16 w-52 h-52 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute top-1/2 -right-20 w-52 h-52 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-black text-slate-100 tracking-tight">
                      Domain &amp; Sub-Brand WiFi Publik
                    </h2>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
                      Multi-Tenant &amp; Carrier-Grade
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    Pemisahan domain untuk mengamankan <strong>Backoffice Ledger ISP</strong> dari akses publik, serta mendukung sub-brand WiFi khusus publik (seperti <em>@gowifi</em> atau <em>@wifi.id</em>) di domain terpisah (misal: <code>hotspot.gowifi.id</code>).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Konfigurasi Sub-Brand & Pemisahan Domain */}
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Wifi className="w-4 h-4 text-cyan-600" />
                Identitas Sub-Brand &amp; Pemetaan Domain
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Konfigurasi nama sub-brand publik dan subdomain yang terisolasi sesuai peruntukan layanannya.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sub-brand Name */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Nama Sub-Brand WiFi Publik
                </label>
                <input
                  type="text"
                  value={domainSettings.wifi_brand_name}
                  onChange={(e) =>
                    setDomainSettings({ ...domainSettings, wifi_brand_name: e.target.value })
                  }
                  placeholder="Contoh: @gowifi atau @wifi.id"
                  className="w-full px-3.5 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 leading-normal">
                  Muncul di halaman captive portal hotspot, voucher belanja, struk thermal mitra loket, dan Passpoint.
                </p>
              </div>

              {/* Public WiFi Domain */}
              <div className="p-4 rounded-2xl bg-cyan-50/50 border border-cyan-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-cyan-950">
                    Domain WiFi Hotspot &amp; Mitra Loket (Publik)
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-200/60 text-cyan-800">
                    Akses Publik
                  </span>
                </div>
                <input
                  type="text"
                  value={domainSettings.wifi_domain}
                  onChange={(e) =>
                    setDomainSettings({ ...domainSettings, wifi_domain: e.target.value })
                  }
                  placeholder="Contoh: hotspot.gowifi.id atau wifi.dev.ispsync.id"
                  className="w-full px-3.5 py-2 text-xs font-mono font-bold border border-cyan-300 rounded-xl bg-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
                <p className="text-[11px] text-cyan-800/80 leading-normal">
                  Rute: <code>/hotspot/buy</code>, <code>/hotspot/login</code>, <code>/passpoint</code>, serta pendaftaran &amp; loket agen <code>/agent/*</code>.
                </p>
              </div>

              {/* Isolated Ledger Backoffice Domain */}
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-blue-950">
                    Domain Backoffice Ledger (Terisolasi)
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-200/60 text-blue-800">
                    Khusus Internal ISP
                  </span>
                </div>
                <input
                  type="text"
                  value={domainSettings.ledger_domain}
                  onChange={(e) =>
                    setDomainSettings({ ...domainSettings, ledger_domain: e.target.value })
                  }
                  placeholder="Contoh: ledger.dev.ispsync.id atau billing.mitra.net.id"
                  className="w-full px-3.5 py-2 text-xs font-mono font-bold border border-blue-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-[11px] text-blue-800/80 leading-normal">
                  Khusus admin ISP, staf operasional, billing engine, dan NOC. <strong>Terisolasi penuh</strong> dari lalu lintas voucher publik.
                </p>
              </div>

              {/* Portal Domain (Optional) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    Domain Portal Pelanggan Rumahan (Opsional)
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-600">
                    Pelanggan Tetap (FTTH)
                  </span>
                </div>
                <input
                  type="text"
                  value={domainSettings.portal_domain}
                  onChange={(e) =>
                    setDomainSettings({ ...domainSettings, portal_domain: e.target.value })
                  }
                  placeholder="Contoh: portal.dev.ispsync.id atau member.mitra.net.id"
                  className="w-full px-3.5 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 leading-normal">
                  Portal mandiri khusus pelanggan PPPoE bulanan untuk cek invoice dan konfirmasi bayar.
                </p>
              </div>

              {/* EngineFibergrid NOC Domain */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-emerald-950">
                    Domain NOC &amp; Peta GIS FiberGrid (Engine 3)
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200/60 text-emerald-800">
                    NOC &amp; FTTX Core
                  </span>
                </div>
                <input
                  type="text"
                  value={domainSettings.fibergrid_domain || ""}
                  onChange={(e) =>
                    setDomainSettings({ ...domainSettings, fibergrid_domain: e.target.value })
                  }
                  placeholder="Contoh: fibergrid.dev.ispsync.id atau fibergrid.mitra.net.id"
                  className="w-full px-3.5 py-2 text-xs font-mono font-bold border border-emerald-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <p className="text-[11px] text-emerald-800/80 leading-normal">
                  Pusat komando topologi OLT, ODC, ODP, feeder optik, dan auto-provisioning TR-069.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Panduan DNS & Auto-SSL VPS */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-200 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                  Panduan DNS A-Record &amp; Let&apos;s Encrypt Auto-SSL
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-slate-800 text-cyan-300 border border-slate-700">
                IP Server VPS: {domainSettings.server_ip || "103.179.65.73"}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Untuk mengaktifkan domain publik sub-brand (misal <code>{domainSettings.wifi_domain || "hotspot.gowifi.id"}</code>), cukup buat <strong>DNS A-Record</strong> di registrar domain Anda (Cloudflare, Niagahoster, Domainesia, dsb) mengarah ke server ISPSYNC:
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70 p-1">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 px-3">Tipe</th>
                    <th className="py-2 px-3">Nama Subdomain</th>
                    <th className="py-2 px-3">Target IP (IPv4)</th>
                    <th className="py-2 px-3">Proxy / SSL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  <tr>
                    <td className="py-2 px-3 text-cyan-400 font-bold">A</td>
                    <td className="py-2 px-3 font-semibold">{domainSettings.wifi_domain?.split(".")[0] || "hotspot"}</td>
                    <td className="py-2 px-3 text-emerald-400 font-bold">{domainSettings.server_ip || "103.179.65.73"}</td>
                    <td className="py-2 px-3 text-slate-400">DNS Only (Auto-SSL Caddy)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-cyan-400 font-bold">A</td>
                    <td className="py-2 px-3 font-semibold">{domainSettings.ledger_domain?.split(".")[0] || "ledger"}</td>
                    <td className="py-2 px-3 text-emerald-400 font-bold">{domainSettings.server_ip || "103.179.65.73"}</td>
                    <td className="py-2 px-3 text-slate-400">DNS Only (Auto-SSL Caddy)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-cyan-400 font-bold">A</td>
                    <td className="py-2 px-3 font-semibold">{domainSettings.fibergrid_domain?.split(".")[0] || "fibergrid"}</td>
                    <td className="py-2 px-3 text-emerald-400 font-bold">{domainSettings.server_ip || "103.179.65.73"}</td>
                    <td className="py-2 px-3 text-slate-400">DNS Only (Auto-SSL Caddy)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-start gap-2.5 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                <strong>Zero Configuration SSL:</strong> Server Caddy ISPSYNC dilengkapi <em>On-Demand TLS</em>. Saat domain custom pertama kali diakses, sertifikat SSL HTTPS otomatis diterbitkan dalam 1-2 detik tanpa perlu restart server atau input token manual.
              </span>
            </div>
          </div>

          {/* Section 3: 1-Click Walled Garden Script MikroTik */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-black text-slate-900 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-blue-600" />
                  Script Walled Garden MikroTik (Otomatis Sesuai Domain)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Salin dan tempel perintah ini di Terminal MikroTik agar HP pelanggan yang belum login dapat membuka halaman beli voucher dan payment gateway QRIS.
                </p>
              </div>

              {(() => {
                const wifiHost = domainSettings.wifi_domain || "wifi.dev.ispsync.id";
                const mikrotikScript = `/ip hotspot walled-garden
add dst-host=*.${wifiHost} action=allow comment="ISPSYNC Hotspot & Agent Portal"
add dst-host=${wifiHost} action=allow comment="ISPSYNC WiFi Domain"
add dst-host=api.midtrans.com action=allow comment="Midtrans Payment API"
add dst-host=app.midtrans.com action=allow comment="Midtrans Payment Web"
add dst-host=passport.duitku.com action=allow comment="Duitku Payment Gateway"
add dst-host=*.xendit.co action=allow comment="Xendit Payment Gateway"
add dst-host=tripay.co.id action=allow comment="Tripay Payment Gateway"`;

                return (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(mikrotikScript);
                      setCopiedScript("mikrotik");
                      setTimeout(() => setCopiedScript(null), 2500);
                    }}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    {copiedScript === "mikrotik" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Tersalin!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        Salin Script MikroTik
                      </>
                    )}
                  </button>
                );
              })()}
            </div>

            <pre className="p-3.5 rounded-xl bg-slate-950 text-cyan-300 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
{`/ip hotspot walled-garden
add dst-host=*.${domainSettings.wifi_domain || "wifi.dev.ispsync.id"} action=allow comment="ISPSYNC Hotspot & Agent Portal"
add dst-host=${domainSettings.wifi_domain || "wifi.dev.ispsync.id"} action=allow comment="ISPSYNC WiFi Domain"
add dst-host=api.midtrans.com action=allow comment="Midtrans Payment API"
add dst-host=app.midtrans.com action=allow comment="Midtrans Payment Web"
add dst-host=passport.duitku.com action=allow comment="Duitku Payment Gateway"
add dst-host=*.xendit.co action=allow comment="Xendit Payment Gateway"
add dst-host=tripay.co.id action=allow comment="Tripay Payment Gateway"`}
            </pre>
          </div>

          {/* Section 4: Live Quick Links */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-900 flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-cyan-600" />
              Tautan Langsung Rute Domain (Uji Coba Akses)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                {
                  title: "Portal Beli Voucher Hotspot",
                  badge: "Publik",
                  badgeColor: "bg-cyan-100 text-cyan-800",
                  url: `https://${domainSettings.wifi_domain || "wifi.dev.ispsync.id"}/hotspot/buy`,
                  desc: "Katalog voucher internet & pembayaran QRIS mandiri",
                },
                {
                  title: "Captive Portal Login Hotspot",
                  badge: "Publik",
                  badgeColor: "bg-cyan-100 text-cyan-800",
                  url: `https://${domainSettings.wifi_domain || "wifi.dev.ispsync.id"}/hotspot/login`,
                  desc: "Form input username & kata sandi voucher",
                },
                {
                  title: "Passpoint Hotspot 2.0",
                  badge: "Publik",
                  badgeColor: "bg-emerald-100 text-emerald-800",
                  url: `https://${domainSettings.wifi_domain || "wifi.dev.ispsync.id"}/passpoint`,
                  desc: "Unduh profil otomatis koneksi WiFi EAP-SIM / TTLS",
                },
                {
                  title: "Pendaftaran Mitra Agen",
                  badge: "Publik",
                  badgeColor: "bg-cyan-100 text-cyan-800",
                  url: `https://${domainSettings.wifi_domain || "wifi.dev.ispsync.id"}/agent/register`,
                  desc: "Form pendaftaran mitra loket & reseller voucher",
                },
                {
                  title: "Login Loket Mitra Agen",
                  badge: "Mitra",
                  badgeColor: "bg-blue-100 text-blue-800",
                  url: `https://${domainSettings.wifi_domain || "wifi.dev.ispsync.id"}/agent/login`,
                  desc: "Akses dashboard penjualan mitra & topup saldo",
                },
                {
                  title: "Backoffice Ledger ISP",
                  badge: "Terisolasi",
                  badgeColor: "bg-purple-100 text-purple-800",
                  url: `https://${domainSettings.ledger_domain || "ledger.dev.ispsync.id"}/login`,
                  desc: "Pusat kendali internal ISP, billing & manajemen router",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-white border border-slate-200/90 hover:border-cyan-400 hover:shadow-xs transition flex flex-col justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">{item.desc}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-slate-400 truncate">
                      {item.url}
                    </span>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition shrink-0"
                      title="Buka rute"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 8: Integrasi FiberGrid & Jartaplok (Custom Integration Rule) */}
      {activeTab === "fibergrid" && (
        <div className="space-y-6">
          {/* Header Card / Explanation Banner */}
          <div className="relative overflow-hidden p-6 rounded-3xl bg-slate-950 border border-slate-800 text-slate-100 shadow-xl">
            <div className="absolute -top-32 -left-32 w-80 h-80 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute top-1/2 -right-32 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
                    Carrier-Grade Network Decoupling
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                    Engine 3 FTTX
                  </span>
                </div>
                <h3 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                  <Radio className="w-5 h-5 text-cyan-400" />
                  Integrasi Engine FiberGrid &amp; Wholesale Jartaplok
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 max-w-3xl leading-relaxed">
                  Konfigurasikan koneksi API secara manual jika entitas hukum pengelola sistem Ledger berbeda dengan penyelenggara jaringan fisik / Jartaplok yang mengoperasikan Engine FiberGrid. Bila diaktifkan, data rute kabel optik (Feeder &amp; Distribusi) akan ditarik secara live ke modul NexusGIS.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right hidden sm:block">
                  <div className="text-[11px] font-semibold text-slate-400">Status Integrasi</div>
                  <div className={`text-xs font-bold ${fibergridSettings.enabled ? "text-emerald-400" : "text-slate-500"}`}>
                    {fibergridSettings.enabled ? "● Aktif Terhubung" : "○ Nonaktif"}
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={fibergridSettings.enabled}
                    onChange={(e) => setFibergridSettings({ ...fibergridSettings, enabled: e.target.checked })}
                  />
                  <div className="w-12 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-cyan-500 peer-checked:to-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Form Settings Card */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Endpoint API */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>URL API Endpoint FiberGrid</span>
                  <span className="text-[10px] text-cyan-600 font-semibold">Wajib Diisi</span>
                </label>
                <div className="relative">
                  <Server className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={fibergridSettings.api_url}
                    onChange={(e) => setFibergridSettings({ ...fibergridSettings, api_url: e.target.value })}
                    placeholder="Contoh: http://172.18.0.1:8082 atau https://fibergrid.rekanan-isp.net.id"
                    className="w-full pl-10 pr-4 py-2.5 text-xs font-mono rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Target host REST API FiberGrid (Port 8082 untuk engine lokal atau domain kustom entitas rekanan).
                </p>
              </div>

              {/* API Key / Secret Token */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>API Key / Secret Token (X-Admin-Key)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Otentikasi Carrier</span>
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showFibergridKey ? "text" : "password"}
                    value={fibergridSettings.api_key}
                    onChange={(e) => setFibergridSettings({ ...fibergridSettings, api_key: e.target.value })}
                    placeholder="Masukkan ADMIN_API_KEY atau Partner Secret Token"
                    className="w-full pl-10 pr-10 py-2.5 text-xs font-mono rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFibergridKey(!showFibergridKey)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showFibergridKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Digunakan untuk otentikasi header <code>X-Admin-Key</code> atau Bearer Token saat request data rute.
                </p>
              </div>

              {/* Kode Tenant / ID Rekanan */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Kode Tenant / ID Rekanan di FiberGrid
                </label>
                <input
                  type="text"
                  value={fibergridSettings.tenant_code || ""}
                  onChange={(e) => setFibergridSettings({ ...fibergridSettings, tenant_code: e.target.value })}
                  placeholder="Contoh: tenant-01, mitra-corp, dev (kosongkan bila mengkoneksikan server mandiri)"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition"
                />
                <p className="text-[11px] text-slate-400">
                  Identifikasi isolasi data bila server FiberGrid menerapkan multi-tenancy wholesale.
                </p>
              </div>

              {/* Auto Sync Toggle */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Sinkronisasi Otomatis Rute Kabel Spasial
                </label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="pr-4">
                    <div className="text-xs font-bold text-slate-800">Tampilkan Jalur Kabel di Peta NexusGIS</div>
                    <div className="text-[11px] text-slate-400">Tarik koordinat polyline Feeder &amp; Distribusi dari FiberGrid.</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={fibergridSettings.auto_sync_routes}
                      onChange={(e) => setFibergridSettings({ ...fibergridSettings, auto_sync_routes: e.target.checked })}
                    />
                    <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Test Result Alert */}
            {fibergridTestResult && (
              <div
                className={`p-4 rounded-2xl border text-xs flex items-start gap-3 animate-in fade-in slide-in-from-top-2 ${
                  fibergridTestResult.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-rose-50 border-rose-200 text-rose-900"
                }`}
              >
                {fibergridTestResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-bold mb-0.5">
                    {fibergridTestResult.success ? "Uji Koneksi Berhasil Terverifikasi" : "Uji Koneksi Gagal"}
                  </div>
                  <div>{fibergridTestResult.message}</div>
                  {fibergridTestResult.latency_ms !== undefined && (
                    <div className="mt-1 text-[11px] opacity-80 font-mono">
                      Waktu Respon: {fibergridTestResult.latency_ms.toFixed(1)} ms
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleTestFiberGrid}
                disabled={fibergridTesting || !fibergridSettings.api_url}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
              >
                {fibergridTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5 text-cyan-600" />}
                {fibergridTesting ? "Menguji Koneksi..." : "Uji Ping & Tes Koneksi API"}
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white text-xs font-extrabold shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? "Menyimpan..." : "Simpan Konfigurasi FiberGrid"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

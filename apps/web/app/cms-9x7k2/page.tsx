"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Lock, ArrowRight, ShieldCheck, Activity, Server, Globe, Zap } from "lucide-react";

type PricingPlan = {
  id: string; label: string; name: string; description: string;
  price: string; period: string; capacity: string; featured: boolean;
  featuredLabel?: string; features: string[];
};
type SiteConfig = {
  logo: { type: string; text: string; url: string };
  navbar: { brand: string; badge: string };
  hero: { badge: string; title: string; titleHighlight: string; description: string; ctaDemo: string; ctaDemoUrl: string; ctaWA: string; ctaWAPhone: string; };
  pricing: PricingPlan[];
};

export default function SiteAdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"logo"|"hero"|"pricing">("logo");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("site-admin-auth");
    if (stored) { setAuthed(true); setPassword(stored); fetchConfig(); }
  }, []);

  async function fetchConfig() {
    const res = await fetch("/api/site-config");
    const data = await res.json();
    setConfig(data);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setAuthError("");
    const res = await fetch("/api/site-config", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, logo: undefined }),
    });
    if (res.status === 401) { setAuthError("Password salah. Coba lagi."); return; }
    sessionStorage.setItem("site-admin-auth", password);
    setAuthed(true); fetchConfig();
  }

  async function handleSave() {
    if (!config) return;
    setSaving(true); setSaveMsg("");
    const res = await fetch("/api/site-config", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, ...config }),
    });
    const data = await res.json();
    setSaving(false);
    setSaveMsg(data.success ? "Tersimpan!" : "Gagal: " + data.error);
    setTimeout(() => setSaveMsg(""), 3000);
  }

  async function handleLogoUpload() {
    if (!logoFile) return;
    setUploading(true);
    const form = new FormData();
    form.append("password", password); form.append("logo", logoFile);
    const res = await fetch("/api/site-config/upload", { method: "POST", body: form });
    const data = await res.json();
    setUploading(false);
    if (data.success && config) {
      setConfig({ ...config, logo: { type: "image", text: config.logo.text, url: data.url } });
      setSaveMsg("Logo berhasil diupload!"); setTimeout(() => setSaveMsg(""), 3000);
    } else { setSaveMsg("Gagal: " + data.error); }
  }

  function updatePricing(idx: number, field: keyof PricingPlan, value: string | boolean | string[]) {
    if (!config) return;
    const pricing = [...config.pricing]; (pricing[idx] as any)[field] = value;
    setConfig({ ...config, pricing });
  }
  function updateFeature(pi: number, fi: number, val: string) {
    if (!config) return;
    const pricing = [...config.pricing]; pricing[pi].features[fi] = val;
    setConfig({ ...config, pricing });
  }
  function addFeature(pi: number) {
    if (!config) return;
    const pricing = [...config.pricing]; pricing[pi].features.push("Fitur baru");
    setConfig({ ...config, pricing });
  }
  function removeFeature(pi: number, fi: number) {
    if (!config) return;
    const pricing = [...config.pricing]; pricing[pi].features.splice(fi, 1);
    setConfig({ ...config, pricing });
  }

  if (!authed) return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* ── Left Column: Clean Admin Login Form ─────────────────────── */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-between p-6 sm:p-12 lg:p-16">
        {/* Top: Brand */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <img
              src="/logo-prism.png"
              alt="ISPSYNC"
              className="h-9 sm:h-10 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <span className="text-2xl font-black tracking-wider text-slate-900 font-sans">
              ISPSYNC
            </span>
          </Link>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
            CMS Admin Console
          </span>
        </div>

        {/* Center: Auth Form */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-3 border border-blue-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Restricted Management Area</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Website Admin Panel
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Masukkan master security password untuk mengelola konfigurasi landing page, paket harga, dan konten platform.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Master Security Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password admin..."
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm transition-all text-slate-900 placeholder:text-slate-400"
                />
              </div>
              {authError && (
                <div className="mt-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 flex-shrink-0" />
                  <span>{authError}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Masuk ke Panel Konten</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-xs text-slate-400 text-center mt-8">
            Akses hanya diizinkan untuk administrator resmi ISPSYNC.
          </p>
        </div>

        {/* Bottom */}
        <div className="text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 pt-6">
          <span>&copy; {new Date().getFullYear()} ISPSYNC Platform Core.</span>
          <Link href="/" className="hover:text-slate-600">
            ← Kembali ke Beranda
          </Link>
        </div>
      </div>

      {/* ── Right Column: Dark Telemetry & Infrastructure ──────────── */}
      <div className="hidden lg:flex lg:w-1/2 min-h-screen bg-slate-950 text-white flex-col justify-between p-12 lg:p-16 relative overflow-hidden border-l border-slate-900">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Status */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-emerald-400 text-xs font-semibold backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>CMS Edge Sync: Operational</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">Build ID: 2.4.0-prod</span>
        </div>

        {/* Center: Live Telemetry Cards */}
        <div className="relative z-10 my-auto py-8 space-y-5">
          <div className="grid grid-cols-5 gap-4">
            {/* Traffic Card */}
            <div className="col-span-3 bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs font-bold text-slate-200">Global Content Sync</div>
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Real-time Multi-Region Propagation</span>
                  </div>
                </div>
                <Activity className="w-4 h-4 text-cyan-400" />
              </div>

              <div className="h-24 w-full flex items-end gap-1.5 pt-4">
                {[55, 70, 45, 80, 60, 95, 75, 85, 70, 100, 90, 85, 70, 95, 92].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end h-full">
                    <div
                      style={{ height: `${h}%` }}
                      className="w-full rounded-t-sm bg-gradient-to-t from-blue-600/40 via-cyan-500/70 to-cyan-400 transition-all duration-500"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-2 pt-2 border-t border-slate-800/60">
                <span>Landing Page</span>
                <span>Pricing API</span>
                <span>CDN Cache</span>
                <span>Live</span>
              </div>
            </div>

            {/* Status Card */}
            <div className="col-span-2 bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Uptime SLA</span>
                <Server className="w-4 h-4 text-cyan-400" />
              </div>

              <div className="my-auto py-2 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-4 border-cyan-400/20 border-t-cyan-400 text-center mx-auto my-1">
                  <span className="text-base font-black text-white font-mono">99.98%</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Docker Containers</div>
              </div>

              <div className="text-[10px] text-emerald-400 font-medium text-center bg-emerald-950/40 py-1 rounded-lg border border-emerald-900/40">
                All 6 Services Up
              </div>
            </div>
          </div>

          {/* Core Info */}
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-200">
                  Infrastructure Engine Status
                </span>
              </div>
              <span className="text-xs font-mono text-cyan-400 font-semibold">
                Triple-Engine Active
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                <div className="text-[10px] text-slate-400">Billing Engine</div>
                <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">Online</div>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                <div className="text-[10px] text-slate-400">Radius AAA</div>
                <div className="text-sm font-bold text-cyan-400 font-mono mt-0.5">Connected</div>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                <div className="text-[10px] text-slate-400">CRM Engine</div>
                <div className="text-sm font-bold text-white font-mono mt-0.5">Synced</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="relative z-10 pt-4 border-t border-slate-900 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Encrypted Session Management</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>High-Availability Cluster</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (!config) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-500 text-sm">Memuat konfigurasi...</div>
    </div>
  );

  const tabs = [
    { key: "logo" as const, label: "Logo & Navbar" },
    { key: "hero" as const, label: "Hero Section" },
    { key: "pricing" as const, label: "Paket & Harga" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo-prism.png"
              alt="ISPSYNC"
              className="h-8 w-auto object-contain"
            />
            <span className="font-black text-gray-900 text-sm tracking-wider">ISPSYNC</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              CMS Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            {saveMsg && (
              <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${saveMsg.includes("Gagal") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{saveMsg}</span>
            )}
            <a href="/" target="_blank" className="text-xs text-gray-500 hover:text-blue-600 border border-gray-200 px-3 py-1.5 rounded-lg">Lihat Website</a>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg disabled:opacity-50">
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
            <button onClick={() => { sessionStorage.removeItem("site-admin-auth"); setAuthed(false); setPassword(""); }}
              className="text-xs text-gray-400 hover:text-red-500">Keluar</button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex gap-2 mb-6">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === t.key ? "bg-blue-600 text-white shadow" : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === "logo" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-bold text-gray-900 mb-4">Logo Navbar</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-3">Mode Logo:</p>
                  <div className="flex gap-4 mb-4">
                    {["text", "image"].map((mode) => (
                      <label key={mode} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="logoType" value={mode}
                          checked={config.logo.type === mode}
                          onChange={() => setConfig({ ...config, logo: { ...config.logo, type: mode } })} />
                        <span className="text-sm capitalize">{mode === "text" ? "Teks Inisial" : "Upload Gambar"}</span>
                      </label>
                    ))}
                  </div>
                  {config.logo.type === "text" && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Inisial (maks 3 karakter)</label>
                      <input type="text" maxLength={3} value={config.logo.text}
                        onChange={(e) => setConfig({ ...config, logo: { ...config.logo, text: e.target.value.toUpperCase() } })}
                        className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-center" />
                    </div>
                  )}
                  {config.logo.type === "image" && (
                    <div className="space-y-3">
                      <input type="file" accept="image/*"
                        onChange={(e) => { const f = e.target.files?.[0] || null; setLogoFile(f); if (f) setLogoPreview(URL.createObjectURL(f)); }}
                        className="text-sm text-gray-600" />
                      {(logoPreview || config.logo.url) && (
                        <img src={logoPreview || config.logo.url} alt="Logo" className="w-16 h-16 object-contain rounded-xl border border-gray-200" />
                      )}
                      <button onClick={handleLogoUpload} disabled={!logoFile || uploading}
                        className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg disabled:opacity-50">
                        {uploading ? "Mengupload..." : "Upload Logo"}
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-3">Preview:</p>
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
                    {config.logo.type === "text" ? (
                      <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-black text-sm">{config.logo.text || "IS"}</span>
                      </div>
                    ) : (
                      <img src={config.logo.url || "/logo.png"} alt="Logo" className="w-10 h-10 object-contain rounded-xl" />
                    )}
                    <div>
                      <span className="font-black text-gray-900 text-lg">{config.navbar.brand}</span>
                      <span className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{config.navbar.badge}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-bold text-gray-900 mb-4">Nama Brand & Badge</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[{label:"Nama Brand",field:"brand"},{label:"Teks Badge",field:"badge"}].map(({label,field}) => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                    <input type="text" value={(config.navbar as any)[field]}
                      onChange={(e) => setConfig({ ...config, navbar: { ...config.navbar, [field]: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "hero" && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-bold text-gray-900 mb-2">Hero Section</h2>
            {[
              {label:"Teks Badge / Pill",field:"badge"},
              {label:"Judul Utama",field:"title"},
              {label:"Judul Highlight (biru)",field:"titleHighlight"},
              {label:"URL Demo",field:"ctaDemoUrl"},
              {label:"Teks Tombol Demo",field:"ctaDemo"},
              {label:"Nomor WhatsApp (tanpa +)",field:"ctaWAPhone"},
              {label:"Teks Tombol WhatsApp",field:"ctaWA"},
            ].map(({label,field}) => (
              <div key={field}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                <input type="text" value={(config.hero as any)[field]}
                  onChange={(e) => setConfig({ ...config, hero: { ...config.hero, [field]: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Deskripsi</label>
              <textarea rows={3} value={config.hero.description}
                onChange={(e) => setConfig({ ...config, hero: { ...config.hero, description: e.target.value } })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
          </div>
        )}

        {activeTab === "pricing" && (
          <div className="space-y-4">
            {config.pricing.map((plan, pi) => (
              <div key={plan.id} className={`bg-white rounded-2xl border p-6 ${plan.featured ? "border-blue-400 ring-2 ring-blue-100" : "border-gray-200"}`}>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-bold text-gray-900">{plan.name}</h3>
                  {plan.featured && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">FEATURED</span>}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  {[
                    {label:"Nama Paket",field:"name"},{label:"Label Kecil",field:"label"},
                    {label:"Harga (Rp)",field:"price"},{label:"Kapasitas",field:"capacity"},
                    {label:"Label Featured",field:"featuredLabel"},
                  ].map(({label,field}) => (
                    <div key={field}>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                      <input type="text" value={(plan as any)[field] || ""}
                        onChange={(e) => updatePricing(pi, field as keyof PricingPlan, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Periode</label>
                    <select value={plan.period} onChange={(e) => updatePricing(pi, "period", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="bln">/ bulan</option>
                      <option value="thn">/ tahun</option>
                    </select>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Deskripsi</label>
                  <input type="text" value={plan.description}
                    onChange={(e) => updatePricing(pi, "description", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Fitur-fitur</label>
                  <div className="space-y-2">
                    {plan.features.map((feat, fi) => (
                      <div key={fi} className="flex gap-2">
                        <input type="text" value={feat}
                          onChange={(e) => updateFeature(pi, fi, e.target.value)}
                          className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <button onClick={() => removeFeature(pi, fi)}
                          className="px-2 py-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-sm">x</button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => addFeature(pi)} className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium">+ Tambah Fitur</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-end">
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm disabled:opacity-50 shadow-lg">
            {saving ? "Menyimpan..." : "Simpan Semua Perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}

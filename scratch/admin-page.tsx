"use client";
import { useState, useEffect } from "react";

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <span className="text-white font-black text-sm">IS</span>
          </div>
          <div><div className="font-black text-gray-900">ISPSYNC</div><div className="text-xs text-gray-500">Website Admin</div></div>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Admin Panel</h1>
        <p className="text-sm text-gray-500 mb-6">Masukkan password untuk mengelola konten website.</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password Admin</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Password..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" required />
            {authError && <p className="text-red-500 text-xs mt-1">{authError}</p>}
          </div>
          <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm">Masuk</button>
        </form>
        <p className="text-xs text-gray-400 mt-4 text-center">Hanya untuk pengelola ISPSYNC</p>
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
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-black text-xs">IS</span>
            </div>
            <span className="font-black text-gray-900 text-sm">ISPSYNC</span>
            <span className="text-xs text-gray-400">Website Admin</span>
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

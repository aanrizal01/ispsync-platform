"use client";
import { useState, useEffect } from "react";
import MemberNav from "../../_nav";
import { useMember } from "../../context";

function getEngineUrls(domain?: string) {
  let d = domain ? domain.trim() : "";
  d = d.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  if (!d) {
    if (typeof window !== "undefined") {
      d = window.location.hostname;
    } else {
      d = "ispsync.id";
    }
  }

  d = d.replace(/^(ledger|billing|nexus|portal|fibergrid|fttx)\./, "");

  return {
    root: `https://${d}`,
    baseHost: d,
    ledger: `https://ledger.${d}`,
    nexus: `https://nexus.${d}`,
    fibergrid: `https://fibergrid.${d}`,
  };
}

export default function EngineNexusSettings() {
  const { member, updateEngineConfig } = useMember();
  const [customDomain, setCustomDomain] = useState("");
  const [brandName, setBrandName] = useState("");
  const [supportPhone, setSupportPhone] = useState("");
  const [captiveUrl, setCaptiveUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (member) {
      setBrandName(member.company);
      setSupportPhone(member.phone || "");
      if (member.engines?.nexus) {
        if (member.engines.nexus.customDomain) setCustomDomain(member.engines.nexus.customDomain);
        if (member.engines.nexus.brandName) setBrandName(member.engines.nexus.brandName);
        if (member.engines.nexus.supportPhone) setSupportPhone(member.engines.nexus.supportPhone);
        if (member.engines.nexus.captiveUrl) setCaptiveUrl(member.engines.nexus.captiveUrl);
        if (member.engines.nexus.logoUrl) setLogoUrl(member.engines.nexus.logoUrl);
      }
    }
  }, [member]);

  if (!member) return null;

  const urls = getEngineUrls(member.domain);
  const activeRootDomain = customDomain.trim() ? customDomain.trim() : urls.baseHost;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    let clean = customDomain.trim().toLowerCase();
    clean = clean.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

    const res = await updateEngineConfig("nexus", {
      customDomain: clean,
      brandName: brandName.trim(),
      supportPhone: supportPhone.trim(),
      captiveUrl: captiveUrl.trim(),
      logoUrl: logoUrl.trim(),
    });
    setSaving(false);
    if (res.success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      alert("Gagal menyimpan: " + (res.error || "Terjadi kesalahan"));
    }
  }

  function copyText(txt: string, field: string) {
    navigator.clipboard.writeText(txt);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  return (
    <MemberNav>
      <div className="max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800">
                Engine 2
              </span>
              <span className="text-xs font-semibold text-purple-600">Customer &amp; Field Operations</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span>🌐</span> Pengaturan ISPSYNC Nexus &amp; Portal
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Kelola domain Landing Portal Pelanggan, aplikasi teknisi lapangan, dan branding mandiri.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={`https://${activeRootDomain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm shadow-blue-200 flex items-center gap-1.5"
            >
              <span>🏠 Buka Landing Portal</span>
              <span className="text-xs font-normal">↗</span>
            </a>
            <a
              href={urls.nexus}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm shadow-purple-200 flex items-center gap-1.5"
            >
              <span>🌐 Buka Operasional Nexus</span>
              <span className="text-xs font-normal">↗</span>
            </a>
          </div>
        </div>

        {/* Status bar */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg font-bold">
              ✓
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900">Status Server Nexus: Operasional</div>
              <div className="text-[11px] text-gray-400">
                Landing Portal Pelanggan (Registrasi &amp; Cek Tagihan) + Operasional Lapangan Aktif
              </div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Online &amp; Siap Pakai
          </span>
        </div>

        {/* Form Pengaturan Domain & Branding */}
        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span>🌐</span> Domain Landing Portal &amp; Operasional
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Alamat web yang dikunjungi pelanggan umum (pendaftaran/cek tagihan) serta tim sales &amp; teknisi ISP Anda.
              </p>
            </div>

            {/* Landing Portal Pelanggan (Root) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <span>🏠</span> 1. Landing Portal Pelanggan (Publik)
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">
                  Customer Self-Service
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Halaman utama yang dibuka masyarakat untuk mendaftar pasang baru, cek jangkauan fiber, dan pembayaran tagihan.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`https://${activeRootDomain}`}
                  className="flex-1 bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-mono font-semibold text-blue-600 cursor-not-allowed select-all"
                />
                <button
                  type="button"
                  onClick={() => copyText(`https://${activeRootDomain}`, "root_url")}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-medium transition-colors"
                >
                  {copiedField === "root_url" ? "✓ Tersalin" : "Salin URL"}
                </button>
                <a
                  href={`https://${activeRootDomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Buka ↗
                </a>
              </div>
            </div>

            {/* Operasional Nexus */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <span>🌐</span> 2. Portal Operasional Nexus (Internal)
                </span>
                <span className="text-[10px] bg-purple-100 text-purple-800 font-semibold px-2 py-0.5 rounded">
                  Sales &amp; Teknisi
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Aplikasi internal untuk login tim marketing/sales, teknisi instalasi &amp; maintenance, dan manajemen captive hotspot.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={urls.nexus}
                  className="flex-1 bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-mono font-semibold text-purple-600 cursor-not-allowed select-all"
                />
                <button
                  type="button"
                  onClick={() => copyText(urls.nexus, "nexus_url")}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-medium transition-colors"
                >
                  {copiedField === "nexus_url" ? "✓ Tersalin" : "Salin URL"}
                </button>
                <a
                  href={urls.nexus}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Buka ↗
                </a>
              </div>
            </div>

            {/* Custom Domain Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                Kustom Domain Sendiri (White-Label)
              </label>
              <div className="flex items-center gap-2">
                <span className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-xl text-xs font-mono text-gray-500">
                  https://
                </span>
                <input
                  type="text"
                  value={customDomain}
                  onChange={e => setCustomDomain(e.target.value)}
                  placeholder={`kosongkan untuk tetap pakai: ${urls.baseHost}`}
                  className="flex-1 bg-white border border-gray-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-r-xl px-3.5 py-2 text-xs font-mono font-medium text-gray-800 transition-colors"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Contoh: <span className="font-mono text-purple-600">ispku.net.id</span> atau <span className="font-mono text-purple-600">portal.ispku.id</span>.
              </p>
            </div>

            {/* DNS Helper */}
            <div className="bg-slate-900 text-slate-200 rounded-xl p-4 text-xs space-y-2">
              <div className="font-bold text-white flex items-center justify-between">
                <span>📋 Panduan DNS Jika Menggunakan Domain Sendiri:</span>
                <span className="text-[10px] text-purple-300 font-mono">Auto-SSL Let's Encrypt Aktif</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-800 p-2.5 rounded-lg space-y-1">
                  <span className="text-slate-400 text-[10px] block font-sans font-bold">1. A Record (Landing Portal):</span>
                  <div className="font-mono text-emerald-400 font-bold">Host: @ &rarr; 103.179.65.73</div>
                </div>
                <div className="bg-slate-800 p-2.5 rounded-lg space-y-1">
                  <span className="text-slate-400 text-[10px] block font-sans font-bold">2. CNAME Record (Operasional):</span>
                  <div className="font-mono text-amber-400 font-bold">Host: nexus &rarr; {urls.baseHost}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Branding Section */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span>🎨</span> Kustomisasi Tampilan &amp; Branding
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Informasi ini ditampilkan di header portal pelanggan dan pesan notifikasi otomatis.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  Nama Brand ISP / Layanan
                </label>
                <input
                  type="text"
                  value={brandName}
                  onChange={e => setBrandName(e.target.value)}
                  placeholder="contoh: CepatNet Fiber"
                  className="w-full bg-white border border-gray-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-800 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  Nomor WhatsApp Call Center
                </label>
                <input
                  type="text"
                  value={supportPhone}
                  onChange={e => setSupportPhone(e.target.value)}
                  placeholder="contoh: 081234567890"
                  className="w-full bg-white border border-gray-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-800 transition-colors"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  URL Logo Brand (PNG / SVG)
                </label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  placeholder="contoh: https://ispku.com/logo.png"
                  className="w-full bg-white border border-gray-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-800 transition-colors"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Masukkan URL gambar logo ISP Anda. Logo akan ditampilkan di header Landing Portal dan favicon. Jika kosong, akan menggunakan logo default ISPSYNC.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                URL Login Captive Hotspot Pelanggan (MikroTik)
              </label>
              <input
                type="text"
                value={captiveUrl}
                onChange={e => setCaptiveUrl(e.target.value)}
                placeholder="contoh: https://wifi.ispku.net.id/login"
                className="w-full bg-white border border-gray-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-3.5 py-2 text-xs font-mono text-gray-800 transition-colors"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Digunakan untuk integrasi halaman login voucher pada MikroTik RouterBoard.
              </p>
            </div>

            {/* Walled Garden / Hotspot Automation */}
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
              <div className="flex items-start gap-3">
                <span className="text-xl">📡</span>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-purple-900">Integrasi Walled-Garden Otomatis</h3>
                    <p className="text-xs text-purple-700 leading-relaxed mt-1">
                      Agar pelanggan dapat membuka halaman login dan melakukan pembayaran Payment Gateway (QRIS/Transfer) <b>sebelum</b> memiliki akses internet, IP Cloud ISPSYNC harus diizinkan di MikroTik.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch("http://ispsync.id:8081/api/v1/tenant/hotspot/generate", {
                          method: "POST",
                          headers: { "X-Tenant-Slug": member.company.toLowerCase() }
                        });
                        const data = await res.json();
                        if (data.script) {
                           alert("SUKSES GENERATE SCRIPT!\n\nSilakan Copy Paste ini di Terminal Winbox Anda:\n\n" + data.script);
                        } else {
                           alert("Gagal: " + (data.error || "Unknown"));
                        }
                      } catch(err) {
                        alert("Gagal menghubungi server: " + err);
                      }
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-2 shadow-sm"
                  >
                    <span>⚡ Generate Script Walled-Garden</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-600 animate-fade-in flex items-center gap-1">
                <span>✓</span> Pengaturan Nexus &amp; Portal berhasil disimpan!
              </span>
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-sm shadow-purple-200"
            >
              {saving ? "Menyimpan..." : "Simpan Pengaturan"}
            </button>
          </div>
        </form>
      </div>
    </MemberNav>
  );
}

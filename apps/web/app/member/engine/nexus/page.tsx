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
      }
    }
  }, [member]);

  if (!member) return null;

  const urls = getEngineUrls(member.domain);
  const defaultDomain = urls.nexus.replace("https://", "");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    const res = await updateEngineConfig("nexus", {
      customDomain: customDomain.trim(),
      brandName: brandName.trim(),
      supportPhone: supportPhone.trim(),
      captiveUrl: captiveUrl.trim(),
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
              <span>🌐</span> Pengaturan ISPSYNC Nexus
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Kelola domain portal pelanggan, aplikasi mobile teknisi lapangan, dan branding mandiri.
            </p>
          </div>

          <a
            href={urls.nexus}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm shadow-purple-200 flex items-center gap-2 self-start sm:self-auto"
          >
            <span>Buka Dashboard Nexus</span>
            <span className="text-sm font-normal">↗</span>
          </a>
        </div>

        {/* Status bar */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg font-bold">
              ✓
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900">Status Server Nexus: Operasional</div>
              <div className="text-[11px] text-gray-400">Portal Pelanggan, Modul Teknisi, &amp; Captive Hotspot Gateway Aktif</div>
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
                <span>🌐</span> Domain Portal Pelanggan &amp; Teknisi
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Alamat web yang dikunjungi pelanggan untuk cek tagihan, lapor gangguan, dan teknisi untuk work order.
              </p>
            </div>

            {/* Subdomain Bawaan */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                Subdomain Bawaan Platform (Default)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={defaultDomain}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-mono text-gray-700 cursor-not-allowed select-all"
                />
                <button
                  type="button"
                  onClick={() => copyText(`https://${defaultDomain}`, "defaultDomain")}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-medium transition-colors"
                >
                  {copiedField === "defaultDomain" ? "✓ Tersalin" : "Salin URL"}
                </button>
              </div>
            </div>

            {/* Custom Domain Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                Domain Kustom Pribadi / White-Label (Opsional)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customDomain}
                  onChange={e => setCustomDomain(e.target.value)}
                  placeholder="contoh: portal.perusahaanisp.net.id"
                  className="flex-1 bg-white border border-gray-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-800 transition-colors"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Arahkan CNAME <code>portal</code> ke <code>103.179.65.73</code> pada DNS Anda.
              </p>
            </div>

            {/* DNS Helper */}
            <div className="bg-slate-900 text-slate-200 rounded-xl p-4 text-xs space-y-2">
              <div className="font-bold text-white flex items-center gap-2">
                <span>📋</span> Konfigurasi DNS Kustom Nexus:
              </div>
              <div className="grid grid-cols-3 gap-2 bg-slate-800 p-2.5 rounded-lg font-mono text-[11px]">
                <div>
                  <span className="text-slate-400 text-[10px] block font-sans">Type</span>
                  <span className="text-amber-400 font-bold">CNAME</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-sans">Host / Subdomain</span>
                  <span className="text-purple-300 font-bold">{customDomain ? customDomain.split(".")[0] : "portal"}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-sans">Target IP</span>
                  <span className="text-emerald-400 font-bold">103.179.65.73</span>
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
                  placeholder="Nama Brand ISP"
                  className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  Nomor WhatsApp Bantuan / CS
                </label>
                <input
                  type="text"
                  value={supportPhone}
                  onChange={e => setSupportPhone(e.target.value)}
                  placeholder="0812xxxxxxxx"
                  className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-800"
                />
              </div>
            </div>
          </div>

          {/* Captive Portal Hotspot */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span>📡</span> Integrasi Captive Portal Hotspot MikroTik
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Halaman login voucher dan redirect hotspot untuk pelanggan publik atau cafe/resto.
              </p>
            </div>

            <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-purple-900 block">URL Login Captive Portal Hotspot:</span>
                <span className="font-mono text-purple-700 text-[11px]">https://{defaultDomain}/hotspot</span>
              </div>
              <button
                type="button"
                onClick={() => copyText(`https://${defaultDomain}/hotspot`, "hotspotUrl")}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                {copiedField === "hotspotUrl" ? "✓ Tersalin" : "Salin URL"}
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {saveSuccess && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 animate-bounce">
                  <span>✓</span> Pengaturan Engine Nexus berhasil disimpan!
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-purple-200 disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan Pengaturan Nexus"}
            </button>
          </div>
        </form>
      </div>
    </MemberNav>
  );
}

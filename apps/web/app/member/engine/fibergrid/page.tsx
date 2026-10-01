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

export default function EngineFiberGridSettings() {
  const { member, updateEngineConfig } = useMember();
  const [customDomain, setCustomDomain] = useState("");
  const [genieAcsUrl, setGenieAcsUrl] = useState("");
  const [oltType, setOltType] = useState("ZTE C320 GPON");
  const [informInterval, setInformInterval] = useState("300");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (member) {
      const urls = getEngineUrls(member.domain);
      const defaultDomain = urls.fibergrid.replace("https://", "");
      setGenieAcsUrl(`http://acs.${defaultDomain}:7547`);

      if (member.engines?.fibergrid) {
        if (member.engines.fibergrid.customDomain) setCustomDomain(member.engines.fibergrid.customDomain);
        if (member.engines.fibergrid.genieAcsUrl) setGenieAcsUrl(member.engines.fibergrid.genieAcsUrl);
        if (member.engines.fibergrid.oltType) setOltType(member.engines.fibergrid.oltType);
        if (member.engines.fibergrid.informInterval) setInformInterval(member.engines.fibergrid.informInterval);
      }
    }
  }, [member]);

  if (!member) return null;

  const urls = getEngineUrls(member.domain);
  const defaultDomain = urls.fibergrid.replace("https://", "");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    const res = await updateEngineConfig("fibergrid", {
      customDomain: customDomain.trim(),
      genieAcsUrl: genieAcsUrl.trim(),
      oltType,
      informInterval,
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
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                Engine 3
              </span>
              <span className="text-xs font-semibold text-emerald-600">FTTX &amp; NOC Command Center</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span>📡</span> Pengaturan ISPSYNC FiberGrid
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Kelola domain NOC, server auto-provisioning GenieACS TR-069, dan pemantauan OLT GPON/EPON.
            </p>
          </div>

          <a
            href={urls.fibergrid}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm shadow-emerald-200 flex items-center gap-2 self-start sm:self-auto"
          >
            <span>Buka Dashboard FiberGrid</span>
            <span className="text-sm font-normal">↗</span>
          </a>
        </div>

        {/* Status bar */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg font-bold">
              ✓
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900">Status Server FiberGrid: Operasional</div>
              <div className="text-[11px] text-gray-400">GenieACS TR-069 NBI Engine &amp; OLT SNMP Poller Aktif</div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Online &amp; Siap Pakai
          </span>
        </div>

        {/* Form Pengaturan Domain & TR-069 */}
        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span>🌐</span> Domain NOC Command Center
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Alamat web yang digunakan oleh tim NOC dan Network Engineer untuk memantau status jaringan fiber.
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
                  placeholder="contoh: noc.perusahaanisp.net.id"
                  className="flex-1 bg-white border border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-800 transition-colors"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Arahkan CNAME <code>noc</code> ke <code>103.179.65.73</code> pada DNS Anda.
              </p>
            </div>

            {/* DNS Helper */}
            <div className="bg-slate-900 text-slate-200 rounded-xl p-4 text-xs space-y-2">
              <div className="font-bold text-white flex items-center gap-2">
                <span>📋</span> Konfigurasi DNS Kustom FiberGrid:
              </div>
              <div className="grid grid-cols-3 gap-2 bg-slate-800 p-2.5 rounded-lg font-mono text-[11px]">
                <div>
                  <span className="text-slate-400 text-[10px] block font-sans">Type</span>
                  <span className="text-amber-400 font-bold">CNAME</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-sans">Host / Subdomain</span>
                  <span className="text-emerald-300 font-bold">{customDomain ? customDomain.split(".")[0] : "noc"}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-sans">Target IP</span>
                  <span className="text-emerald-400 font-bold">103.179.65.73</span>
                </div>
              </div>
            </div>
          </div>

          {/* GenieACS TR-069 Section */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span>⚙️</span> Parameter Auto-Provisioning GenieACS (TR-069)
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Masukkan URL Inform ini ke konfigurasi ONT / modem pelanggan (ZTE, Fiberhome, Huawei) untuk aktivasi zero-touch.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  ACS Inform URL (Port 7547)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={genieAcsUrl}
                    onChange={e => setGenieAcsUrl(e.target.value)}
                    className="flex-1 bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-mono text-gray-800"
                  />
                  <button
                    type="button"
                    onClick={() => copyText(genieAcsUrl, "genieUrl")}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-medium transition-colors"
                  >
                    {copiedField === "genieUrl" ? "✓ Tersalin" : "Salin URL"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                    Tipe OLT Utama
                  </label>
                  <select
                    value={oltType}
                    onChange={e => setOltType(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-800"
                  >
                    <option value="ZTE C320 GPON">ZTE C320 / C300 GPON</option>
                    <option value="Huawei MA5608T">Huawei MA5608T / MA5800</option>
                    <option value="VSOL GPON">VSOL V1600G GPON</option>
                    <option value="HSGQ EPON">HSGQ / BDCOM EPON</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                    Inform Interval
                  </label>
                  <select
                    value={informInterval}
                    onChange={e => setInformInterval(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-800"
                  >
                    <option value="60">60 Detik (Agresif / Lab)</option>
                    <option value="300">300 Detik (5 Menit - Standar Telco)</option>
                    <option value="900">900 Detik (15 Menit - Hemat Bandwidth)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Threshold Notice */}
            <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs text-emerald-800">
              <span className="font-bold">Standar Alarm Redaman Optik (Optical Budget):</span>
              <div className="text-[11px] text-emerald-700 mt-0.5">
                Batas warning otomatis: <code>-27.0 dBm</code> (Kritis: <code>-30.0 dBm</code>). FiberGrid otomatis menandai ONT yang mengalami redaman tinggi.
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {saveSuccess && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 animate-bounce">
                  <span>✓</span> Pengaturan Engine FiberGrid berhasil disimpan!
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-200 disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan Pengaturan FiberGrid"}
            </button>
          </div>
        </form>
      </div>
    </MemberNav>
  );
}

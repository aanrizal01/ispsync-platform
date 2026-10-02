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

export default function EngineLedgerSettings() {
  const { member, updateEngineConfig } = useMember();
  const [customDomain, setCustomDomain] = useState("");
  const [radiusSecret, setRadiusSecret] = useState("ispsync-radius-sec");
  const [pgChoice, setPgChoice] = useState("qris");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (member?.engines?.ledger) {
      if (member.engines.ledger.customDomain) setCustomDomain(member.engines.ledger.customDomain);
      if (member.engines.ledger.radiusSecret) setRadiusSecret(member.engines.ledger.radiusSecret);
      if (member.engines.ledger.pgProvider) setPgChoice(member.engines.ledger.pgProvider);
    }
  }, [member]);

  if (!member) return null;

  const urls = getEngineUrls(member.domain);
  const defaultDomain = urls.ledger.replace("https://", "");
  const activeDomain = customDomain.trim() ? customDomain.trim() : defaultDomain;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    const res = await updateEngineConfig("ledger", {
      customDomain: customDomain.trim(),
      radiusSecret: radiusSecret.trim(),
      pgProvider: pgChoice,
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
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
                Engine 1
              </span>
              <span className="text-xs font-semibold text-blue-600">Core Billing &amp; AAA</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span>💳</span> Pengaturan ISPSYNC Ledger
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Kelola domain akses, server RADIUS AAA, dan integrasi penagihan otomatis untuk ISP Anda.
            </p>
          </div>

          <a
            href={urls.ledger}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm shadow-blue-200 flex items-center gap-2 self-start sm:self-auto"
          >
            <span>Buka Dashboard Ledger</span>
            <span className="text-sm font-normal">↗</span>
          </a>
        </div>

        {/* Status bar */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg font-bold">
              ✓
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900">Status Server Ledger: Operasional</div>
              <div className="text-[11px] text-gray-400">PostgreSQL Billing DB, Redis Cache, FreeRADIUS Container Aktif</div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Online &amp; Siap Pakai
          </span>
        </div>

        {/* Form Pengaturan Domain */}
        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span>🌐</span> Konfigurasi Domain &amp; White-Label
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Tentukan alamat web yang digunakan oleh admin &amp; kasir ISP untuk mengakses modul Ledger.
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
              <p className="text-[11px] text-gray-400 mt-1">
                Subdomain ini otomatis aktif dengan sertifikat SSL TLS ZeroSSL gratis.
              </p>
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
                  placeholder="contoh: billing.perusahaanisp.net.id"
                  className="flex-1 bg-white border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-800 transition-colors"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Gunakan domain atau subdomain milik ISP Anda sendiri untuk tampilan full white-label.
              </p>
            </div>

            {/* DNS Assistant Card */}
            <div className="bg-slate-900 text-slate-200 rounded-xl p-4 text-xs space-y-2">
              <div className="font-bold text-white flex items-center gap-2">
                <span>📋</span> Panduan Konfigurasi DNS Kustom Anda:
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Tambahkan DNS Record berikut di panel domain Anda (Cloudflare, cPanel, atau registrar):
              </p>
              <div className="grid grid-cols-3 gap-2 bg-slate-800 p-2.5 rounded-lg font-mono text-[11px]">
                <div>
                  <span className="text-slate-400 text-[10px] block font-sans">Type</span>
                  <span className="text-amber-400 font-bold">CNAME</span> / A
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-sans">Host / Name</span>
                  <span className="text-blue-300 font-bold">{customDomain ? customDomain.split(".")[0] : "billing"}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-sans">Target / IP</span>
                  <span className="text-emerald-400 font-bold">103.179.65.73</span>
                </div>
              </div>
              <div className="text-[10px] text-slate-400">
                🔒 SSL/TLS otomatis diterbitkan oleh On-Demand TLS Caddy begitu record DNS terarah.
              </div>
            </div>
          </div>

          {/* NEW: VPN Hub / MikroTik Router Sync */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white flex items-center gap-3">
              <span className="text-xl">🛡️</span>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Koneksi VPN MikroTik (Auto-Provisioning)</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">Hubungkan router Anda ke Cloud ISPSYNC menggunakan WireGuard.</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex items-start gap-3">
                <span className="text-yellow-600 mt-0.5">ℹ️</span>
                <div className="text-xs text-yellow-800 leading-relaxed">
                  <strong>RouterOS v7+ Sangat Direkomendasikan.</strong><br/>
                  Klik "Generate Script" di bawah ini. Sistem akan membagikan alokasi IP Private (10.255.x.x) dan kunci kriptografi otomatis. Anda cukup mem-<em>paste</em> kode tersebut di menu <strong>New Terminal</strong> MikroTik (Winbox).
                </div>
              </div>
              
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch("http://ispsync.id:8081/api/v1/tenant/mikrotik/generate", {
                      method: "POST",
                      headers: { "X-Tenant-Slug": member.company.toLowerCase() }
                    });
                    const data = await res.json();
                    if (data.script) {
                       alert("SUKSES GENERATE!\n\nSilakan Copy Paste ini di Terminal Winbox:\n\n" + data.script);
                    } else {
                       alert("Gagal: " + (data.error || "Unknown"));
                    }
                  } catch(err) {
                    alert("Gagal menghubungi server: " + err);
                  }
                }}
                className="px-4 py-2.5 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2"
              >
                <span>⚡ Generate Script Winbox</span>
              </button>
            </div>
          </div>

          {/* NEW: Auto-Isolir / Billing Automation */}
          <div className="bg-rose-50 border border-rose-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-rose-100/50 bg-gradient-to-r from-rose-100 to-rose-50 flex items-center gap-3">
              <span className="text-xl">🛑</span>
              <div>
                <h2 className="text-sm font-bold text-rose-900">Sistem Auto-Isolir Tunggakan (Walled-Garden)</h2>
                <p className="text-[11px] text-rose-700 mt-0.5">Redirect pelanggan telat bayar ke halaman peringatan ISPSYNC.</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-white/80 border border-rose-200 p-4 rounded-xl flex items-start gap-3">
                <span className="text-rose-600 mt-0.5">ℹ️</span>
                <div className="text-xs text-rose-800 leading-relaxed">
                  <strong>Bagaimana Ini Bekerja?</strong><br/>
                  Script ini akan membuat <code>POOL_ISOLIR</code> dan aturan <code>dst-nat</code> di MikroTik Anda. 
                  Jika pelanggan menunggak, FreeRADIUS ISPSYNC akan mengalokasikan mereka ke pool ini. 
                  Semua trafik internet mereka akan otomatis dialihkan ke halaman peringatan (beserta QRIS pelunasan).
                </div>
              </div>
              
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch("http://ispsync.id:8081/api/v1/tenant/isolir/generate", {
                      method: "POST",
                      headers: { "X-Tenant-Slug": member.company.toLowerCase() }
                    });
                    const data = await res.json();
                    if (data.script) {
                       alert("SUKSES GENERATE SCRIPT ISOLIR!\n\nSilakan Copy Paste ini di Terminal Winbox Anda:\n\n" + data.script);
                    } else {
                       alert("Gagal: " + (data.error || "Unknown"));
                    }
                  } catch(err) {
                    alert("Gagal menghubungi server: " + err);
                  }
                }}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2"
              >
                <span>⚡ Generate Script Isolir</span>
              </button>
            </div>
          </div>

          {/* RADIUS AAA Section */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span>⚡</span> Parameter Server RADIUS AAA (PPPoE / Hotspot)
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Gunakan parameter ini untuk menghubungkan router MikroTik / Juniper BRAS Anda ke server ISPSYNC FreeRADIUS.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">RADIUS Server IP</span>
                <span className="font-mono font-bold text-gray-900 text-sm">103.179.65.73</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Auth / Acct Port</span>
                <span className="font-mono font-bold text-gray-900 text-sm">1812 / 1813 UDP</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">CoA / Disconnect Port</span>
                <span className="font-mono font-bold text-gray-900 text-sm">3799 UDP</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                RADIUS Shared Secret
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={radiusSecret}
                  onChange={e => setRadiusSecret(e.target.value)}
                  className="flex-1 bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-mono text-gray-800"
                />
                <button
                  type="button"
                  onClick={() => copyText(radiusSecret, "radiusSecret")}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-medium transition-colors"
                >
                  {copiedField === "radiusSecret" ? "✓ Tersalin" : "Salin Secret"}
                </button>
              </div>
            </div>

            {/* MikroTik Quick Command Helper */}
            <div className="p-3 bg-slate-950 text-slate-200 rounded-xl font-mono text-[11px] space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-sans">
                <span>Perintah Cepat MikroTik RouterOS Terminal:</span>
                <button
                  type="button"
                  onClick={() => copyText(`/radius add address=103.179.65.73 secret="${radiusSecret}" service=ppp,hotspot authentication-port=1812 accounting-port=1813 timeout=3000ms`, "mikrotikCli")}
                  className="text-blue-400 hover:underline"
                >
                  {copiedField === "mikrotikCli" ? "✓ Disalin!" : "Salin Script CLI"}
                </button>
              </div>
              <div className="text-emerald-400 overflow-x-auto whitespace-pre p-1">
{`/radius add address=103.179.65.73 secret="${radiusSecret}" service=ppp,hotspot authentication-port=1812 accounting-port=1813 timeout=3000ms`}
              </div>
            </div>
          </div>

          {/* Payment Gateway Preferences */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span>💳</span> Preferensi Pembayaran Otomatis
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Pilih metode pembayaran utama yang ditampilkan di invoice pelanggan.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: "qris", name: "QRIS Real-Time", desc: "Scan otomatis langsung lunas" },
                { id: "va", name: "Virtual Account", desc: "BCA, Mandiri, BRI, BNI" },
                { id: "manual", name: "Transfer Bank Manual", desc: "Upload bukti pembayaran" },
              ].map(pg => (
                <label
                  key={pg.id}
                  onClick={() => setPgChoice(pg.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    pgChoice === pg.id
                      ? "border-blue-600 bg-blue-50/50 shadow-sm"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-gray-900">{pg.name}</span>
                      <input
                        type="radio"
                        name="pgChoice"
                        checked={pgChoice === pg.id}
                        onChange={() => setPgChoice(pg.id)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">{pg.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {saveSuccess && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 animate-bounce">
                  <span>✓</span> Pengaturan Engine Ledger berhasil disimpan!
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-200 disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan Pengaturan Ledger"}
            </button>
          </div>
        </form>
      </div>
    </MemberNav>
  );
}

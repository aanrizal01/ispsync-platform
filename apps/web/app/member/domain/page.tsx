"use client";
import { useState, useEffect } from "react";
import MemberNav from "../_nav";
import { useMember } from "../context";
import Link from "next/link";

function getBaseDomain(domain?: string) {
  let d = domain ? domain.trim() : "";
  d = d.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  if (!d) {
    if (typeof window !== "undefined") {
      d = window.location.hostname;
    } else {
      d = "ispsync.id";
    }
  }

  // Strip existing engine subdomains if present
  d = d.replace(/^(ledger|billing|nexus|portal|fibergrid|fttx)\./, "");
  return d;
}

export default function MemberDomainSettings() {
  const { member, updateEngineConfig } = useMember();
  const [customDomain, setCustomDomain] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (member) {
      if (member.customDomain) {
        setCustomDomain(member.customDomain);
      }
    }
  }, [member]);

  if (!member) return null;

  const defaultDomain = getBaseDomain(member.domain);
  const activeDomain = customDomain.trim() ? customDomain.trim() : defaultDomain;

  const endpoints = [
    {
      name: "Landing Portal Pelanggan",
      role: "Pendaftaran Pasang Baru, Cek Coverage Fiber & Portal Mandiri Ritel",
      badge: "Customer Facing",
      badgeColor: "bg-blue-100 text-blue-800",
      url: `https://${activeDomain}`,
      defaultUrl: `https://${defaultDomain}`,
      icon: "🏠",
    },
    {
      name: "Engine 1 - ISPSYNC Ledger",
      role: "Backoffice Billing ISP, Core AAA MikroTik & Rekonsiliasi Payment Gateway",
      badge: "Engine 1 (Backoffice)",
      badgeColor: "bg-indigo-100 text-indigo-800",
      url: `https://ledger.${activeDomain}`,
      defaultUrl: `https://ledger.${defaultDomain}`,
      icon: "💳",
      settingsUrl: "/member/engine/ledger",
    },
    {
      name: "Engine 2 - ISPSYNC Nexus",
      role: "Aplikasi Operasional Sales, Teknisi Lapangan & Hotspot Captive Portal",
      badge: "Engine 2 (Operations)",
      badgeColor: "bg-purple-100 text-purple-800",
      url: `https://nexus.${activeDomain}`,
      defaultUrl: `https://nexus.${defaultDomain}`,
      icon: "🌐",
      settingsUrl: "/member/engine/nexus",
    },
    {
      name: "Engine 3 - ISPSYNC FiberGrid",
      role: "NOC Command Center, Pemetaan OLT GPON/EPON & GenieACS TR-069",
      badge: "Engine 3 (FTTx & NOC)",
      badgeColor: "bg-emerald-100 text-emerald-800",
      url: `https://fibergrid.${activeDomain}`,
      defaultUrl: `https://fibergrid.${defaultDomain}`,
      icon: "📡",
      settingsUrl: "/member/engine/fibergrid",
    },
  ];

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    let clean = customDomain.trim().toLowerCase();
    clean = clean.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

    const res = await updateEngineConfig("primary", {
      customDomain: clean,
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
                White-Label &amp; DNS
              </span>
              <span className="text-xs font-semibold text-blue-600">Domain &amp; Portal Ekosistem</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span>🏷️</span> Pengaturan Domain &amp; Landing Portal
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Atur domain Landing Portal Pelanggan Anda dan kelola pemetaan otomatis ke seluruh 3 Engine ISPSYNC.
            </p>
          </div>

          <a
            href={`https://${activeDomain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-blue-200"
          >
            <span>Buka Landing Portal</span>
            <span>↗</span>
          </a>
        </div>

        {/* Current Active Domain Overview Card */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-md border border-slate-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Landing Portal Aktif
                </span>
                <span className="px-2 py-0.5 bg-slate-700/80 rounded-full text-[10px] font-mono text-slate-300">
                  Auto-SSL TLS On-Demand
                </span>
              </div>
              <div className="text-2xl font-black tracking-tight text-white font-mono flex items-center gap-2">
                <span>https://{activeDomain}</span>
              </div>
              <p className="text-xs text-slate-300 mt-2 max-w-xl leading-relaxed">
                Ini adalah portal utama yang diakses oleh calon pelanggan Anda untuk pendaftaran internet baru, cek ketersediaan jaringan, tracking tagihan ritel, dan bantuan customer support.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => copyText(`https://${activeDomain}`, "active_domain")}
                className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <span>{copiedField === "active_domain" ? "✓ Tersalin!" : "📋 Salin URL"}</span>
              </button>
              <a
                href={`https://${activeDomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>Kunjungi Portal ↗</span>
              </a>
            </div>
          </div>
        </div>

        {/* Custom Domain Form */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gray-100">
            <span className="text-lg">🌐</span>
            <div>
              <h2 className="text-base font-bold text-gray-900">Kustomisasi Domain (White-Label Penuh)</h2>
              <p className="text-xs text-gray-500">
                Gunakan domain resmi ISP Anda sendiri (contoh: <span className="font-mono text-blue-600 font-semibold">myisp.net.id</span> atau <span className="font-mono text-blue-600 font-semibold">portal.myisp.id</span>).
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Subdomain Default ISPSYNC
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2.5 bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl text-xs font-mono text-gray-500">
                    https://
                  </span>
                  <input
                    type="text"
                    readOnly
                    value={defaultDomain}
                    className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-r-xl text-xs font-mono text-gray-700 cursor-not-allowed focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Domain bawaan tenant yang disediakan langsung oleh platform.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Custom Domain Anda (Opsional)
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2.5 bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl text-xs font-mono text-gray-500">
                    https://
                  </span>
                  <input
                    type="text"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="misal: ispku.net.id atau portal.ispku.id"
                    className="flex-1 px-3 py-2.5 bg-white border border-gray-300 rounded-r-xl text-xs font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Kosongkan jika ingin tetap menggunakan domain default ({defaultDomain}).
                </p>
              </div>
            </div>

            {/* DNS Instructions Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 space-y-3">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>📋 Panduan Konfigurasi DNS di Registrar Domain Anda:</span>
                <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-mono font-normal">
                  IP Server: 103.179.65.73
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Jika Anda menggunakan Custom Domain sendiri (contoh: <span className="font-mono font-semibold">{customDomain.trim() || "ispku.net.id"}</span>), tambahkan DNS Record berikut di panel registrar (Cloudflare, Rumahweb, Niagahoster, dll):
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[11px] bg-white rounded-lg border border-slate-200">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-[10px]">
                    <tr>
                      <th className="p-2 border-b">Tipe</th>
                      <th className="p-2 border-b">Host / Nama Record</th>
                      <th className="p-2 border-b">Target / Value Pointing</th>
                      <th className="p-2 border-b">Fungsi</th>
                      <th className="p-2 border-b text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-2 font-bold text-blue-600">A</td>
                      <td className="p-2 font-semibold">@ (atau root)</td>
                      <td className="p-2 text-slate-800">103.179.65.73</td>
                      <td className="p-2 font-sans text-[11px] text-slate-500">Landing Portal Pelanggan</td>
                      <td className="p-2 text-right">
                        <button
                          type="button"
                          onClick={() => copyText("103.179.65.73", "dns_a")}
                          className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-sans font-medium"
                        >
                          {copiedField === "dns_a" ? "✓" : "Salin IP"}
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-indigo-600">CNAME</td>
                      <td className="p-2 font-semibold">ledger</td>
                      <td className="p-2 text-slate-800">{defaultDomain}</td>
                      <td className="p-2 font-sans text-[11px] text-slate-500">Engine 1 (Billing &amp; RADIUS)</td>
                      <td className="p-2 text-right">
                        <button
                          type="button"
                          onClick={() => copyText(defaultDomain, "dns_ledger")}
                          className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-sans font-medium"
                        >
                          {copiedField === "dns_ledger" ? "✓" : "Salin"}
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-purple-600">CNAME</td>
                      <td className="p-2 font-semibold">nexus</td>
                      <td className="p-2 text-slate-800">{defaultDomain}</td>
                      <td className="p-2 font-sans text-[11px] text-slate-500">Engine 2 (CRM &amp; Sales)</td>
                      <td className="p-2 text-right">
                        <button
                          type="button"
                          onClick={() => copyText(defaultDomain, "dns_nexus")}
                          className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-sans font-medium"
                        >
                          {copiedField === "dns_nexus" ? "✓" : "Salin"}
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-emerald-600">CNAME</td>
                      <td className="p-2 font-semibold">fibergrid</td>
                      <td className="p-2 text-slate-800">{defaultDomain}</td>
                      <td className="p-2 font-sans text-[11px] text-slate-500">Engine 3 (FTTx &amp; NOC)</td>
                      <td className="p-2 text-right">
                        <button
                          type="button"
                          onClick={() => copyText(defaultDomain, "dns_fibergrid")}
                          className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-sans font-medium"
                        >
                          {copiedField === "dns_fibergrid" ? "✓" : "Salin"}
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                🔒 <strong>Sertifikat SSL Otomatis:</strong> Setelah DNS terarah ke IP server, Caddy Webserver kami akan otomatis menerbitkan sertifikat Let's Encrypt SSL HTTPS untuk domain Anda (Zero-Configuration).
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              {saveSuccess && (
                <span className="text-xs font-bold text-emerald-600 animate-fade-in flex items-center gap-1">
                  <span>✓</span> Domain berhasil disimpan!
                </span>
              )}
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm shadow-blue-200 transition-all flex items-center gap-2"
              >
                {saving ? "Menyimpan..." : "Simpan Perubahan Domain"}
              </button>
            </div>
          </form>
        </div>

        {/* 4 Endpoints Ecosystem Map */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="pb-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Pemetaan 4 URL Ekosistem Tenant Anda</h2>
              <p className="text-xs text-gray-500">
                Daftar seluruh URL aktif yang otomatis terhubung dengan domain yang Anda pilih.
              </p>
            </div>
            <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-mono font-bold rounded-lg">
              {activeDomain}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {endpoints.map((ep, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-gray-100 bg-gray-50/70 hover:bg-white hover:border-gray-300 hover:shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-lg flex-shrink-0 shadow-sm">
                    {ep.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900">{ep.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ep.badgeColor}`}>
                        {ep.badge}
                      </span>
                    </div>
                    <div className="font-mono text-xs font-semibold text-blue-600 mt-0.5">
                      {ep.url}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">{ep.role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => copyText(ep.url, `ep_${i}`)}
                    className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg transition-colors"
                  >
                    {copiedField === `ep_${i}` ? "✓ Tersalin" : "Salin"}
                  </button>

                  {ep.settingsUrl && (
                    <Link
                      href={ep.settingsUrl}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                      title="Buka Pengaturan Engine"
                    >
                      <span>⚙️</span>
                    </Link>
                  )}

                  <a
                    href={ep.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <span>Buka</span>
                    <span>↗</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MemberNav>
  );
}

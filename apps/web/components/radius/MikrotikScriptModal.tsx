"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Copy, Check, RefreshCw, Terminal, Download, ShieldCheck, Server } from "lucide-react";

export interface MikrotikScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    routerName?: string;
    nasIp?: string;
    secret?: string;
    apiUser?: string;
  };
  onApplyToForm?: (data: { nasname: string; shortname: string; secret: string }) => void;
}

function generateRandomString(length = 16) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function MikrotikScriptModal({
  isOpen,
  onClose,
  initialData,
  onApplyToForm,
}: MikrotikScriptModalProps) {
  // RouterOS Version: ros6 or ros7 (ROS 7 is recommended default)
  const [rosVersion, setRosVersion] = useState<"ros6" | "ros7">("ros7");

  // Format mode: one-line (for safe terminal paste) or formatted (readable)
  const [formatMode, setFormatMode] = useState<"oneline" | "multiline">("oneline");

  // Parameters
  const [routerName, setRouterName] = useState(initialData?.routerName || "NAS-ROUTER-01");
  const [nasIp, setNasIp] = useState(initialData?.nasIp || "");
  const [apiUser, setApiUser] = useState(initialData?.apiUser || "ispsync_api");
  const [secret, setSecret] = useState(initialData?.secret || "");
  const [radiusServerIp, setRadiusServerIp] = useState("103.179.65.72");
  const [authPort, setAuthPort] = useState("1812");
  const [acctPort, setAcctPort] = useState("1813");
  const [apiPort, setApiPort] = useState("8728");
  const [coaPort, setCoaPort] = useState("3799");
  const [interimUpdate, setInterimUpdate] = useState("00:10:00");

  // Feature toggles
  const [includeApi, setIncludeApi] = useState(true);
  const [includeRadius, setIncludeRadius] = useState(true);
  const [includeHotspot, setIncludeHotspot] = useState(true);
  const [includePppoe, setIncludePppoe] = useState(true);
  const [includeCoa, setIncludeCoa] = useState(true);

  // Copy state
  const [copied, setCopied] = useState(false);

  // Auto initialize secret & apiUser if empty
  useEffect(() => {
    if (isOpen) {
      if (initialData?.routerName) setRouterName(initialData.routerName);
      if (initialData?.nasIp) setNasIp(initialData.nasIp);
      if (initialData?.secret) {
        setSecret(initialData.secret);
      } else if (!secret) {
        setSecret(generateRandomString(16));
      }
      if (initialData?.apiUser) {
        setApiUser(initialData.apiUser);
      } else if (!apiUser || apiUser === "ispsync_api") {
        setApiUser(`RadiusAuth${Math.floor(1000 + Math.random() * 9000)}`);
      }
    }
  }, [isOpen, initialData]);

  const handleRegenerate = () => {
    setSecret(generateRandomString(16));
    setApiUser(`RadiusAuth${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handleResetToRecommended = () => {
    setRosVersion("ros7");
    setFormatMode("oneline");
    setRadiusServerIp("103.179.65.72");
    setAuthPort("1812");
    setAcctPort("1813");
    setApiPort("8728");
    setCoaPort("3799");
    setInterimUpdate("00:10:00");
    setIncludeApi(true);
    setIncludeRadius(true);
    setIncludeHotspot(true);
    setIncludePppoe(true);
    setIncludeCoa(true);
  };

  // Generate Script based on settings
  const generatedScript = useMemo(() => {
    const commands: string[] = [];
    commands.push(`# === ISPSYNC MikroTik RADIUS & API Sync Script (${rosVersion.toUpperCase()}) ===`);
    commands.push(`# Target: ${routerName || "NAS"} | Server: ${radiusServerIp}`);

    // Cleanup existing items
    commands.push(`/radius remove [find comment="added by ispsync"];`);
    if (includeApi) {
      commands.push(`/user remove [find comment="user for ispsync authentication"];`);
      commands.push(`/user group remove [find comment="group for ispsync authentication"];`);
    }

    // 1. User & Group for API
    if (includeApi) {
      if (rosVersion === "ros7") {
        commands.push(
          `/user group add name="ispsync.group" policy=read,write,api,test,policy,sensitive,romon,rest-api comment="group for ispsync authentication";`
        );
      } else {
        commands.push(
          `/user group add name="ispsync.group" policy=read,write,api,test,policy,sensitive comment="group for ispsync authentication";`
        );
      }
      commands.push(
        `/user add name="${apiUser}" group="ispsync.group" password="${secret}" comment="user for ispsync authentication";`
      );
      commands.push(`/ip service set api disabled=no port=${apiPort};`);
    }

    // 2. RADIUS Server
    if (includeRadius) {
      if (rosVersion === "ros7") {
        commands.push(
          `/radius add authentication-port=${authPort} accounting-port=${acctPort} timeout=3000ms comment="added by ispsync" service=ppp,hotspot,login address=${radiusServerIp} secret="${secret}" require-message-authenticator=no;`
        );
      } else {
        commands.push(
          `/radius add authentication-port=${authPort} accounting-port=${acctPort} timeout=3s comment="added by ispsync" service=ppp,hotspot,login address=${radiusServerIp} secret="${secret}";`
        );
      }
    }

    // 3. Hotspot AAA
    if (includeHotspot) {
      commands.push(
        `/ip hotspot profile set use-radius=yes radius-accounting=yes radius-interim-update="${interimUpdate}" nas-port-type="wireless-802.11" [find name!=""];`
      );
    }

    // 4. PPPoE AAA
    if (includePppoe) {
      commands.push(
        `/ppp aaa set use-radius=yes accounting=yes interim-update="${interimUpdate}";`
      );
    }

    // 5. RADIUS Incoming (CoA / Disconnect)
    if (includeCoa) {
      commands.push(
        `/radius incoming set accept=yes port=${coaPort};`
      );
    }

    if (formatMode === "oneline") {
      return commands.filter(c => !c.startsWith("#")).join("");
    }
    return commands.join("\n");
  }, [
    rosVersion,
    formatMode,
    routerName,
    radiusServerIp,
    apiUser,
    secret,
    authPort,
    acctPort,
    apiPort,
    coaPort,
    interimUpdate,
    includeApi,
    includeRadius,
    includeHotspot,
    includePppoe,
    includeCoa,
  ]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error("Gagal menyalin script:", e);
    }
  };

  const handleDownload = () => {
    const filename = `gigabill-${routerName.toLowerCase().replace(/[^a-z0-9]/g, "_") || "nas"}-${rosVersion}.rsc`;
    const blob = new Blob([generatedScript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleApply = () => {
    if (onApplyToForm) {
      onApplyToForm({
        nasname: nasIp || "192.168.88.1",
        shortname: routerName || "NAS-ROUTER",
        secret: secret,
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center font-mono font-bold text-base">
              &lt;/&gt;
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                ISPSYNC MikroTik Script Generator
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold uppercase">
                  {rosVersion.toUpperCase()}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Otomatisasi konfigurasi FreeRADIUS, CoA Disconnect, dan API MikroTik
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Top Control Bar: Version Selector & Preset */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetToRecommended}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 transition-colors shadow-2xs"
              title="Set semua konfigurasi ke rekomendasi terbaik ISP"
            >
              <span>⚡</span> Rekomendasi Standar
            </button>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs font-medium text-slate-500">Pilih Versi RouterOS:</span>
          </div>

          {/* RouterOS Version Toggle (ROS 6 vs ROS 7) */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setRosVersion("ros6")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                rosVersion === "ros6"
                  ? "bg-slate-800 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ROS v6
            </button>
            <button
              type="button"
              onClick={() => setRosVersion("ros7")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                rosVersion === "ros7"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ROS v7
              <span className="text-[10px] bg-white/25 px-1.5 py-0.2 rounded font-semibold">
                Rekomendasi
              </span>
            </button>
          </div>
        </div>

        {/* Modal Body / Scrollable Content */}
        <div className="px-6 py-4 overflow-y-auto space-y-4 text-xs">
          {/* Quick Parameters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Username API MikroTik
              </label>
              <input
                type="text"
                value={apiUser}
                onChange={(e) => setApiUser(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-xs bg-white text-slate-900"
                placeholder="ispsync_api"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Password API &amp; Secret Radius
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-xs bg-white text-slate-900"
                  placeholder="Secret string"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                IP Server RADIUS
              </label>
              <input
                type="text"
                value={radiusServerIp}
                onChange={(e) => setRadiusServerIp(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-xs bg-white text-slate-900"
                placeholder="103.179.65.72"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Nama Router (Shortname)
              </label>
              <input
                type="text"
                value={routerName}
                onChange={(e) => setRouterName(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900"
                placeholder="NAS-SITE-1"
              />
            </div>
          </div>

          {/* Port Settings & Format Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-slate-600">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-slate-700">Port Setting:</span>
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                Auth: <strong className="text-slate-800">{authPort}</strong>
              </span>
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                Acct: <strong className="text-slate-800">{acctPort}</strong>
              </span>
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                API: <strong className="text-slate-800">{apiPort}</strong>
              </span>
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                CoA: <strong className="text-slate-800">{coaPort}</strong>
              </span>
            </div>

            {/* Script format switch */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">Tampilan Script:</span>
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-[11px]">
                <button
                  type="button"
                  onClick={() => setFormatMode("oneline")}
                  className={`px-2 py-0.5 rounded ${
                    formatMode === "oneline" ? "bg-white font-bold text-blue-700 shadow-xs" : "text-slate-600"
                  }`}
                >
                  Satu Baris (Terminal Safe)
                </button>
                <button
                  type="button"
                  onClick={() => setFormatMode("multiline")}
                  className={`px-2 py-0.5 rounded ${
                    formatMode === "multiline" ? "bg-white font-bold text-blue-700 shadow-xs" : "text-slate-600"
                  }`}
                >
                  Multi-Baris
                </button>
              </div>
            </div>
          </div>

          {/* Action Bar Above Script */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-slate-800 uppercase tracking-wide text-[11px]">
                Copy Paste Script Berikut di Terminal MikroTik
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRegenerate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                title="Acak password dan secret baru"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Re-Generate
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-xs shadow-xs transition-all ${
                  copied
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Tersalin ke Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Script
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Generated Code Terminal Box */}
          <div className="relative rounded-xl bg-slate-900 p-4 border border-slate-800 text-emerald-400 font-mono text-[11px] leading-relaxed select-all overflow-x-auto max-h-[220px] shadow-inner">
            <pre className="whitespace-pre-wrap break-all">
              {generatedScript}
            </pre>
          </div>

          {/* Practical Guide */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-[11px] space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-slate-900">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Panduan Penerapan di MikroTik:
            </div>
            <p>
              1. Buka <strong>New Terminal</strong> di Winbox MikroTik Anda, lalu langsung tekan tombol <strong>Paste</strong> (atau klik kanan &gt; Paste).
            </p>
            <p>
              2. Pastikan port API <strong>{apiPort}</strong> di menu <code>/ip service</code> berstatus aktif untuk sinkronisasi monitoring &amp; disconnect user.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-white text-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download .rsc
          </button>

          <div className="flex items-center gap-2">
            {onApplyToForm && (
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors"
              >
                Terapkan ke Form Router NAS
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-100 text-xs transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

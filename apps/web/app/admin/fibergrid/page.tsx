"use client";

import React, { useState, useEffect } from "react";
import {
  Network,
  ExternalLink,
  MapPin,
  Layers,
  Radio,
  Server,
  Activity,
  CheckCircle2,
  Share2,
  RefreshCw,
  Compass,
  Zap,
  Globe,
  FileSpreadsheet,
} from "lucide-react";

export default function AdminFibergridPage() {
  const [tenantSlug, setTenantSlug] = useState("dev");
  const [iframeError, setIframeError] = useState(false);
  const [loadingFrame, setLoadingFrame] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      const parts = host.split(".");
      if (parts.length >= 4) {
        setTenantSlug(parts[1]);
      } else if (parts.length === 3 && parts[1] === "ispsync") {
        setTenantSlug(parts[0]);
      } else {
        setTenantSlug("dev");
      }
    }
  }, []);

  const fibergridUrl = `https://fttx.${tenantSlug}.ispsync.id`;
  const nexusUrl = `https://nexus.${tenantSlug}.ispsync.id`;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
              ENGINE 3 FTTX
            </span>
            <span className="text-xs text-slate-500 font-mono">
              fttx.{tenantSlug}.ispsync.id
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Network className="w-6 h-6 text-blue-600" />
            Peta FTTX GIS — EngineFibergrid
          </h1>
          <p className="text-sm text-slate-500">
            Pusat komando topologi geospasial jaringan fiber optik OLT, ODC, ODP, jalur kabel, dan Wholesale Jartaplok.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href={nexusUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition flex items-center gap-1.5"
          >
            <Compass className="w-3.5 h-3.5 text-blue-600" />
            <span>EngineNexus Lapangan</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          <a
            href={fibergridUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white text-xs font-bold rounded-lg transition flex items-center gap-2 shadow-sm"
          >
            <Network className="w-4 h-4" />
            <span>Buka EngineFibergrid NOC</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Feature Showcase Grid (Carrier-Grade Aesthetic) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">OLT Multi-Vendor</h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Huawei, ZTE, FiberHome, C-Data, dan VSOL via SNMP &amp; TR-069.
              </p>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Monitoring Core</span>
            <span className="font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Aktif
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Peta Topologi GIS</h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Rute kabel Backbone, Feeder, dan Distribusi tiang ke tiang.
              </p>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Format Spasial</span>
            <span className="font-bold text-cyan-700">WGS84 &amp; PostGIS</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">ODC &amp; ODP Splitter</h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Manajemen kapasitas port 1:8 / 1:16, okupansi, dan redaman OPM.
              </p>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Integrasi Port</span>
            <span className="font-bold text-indigo-700">Single Source</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Wholesale Jartaplok</h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Billing sewa port B2B, faktur pajak PPN 11%, dan PPh 23 2%.
              </p>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Mitra Jartaplok</span>
            <span className="font-bold text-amber-700">e-Bupot Ready</span>
          </div>
        </div>
      </div>

      {/* Embedded Live Frame or Launch Hero */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Browser Mockup Header */}
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
            <span className="ml-2 text-xs font-mono text-slate-400 bg-slate-800 px-3 py-1 rounded-md border border-slate-700">
              {fibergridUrl}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setLoadingFrame(true);
                setIframeError(false);
              }}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Muat ulang tampilan"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <a
              href={fibergridUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-md transition flex items-center gap-1.5"
            >
              <span>Layar Penuh</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Frame Container */}
        <div className="relative w-full h-[620px] bg-slate-950 flex flex-col items-center justify-center">
          {!iframeError ? (
            <iframe
              src={fibergridUrl}
              title="EngineFibergrid NOC GIS"
              className="w-full h-full border-0"
              onLoad={() => setLoadingFrame(false)}
              onError={() => setIframeError(true)}
            />
          ) : (
            <div className="max-w-md p-8 text-center text-white">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-4">
                <Network className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">
                EngineFibergrid NOC Command Center
              </h2>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Untuk keamanan browser, EngineFibergrid berjalan mandiri dengan sertifikat TLS terpisah. Klik tombol di bawah untuk membuka peta GIS topologi fiber optik penuh.
              </p>
              <a
                href={fibergridUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-blue-500/25"
              >
                <span>Buka {fibergridUrl}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

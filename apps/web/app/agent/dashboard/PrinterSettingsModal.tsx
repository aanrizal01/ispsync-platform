"use client";

import React, { useState, useEffect } from "react";
import {
  Printer,
  Smartphone,
  CheckCircle2,
  Sliders,
  Download,
  HelpCircle,
  X,
  Play,
  FileText,
} from "lucide-react";
import {
  ThermalPrinterSettings,
  ThermalPrinterService,
  DEFAULT_PRINTER_SETTINGS,
} from "@/lib/thermal-printer";
import { cn } from "@/lib/utils";

interface PrinterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrinterSettingsModal({ isOpen, onClose }: PrinterSettingsModalProps) {
  const [settings, setSettings] = useState<ThermalPrinterSettings>(DEFAULT_PRINTER_SETTINGS);
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSettings(ThermalPrinterService.getSettings());
      setIsNativeApp(ThermalPrinterService.isNativeAndroid());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    ThermalPrinterService.saveSettings(settings);
    setTestResult("Pengaturan printer berhasil disimpan!");
    setTimeout(() => {
      setTestResult(null);
      onClose();
    }, 1200);
  };

  const handleTestPrint = async () => {
    const dummyTicket = {
      code: "DEMO-8899",
      password: "123",
      template_name: "PAKET 24 JAM UNLIMITED",
      price: 5000,
      duration_text: "24 Jam",
      quota_text: "Tanpa Kuota",
      agent_name: "Mitra Resmi ISPSYNC",
      created_at: new Date().toLocaleString("id-ID"),
    };

    const res = await ThermalPrinterService.printTickets([dummyTicket], settings);
    setTestResult(res.message);
    setTimeout(() => setTestResult(null), 4000);
  };

  return (
    <div 
      className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Pengaturan Printer Thermal
              </h3>
              <p className="text-xs text-slate-500">
                Konfigurasi printer Bluetooth portabel (58mm / 80mm)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            title="Tutup"
          >
            <X className="w-4 h-4" />
            <span>Tutup</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">

        {testResult && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{testResult}</span>
          </div>
        )}

        {/* Status Mode App */}
        {isNativeApp ? (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-800">
            <Smartphone className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold block">Aplikasi Android GOGIGA Aktif!</span>
              <span>Printer terhubung langsung via Bluetooth Native SPP (ESC/POS).</span>
            </div>
          </div>
        ) : (
          <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs text-blue-900">
            <HelpCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <span className="font-bold block">Menggunakan Browser Smartphone:</span>
              <p className="text-[11.5px] leading-relaxed text-blue-800">
                Browser web di Android tidak dapat terhubung langsung ke printer Bluetooth biasa. Agar bisa cetak thermal langsung tanpa dialog printer yang terpotong, Anda dapat menggunakan:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href="/downloads/gogiga-agent.apk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download APK GOGIGA Agent</span>
                </a>
                <a
                  href="https://play.google.com/store/apps/details?id=ru.a402d.rawbt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
                >
                  <span>Install RawBT Driver (PlayStore)</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Form Setelan */}
        <div className="space-y-4 text-xs">
          {/* Pilihan Metode Cetak */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Metode Cetak Thermal
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSettings({ ...settings, printMode: "rawbt" })}
                className={cn(
                  "p-3 rounded-2xl border text-left transition-all",
                  settings.printMode === "rawbt"
                    ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20"
                    : "border-slate-200 hover:bg-slate-50"
                )}
              >
                <div className="font-bold text-slate-900 flex items-center justify-between">
                  <span>RawBT / App Native</span>
                  {settings.printMode === "rawbt" && (
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <p className="text-[10.5px] text-slate-500 mt-1 leading-snug">
                  Cetak langsung ke Bluetooth via ESC/POS (Rekomendasi konter)
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSettings({ ...settings, printMode: "browser" })}
                className={cn(
                  "p-3 rounded-2xl border text-left transition-all",
                  settings.printMode === "browser"
                    ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20"
                    : "border-slate-200 hover:bg-slate-50"
                )}
              >
                <div className="font-bold text-slate-900 flex items-center justify-between">
                  <span>Browser Print</span>
                  {settings.printMode === "browser" && (
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <p className="text-[10.5px] text-slate-500 mt-1 leading-snug">
                  Dialog cetak bawaan Google Chrome / Android Spooler
                </p>
              </button>
            </div>
          </div>

          {/* Pilihan Ukuran Kertas */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Ukuran Lebar Kertas Thermal
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSettings({ ...settings, paperSize: "58mm" })}
                className={cn(
                  "py-2.5 px-3 rounded-xl border text-center font-bold transition-all",
                  settings.paperSize === "58mm"
                    ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                )}
              >
                58 mm (32 Kolom)
              </button>

              <button
                type="button"
                onClick={() => setSettings({ ...settings, paperSize: "80mm" })}
                className={cn(
                  "py-2.5 px-3 rounded-xl border text-center font-bold transition-all",
                  settings.paperSize === "80mm"
                    ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                )}
              >
                80 mm (48 Kolom)
              </button>
            </div>
          </div>

          {/* Header Toko / Nama Hotspot */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Judul Header Struk
            </label>
            <input
              type="text"
              value={settings.headerTitle}
              onChange={(e) => setSettings({ ...settings, headerTitle: e.target.value })}
              placeholder="Contoh: GOGIGA HOTSPOT / NAMA TOKO"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-slate-900 font-semibold"
            />
          </div>

          {/* Footer Text */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Pesan Footer Struk
            </label>
            <input
              type="text"
              value={settings.footerText}
              onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
              placeholder="Contoh: Terima kasih / CS: 0812xxxx"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-slate-900"
            />
          </div>

          {/* Feed Spacing */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Spasi Akhir Kertas (Feed Lines): {settings.feedLines} baris
            </label>
            <input
              type="range"
              min={1}
              max={6}
              value={settings.feedLines}
              onChange={(e) =>
                setSettings({ ...settings, feedLines: Number(e.target.value) })
              }
              className="w-full cursor-pointer accent-blue-600"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons (Sticky Footer) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleTestPrint}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors active:scale-95 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-blue-600" />
            <span>Tes Cetak Struk</span>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 border border-slate-300 rounded-xl text-slate-600 text-xs font-semibold text-center hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal / Tutup
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-initial px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 text-center cursor-pointer"
            >
              Simpan Pengaturan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

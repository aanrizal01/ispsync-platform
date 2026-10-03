"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Printer, X, FileSpreadsheet, Calendar, User, TrendingUp } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import type { Agent, AgentMutation } from "@/lib/api/agents";
import type { CompanyPksProfile } from "./AgentPksModal";

interface AgentLedgerPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyProfile: CompanyPksProfile;
  selectedAgent: Agent | null;
  mutations: AgentMutation[];
  startDate?: string;
  endDate?: string;
  mutationType?: string;
  totalMutations?: number;
}

export default function AgentLedgerPrintModal({
  isOpen,
  onClose,
  companyProfile,
  selectedAgent,
  mutations,
  startDate,
  endDate,
  mutationType,
  totalMutations,
}: AgentLedgerPrintModalProps) {
  const [mounted, setMounted] = useState(false);
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const now = new Date();
  const printDateStr = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const printTimeStr = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPeriod = () => {
    if (startDate && endDate) {
      if (startDate === endDate) return `Tanggal: ${startDate}`;
      return `Periode: ${startDate} s/d ${endDate}`;
    }
    if (startDate) return `Mulai Tanggal: ${startDate}`;
    if (endDate) return `Sampai Tanggal: ${endDate}`;
    return "Seluruh Periode Pembukuan (Kumulatif)";
  };

  // Financial summary calculation
  let totalCredit = 0;
  let totalDebit = 0;

  mutations.forEach((m) => {
    if (m.amount > 0) {
      totalCredit += m.amount;
    } else {
      totalDebit += Math.abs(m.amount);
    }
  });

  const netCashflow = totalCredit - totalDebit;

  const getTypeName = (type: string) => {
    switch (type) {
      case "WITHDRAWAL":
        return "Tarik Saldo";
      case "TOPUP_MANUAL":
        return "Top-Up Manual";
      case "TOPUP_BANK_TRANSFER":
        return "Transfer Bank";
      case "VOUCHER_OFFLINE_BUY":
        return "Modal Voucher";
      case "VOUCHER_ONLINE_COMMISSION":
        return "Komisi Promo";
      case "INVOICE_PAYMENT_AGENT":
        return "Bayar Tagihan";
      default:
        return type || "Mutasi Kas";
    }
  };

  const logoUrl = companyProfile.logoUrl || "/web/dev_logo.svg";

  return createPortal(
    <div
      id="agent-ledger-modal-portal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto print:overflow-visible print:backdrop-blur-none"
    >
      <style jsx global>{`
        @media print {
          @page {
            size: ${orientation === "landscape" ? "A4 landscape" : "A4 portrait"};
            margin: 8mm 10mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 100% !important;
            overflow: visible !important;
          }
          body * {
            visibility: hidden !important;
          }
          #agent-ledger-printable, #agent-ledger-printable * {
            visibility: visible !important;
          }
          #agent-ledger-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .ledger-print-hidden {
            display: none !important;
          }
          nav, aside, header, footer {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-5xl w-full my-6 max-h-[92vh] flex flex-col overflow-hidden print:max-h-none print:shadow-none print:rounded-none print:border-none print:w-full print:m-0 print:overflow-visible">
        {/* Action Header Bar (Hidden in Print) */}
        <div className="p-4 sm:px-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 shrink-0 ledger-print-hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Buku Besar &amp; Laporan Mutasi Kas Saldo Agen
              </h3>
              <p className="text-xs text-slate-500">
                {selectedAgent ? (
                  <span>Agen: <b>{selectedAgent.name}</b> ({selectedAgent.code})</span>
                ) : (
                  <span>Seluruh Agen Mitra Resmi &bull; Rekapitulasi Pembukuan</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setOrientation("landscape")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  orientation === "landscape"
                    ? "bg-blue-600 text-white font-bold shadow-xs"
                    : "text-slate-700 hover:text-slate-900"
                }`}
              >
                Landscape
              </button>
              <button
                type="button"
                onClick={() => setOrientation("portrait")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  orientation === "portrait"
                    ? "bg-blue-600 text-white font-bold shadow-xs"
                    : "text-slate-700 hover:text-slate-900"
                }`}
              >
                Portrait
              </button>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-cyan-400" />
              <span>Cetak / Print PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 font-sans text-slate-900 print:p-0 print:overflow-visible">
          <div id="agent-ledger-printable" className="max-w-4xl mx-auto space-y-4">
            {/* Kop Surat Resmi ISP */}
            <div className="text-center pb-3 border-b-4 border-double border-slate-900">
              <div className="flex flex-col items-center justify-center mb-1">
                <img
                  src={logoUrl}
                  alt={companyProfile.brandName || "Logo"}
                  className="h-10 sm:h-11 w-auto max-w-[220px] object-contain mb-1"
                  onError={(e: any) => {
                    e.currentTarget.src = "/logo.png";
                  }}
                />
                <h1 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-950 font-serif">
                  {companyProfile.companyName}
                </h1>
              </div>

              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-700">
                Penyelenggara Jasa Akses Internet (Internet Service Provider)
              </p>
              <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                NIB: {companyProfile.nib || "0220208123456"} &bull; SKLO Kominfo RI: {companyProfile.sklo || "No. 128/TEL.04.02/KOMINFO"}
              </p>
              <p className="text-[10px] text-slate-600 mt-0.5">
                Kantor: {companyProfile.address} &bull; Telp/WA: {companyProfile.phone} &bull; Email: {companyProfile.emailSupport}
              </p>
            </div>

            {/* Judul Dokumen Pembukuan */}
            <div className="text-center py-1">
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wide text-slate-950 font-serif">
                BUKU BESAR &amp; LAPORAN MUTASI KAS SALDO AGEN
              </h2>
              <div className="flex items-center justify-center gap-3 text-xs text-slate-600 font-medium mt-1">
                <span className="flex items-center gap-1 font-semibold text-slate-800">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  {formatPeriod()}
                </span>
                <span>&bull;</span>
                <span>Waktu Cetak: {printDateStr}, {printTimeStr} WIB</span>
              </div>
            </div>

            {/* Scope / Filter Info Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-[10.5px] uppercase font-semibold text-slate-500 block">Ruang Lingkup / Agen</span>
                <span className="font-bold text-slate-900 mt-0.5 block">
                  {selectedAgent ? `${selectedAgent.name} (${selectedAgent.code})` : "Semua Agen Mitra Resmi"}
                </span>
                {selectedAgent?.company_name && (
                  <span className="text-[11px] text-slate-500 block">Gerai: {selectedAgent.company_name}</span>
                )}
              </div>

              <div>
                <span className="text-[10.5px] uppercase font-semibold text-slate-500 block">Filter Transaksi</span>
                <span className="font-bold text-slate-900 mt-0.5 block">
                  {mutationType ? getTypeName(mutationType) : "Semua Tipe Transaksi"}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Jumlah Baris: {mutations.length} {totalMutations && totalMutations > mutations.length ? `(dari ${totalMutations})` : ""}
                </span>
              </div>

              <div>
                <span className="text-[10.5px] uppercase font-semibold text-slate-500 block">Status Saldo Saat Ini</span>
                <span className="font-bold text-emerald-700 text-sm mt-0.5 block font-mono">
                  {selectedAgent ? formatRupiah(selectedAgent.balance) : "Konsolidasi Saldo Kas"}
                </span>
              </div>
            </div>

            {/* Ringkasan Finansial Periode Terpilih */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-800 block">
                  Total Kas Masuk (Kredit)
                </span>
                <div className="text-base font-black text-emerald-700 font-mono mt-0.5">
                  +{formatRupiah(totalCredit)}
                </div>
                <span className="text-[10px] text-emerald-600">Top-up, komisi promo &amp; penyesuaian</span>
              </div>

              <div className="p-2.5 rounded-xl border border-rose-200 bg-rose-50/50">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-rose-800 block">
                  Total Kas Keluar (Debit)
                </span>
                <div className="text-base font-black text-rose-700 font-mono mt-0.5">
                  -{formatRupiah(totalDebit)}
                </div>
                <span className="text-[10px] text-rose-600">Pencairan saldo &amp; modal voucher</span>
              </div>

              <div className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/50">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-blue-800 block">
                  Arus Kas Bersih (Net)
                </span>
                <div className={`text-base font-black font-mono mt-0.5 ${netCashflow >= 0 ? "text-blue-700" : "text-rose-700"}`}>
                  {netCashflow >= 0 ? "+" : ""}{formatRupiah(netCashflow)}
                </div>
                <span className="text-[10px] text-blue-600">Selisih mutasi pada periode ini</span>
              </div>
            </div>

            {/* Tabel Buku Besar */}
            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold uppercase tracking-wider text-[10.5px]">
                  <tr>
                    <th className="py-2 px-2.5 text-center w-8">No</th>
                    <th className="py-2 px-3 whitespace-nowrap">Waktu</th>
                    <th className="py-2 px-3">Mitra Agen</th>
                    <th className="py-2 px-3">Jenis Transaksi</th>
                    <th className="py-2 px-3">Keterangan &amp; Ref</th>
                    <th className="py-2 px-3 text-right">Debit (Keluar)</th>
                    <th className="py-2 px-3 text-right">Kredit (Masuk)</th>
                    <th className="py-2 px-3 text-right whitespace-nowrap">Saldo Akhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[11px]">
                  {mutations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                        Tidak ada transaksi mutasi kas saldo pada kriteria periode ini.
                      </td>
                    </tr>
                  ) : (
                    mutations.map((m, idx) => {
                      const isCredit = m.amount > 0;
                      return (
                        <tr key={m.id || idx} className="hover:bg-slate-50">
                          <td className="py-2 px-2.5 text-center text-slate-500 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">
                            {formatDate(m.created_at)}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-900">
                            <div>{m.agent_name || "Agen"}</div>
                            {m.agent_code && (
                              <div className="text-[9.5px] font-mono text-slate-400">{m.agent_code}</div>
                            )}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap font-medium text-slate-700">
                            {getTypeName(m.mutation_type)}
                          </td>
                          <td className="py-2 px-3 text-slate-600 max-w-xs">
                            <div className="line-clamp-2">{m.description || "-"}</div>
                            {m.reference_id && (
                              <div className="text-[9.5px] font-mono text-slate-400">Ref: {m.reference_id}</div>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                            {!isCredit ? formatRupiah(Math.abs(m.amount)) : "-"}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                            {isCredit ? `+${formatRupiah(m.amount)}` : "-"}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {formatRupiah(m.balance_after)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {/* Total Row */}
                {mutations.length > 0 && (
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-[11px]">
                    <tr>
                      <td colSpan={5} className="py-2 px-3 text-right uppercase tracking-wider text-slate-800">
                        Total Mutasi Periode Ini:
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-rose-700 whitespace-nowrap">
                        {formatRupiah(totalDebit)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-700 whitespace-nowrap">
                        +{formatRupiah(totalCredit)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-900 whitespace-nowrap">
                        {netCashflow >= 0 ? "+" : ""}{formatRupiah(netCashflow)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Kolom Pengesahan Tanda Tangan */}
            <div className="pt-6 grid grid-cols-2 text-center text-xs text-slate-800 break-inside-avoid">
              <div>
                <p className="text-slate-500">Dibuat &amp; Diperiksa Oleh,</p>
                <p className="font-semibold text-slate-700 mt-0.5">Bagian Keuangan / Finance</p>
                <div className="h-16 flex items-end justify-center">
                  <span className="font-bold underline tracking-wide">
                    ( .................................................... )
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Staf Administrasi Kasir</p>
              </div>

              <div>
                <p className="text-slate-500">Mengetahui &amp; Menyetujui,</p>
                <p className="font-semibold text-slate-700 mt-0.5">{companyProfile.companyName}</p>
                <div className="h-16 flex items-end justify-center">
                  <span className="font-bold underline tracking-wide">
                    ( .................................................... )
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Direktur / Operational Manager</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

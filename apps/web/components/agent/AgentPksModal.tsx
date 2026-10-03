"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, X, FileText, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AgentPksData {
  id: string;
  code: string;
  name: string;
  company_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  id_card_number?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
  offline_cashback_pct?: number;
  online_cashback_pct?: number;
  online_discount_pct?: number;
  created_at?: string;
}

export interface CompanyPksProfile {
  companyName: string;
  brandName: string;
  npwp: string;
  address: string;
  phone: string;
  emailSupport: string;
  logoUrl?: string;
}

interface AgentPksModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: AgentPksData | null;
  companyProfile: CompanyPksProfile;
}

export default function AgentPksModal({
  isOpen,
  onClose,
  agent,
  companyProfile,
}: AgentPksModalProps) {
  const [mounted, setMounted] = useState(false);
  const [paperFormat, setPaperFormat] = useState<"legal" | "f4" | "a4-compact" | "a4">("legal");

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

  if (!mounted || !isOpen || !agent) return null;

  const agreementDate = agent.created_at ? new Date(agent.created_at) : new Date();
  const formattedDate = agreementDate.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const agreementYear = agreementDate.getFullYear();
  const regNumber = `PKS/ISP/AGN/${agreementYear}/${agent.code}`;
  const logoUrl = companyProfile.logoUrl || "/web/dev_logo.svg";

  return createPortal(
    <div
      id="agent-pks-portal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto print:overflow-visible print:backdrop-blur-none"
    >
      <style jsx global>{`
        @media print {
          @page {
            size: ${
              paperFormat === "legal"
                ? "legal portrait"
                : paperFormat === "f4"
                ? "215mm 330mm portrait"
                : "A4 portrait"
            };
            margin: ${
              paperFormat === "legal"
                ? "8mm 14mm 8mm 14mm"
                : paperFormat === "f4"
                ? "8mm 13mm 8mm 13mm"
                : paperFormat === "a4-compact"
                ? "6mm 10mm 6mm 10mm"
                : "12mm 16mm 12mm 16mm"
            };
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 100% !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Hide all application UI except this modal portal */
          body > *:not(#agent-pks-portal) {
            display: none !important;
          }
          #agent-pks-portal {
            display: block !important;
            position: static !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: transparent !important;
            overflow: visible !important;
          }
          #agent-pks-card {
            display: block !important;
            position: static !important;
            width: 100% !important;
            max-width: none !important;
            max-height: none !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: transparent !important;
            overflow: visible !important;
          }
          #agent-pks-printable {
            display: block !important;
            width: 100% !important;
            max-height: none !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          /* Single Page Optimizations (Legal, F4, A4-Compact) */
          .pks-legal-mode {
            font-size: 11.2px !important;
            line-height: 1.48 !important;
          }
          .pks-legal-mode .pks-header {
            margin-bottom: 0.75rem !important;
          }
          .pks-legal-mode .pks-parties {
            margin-bottom: 0.75rem !important;
          }
          .pks-legal-mode .pks-pasal-block {
            margin-bottom: 0.45rem !important;
          }
          .pks-legal-mode .pks-signatures {
            margin-top: 1rem !important;
            padding-top: 0.6rem !important;
          }

          .pks-f4-mode {
            font-size: 10.4px !important;
            line-height: 1.4 !important;
          }
          .pks-f4-mode .pks-header {
            margin-bottom: 0.65rem !important;
          }
          .pks-f4-mode .pks-parties {
            margin-bottom: 0.65rem !important;
          }
          .pks-f4-mode .pks-pasal-block {
            margin-bottom: 0.4rem !important;
          }
          .pks-f4-mode .pks-signatures {
            margin-top: 0.85rem !important;
            padding-top: 0.5rem !important;
          }

          .pks-compact-mode {
            font-size: 9.8px !important;
            line-height: 1.34 !important;
          }
          .pks-compact-mode .pks-header {
            margin-bottom: 0.5rem !important;
          }
          .pks-compact-mode .pks-parties {
            margin-bottom: 0.5rem !important;
          }
          .pks-compact-mode .pks-pasal-block {
            margin-bottom: 0.35rem !important;
          }
          .pks-compact-mode .pks-signatures {
            margin-top: 0.75rem !important;
            padding-top: 0.45rem !important;
          }

          .pks-header {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .pks-parties {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .pks-pasal-block {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .pks-signatures {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          nav, aside, header, footer {
            display: none !important;
          }
        }
      `}</style>

      <div
        id="agent-pks-card"
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full my-6 max-h-[92vh] flex flex-col overflow-hidden print:max-h-none print:shadow-none print:rounded-none print:border-none print:w-full print:m-0 print:overflow-visible"
      >
        {/* Modal Action Header (Hidden in Print) */}
        <div className="p-4 sm:px-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Surat Perjanjian Kerja Sama (PKS) Kemitraan Agen Resmi
              </h3>
              <p className="text-xs text-slate-500">
                Mitra: <span className="font-semibold text-slate-800">{agent.name}</span> ({agent.code}) &bull; Siap Cetak
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Paper Size Format Selector */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPaperFormat("legal")}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1",
                  paperFormat === "legal"
                    ? "bg-purple-600 text-white font-bold shadow-xs"
                    : "text-slate-700 hover:text-slate-900"
                )}
                title="Kertas Legal (8.5 x 14 in / 216 x 356 mm) — Pas 1 Lembar Penuh"
              >
                <span>Legal (1 Lembar)</span>
              </button>
              <button
                type="button"
                onClick={() => setPaperFormat("f4")}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1",
                  paperFormat === "f4"
                    ? "bg-purple-600 text-white font-bold shadow-xs"
                    : "text-slate-700 hover:text-slate-900"
                )}
                title="Kertas Folio / F4 HVS (215 x 330 mm) — Pas 1 Lembar"
              >
                <span>F4 / Folio</span>
              </button>
              <button
                type="button"
                onClick={() => setPaperFormat("a4-compact")}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1",
                  paperFormat === "a4-compact"
                    ? "bg-purple-600 text-white font-bold shadow-xs"
                    : "text-slate-700 hover:text-slate-900"
                )}
                title="Kertas A4 Ringkas (210 x 297 mm) — Pas 1 Lembar"
              >
                <span>A4 (1 Lembar)</span>
              </button>
              <button
                type="button"
                onClick={() => setPaperFormat("a4")}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1",
                  paperFormat === "a4"
                    ? "bg-purple-600 text-white font-bold shadow-xs"
                    : "text-slate-700 hover:text-slate-900"
                )}
                title="Kertas A4 Standar (2 Lembar Bersusun)"
              >
                <span>A4 (2 Lembar)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Body (Printable) */}
        <div
          id="agent-pks-printable"
          className={cn(
            "p-8 sm:p-12 overflow-y-auto font-sans text-slate-900 leading-relaxed print:p-0 print:overflow-visible print:m-0 print:text-black",
            paperFormat === "legal" && "pks-legal-mode text-xs",
            paperFormat === "f4" && "pks-f4-mode text-xs",
            paperFormat === "a4-compact" && "pks-compact-mode text-[11px]",
            paperFormat === "a4" && "text-xs sm:text-sm"
          )}
        >
          {/* Header Block (Kop + Judul) - Kept together so it never splits across pages */}
          <div className="pks-header">
            {/* Kop Surat Resmi */}
            <div className="text-center pb-3 border-b-4 border-double border-slate-900 mb-5">
              {/* Logo Perusahaan */}
              <div className="flex flex-col items-center justify-center mb-1.5">
                <img
                  src={logoUrl}
                  alt={companyProfile.brandName || "Logo"}
                  className="h-11 sm:h-12 w-auto max-w-[260px] object-contain mb-1"
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
                NPWP: {companyProfile.npwp}
              </p>
              <p className="text-[10px] text-slate-600 mt-0.5">
                Kantor: {companyProfile.address} &bull; Telp/WA: {companyProfile.phone} &bull; Email: {companyProfile.emailSupport}
              </p>
            </div>

            {/* Judul & Nomor Surat */}
            <div className="text-center mb-4">
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wide underline underline-offset-4 text-slate-950 font-serif">
                SURAT PERJANJIAN KERJA SAMA (PKS) KEMITRAAN AGEN RESMI
              </h2>
              <p className="text-xs font-mono font-bold text-slate-700 mt-1">
                Nomor Registrasi: {regNumber}
              </p>
            </div>
          </div>

          {/* Pembukaan & Para Pihak */}
          <div className="pks-parties space-y-2.5 mb-5 text-justify leading-relaxed">
            <p>
              Pada hari ini, tanggal <strong>{formattedDate}</strong>, telah dibuat dan ditandatangani Perjanjian Kerja Sama Kemitraan Distribusi Layanan Internet, Voucher Hotspot, WiFi Roaming Passpoint, dan Loket Pembayaran Tagihan (selanjutnya disebut <strong>&quot;Perjanjian&quot;</strong>), oleh dan antara:
            </p>

            <div className="pl-4 border-l-2 border-slate-300 space-y-1.5 py-1">
              <p>
                <strong>1. {companyProfile.companyName}</strong>, sebuah perseroan terbatas berizin resmi penyelenggara jasa internet ISP, beralamat kantor di {companyProfile.address}, dalam hal ini bertindak untuk dan atas nama perseroan (selanjutnya disebut sebagai <strong>&quot;PIHAK PERTAMA&quot;</strong>).
              </p>
              <p>
                <strong>2. {agent.name}</strong>, pemilik / penanggung jawab operasional gerai <strong>{agent.company_name || agent.name}</strong>, beralamat kontak {agent.phone || "-"}, nomor rekening penampungan <strong>{agent.bank_name || "BCA"} {agent.bank_account_number || "-"}</strong> a/n {agent.bank_account_holder || agent.name} (selanjutnya disebut sebagai <strong>&quot;PIHAK KEDUA&quot;</strong>).
              </p>
            </div>

            <p>
              PARA PIHAK sepakat untuk saling mengikatkan diri dalam Perjanjian Kemitraan Keagenan ini dengan syarat dan ketentuan sebagai berikut:
            </p>
          </div>

          {/* Pasal-Pasal */}
          <div className="space-y-3.5 text-justify">
            <div className="pks-pasal-block">
              <h4 className="font-bold text-slate-950 font-serif text-xs sm:text-sm">PASAL 1 — DASAR KEMITRAAN &amp; LEGALITAS</h4>
              <p className="text-[11px] sm:text-xs text-slate-700 mt-0.5 leading-relaxed">
                1. PIHAK PERTAMA adalah Badan Hukum Penyelenggara Jasa Internet (ISP) berizin resmi dari Kementerian Komunikasi dan Informatika RI.<br />
                2. PIHAK KEDUA bertindak semata-mata sebagai <strong>Mitra Saluran Distribusi Resmi (Channel Partner)</strong> bagi produk PIHAK PERTAMA, dan hubungan ini merupakan kemitraan bisnis keagenan, bukan ketenagakerjaan/karyawan, serta bukan pengalihan izin telekomunikasi.
              </p>
            </div>

            <div className="pks-pasal-block">
              <h4 className="font-bold text-slate-950 font-serif text-xs sm:text-sm">PASAL 2 — RUANG LINGKUP LAYANAN</h4>
              <p className="text-[11px] sm:text-xs text-slate-700 mt-0.5 leading-relaxed">
                PIHAK KEDUA ditunjuk sah untuk melayani: (a) Penjualan kode voucher Hotspot WiFi digital/fisik; (b) Penyaluran dan aktivasi paket WiFi Roaming Passpoint (Hotspot 2.0); (c) Penerimaan setoran loket pembayaran tagihan bulanan pelanggan resmi PIHAK PERTAMA.
              </p>
            </div>

            <div className="pks-pasal-block">
              <h4 className="font-bold text-slate-950 font-serif text-xs sm:text-sm">PASAL 3 — HAK &amp; KEWAJIBAN PARA PIHAK</h4>
              <p className="text-[11px] sm:text-xs text-slate-700 mt-0.5 leading-relaxed">
                1. PIHAK PERTAMA berkewajiban menyediakan aplikasi loket agen yang stabil, pasokan voucher, dan menyetorkan PPN resmi ke kas negara.<br />
                2. PIHAK KEDUA berhak atas bagi hasil/komisi resmi, dan berkewajiban menjual produk sesuai tarif HET resmi serta menerbitkan struk/bukti bayar sah kepada pelanggan akhir.
              </p>
            </div>

            <div className="pks-pasal-block">
              <h4 className="font-bold text-slate-950 font-serif text-xs sm:text-sm">PASAL 4 — LARANGAN KERAS &amp; INTEGRITAS (ANTI RT/RW NET ILEGAL)</h4>
              <p className="text-[11px] sm:text-xs text-slate-700 mt-0.5 leading-relaxed">
                PIHAK KEDUA <strong>dilarang keras</strong>: (a) Menjual kembali bandwidth mentah secara ilegal, menarik kabel LAN/FO ke tetangga di luar izin resmi, atau menyelenggarakan RT/RW Net ilegal; (b) Memodifikasi konfigurasi perangkat Access Point/ONT; (c) Mengenakan pungutan biaya liar di luar tarif resmi. Pelanggaran mengakibatkan pemutusan kerja sama seketika dan penerusan ke ranah hukum UU Telekomunikasi No. 36/1999.
              </p>
            </div>

            <div className="pks-pasal-block">
              <h4 className="font-bold text-slate-950 font-serif text-xs sm:text-sm">PASAL 5 — SKEMA KOMISI &amp; KETENTUAN PERPAJAKAN</h4>
              <p className="text-[11px] sm:text-xs text-slate-700 mt-0.5 leading-relaxed">
                1. <strong>Komisi Voucher Offline / Grosir:</strong> Cashback sebesar <strong>{agent.offline_cashback_pct ?? 15}%</strong>.<br />
                2. <strong>Komisi Transaksi Online / Kode Promo:</strong> Komisi sebesar <strong>{agent.online_cashback_pct ?? 10}%</strong> (Diskon pelanggan: {agent.online_discount_pct ?? 10}%).<br />
                3. <strong>Pajak (PMK No. 6/PMK.03/2021):</strong> Nilai jual paket sudah mencakup PPN 11% yang disetorkan langsung oleh PIHAK PERTAMA ke kas negara, di mana Dasar Pengenaan Pajak (DPP) dihitung dari harga bersih setelah diskon resmi (<em>final price / 1.11</em>).
              </p>
            </div>

            <div className="pks-pasal-block">
              <h4 className="font-bold text-slate-950 font-serif text-xs sm:text-sm">PASAL 6 — MASA BERLAKU &amp; PENYELESAIAN PERSELISIHAN</h4>
              <p className="text-[11px] sm:text-xs text-slate-700 mt-0.5 leading-relaxed">
                Perjanjian ini berlaku selama 1 (satu) tahun sejak ditandatangani. Segala perselisihan diselesaikan secara musyawarah mufakat, dan apabila tidak tercapai mufakat, PARA PIHAK sepakat memilih domisili hukum di Pengadilan Negeri setempat.
              </p>
            </div>
          </div>

          {/* Tanda Tangan */}
          <div className="pks-signatures grid grid-cols-2 gap-8 pt-6 mt-6 border-t border-slate-200">
            <div className="text-center">
              <p className="font-bold text-slate-900 text-xs sm:text-sm">PIHAK PERTAMA</p>
              <p className="text-[11px] text-slate-600">{companyProfile.companyName}</p>
              <div className="h-16 sm:h-20 flex items-center justify-center my-1 text-slate-400 text-[10px] italic border border-dashed border-slate-300 rounded-lg max-w-[180px] mx-auto bg-slate-50">
                [ Meterai Rp 10.000 &amp; Cap ]
              </div>
              <p className="font-bold text-slate-900 underline text-xs mt-1">Pimpinan Perusahaan</p>
              <p className="text-[10px] text-slate-500">Direktur / Authorized Representative</p>
            </div>

            <div className="text-center">
              <p className="font-bold text-slate-900 text-xs sm:text-sm">PIHAK KEDUA</p>
              <p className="text-[11px] text-slate-600">Mitra Agen / Pengelola Gerai</p>
              <div className="h-16 sm:h-20 flex items-center justify-center my-1 text-slate-400 text-[10px] italic border border-dashed border-slate-300 rounded-lg max-w-[180px] mx-auto bg-slate-50">
                [ Tanda Tangan Mitra ]
              </div>
              <p className="font-bold text-slate-900 underline text-xs mt-1">{agent.name}</p>
              <p className="text-[10px] text-slate-500">Pemilik / Penanggung Jawab Gerai</p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

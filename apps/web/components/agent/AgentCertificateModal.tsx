"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Printer, X, Award, ShieldCheck, CheckCircle2 } from "lucide-react";

export interface AgentCertificateData {
  id: string;
  code: string;
  name: string;
  company_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  id_card_number?: string;
  created_at?: string;
}

export interface CompanyCertificateProfile {
  companyName: string;
  brandName: string;
  npwp?: string;
  nib?: string;
  sklo?: string;
  address: string;
  phone: string;
  emailSupport: string;
  logoUrl?: string;
}

interface AgentCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: AgentCertificateData | null;
  companyProfile: CompanyCertificateProfile;
}

export default function AgentCertificateModal({
  isOpen,
  onClose,
  agent,
  companyProfile,
}: AgentCertificateModalProps) {
  const [mounted, setMounted] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

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

  const issueDate = agent.created_at ? new Date(agent.created_at) : new Date();
  const validUntil = new Date(issueDate);
  validUntil.setFullYear(validUntil.getFullYear() + 1);

  const formattedIssueDate = issueDate.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formattedValidUntil = validUntil.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const certificateNumber = `CERT/ISP/AGN/${issueDate.getFullYear()}/${agent.code}`;
  const verifyUrl = typeof window !== "undefined"
    ? `${window.location.origin}/agent/login?verify=${encodeURIComponent(agent.code)}`
    : `https://ispsync.id/agent/verify?code=${encodeURIComponent(agent.code)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&data=${encodeURIComponent(verifyUrl)}`;

  const logoUrl = companyProfile.logoUrl || "/web/dev_logo.svg";

  return createPortal(
    <div id="agent-certificate-portal" className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
          html, body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body > *:not(#agent-certificate-portal) {
            display: none !important;
          }
          #agent-certificate-portal {
            display: block !important;
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          nav, aside, header, footer {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:rounded-none print:border-none print:w-full print:m-0">
        {/* Modal Controls Bar (Hidden on print) */}
        <div className="p-4 sm:px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Award className="w-4 h-4 text-amber-600" />
            <span className="font-bold text-slate-900">Sertifikat Resmi Kemitraan Agen (Format Cetak A4 Landscape)</span>
            <span className="hidden sm:inline text-slate-400">&bull; {agent.name} ({agent.code})</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 via-amber-700 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
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

        {/* Certificate Canvas (Landscape Printable) */}
        <div
          ref={printAreaRef}
          className="p-4 sm:p-8 overflow-y-auto flex items-center justify-center bg-slate-100/60 print:p-0 print:bg-white print:overflow-visible"
        >
          {/* Certificate Border Container */}
          <div className="w-full max-w-[280mm] min-h-[190mm] bg-white border-[10px] border-double border-slate-900 p-6 sm:p-10 relative flex flex-col justify-between shadow-lg print:shadow-none print:border-[8px] print:m-0 print:w-full print:min-h-0">
            {/* Inner Gold Filigree Accent Frame */}
            <div className="absolute inset-2 border border-amber-600/40 pointer-events-none rounded-sm" />
            <div className="absolute inset-2.5 border border-dashed border-amber-500/30 pointer-events-none" />

            {/* Corner Decorative Ornaments */}
            <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-amber-600 pointer-events-none" />
            <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-amber-600 pointer-events-none" />
            <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-amber-600 pointer-events-none" />
            <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-amber-600 pointer-events-none" />

            {/* Faint Background Watermark Seal */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
              <Award className="w-[380px] h-[380px] text-slate-900" />
            </div>

            {/* Header Section */}
            <div className="text-center relative z-10">
              <div className="flex items-center justify-center mb-1.5">
                <img
                  src={logoUrl}
                  alt={companyProfile.brandName || "Logo"}
                  className="h-10 sm:h-12 w-auto max-w-[240px] object-contain"
                  onError={(e: any) => {
                    e.currentTarget.src = "/logo.png";
                  }}
                />
              </div>
              <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-slate-800 font-serif">
                {companyProfile.companyName}
              </h2>
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Penyelenggara Jasa Akses Internet (Internet Service Provider) Berizin Resmi
              </p>
              <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                NIB: {companyProfile.nib || "0220208123456"} &bull; SKLO Kominfo RI: {companyProfile.sklo || "No. 128/TEL.04.02/KOMINFO"}
              </p>

              {/* Title Lockup */}
              <div className="mt-4 pt-3 border-t border-slate-300/80 max-w-xl mx-auto">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black uppercase tracking-wider text-slate-950 font-serif leading-tight">
                  SERTIFIKAT KEMITRAAN AGEN RESMI
                </h1>
                <p className="text-[10px] sm:text-xs font-serif italic text-amber-800 tracking-wide mt-0.5">
                  Certificate of Authorized Channel Partnership
                </p>
                <div className="inline-block mt-1 px-3 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[10px] sm:text-xs font-bold text-slate-800">
                  {certificateNumber}
                </div>
              </div>
            </div>

            {/* Recipient Body Section */}
            <div className="text-center my-4 relative z-10 space-y-2">
              <p className="text-xs sm:text-sm text-slate-600 font-serif italic">
                Dengan bangga menyatakan bahwa gerai usaha / loket:
              </p>

              {/* Outlet / Store Name */}
              <div className="py-1">
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-black uppercase tracking-tight text-slate-900 font-serif underline underline-offset-4 decoration-amber-500/60">
                  {agent.company_name || agent.name}
                </h3>
                <p className="text-xs sm:text-sm font-bold text-slate-700 mt-1">
                  Penanggung Jawab / Pemilik: <span className="uppercase text-slate-950">{agent.name}</span>
                </p>
                {agent.id_card_number && (
                  <p className="text-[11px] font-mono text-slate-500">
                    NIK: {agent.id_card_number} &bull; ID Agen: <strong>{agent.code}</strong>
                  </p>
                )}
                {agent.address && (
                  <p className="text-[11px] sm:text-xs text-slate-600 max-w-lg mx-auto leading-relaxed mt-0.5">
                    Lokasi: {agent.address}
                  </p>
                )}
              </div>

              {/* Declaration Statement */}
              <div className="max-w-2xl mx-auto pt-1 pb-2">
                <p className="text-[11px] sm:text-xs text-slate-700 leading-relaxed text-justify sm:text-center">
                  Ditetapkan dan terdaftar secara sah sebagai <strong>MITRA SALURAN DISTRIBUSI RESMI (AUTHORIZED CHANNEL PARTNER)</strong> bagi produk Penjualan Kode Voucher Hotspot WiFi, WiFi Roaming Passpoint (Hotspot 2.0), serta Layanan Loket Pembayaran Tagihan Internet Resmi <strong>{companyProfile.brandName}</strong>. Seluruh operasional kemitraan ini tunduk pada syarat dan ketentuan Perjanjian Kerja Sama (PKS) serta mematuhi <strong>Undang-Undang Telekomunikasi Republik Indonesia No. 36 Tahun 1999</strong>.
                </p>
              </div>

              {/* Validity info */}
              <div className="flex items-center justify-center gap-4 text-[10px] sm:text-xs text-slate-600 font-mono pt-1">
                <span>Diterbitkan: <strong>{formattedIssueDate}</strong></span>
                <span>&bull;</span>
                <span>Berlaku Hingga: <strong>{formattedValidUntil}</strong></span>
              </div>
            </div>

            {/* Bottom Footer Section: Seal, QR Verification, Signature */}
            <div className="pt-4 border-t border-slate-300 relative z-10 flex items-end justify-between px-2 sm:px-6">
              {/* Left: Security Hologram Badge */}
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-double border-amber-600/80 bg-gradient-to-tr from-amber-500/20 via-yellow-400/20 to-amber-600/20 flex flex-col items-center justify-center text-amber-900 p-1 shadow-xs">
                  <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-amber-700" />
                  <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-tighter mt-0.5">
                    AUTHORIZED
                  </span>
                  <span className="text-[6px] sm:text-[7px] font-bold text-amber-800">
                    CHANNEL PARTNER
                  </span>
                </div>
                <span className="text-[8px] text-slate-400 font-mono mt-1 uppercase tracking-wider">
                  TERVERIFIKASI SISTEM
                </span>
              </div>

              {/* Center: Live QR Verification */}
              <div className="flex flex-col items-center justify-center text-center">
                <div className="p-1.5 bg-white border border-slate-300 rounded-lg shadow-2xs">
                  <img
                    src={qrCodeUrl}
                    alt="QR Validasi"
                    className="w-14 h-14 sm:w-16 sm:h-16 object-contain"
                  />
                </div>
                <span className="text-[8px] text-slate-500 font-mono mt-1">
                  Scan untuk Cek Keaslian
                </span>
              </div>

              {/* Right: Signature & Official Stamp */}
              <div className="text-center min-w-[160px] sm:min-w-[200px]">
                <p className="text-[10px] sm:text-xs font-bold text-slate-800">
                  {companyProfile.companyName}
                </p>
                <div className="h-14 sm:h-16 flex items-center justify-center my-0.5 relative">
                  {/* Digital Signature representation */}
                  <div className="text-slate-400 font-serif italic text-xs rotate-[-3deg] select-none">
                    [ Tanda Tangan &amp; Cap Digital ]
                  </div>
                  {/* Decorative stamp circle */}
                  <div className="absolute w-12 h-12 rounded-full border border-blue-600/40 text-blue-700/40 flex items-center justify-center text-[7px] font-bold uppercase rotate-12 pointer-events-none">
                    RESMI &bull; ISP
                  </div>
                </div>
                <p className="text-xs font-bold text-slate-950 underline underline-offset-2">
                  Direktur Utama / Pimpinan
                </p>
                <p className="text-[9px] text-slate-500 font-mono">
                  Authorized Legal Representative
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

"use client";

import { useEffect, useRef } from "react";
import { Printer, X, FileText, CheckCircle2, ShieldCheck } from "lucide-react";

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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !agent) return null;

  const agreementDate = agent.created_at ? new Date(agent.created_at) : new Date();
  const formattedDate = agreementDate.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const agreementYear = agreementDate.getFullYear();
  const regNumber = `PKS/ISP/AGN/${agreementYear}/${agent.code}`;
  const logoUrl = companyProfile.logoUrl || "/web/dev_logo.svg";

  return (
    <div
      id="agent-pks-modal-root"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto print:overflow-visible print:backdrop-blur-none"
    >
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 15mm 20mm;
          }
          html, body {
            background: white !important;
            color: black !important;
            height: auto !important;
            min-height: 100% !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #agent-pks-modal-root,
          #agent-pks-modal-root * {
            visibility: visible !important;
          }
          #agent-pks-modal-root {
            position: static !important;
            inset: auto !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            backdrop-filter: none !important;
            overflow: visible !important;
            display: block !important;
          }
          #agent-pks-card {
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
            display: block !important;
          }
          #agent-pks-printable {
            width: 100% !important;
            max-height: none !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            display: block !important;
          }
          .pks-pasal-block {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .pks-signatures {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-top: 2rem;
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
        <div className="p-4 sm:px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Surat Perjanjian Kerja Sama (PKS) Kemitraan Agen Resmi
              </h3>
              <p className="text-xs text-slate-500">
                Mitra: <span className="font-semibold text-slate-800">{agent.name}</span> ({agent.code}) &bull; Siap Cetak A4 Portrait
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
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

        {/* Document Body (Printable Multi-Page) */}
        <div
          id="agent-pks-printable"
          className="p-8 sm:p-12 overflow-y-auto font-sans text-slate-900 text-xs sm:text-sm leading-relaxed print:p-0 print:overflow-visible print:m-0 print:text-black"
        >
          {/* Kop Surat Resmi */}
          <div className="text-center pb-4 border-b-4 border-double border-slate-900 mb-6">
            {/* Logo Perusahaan */}
            <div className="flex flex-col items-center justify-center mb-2">
              <img
                src={logoUrl}
                alt={companyProfile.brandName || "Logo"}
                className="h-12 sm:h-14 w-auto max-w-[280px] object-contain mb-1"
                onError={(e: any) => {
                  e.currentTarget.src = "/logo.png";
                }}
              />
              <h1 className="text-lg sm:text-xl font-black uppercase tracking-wider text-slate-950 font-serif">
                {companyProfile.companyName}
              </h1>
            </div>

            <p className="text-xs font-bold uppercase tracking-widest text-slate-700 mt-0.5">
              Penyelenggara Jasa Akses Internet (Internet Service Provider)
            </p>
            <p className="text-[11px] text-slate-600 font-mono mt-0.5">
              NPWP: {companyProfile.npwp}
            </p>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Kantor: {companyProfile.address} &bull; Telp/WA: {companyProfile.phone} &bull; Email: {companyProfile.emailSupport}
            </p>
          </div>

          {/* Judul & Nomor Surat */}
          <div className="text-center mb-6">
            <h2 className="text-base sm:text-lg font-black uppercase tracking-wide underline underline-offset-4 text-slate-950 font-serif">
              SURAT PERJANJIAN KERJA SAMA (PKS) KEMITRAAN AGEN RESMI
            </h2>
            <p className="text-xs font-mono font-bold text-slate-700 mt-1">
              Nomor Registrasi: {regNumber}
            </p>
          </div>

          {/* Pembukaan & Para Pihak */}
          <div className="space-y-3 mb-5 text-justify leading-relaxed">
            <p>
              Pada hari ini, tanggal <strong>{formattedDate}</strong>, telah dibuat dan ditandatangani Perjanjian Kerja Sama Kemitraan Distribusi Layanan Internet, Voucher Hotspot, WiFi Roaming Passpoint, dan Loket Pembayaran Tagihan (selanjutnya disebut <strong>&quot;Perjanjian&quot;</strong>), oleh dan antara:
            </p>

            <div className="pl-4 border-l-2 border-slate-300 space-y-2">
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
          <div className="space-y-4 text-justify">
            <div className="pks-pasal-block">
              <h4 className="font-bold text-slate-950 font-serif">PASAL 1 — DASAR KEMITRAAN &amp; LEGALITAS</h4>
              <p className="text-xs text-slate-700 mt-0.5">
                1. PIHAK PERTAMA adalah Badan Hukum Penyelenggara Jasa Internet (ISP) berizin resmi dari Kementerian Komunikasi dan Informatika RI.<br />
                2. PIHAK KEDUA bertindak semata-mata sebagai <strong>Mitra Saluran Distribusi Resmi (Channel Partner)</strong> bagi produk PIHAK PERTAMA, dan hubungan ini merupakan kemitraan bisnis keagenan, bukan ketenagakerjaan/karyawan, serta bukan pengalihan izin telekomunikasi.
              </p>
            </div>

            <div className="pks-pasal-block">
              <h4 className="font-bold text-slate-950 font-serif">PASAL 2 — RUANG LINGKUP LAYANAN</h4>
              <p className="text-xs text-slate-700 mt-0.5">
                PIHAK KEDUA ditunjuk sah untuk melayani: (a) Penjualan kode voucher Hotspot WiFi digital/fisik; (b) Penyaluran dan aktivasi paket WiFi Roaming Passpoint (Hotspot 2.0); (c) Penerimaan setoran loket pembayaran tagihan bulanan pelanggan resmi PIHAK PERTAMA.
              </p>
            </div>

            <div className="pks-pasal-block">
              <h4 className="font-bold text-slate-950 font-serif">PASAL 3 — HAK &amp; KEWAJIBAN PARA PIHAK</h4>
              <p className="text-xs text-slate-700 mt-0.5">
                1. PIHAK PERTAMA berkewajiban menyediakan aplikasi loket agen yang stabil, pasokan voucher, dan menyetorkan PPN resmi ke kas negara.<br />
                2. PIHAK KEDUA berhak atas bagi hasil/komisi resmi, dan berkewajiban menjual produk sesuai tarif HET resmi serta menerbitkan struk/bukti bayar sah kepada pelanggan akhir.
              </p>
            </div>

            <div className="pks-pasal-block">
              <h4 className="font-bold text-slate-950 font-serif">PASAL 4 — LARANGAN KERAS &amp; INTEGRITAS (ANTI RT/RW NET ILEGAL)</h4>
              <p className="text-xs text-slate-700 mt-0.5">
                PIHAK KEDUA <strong>dilarang keras</strong>: (a) Menjual kembali bandwidth mentah secara ilegal, menarik kabel LAN/FO ke tetangga di luar izin resmi, atau menyelenggarakan RT/RW Net ilegal; (b) Memodifikasi konfigurasi perangkat Access Point/ONT; (c) Mengenakan pungutan biaya liar di luar tarif resmi. Pelanggaran mengakibatkan pemutusan kerja sama seketika dan penerusan ke ranah hukum UU Telekomunikasi No. 36/1999.
              </p>
            </div>

            <div className="pks-pasal-block">
              <h4 className="font-bold text-slate-950 font-serif">PASAL 5 — SKEMA KOMISI &amp; KETENTUAN PERPAJAKAN</h4>
              <p className="text-xs text-slate-700 mt-0.5">
                1. <strong>Komisi Voucher Offline / Grosir:</strong> Cashback sebesar <strong>{agent.offline_cashback_pct ?? 15}%</strong>.<br />
                2. <strong>Komisi Transaksi Online / Kode Promo:</strong> Komisi sebesar <strong>{agent.online_cashback_pct ?? 10}%</strong> (Diskon pelanggan: {agent.online_discount_pct ?? 10}%).<br />
                3. <strong>Pajak (PMK No. 6/PMK.03/2021):</strong> Nilai jual paket sudah mencakup PPN 11% yang disetorkan langsung oleh PIHAK PERTAMA ke kas negara, di mana Dasar Pengenaan Pajak (DPP) dihitung dari harga bersih setelah diskon resmi (<em>final price / 1.11</em>).
              </p>
            </div>

            <div className="pks-pasal-block">
              <h4 className="font-bold text-slate-950 font-serif">PASAL 6 — MASA BERLAKU &amp; PENYELESAIAN PERSELISIHAN</h4>
              <p className="text-xs text-slate-700 mt-0.5">
                Perjanjian ini berlaku selama 1 (satu) tahun sejak ditandatangani. Segala perselisihan diselesaikan secara musyawarah mufakat, dan apabila tidak tercapai mufakat, PARA PIHAK sepakat memilih domisili hukum di Pengadilan Negeri setempat.
              </p>
            </div>
          </div>

          {/* Tanda Tangan */}
          <div className="pks-signatures grid grid-cols-2 gap-8 pt-8 mt-6 border-t border-slate-200">
            <div className="text-center">
              <p className="font-bold text-slate-900">PIHAK PERTAMA</p>
              <p className="text-xs text-slate-600">{companyProfile.companyName}</p>
              <div className="h-20 flex items-center justify-center my-1 text-slate-400 text-[11px] italic border border-dashed border-slate-300 rounded-lg max-w-[200px] mx-auto bg-slate-50">
                [ Meterai Rp 10.000 &amp; Cap ]
              </div>
              <p className="font-bold text-slate-900 underline mt-2">Pimpinan Perusahaan</p>
              <p className="text-[11px] text-slate-500">Direktur / Authorized Representative</p>
            </div>

            <div className="text-center">
              <p className="font-bold text-slate-900">PIHAK KEDUA</p>
              <p className="text-xs text-slate-600">Mitra Agen / Pengelola Gerai</p>
              <div className="h-20 flex items-center justify-center my-1 text-slate-400 text-[11px] italic border border-dashed border-slate-300 rounded-lg max-w-[200px] mx-auto bg-slate-50">
                [ Tanda Tangan Mitra ]
              </div>
              <p className="font-bold text-slate-900 underline mt-2">{agent.name}</p>
              <p className="text-[11px] text-slate-500">Pemilik / Penanggung Jawab Gerai</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

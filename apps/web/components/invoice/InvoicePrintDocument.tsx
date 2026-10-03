"use client";

import React from "react";
import { InvoiceTemplateSettings, defaultInvoiceTemplateSettings } from "@/lib/api/settings";
import { Barcode128 } from "@/components/common/Barcode128";

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface InvoiceDocumentData {
  invoice_number: string;
  issue_date?: string;
  created_at?: string;
  due_date: string;
  status: string;
  billing_period_start?: string;
  billing_period_end?: string;
  subtotal?: number;
  tax_amount?: number;
  late_fee_amount?: number;
  total_amount: number;
  amount_paid?: number;
  amount_due?: number;
  notes?: string;
  items?: InvoiceItem[];
}

export interface CustomerDocumentData {
  customer_name?: string;
  customer_number?: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface InvoicePrintDocumentProps {
  template?: InvoiceTemplateSettings;
  invoice: InvoiceDocumentData;
  customer: CustomerDocumentData;
  elementId?: string;
  isCompactPreview?: boolean;
  overrideLayout?: "modern" | "classic" | "banner" | "compact" | "thermal";
  thermalWidth?: "80mm" | "58mm";
}

function formatRupiah(val?: number) {
  if (val === undefined || isNaN(val)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function InvoicePrintDocument({
  template = defaultInvoiceTemplateSettings,
  invoice,
  customer,
  elementId = "printable-invoice",
  isCompactPreview = false,
  overrideLayout,
  thermalWidth = "80mm",
}: InvoicePrintDocumentProps) {
  const accentColor = template.accent_color || "#2563eb";
  const layout = overrideLayout || template.layout || "modern";
  const isQrEnabled = template.enable_qr_verification !== false;
  // Selalu arahkan ke subdomain portal billing (https://ispsync.id), bukan web profil utama
  const billingBaseUrl =
    typeof window !== "undefined" && window.location.origin.includes("billing.")
      ? window.location.origin
      : "https://ispsync.id";
  const verifyUrl = `${billingBaseUrl}/billing/check?q=${encodeURIComponent(invoice.invoice_number || "")}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&data=${encodeURIComponent(verifyUrl)}`;

  const items =
    invoice.items && invoice.items.length > 0
      ? invoice.items
      : [
          {
            description: "Biaya Berlangganan Paket Internet",
            quantity: 1,
            unit_price: invoice.subtotal || invoice.total_amount,
            total: invoice.subtotal || invoice.total_amount,
          },
        ];

  const subtotal = invoice.subtotal ?? invoice.total_amount;
  const tax = invoice.tax_amount ?? 0;
  const lateFee = invoice.late_fee_amount ?? 0;
  const total = invoice.total_amount;
  const paid = invoice.amount_paid ?? (invoice.status === "PAID" ? total : 0);
  const due =
    invoice.status === "PAID"
      ? 0
      : (invoice.amount_due ?? Math.max(0, total - paid));

  const isPaid = invoice.status === "PAID";
  const isOverdue = invoice.status === "OVERDUE";

  const footerNotesList = (template.footer_notes || "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const bankAccounts =
    template.bank_accounts && template.bank_accounts.length > 0
      ? template.bank_accounts
      : template.bank_name
      ? [
          {
            bank_name: template.bank_name,
            bank_account_number: template.bank_account_number,
            bank_account_holder: template.bank_account_holder,
          },
        ]
      : [];

  // 1. ==================== CLASSIC / KOP SURAT RESMI ====================
  if (layout === "classic") {
    return (
      <div
        id={elementId}
        className={`bg-white text-slate-900 w-full ${
          isCompactPreview
            ? "p-6 text-[10px] sm:text-[11px] rounded-none border border-slate-300 shadow-2xl"
            : "max-w-[210mm] min-h-[297mm] p-6 sm:p-10 shadow-2xl rounded-none border border-slate-300 print:shadow-none print:border-none print:p-0"
        } flex flex-col justify-between`}
      >
        <div>
          {/* Centered Formal Kop Surat */}
          {template.letterhead_html ? (
            <div
              className="pb-4 relative text-center"
              dangerouslySetInnerHTML={{ __html: template.letterhead_html }}
            />
          ) : (
            <div className="text-center pb-4 relative">
              <div className="flex items-center justify-center gap-4 mb-2">
                <div className="w-16 h-16 p-1 border border-slate-300 rounded flex items-center justify-center shrink-0">
                  <img
                    src={template.header_image_url || template.logo_url || "/logo.png"}
                    alt={template.brand_name}
                    className="w-full h-full object-contain"
                    onError={(e: any) => {
                      e.target.src = "/logo.png";
                    }}
                  />
                </div>
                <div className="text-left">
                  <h1 className="text-2xl font-serif font-black tracking-wider uppercase text-slate-900">
                    {template.brand_name}
                  </h1>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {template.company_name}
                  </p>
                  {template.tax_id && (
                    <p className="text-[11px] text-slate-600 font-mono">NPWP: {template.tax_id}</p>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-slate-600 leading-tight">
                {template.license_no && <span className="block italic">{template.license_no}</span>}
                {template.address} &bull; Telp/WA: {template.phone} &bull; Email: {template.email}
              </p>
            </div>
          )}

          {/* Double Divider Line khas Surat Dinas / Formal */}
          <div className="border-b-4 border-double border-slate-800 mb-6"></div>

          {/* Document Title & Reference Header */}
          <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold font-serif uppercase tracking-widest text-slate-900">
                FAKTUR PENAGIHAN RESMI
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                No. Dokumen: <strong className="text-slate-900">{invoice.invoice_number}</strong>
              </p>
            </div>
            <div className="flex items-center gap-3">
              {invoice.invoice_number && (
                <div className="hidden sm:block p-1 bg-white border border-slate-200 rounded">
                  <Barcode128
                    value={invoice.invoice_number}
                    height={30}
                    width={1.1}
                    fontSize={8.5}
                  />
                </div>
              )}
              <div className="text-right">
                <span
                  className={`inline-block px-3 py-1 font-bold text-xs uppercase border rounded ${
                    isPaid
                      ? "border-emerald-600 text-emerald-800 bg-emerald-50"
                      : isOverdue
                      ? "border-rose-600 text-rose-800 bg-rose-50"
                      : "border-amber-600 text-amber-800 bg-amber-50"
                  }`}
                >
                  {isPaid ? "STATUS: LUNAS" : isOverdue ? "STATUS: JATUH TEMPO" : "STATUS: MENUNGGU PEMBAYARAN"}
                </span>
              </div>
            </div>
          </div>

          {/* Customer & Invoice Dates Box */}
          <div className="grid grid-cols-2 gap-4 mb-6 border border-slate-300 p-4 rounded text-xs bg-slate-50/50">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-500 mb-1 tracking-wider">
                DITUJUKAN KEPADA:
              </p>
              <h3 className="text-sm font-bold text-slate-900">{customer.customer_name}</h3>
              <p className="text-xs text-slate-700 font-mono mt-0.5">ID: {customer.customer_number}</p>
              <p className="text-xs text-slate-700 mt-0.5">Kontak: {customer.phone || "-"}</p>
              {customer.address && <p className="text-xs text-slate-600 mt-1 leading-snug">{customer.address}</p>}
            </div>
            <div className="border-l border-slate-300 pl-4 space-y-1">
              <p className="text-[10px] font-bold uppercase text-slate-500 mb-1 tracking-wider">
                RINCIAN TANGGAL & PERIODE:
              </p>
              <div className="flex justify-between">
                <span className="text-slate-600">Tanggal Faktur:</span>
                <span className="font-semibold text-slate-900">{formatDate(invoice.issue_date || invoice.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Batas Waktu (Jatuh Tempo):</span>
                <span className="font-bold text-rose-700">{formatDate(invoice.due_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Periode Pemakaian:</span>
                <span className="text-slate-800 font-medium">
                  {invoice.billing_period_start
                    ? `${formatDate(invoice.billing_period_start)} s/d ${formatDate(invoice.billing_period_end || "")}`
                    : "Bulan Berjalan"}
                </span>
              </div>
            </div>
          </div>

          {/* Formal Bordered Table */}
          <table className="w-full text-left text-xs border border-slate-400 mb-6">
            <thead>
              <tr className="bg-slate-200 text-slate-800 border-b border-slate-400 font-bold">
                <th className="p-2 border-r border-slate-400 w-10 text-center">No</th>
                <th className="p-2 border-r border-slate-400">Deskripsi / Uraian Layanan</th>
                <th className="p-2 border-r border-slate-400 w-14 text-center">Qty</th>
                <th className="p-2 border-r border-slate-400 w-28 text-right">Tarif Satuan</th>
                <th className="p-2 w-32 text-right">Total (IDR)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id || idx} className="border-b border-slate-300">
                  <td className="p-2 border-r border-slate-300 text-center text-slate-600">{idx + 1}</td>
                  <td className="p-2 border-r border-slate-300 font-medium text-slate-900">{item.description}</td>
                  <td className="p-2 border-r border-slate-300 text-center text-slate-700">{item.quantity}x</td>
                  <td className="p-2 border-r border-slate-300 text-right font-mono text-slate-800">
                    {formatRupiah(item.unit_price)}
                  </td>
                  <td className="p-2 text-right font-mono font-bold text-slate-900">{formatRupiah(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Breakdown & Calculation */}
          <div className="flex justify-between items-start gap-4 mb-6">
            <div className="w-1/2 p-3 border border-slate-300 rounded text-xs bg-slate-50 space-y-2">
              <p className="font-bold text-slate-800">Instruksi Pembayaran Transfer Bank:</p>
              {bankAccounts.length > 0 ? (
                bankAccounts.map((acc, idx) => (
                  <div key={idx} className="space-y-0.5 pb-1.5 border-b border-slate-200 last:border-0 last:pb-0">
                    <p className="text-[11px] text-slate-700">
                      Bank: <strong>{acc.bank_name}</strong> {acc.branch ? <span className="text-slate-500 font-normal">({acc.branch})</span> : ""}
                    </p>
                    <p className="text-[11px] text-slate-700">
                      No. Rekening: <strong className="font-mono text-slate-900">{acc.bank_account_number}</strong>
                    </p>
                    <p className="text-[11px] text-slate-700">
                      Atas Nama: <strong>{acc.bank_account_holder}</strong>
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-slate-500 italic">Hubungi kasir untuk info rekening.</p>
              )}
            </div>

            <div className="w-1/2 max-w-xs ml-auto text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (DPP):</span>
                <span className="font-mono font-semibold">{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>PPN (11%):</span>
                <span className="font-mono">{formatRupiah(tax)}</span>
              </div>
              {lateFee > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Denda Keterlambatan:</span>
                  <span className="font-mono">+{formatRupiah(lateFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-300">
                <span>Total Tagihan:</span>
                <span className="font-mono">{formatRupiah(total)}</span>
              </div>
              {paid > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Telah Dibayar:</span>
                  <span className="font-mono">-{formatRupiah(paid)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-rose-700 pt-1 border-t-2 border-double border-slate-800">
                <span>Jumlah Yang Harus Dibayar:</span>
                <span className="font-mono">{formatRupiah(due)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Formal Signature & Footer */}
        <div className="pt-4 border-t border-slate-300">
          <div className="flex justify-between items-end text-xs">
            <div className="max-w-sm text-[10px] text-slate-500">
              <p className="font-bold text-slate-700 mb-0.5">Catatan Penting:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {footerNotesList.map((line, idx) => (
                  <li key={idx}>{line.replace(/^[•\-\*]\s*/, "")}</li>
                ))}
              </ul>
            </div>

            {/* Verification QR Code & Barcode Loket */}
            <div className="flex items-center gap-2.5">
              {isQrEnabled && (
                <div className="flex items-center gap-2 border border-slate-300 rounded-lg p-2 bg-slate-50/70 max-w-[190px]">
                  <div className="w-12 h-12 bg-white p-0.5 border border-slate-300 rounded shrink-0 flex items-center justify-center">
                    <img
                      src={qrCodeUrl}
                      alt="QR Verifikasi"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-[9px] leading-tight text-slate-700">
                    <p className="font-extrabold text-slate-900 uppercase tracking-tight">VERIFIKASI RESMI</p>
                    <p className="text-[8px] text-slate-500 mt-0.5 leading-snug">Pindai QR untuk validasi keabsahan dokumen faktur ini.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Official Signature Box */}
            <div className="text-center w-52">
              <p className="text-[11px] text-slate-600 mb-1">
                Diterbitkan secara sah oleh,
              </p>
              <p className="text-xs font-bold text-slate-800">{template.company_name}</p>
              <div className="h-16 flex items-center justify-center text-slate-300 text-[10px] italic">
                ( Cap &amp; Tanda Tangan Resmi )
              </div>
              <div className="border-t border-slate-400 pt-1 font-bold text-slate-800 text-[11px]">
                Bagian Keuangan &amp; Billing
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. ==================== BOLD BANNER / MODERN BERWARNA ====================
  if (layout === "banner") {
    return (
      <div
        id={elementId}
        className={`bg-white text-slate-900 w-full ${
          isCompactPreview
            ? "p-0 text-[10px] sm:text-[11px] rounded-none border border-slate-300 shadow-2xl overflow-hidden"
            : "max-w-[210mm] min-h-[297mm] shadow-2xl rounded-none border border-slate-300 overflow-hidden print:shadow-none print:border-none print:rounded-none"
        } flex flex-col justify-between`}
      >
        <div>
          {/* Top Full Accent Banner */}
          <div
            className="p-6 sm:p-8 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            style={{ backgroundColor: accentColor }}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white p-1.5 shadow-md flex items-center justify-center shrink-0">
                <img
                  src={template.header_image_url || template.logo_url || "/logo.png"}
                  alt={template.brand_name}
                  className="w-full h-full object-contain"
                  onError={(e: any) => {
                    e.target.src = "/logo.png";
                  }}
                />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">{template.brand_name}</h1>
                <p className="text-xs font-medium text-white/90">{template.company_name}</p>
                <p className="text-[11px] text-white/80 mt-0.5">{template.phone} &bull; {template.email}</p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-xs rounded-lg text-xs font-bold uppercase tracking-widest text-white border border-white/30">
                FAKTUR TAGIHAN
              </span>
              <p className="text-sm font-mono font-bold mt-1 text-white">{invoice.invoice_number}</p>
              <div className="mt-1">
                <span
                  className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-extrabold uppercase ${
                    isPaid
                      ? "bg-emerald-400 text-slate-900"
                      : isOverdue
                      ? "bg-rose-400 text-slate-900"
                      : "bg-amber-300 text-slate-900"
                  }`}
                >
                  {isPaid ? "✓ LUNAS" : isOverdue ? "! JATUH TEMPO" : "BELUM LUNAS"}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {/* Meta Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  DITAGIHKAN KEPADA:
                </span>
                <p className="text-sm font-bold text-slate-900">{customer.customer_name}</p>
                <p className="text-xs text-slate-600 font-mono mt-0.5">ID: {customer.customer_number}</p>
                <p className="text-xs text-slate-600 mt-0.5">WhatsApp: {customer.phone || "-"}</p>
                {customer.address && <p className="text-xs text-slate-600 mt-1">{customer.address}</p>}
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  DETAIL PEMBAYARAN:
                </span>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tanggal Terbit:</span>
                  <span className="font-semibold text-slate-800">{formatDate(invoice.issue_date || invoice.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Jatuh Tempo:</span>
                  <span className="font-bold text-rose-600">{formatDate(invoice.due_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Periode Tagihan:</span>
                  <span className="font-medium text-slate-800">
                    {invoice.billing_period_start
                      ? `${formatDate(invoice.billing_period_start)} s/d ${formatDate(invoice.billing_period_end || "")}`
                      : "Bulan Berjalan"}
                  </span>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-xl overflow-hidden border border-slate-200 mb-6">
              <table className="w-full text-left text-xs">
                <thead style={{ backgroundColor: accentColor }} className="text-white font-bold">
                  <tr>
                    <th className="p-3 w-10 text-center">No</th>
                    <th className="p-3">Rincian Layanan Internet</th>
                    <th className="p-3 w-14 text-center">Qty</th>
                    <th className="p-3 w-28 text-right">Harga</th>
                    <th className="p-3 w-32 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50">
                      <td className="p-3 text-center text-slate-500">{idx + 1}</td>
                      <td className="p-3 font-semibold text-slate-800">{item.description}</td>
                      <td className="p-3 text-center text-slate-600">{item.quantity}x</td>
                      <td className="p-3 text-right font-mono text-slate-700">{formatRupiah(item.unit_price)}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">{formatRupiah(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Details */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="w-full sm:w-1/2 p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-2">
                <p className="font-bold text-slate-800">Transfer Bank Resmi:</p>
                {bankAccounts.length > 0 ? (
                  bankAccounts.map((acc, idx) => (
                    <div key={idx} className="space-y-0.5 text-slate-600 text-[11px] pb-1.5 border-b border-slate-200 last:border-0 last:pb-0">
                      <p>Bank: <strong>{acc.bank_name}</strong> {acc.branch ? <span className="text-slate-500 font-normal">({acc.branch})</span> : ""}</p>
                      <p>Rekening: <strong className="font-mono text-slate-900">{acc.bank_account_number}</strong></p>
                      <p>Atas Nama: <strong>{acc.bank_account_holder}</strong></p>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-slate-500 italic">Hubungi kasir untuk info rekening.</p>
                )}
              </div>

              <div className="w-full sm:w-1/2 max-w-xs ml-auto text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal (DPP):</span>
                  <span className="font-mono font-medium">{formatRupiah(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>PPN (11%):</span>
                  <span className="font-mono">{formatRupiah(tax)}</span>
                </div>
                {lateFee > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Denda:</span>
                    <span className="font-mono">+{formatRupiah(lateFee)}</span>
                  </div>
                )}
                <div
                  className="flex justify-between text-sm font-black p-2 rounded-lg text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  <span>Total Tagihan:</span>
                  <span className="font-mono">{formatRupiah(total)}</span>
                </div>
                {paid > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold px-2">
                    <span>Sudah Terbayar:</span>
                    <span className="font-mono">-{formatRupiah(paid)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-rose-600 px-2 pt-1 border-t border-slate-200">
                  <span>Sisa Tagihan:</span>
                  <span className="font-mono">{formatRupiah(due)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 sm:p-8 border-t border-slate-200 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row justify-between items-end gap-3 text-xs text-slate-500">
            <div className="max-w-md">
              <p className="font-bold text-slate-700 mb-0.5">Syarat &amp; Ketentuan:</p>
              <ul className="list-disc list-inside text-[10px] space-y-0.5">
                {footerNotesList.map((line, idx) => (
                  <li key={idx}>{line.replace(/^[•\-\*]\s*/, "")}</li>
                ))}
              </ul>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              {isQrEnabled && (
                <div className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <div className="w-12 h-12 bg-white p-0.5 border border-slate-200 rounded shrink-0 flex items-center justify-center">
                    <img
                      src={qrCodeUrl}
                      alt="QR Verifikasi"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-left text-[9px] leading-tight">
                    <span className="font-extrabold text-slate-900 uppercase tracking-tight block">
                      VERIFIKASI SAH
                    </span>
                    <span className="text-[8px] text-slate-500 block mt-0.5">
                      Pindai untuk cek status
                    </span>
                    <p className="text-[8px] text-slate-400 mt-0.5">{template.company_name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. ==================== COMPACT / STRUK KASIR THERMAL (POS 58mm / 80mm) ====================
  if (layout === "compact" || layout === "thermal") {
    const is58mm = thermalWidth === "58mm";
    return (
      <div
        id={elementId}
        className={`bg-white text-slate-900 mx-auto ${
          is58mm ? "max-w-[58mm] text-[9.5px] p-2" : "max-w-[80mm] text-[11px] p-3 sm:p-4"
        } ${
          isCompactPreview
            ? "shadow-2xl border border-slate-300 rounded-none"
            : "shadow-2xl rounded-none border border-slate-300 print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:max-w-none"
        } font-mono leading-tight flex flex-col justify-between`}
      >
        <div>
          {/* Header Struk POS */}
          <div className="text-center pb-2 border-b-2 border-dashed border-slate-800">
            {(template.header_image_url || template.logo_url) && (
              <div className="w-8 h-8 mx-auto mb-1 flex items-center justify-center">
                <img
                  src={template.header_image_url || template.logo_url}
                  alt={template.brand_name}
                  className="w-full h-full object-contain filter grayscale"
                  onError={(e: any) => {
                    e.target.style.display = "none";
                  }}
                />
              </div>
            )}
            <h1 className="text-sm sm:text-base font-black tracking-wider uppercase text-slate-950">
              {template.brand_name}
            </h1>
            <p className="text-[10px] font-bold text-slate-800 uppercase leading-snug">
              {template.company_name}
            </p>
            <p className="text-[9px] text-slate-600 mt-0.5 leading-tight">
              {template.address}
            </p>
            <p className="text-[9px] text-slate-600 mt-0.5">
              WA: {template.phone}
            </p>
          </div>

          {/* Metadata Transaksi */}
          <div className="py-2 border-b border-dashed border-slate-400 space-y-0.5 text-[9.5px]">
            <div className="flex justify-between">
              <span className="text-slate-600">NO. FAKTUR:</span>
              <strong className="text-slate-900">{invoice.invoice_number}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">TGL/JAM:</span>
              <span>{formatDate(invoice.issue_date || invoice.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">JATUH TEMPO:</span>
              <span className="font-bold text-slate-900">{formatDate(invoice.due_date)}</span>
            </div>
            <div className="flex justify-between pt-0.5">
              <span className="text-slate-600">PELANGGAN:</span>
              <strong className="text-slate-950 truncate max-w-[140px]">{customer.customer_name || "Pelanggan"}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">ID CUST:</span>
              <span className="font-bold">{customer.customer_number || "-"}</span>
            </div>
            {customer.phone && (
              <div className="flex justify-between">
                <span className="text-slate-600">NO. KONTAK:</span>
                <span>{customer.phone}</span>
              </div>
            )}
            <div className="flex justify-between pt-0.5">
              <span className="text-slate-600">PERIODE:</span>
              <span className="truncate max-w-[140px]">
                {invoice.billing_period_start
                  ? `${formatDate(invoice.billing_period_start)} s/d ${formatDate(invoice.billing_period_end || "")}`
                  : "Bulan Berjalan"}
              </span>
            </div>
          </div>

          {/* Item List Header */}
          <div className="py-2 border-b-2 border-dashed border-slate-800">
            <div className="flex justify-between font-bold text-slate-800 pb-1 border-b border-slate-300 uppercase text-[9.5px]">
              <span>LAYANAN / ITEM</span>
              <span>TOTAL</span>
            </div>
            <div className="space-y-1.5 pt-1.5">
              {items.map((item, idx) => (
                <div key={item.id || idx}>
                  <p className="font-bold text-slate-950 leading-tight">{item.description}</p>
                  <div className="flex justify-between text-[9px] text-slate-600">
                    <span>
                      {item.quantity}x @ {formatRupiah(item.unit_price)}
                    </span>
                    <span className="font-bold text-slate-900">{formatRupiah(item.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rincian Finansial & Total */}
          <div className="py-2 border-b-2 border-dashed border-slate-800 space-y-0.5 text-[10px]">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal (DPP):</span>
              <span>{formatRupiah(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>PPN (11%):</span>
              <span>{formatRupiah(tax)}</span>
            </div>
            {lateFee > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Denda:</span>
                <span>+{formatRupiah(lateFee)}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-xs sm:text-sm pt-1 border-t border-slate-800 text-slate-950">
              <span>TOTAL TAGIHAN:</span>
              <span>{formatRupiah(total)}</span>
            </div>
            {paid > 0 && (
              <div className="flex justify-between text-slate-700">
                <span>Telah Dibayar:</span>
                <span>-{formatRupiah(paid)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-xs pt-1 border-t border-dashed border-slate-400">
              <span>SISA HARUS DIBAYAR:</span>
              <span>{formatRupiah(due)}</span>
            </div>
          </div>

          {/* Status Badge Box */}
          <div className="my-2 p-1.5 text-center border-2 border-slate-900 rounded font-black text-xs uppercase tracking-widest bg-slate-50">
            {isPaid ? "*** LUNAS / PAID ***" : isOverdue ? "*** JATUH TEMPO ***" : "*** BELUM LUNAS ***"}
          </div>

          {/* Instruksi Transfer Rekening */}
          {bankAccounts.length > 0 && (
            <div className="py-1.5 border-b border-dashed border-slate-400 text-[9px] space-y-1">
              <p className="font-bold text-slate-800 uppercase">Transfer Pembayaran Bank:</p>
              {bankAccounts.map((acc, idx) => (
                <div key={idx} className="space-y-0.5 pb-1 border-b border-slate-200 last:border-0 last:pb-0">
                  <div className="flex justify-between">
                    <span>Bank:</span>
                    <strong>{acc.bank_name} {acc.branch ? `(${acc.branch})` : ""}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>No. Rek:</span>
                    <strong className="font-mono text-[10px]">{acc.bank_account_number}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>A/N:</span>
                    <span className="truncate max-w-[130px]">{acc.bank_account_holder}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer & Barcode Simulasi */}
        <div className="pt-2 text-center text-[9px] text-slate-600 space-y-1">
          {footerNotesList.length > 0 ? (
            <div className="space-y-0.5 text-[8.5px] text-slate-600 leading-tight">
              {footerNotesList.map((note, idx) => (
                <p key={idx}>{note.replace(/^[•\-\*]\s*/, "")}</p>
              ))}
            </div>
          ) : (
            <>
              <p className="font-medium">Terima kasih atas pembayaran Anda.</p>
              <p className="text-[8.5px] text-slate-500">
                Simpan struk ini sebagai bukti pembayaran tagihan yang sah.
              </p>
            </>
          )}

          {/* QR Verifikasi Struk */}
          {isQrEnabled && (
            <div className="pt-2 pb-0.5 flex flex-col items-center justify-center">
              <div className="w-14 h-14 p-0.5 bg-white border border-slate-300 rounded flex items-center justify-center">
                <img
                  src={qrCodeUrl}
                  alt="QR Verifikasi"
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-[7.5px] font-bold text-slate-600 mt-0.5 uppercase tracking-wider">
                Scan QR Verifikasi Faktur
              </p>
            </div>
          )}

          {/* Barcode Code 128 Nyata untuk Scanner Kasir POS */}
          {invoice.invoice_number && (
            <div className="pt-2 flex flex-col items-center justify-center">
              <Barcode128
                value={invoice.invoice_number}
                height={is58mm ? 30 : 36}
                width={is58mm ? 0.95 : 1.15}
                fontSize={is58mm ? 8.5 : 9.5}
                caption="Scan Loket / Kasir POS"
              />
            </div>
          )}

          <div className="pt-1 text-[8px] text-slate-400">
            - - - - - - - - GUNTING DISINI - - - - - - - -
          </div>
        </div>
      </div>
    );
  }

  // 4. ==================== MODERN MINIMALIST (DEFAULT) ====================
  return (
    <div
      id={elementId}
      className={`bg-white text-slate-900 w-full h-full flex flex-col justify-between ${
        isCompactPreview
          ? "p-6 sm:p-7 text-[10px] sm:text-[11px] rounded-none border-0 min-h-[720px]"
          : "max-w-[210mm] min-h-[297mm] p-6 sm:p-10 shadow-2xl rounded-none border border-slate-300 print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:h-full print:min-h-0"
      }`}
    >
      <div>
        {/* Kop Surat / Company Header */}
        <div
          className="flex flex-col sm:flex-row justify-between items-start pb-5 border-b-2 gap-4"
          style={{ borderColor: accentColor }}
        >
          <div className="flex items-start gap-3.5">
            <div className="w-14 h-14 rounded-xl bg-white p-1 border border-slate-200 shadow-xs flex items-center justify-center shrink-0">
              <img
                src={template.header_image_url || template.logo_url || "/logo.png"}
                alt={template.brand_name || "Logo"}
                className="w-full h-full object-contain"
                onError={(e: any) => {
                  e.target.src = "/logo.png";
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-black tracking-tight" style={{ color: accentColor }}>
                  {template.brand_name || "ISPSYNC"}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">
                {template.company_name || "PT Inovasi Sistem Pintar"}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-sm leading-relaxed">
                {template.license_no && (
                  <>
                    {template.license_no}
                    <br />
                  </>
                )}
                Kantor: {template.address}
                <br />
                Telp/WA: {template.phone} &bull; Email: {template.email}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span
              className="inline-block text-xl font-extrabold tracking-tight border-b pb-1 uppercase"
              style={{
                color: accentColor,
                borderColor: accentColor,
              }}
            >
              FAKTUR TAGIHAN
            </span>
            <table className="mt-2 text-xs text-left sm:text-right ml-auto">
              <tbody>
                <tr>
                  <td className="text-slate-500 pr-3">No. Faktur:</td>
                  <td className="font-mono font-bold text-slate-900">{invoice.invoice_number}</td>
                </tr>
                <tr>
                  <td className="text-slate-500 pr-3">Tgl. Terbit:</td>
                  <td className="font-medium text-slate-800">
                    {formatDate(invoice.issue_date || invoice.created_at)}
                  </td>
                </tr>
                <tr>
                  <td className="text-slate-500 pr-3">Jatuh Tempo:</td>
                  <td className="font-bold text-rose-600">{formatDate(invoice.due_date)}</td>
                </tr>
                <tr>
                  <td className="text-slate-500 pr-3">Status:</td>
                  <td>
                    <span
                      className={`font-bold text-xs uppercase px-2 py-0.5 rounded border inline-block ${
                        isPaid
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : isOverdue
                          ? "bg-rose-100 text-rose-800 border-rose-300"
                          : "bg-amber-100 text-amber-800 border-amber-300"
                      }`}
                    >
                      {isPaid ? "LUNAS (PAID)" : isOverdue ? "JATUH TEMPO (OVERDUE)" : "BELUM LUNAS (UNPAID)"}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
            {invoice.invoice_number && (
              <div className="mt-2.5 flex justify-end">
                <div className="p-1 bg-slate-50 border border-slate-200 rounded-lg inline-block">
                  <Barcode128
                    value={invoice.invoice_number}
                    height={28}
                    width={1.05}
                    fontSize={8.5}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Customer Information (Bill To) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Ditagihkan Kepada (Bill To):
            </p>
            <h3 className="text-sm font-bold text-slate-900">{customer.customer_name}</h3>
            <p className="text-xs text-slate-600 font-mono mt-0.5">
              ID Pelanggan: <span className="font-semibold text-slate-800">{customer.customer_number}</span>
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              No. Kontak / WA: {customer.phone || "-"}
            </p>
            {customer.address && (
              <p className="text-xs text-slate-600 mt-1 leading-snug">
                Alamat: {customer.address}
              </p>
            )}
          </div>

          <div className="sm:border-l sm:border-slate-200 sm:pl-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Informasi Layanan:
            </p>
            <p className="text-xs text-slate-600">
              Periode Tagihan:{" "}
              <span className="font-semibold text-slate-800">
                {invoice.billing_period_start
                  ? `${formatDate(invoice.billing_period_start)} s/d ${formatDate(invoice.billing_period_end || "")}`
                  : "Bulan Berjalan"}
              </span>
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Mata Uang: <span className="font-semibold text-slate-800">IDR (Rupiah)</span>
            </p>
            {invoice.notes && (
              <p className="text-xs text-slate-600 mt-1 italic bg-amber-50 p-2 rounded border border-amber-200">
                Catatan: {invoice.notes}
              </p>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-5">
          <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-2.5 w-10 text-center">No</th>
                <th className="p-2.5">Rincian Komponen Layanan</th>
                <th className="p-2.5 w-14 text-center">Qty</th>
                <th className="p-2.5 w-28 text-right">Tarif Satuan</th>
                <th className="p-2.5 w-32 text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-slate-50/50">
                  <td className="p-2.5 text-center text-slate-500">{idx + 1}</td>
                  <td className="p-2.5 font-medium text-slate-900">{item.description}</td>
                  <td className="p-2.5 text-center text-slate-600">{item.quantity}x</td>
                  <td className="p-2.5 text-right font-mono text-slate-700">{formatRupiah(item.unit_price)}</td>
                  <td className="p-2.5 text-right font-mono font-bold text-slate-900">{formatRupiah(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Breakdown & Calculation */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="w-full sm:w-1/2 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <p className="font-bold text-slate-700">Metode Pembayaran Resmi:</p>
            <div className="text-[11px] text-slate-600 space-y-1.5">
              {bankAccounts.length > 0 ? (
                bankAccounts.map((acc, idx) => (
                  <p key={idx}>
                    &bull; <strong>{acc.bank_name}{acc.branch ? ` (${acc.branch})` : ""}:</strong>{" "}
                    <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono font-bold text-slate-900">
                      {acc.bank_account_number}
                    </code>{" "}
                    a/n {acc.bank_account_holder}
                  </p>
                ))
              ) : null}
              <p>
                &bull; <strong>QRIS &amp; Virtual Account:</strong> Tersedia langsung melalui portal mandiri pelanggan.
              </p>
            </div>
          </div>

          <div className="w-full sm:w-1/2 max-w-xs ml-auto text-xs space-y-1.5">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal (DPP):</span>
              <span className="font-mono font-semibold">{formatRupiah(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>PPN (11%):</span>
              <span className="font-mono">{formatRupiah(tax)}</span>
            </div>
            {lateFee > 0 && (
              <div className="flex justify-between text-rose-600 font-medium">
                <span>Denda Keterlambatan:</span>
                <span className="font-mono">+{formatRupiah(lateFee)}</span>
              </div>
            )}
            <div
              className="flex justify-between text-sm font-black pt-1.5 border-t border-slate-200"
              style={{ color: accentColor }}
            >
              <span>Total Tagihan:</span>
              <span className="font-mono">{formatRupiah(total)}</span>
            </div>
            {paid > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Sudah Dibayar:</span>
                <span className="font-mono font-semibold">-{formatRupiah(paid)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-rose-600 pt-1 border-t border-slate-200">
              <span>Sisa Bayar (Amount Due):</span>
              <span className="font-mono">{formatRupiah(due)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Legal & Stamp Footer */}
      <div className="border-t border-slate-200 pt-4 mt-auto">
        <div className="flex flex-col sm:flex-row justify-between items-end gap-3 text-xs text-slate-500">
          <div className="max-w-md">
            <p className="font-bold text-slate-700 mb-0.5">Ketentuan &amp; Informasi Penting:</p>
            <ul className="list-disc list-inside text-[10px] space-y-0.5 text-slate-500">
              {footerNotesList.map((line, idx) => (
                <li key={idx}>{line.replace(/^[•\-\*]\s*/, "")}</li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isQrEnabled && (
              <div className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-slate-50/80">
                <div className="w-12 h-12 bg-white p-0.5 border border-slate-200 rounded shrink-0 flex items-center justify-center">
                  <img
                    src={qrCodeUrl}
                    alt="QR Verifikasi"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="text-left text-[9px] leading-tight">
                  <span className="font-extrabold text-slate-800 uppercase tracking-tight block">
                    VERIFIKASI SAH
                  </span>
                  <span className="text-[8px] text-slate-500 block mt-0.5">
                    Pindai untuk cek status resmi online
                  </span>
                  <p className="text-[8px] text-slate-400 mt-0.5">Dokumen resmi {template.company_name}</p>
                </div>
              </div>
            )}

            {/* Official Company Seal & Signature */}
            <div className="text-center w-36 sm:w-44 relative shrink-0">
              <p className="text-[8.5px] text-slate-500 mb-0.5">Diterbitkan sah oleh:</p>
              <p className="text-[9.5px] font-bold text-slate-800 truncate">{template.company_name || "PT Inovasi Sistem Pintar"}</p>
              <div className="h-12 relative flex items-center justify-center">
                {/* Official Stamp Seal (Stempel Basah Digital) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-85 -rotate-6">
                  <div className="border-2 border-dashed border-rose-600/70 rounded-full w-24 h-11 flex flex-col items-center justify-center p-0.5 text-rose-600 uppercase font-black text-[7px] leading-tight text-center">
                    <span className="tracking-widest">★ LUNAS ★</span>
                    <span className="text-[6px] font-bold truncate max-w-[75px]">{template.brand_name || "ISPSYNC"}</span>
                    <span className="text-[5px] font-mono">BILLING OFFICIAL</span>
                  </div>
                </div>
                <div className="text-slate-300 text-[8.5px] italic z-10">
                  ( Tanda Tangan Digital )
                </div>
              </div>
              <div className="border-t border-slate-400 pt-0.5 font-bold text-slate-800 text-[9px]">
                Bagian Keuangan &amp; Kasir
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

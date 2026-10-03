"use client";

import React from "react";
import { InvoiceTemplateSettings, defaultInvoiceTemplateSettings } from "@/lib/api/settings";
import { InvoiceDocumentData } from "@/components/invoice/InvoicePrintDocument";
import { Barcode128 } from "@/components/common/Barcode128";

export interface PaymentReceiptData {
  id?: string;
  payment_number: string;
  invoice_id?: string;
  invoice_number?: string;
  amount: number;
  payment_method: string;
  status: string;
  paid_at?: string;
  created_at: string;
  notes?: string;
  gateway_reference?: string;
}

export interface ReceiptCustomerData {
  customer_name?: string;
  customer_number?: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface ReceiptPrintDocumentProps {
  template?: InvoiceTemplateSettings;
  payment: PaymentReceiptData;
  customer: ReceiptCustomerData;
  invoice?: InvoiceDocumentData | null;
  elementId?: string;
  overrideLayout?: "a4" | "thermal";
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

function formatDate(dateStr?: string, includeTime = false) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const dateFormatted = `${day}/${month}/${year}`;
    if (!includeTime) return dateFormatted;
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${dateFormatted} ${hours}:${minutes} WIB`;
  } catch {
    return dateStr;
  }
}

export function terbilang(n: number): string {
  const angka = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  n = Math.floor(Math.abs(n));
  if (n < 12) return angka[n];
  if (n < 20) return terbilang(n - 10) + " Belas";
  if (n < 100) return (terbilang(Math.floor(n / 10)) + " Puluh " + terbilang(n % 10)).trim();
  if (n < 200) return ("Seratus " + terbilang(n - 100)).trim();
  if (n < 1000) return (terbilang(Math.floor(n / 100)) + " Ratus " + terbilang(n % 100)).trim();
  if (n < 2000) return ("Seribu " + terbilang(n - 1000)).trim();
  if (n < 1000000) return (terbilang(Math.floor(n / 1000)) + " Ribu " + terbilang(n % 1000)).trim();
  if (n < 1000000000) return (terbilang(Math.floor(n / 1000000)) + " Juta " + terbilang(n % 1000000)).trim();
  if (n < 1000000000000) return (terbilang(Math.floor(n / 1000000000)) + " Miliar " + terbilang(n % 1000000000)).trim();
  return "";
}

function methodLabel(method: string) {
  switch (method?.toUpperCase()) {
    case "MANUAL":
      return "Tunai / Kasir (CASH)";
    case "VA_BCA":
      return "Transfer Bank BCA";
    case "VA_MANDIRI":
      return "Transfer Bank Mandiri";
    case "VA_BNI":
      return "Transfer Bank BNI";
    case "VA_BRI":
      return "Transfer Bank BRI";
    case "QRIS":
      return "QRIS (Quick Response Code Indonesian Standard)";
    case "MIDTRANS":
      return "Payment Gateway (Midtrans)";
    case "XENDIT":
      return "Payment Gateway (Xendit)";
    default:
      return method || "Tunai";
  }
}

export function ReceiptPrintDocument({
  template = defaultInvoiceTemplateSettings,
  payment,
  customer,
  invoice,
  elementId = "printable-receipt",
  overrideLayout = "a4",
  thermalWidth = "80mm",
}: ReceiptPrintDocumentProps) {
  const accentColor = template.accent_color || "#2563eb";
  const isThermal = overrideLayout === "thermal";
  const is58mm = thermalWidth === "58mm";

  // 1. ==================== STRUK KASIR THERMAL (POS 58mm / 80mm) ====================
  if (isThermal) {
    return (
      <div
        id={elementId}
        className={`bg-white text-slate-900 mx-auto ${
          is58mm ? "max-w-[58mm] text-[9.5px] p-2" : "max-w-[80mm] text-[11px] p-3 sm:p-4"
        } shadow-md sm:rounded-lg border border-slate-300 print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:max-w-none font-mono leading-tight flex flex-col justify-between`}
      >
        <div>
          {/* Header */}
          <div className="text-center pb-2 border-b-2 border-dashed border-slate-800">
            {template.logo_url && (
              <div className="w-8 h-8 mx-auto mb-1 flex items-center justify-center">
                <img
                  src={template.logo_url}
                  alt={template.brand_name}
                  className="w-full h-full object-contain filter grayscale"
                  onError={(e: any) => {
                    e.target.style.display = "none";
                  }}
                />
              </div>
            )}
            <h1 className="text-sm sm:text-base font-black tracking-wider uppercase text-slate-950">
              {template.brand_name || "ISPSYNC"}
            </h1>
            <p className="text-[10px] font-bold text-slate-800 uppercase leading-snug">
              {template.company_name || "PT Inovasi Sistem Pintar"}
            </p>
            <p className="text-[9px] text-slate-600 mt-0.5 leading-tight">
              {template.address}
            </p>
            <p className="text-[9px] text-slate-600 mt-0.5">
              WA: {template.phone}
            </p>
          </div>

          {/* Title */}
          <div className="py-1.5 text-center border-b border-dashed border-slate-400">
            <span className="font-extrabold text-[11px] uppercase tracking-wider text-slate-900">
              *** STRUK BUKTI PEMBAYARAN ***
            </span>
          </div>

          {/* Metadata Transaksi */}
          <div className="py-2 border-b border-dashed border-slate-400 space-y-0.5 text-[9.5px]">
            <div className="flex justify-between">
              <span className="text-slate-600">NO. TRANSAKSI:</span>
              <strong className="text-slate-900">{payment.payment_number}</strong>
            </div>
            {payment.invoice_number && (
              <div className="flex justify-between">
                <span className="text-slate-600">NO. FAKTUR:</span>
                <span className="font-bold">{payment.invoice_number}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-600">WAKTU BAYAR:</span>
              <span>{formatDate(payment.paid_at || payment.created_at, true)}</span>
            </div>
            <div className="flex justify-between pt-0.5">
              <span className="text-slate-600">PELANGGAN:</span>
              <strong className="text-slate-950 truncate max-w-[140px]">
                {customer.customer_name || payment.payment_number}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">ID CUST:</span>
              <span className="font-bold">{customer.customer_number || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">METODE:</span>
              <span className="font-semibold">{methodLabel(payment.payment_method)}</span>
            </div>
          </div>

          {/* Rincian Pembayaran */}
          <div className="py-2 border-b-2 border-dashed border-slate-800 space-y-1">
            <div className="flex justify-between font-bold text-slate-800 pb-1 border-b border-slate-300 uppercase text-[9.5px]">
              <span>KETERANGAN</span>
              <span>JUMLAH</span>
            </div>
            <div>
              <p className="font-bold text-slate-950 leading-tight">
                {payment.invoice_number ? `Pembayaran Faktur ${payment.invoice_number}` : "Pembayaran Layanan Internet"}
              </p>
              {payment.notes && (
                <p className="text-[9px] text-slate-500 italic mt-0.5">{payment.notes}</p>
              )}
            </div>

            <div className="flex justify-between font-black text-xs sm:text-sm pt-2 border-t border-slate-800 text-slate-950">
              <span>TOTAL DITERIMA:</span>
              <span>{formatRupiah(payment.amount)}</span>
            </div>
          </div>

          {/* Status Badge */}
          <div className="my-2 p-1.5 text-center border-2 border-slate-900 rounded font-black text-xs uppercase tracking-widest bg-slate-50">
            *** LUNAS / COMPLETED ***
          </div>
        </div>

        {/* Footer & Barcode */}
        <div className="pt-2 text-center text-[9px] text-slate-600 space-y-1">
          <p className="font-medium">Terima kasih atas pembayaran Anda.</p>
          <p className="text-[8.5px] text-slate-500">
            Bukti pembayaran ini sah dan diproses otomatis oleh sistem {template.brand_name || "ISPSYNC"}.
          </p>

          {/* Barcode Code 128 Nyata */}
          {payment.payment_number && (
            <div className="pt-2 flex flex-col items-center justify-center">
              <Barcode128
                value={payment.payment_number}
                height={is58mm ? 28 : 34}
                width={is58mm ? 0.95 : 1.15}
                fontSize={is58mm ? 8.5 : 9.5}
                caption="Bukti Pembayaran Sah"
              />
            </div>
          )}

          <div className="pt-1 text-[8px] text-slate-400">
            - - - - - - - - SIMPAN STRUK INI - - - - - - - -
          </div>
        </div>
      </div>
    );
  }

  // 2. ==================== KWITANSI RESMI (FORMAT A4 / SETENGAH A4) ====================
  const terbilangText = terbilang(payment.amount);

  return (
    <div
      id={elementId}
      className="bg-white text-slate-900 w-full max-w-[210mm] min-h-[148mm] p-6 sm:p-10 shadow-md sm:rounded-xl border border-slate-200 print:shadow-none print:border-none print:p-0 flex flex-col justify-between"
    >
      <div>
        {/* Kop Surat Perusahaan */}
        <div
          className="flex flex-col sm:flex-row justify-between items-start pb-4 border-b-2 gap-4"
          style={{ borderColor: accentColor }}
        >
          <div className="flex items-start gap-3.5">
            <div className="w-14 h-14 rounded-xl bg-white p-1 border border-slate-200 shadow-xs flex items-center justify-center shrink-0">
              <img
                src={template.logo_url || "/logo.png"}
                alt={template.brand_name || "Logo"}
                className="w-full h-full object-contain"
                onError={(e: any) => {
                  e.target.src = "/logo.png";
                }}
              />
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight" style={{ color: accentColor }}>
                {template.brand_name || "ISPSYNC"}
              </span>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">
                {template.company_name || "PT Inovasi Sistem Pintar"}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed max-w-sm">
                {template.address} &bull; WA: {template.phone} &bull; Email: {template.email}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <h2
              className="text-xl font-black tracking-wider uppercase border-b-2 pb-0.5"
              style={{ color: accentColor, borderColor: accentColor }}
            >
              KWITANSI PEMBAYARAN
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              OFFICIAL PAYMENT RECEIPT
            </p>
            <table className="mt-2 text-xs text-left sm:text-right ml-auto">
              <tbody>
                <tr>
                  <td className="text-slate-500 pr-3">No. Kwitansi:</td>
                  <td className="font-mono font-bold text-slate-900">{payment.payment_number}</td>
                </tr>
                {payment.invoice_number && (
                  <tr>
                    <td className="text-slate-500 pr-3">No. Faktur:</td>
                    <td className="font-mono font-semibold text-blue-600">{payment.invoice_number}</td>
                  </tr>
                )}
                <tr>
                  <td className="text-slate-500 pr-3">Tanggal:</td>
                  <td className="font-medium text-slate-800">
                    {formatDate(payment.paid_at || payment.created_at, true)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Status Stamp */}
        <div className="my-5 flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-lg text-xs font-black uppercase bg-emerald-600 text-white tracking-wider shadow-xs">
              ✓ LUNAS (PAID)
            </span>
            <span className="text-xs text-slate-600">
              Metode: <strong className="text-slate-800">{methodLabel(payment.payment_method)}</strong>
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Total Diterima</span>
            <span className="text-xl font-black text-emerald-600">{formatRupiah(payment.amount)}</span>
          </div>
        </div>

        {/* Rincian Kwitansi Tradisional Formal */}
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-12 gap-2 border-b border-slate-200 pb-3">
            <div className="col-span-3 font-semibold text-slate-600 uppercase tracking-wider text-[11px]">
              Telah Diterima Dari
            </div>
            <div className="col-span-9 font-bold text-slate-900 text-sm">
              {customer.customer_name || "Pelanggan Terdaftar"}
              {customer.customer_number && (
                <span className="font-normal font-mono text-slate-500 text-xs ml-2">
                  (ID: {customer.customer_number})
                </span>
              )}
              {customer.phone && (
                <div className="text-xs font-normal text-slate-600 mt-0.5">Kontak / WA: {customer.phone}</div>
              )}
              {customer.address && (
                <div className="text-xs font-normal text-slate-500 mt-0.5 leading-snug">{customer.address}</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2 border-b border-slate-200 pb-3">
            <div className="col-span-3 font-semibold text-slate-600 uppercase tracking-wider text-[11px]">
              Uang Sejumlah
            </div>
            <div className="col-span-9">
              <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200 text-slate-800 font-serif italic text-xs font-medium">
                # {terbilangText ? `${terbilangText} Rupiah` : formatRupiah(payment.amount)} #
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2 border-b border-slate-200 pb-3">
            <div className="col-span-3 font-semibold text-slate-600 uppercase tracking-wider text-[11px]">
              Untuk Pembayaran
            </div>
            <div className="col-span-9 text-slate-800 space-y-1">
              <p className="font-semibold text-slate-900">
                {payment.invoice_number
                  ? `Pelunasan Faktur Tagihan Internet No. ${payment.invoice_number}`
                  : "Pembayaran Tagihan Layanan Akses Internet"}
              </p>
              {invoice?.billing_period_start && (
                <p className="text-slate-500 text-[11px]">
                  Periode Pemakaian: {formatDate(invoice.billing_period_start)} s/d {formatDate(invoice.billing_period_end || "")}
                </p>
              )}
              {payment.notes && (
                <p className="text-slate-600 text-[11px] bg-amber-50 p-2 rounded border border-amber-200">
                  Catatan: {payment.notes}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tanda Tangan & Cap Sah */}
      <div className="pt-6 mt-6 border-t border-slate-200">
        <div className="flex justify-between items-end text-xs">
          <div className="max-w-sm text-[10px] text-slate-500 space-y-1">
            <p className="font-bold text-slate-700">Ketentuan &amp; Keabsahan:</p>
            <p>1. Kwitansi ini merupakan bukti pembayaran yang sah dan mengikat yang diterbitkan oleh sistem penagihan {template.brand_name || "ISPSYNC"}.</p>
            <p>2. Pembayaran yang telah lunas tidak dapat dibatalkan atau ditarik kembali kecuali atas persetujuan manajemen.</p>
          </div>

          <div className="text-center w-56">
            <p className="text-[11px] text-slate-600 mb-1">
              Diterima &amp; Diverifikasi Oleh,
            </p>
            <p className="text-xs font-bold text-slate-900">{template.company_name || "PT Inovasi Sistem Pintar"}</p>
            <div className="h-16 flex items-center justify-center">
              <div className="border border-emerald-600 text-emerald-700 font-extrabold text-[10px] px-3 py-1 rounded rotate-[-5deg] uppercase tracking-wider bg-emerald-50/50">
                LUNAS &bull; {payment.payment_number}
              </div>
            </div>
            <div className="border-t border-slate-300 pt-1 font-bold text-slate-800 text-[11px]">
              Petugas Kasir / Billing
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

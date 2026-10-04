package billing

import (
	"fmt"
	"strings"
	"time"

	"github.com/gigabill/isp/internal/customer"
)

// CompanyInfo represents the ISP issuer details shown on the invoice.
type CompanyInfo struct {
	CompanyName   string
	BrandName     string
	LicenseNo     string
	TaxID         string // NPWP
	Address       string
	Phone         string
	Email         string
	Website       string
	BankBCA       string
	BankMandiri   string
	BankBRI       string
	AccountHolder string
}

// DefaultCompanyInfo returns standard ISPSYNC corporate credentials.
func DefaultCompanyInfo() CompanyInfo {
	return CompanyInfo{
		CompanyName:   "PT GIGA NUSANTARA SOLUSINDO",
		BrandName:     "GOGIGA NET",
		LicenseNo:     "SK Kominfo RI No. 128/TEL.02.02/2024 (Izin ISP & Jartaplok)",
		TaxID:         "03.882.194.5-014.000",
		Address:       "Gedung Cyber 1 Lt. 3, Jl. Kuningan Barat No. 8, Jakarta Selatan",
		Phone:         "+62 811-6677-8899 / (021) 5088-7766",
		Email:         "info@ispsync.id",
		Website:       "https://ispsync.id",
		BankBCA:       "8910-234-567",
		BankMandiri:   "111-00-9876543-2",
		BankBRI:       "0018-01-002345-50-9",
		AccountHolder: "PT GIGA NUSANTARA SOLUSINDO",
	}
}

// RenderInvoiceHTML generates a pixel-perfect, telco-grade A4 invoice page.
func RenderInvoiceHTML(inv *Invoice, cust *customer.Customer, info CompanyInfo, payURL, qrURL string) string {
	issueDateStr := "-"
	if inv.IssueDate != nil {
		issueDateStr = inv.IssueDate.Format("02 Jan 2006")
	}
	dueDateStr := inv.DueDate.Format("02 Jan 2006")
	periodStr := "-"
	if inv.BillingPeriodStart != nil && inv.BillingPeriodEnd != nil {
		periodStr = fmt.Sprintf("%s s/d %s", inv.BillingPeriodStart.Format("02 Jan 2006"), inv.BillingPeriodEnd.Format("02 Jan 2006"))
	}

	custName := "Pelanggan Yth."
	custNumber := "-"
	custPhone := "-"
	custEmail := "-"
	custAddress := "-"
	if cust != nil {
		custName = cust.FullName
		if cust.CustomerNumber != "" {
			custNumber = cust.CustomerNumber
		}
		if cust.Phone != "" {
			custPhone = cust.Phone
		}
		if cust.Email != nil && *cust.Email != "" {
			custEmail = *cust.Email
		}
		if len(cust.Addresses) > 0 {
			addr := cust.Addresses[0]
			custAddress = addr.Street
			if addr.City != "" {
				custAddress += ", " + addr.City
			}
		}
	} else if inv.CustomerName != nil {
		custName = *inv.CustomerName
		if inv.CustomerNumber != nil {
			custNumber = *inv.CustomerNumber
		}
		if inv.CustomerPhone != nil {
			custPhone = *inv.CustomerPhone
		}
	}

	// Status Watermark & Badges
	badgeClass := "badge-issued"
	badgeText := "BELUM LUNAS"
	watermarkClass := "stamp-unpaid"
	watermarkText := "BELUM LUNAS"
	if inv.Status == StatusPaid {
		badgeClass = "badge-paid"
		badgeText = "LUNAS / PAID"
		watermarkClass = "stamp-paid"
		watermarkText = "LUNAS"
	} else if inv.Status == StatusOverdue || time.Now().After(inv.DueDate) {
		badgeClass = "badge-overdue"
		badgeText = "JATUH TEMPO / OVERDUE"
		watermarkClass = "stamp-overdue"
		watermarkText = "OVERDUE"
	}

	var itemsHTML strings.Builder
	for idx, item := range inv.Items {
		taxPct := fmt.Sprintf("%.1f%%", float64(item.TaxPercent)/100.0)
		itemsHTML.WriteString(fmt.Sprintf(`
			<tr>
				<td class="text-center font-mono">%d</td>
				<td>
					<div class="font-bold text-slate-800">%s</div>
					<div class="text-xs text-slate-500">%s</div>
				</td>
				<td class="text-center font-mono">%d</td>
				<td class="text-right font-mono">%s</td>
				<td class="text-center font-mono text-xs">%s</td>
				<td class="text-right font-mono font-semibold text-slate-900">%s</td>
			</tr>
		`, idx+1, escapeHTML(item.Description), escapeHTML(string(item.ItemType)), item.Quantity, item.UnitPrice.String(), taxPct, item.Total.String()))
	}

	if len(inv.Items) == 0 {
		itemsHTML.WriteString(fmt.Sprintf(`
			<tr>
				<td class="text-center font-mono">1</td>
				<td>
					<div class="font-bold text-slate-800">Biaya Layanan Internet Broadband</div>
					<div class="text-xs text-slate-500">Periode: %s</div>
				</td>
				<td class="text-center font-mono">1</td>
				<td class="text-right font-mono">%s</td>
				<td class="text-center font-mono text-xs">11.0%%</td>
				<td class="text-right font-mono font-semibold text-slate-900">%s</td>
			</tr>
		`, periodStr, inv.Subtotal.String(), inv.TotalAmount.String()))
	}

	// Terbilang
	terbilangText := terbilangRupiah(inv.TotalAmount.Int64())

	// Payment Buttons / Actions
	payActionHTML := ""
	if inv.Status != StatusPaid && payURL != "" {
		payActionHTML = fmt.Sprintf(`
			<a href="%s" target="_blank" class="no-print inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg transition shadow-emerald-500/20 text-sm">
				💳 Bayar Sekarang via Online
			</a>
		`, payURL)
	}

	qrBlockHTML := ""
	if qrURL != "" && inv.Status != StatusPaid {
		qrBlockHTML = fmt.Sprintf(`
			<div class="p-3 bg-white border border-slate-200 rounded-xl shadow-xs text-center inline-block">
				<img src="%s" alt="QRIS Code" class="w-32 h-32 mx-auto object-contain" />
				<p class="text-[10px] font-bold text-slate-600 mt-1 uppercase tracking-wider">Scan QRIS Dinamis</p>
			</div>
		`, qrURL)
	}

	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="id">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Faktur Tagihan %s - %s</title>
	<script src="https://cdn.tailwindcss.com"></script>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
	<style>
		body {
			font-family: 'Plus Jakarta Sans', sans-serif;
			background-color: #f8fafc;
			color: #1e293b;
		}
		.font-mono {
			font-family: 'JetBrains Mono', monospace;
		}
		.invoice-card {
			max-width: 210mm;
			min-height: 297mm;
			margin: 20px auto;
			background: #ffffff;
			box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
			padding: 40px 48px;
			position: relative;
			box-sizing: border-box;
		}
		/* Watermark Stamp */
		.stamp {
			position: absolute;
			top: 240px;
			right: 70px;
			font-size: 38px;
			font-weight: 800;
			text-transform: uppercase;
			border: 4px dashed;
			padding: 8px 24px;
			border-radius: 12px;
			transform: rotate(-12deg);
			opacity: 0.22;
			pointer-events: none;
			letter-spacing: 2px;
			font-family: 'Plus Jakarta Sans', sans-serif;
		}
		.stamp-paid {
			color: #059669;
			border-color: #059669;
		}
		.stamp-unpaid {
			color: #d97706;
			border-color: #d97706;
		}
		.stamp-overdue {
			color: #dc2626;
			border-color: #dc2626;
		}
		.badge-paid {
			background-color: #d1fae5;
			color: #065f46;
			border: 1px solid #a7f3d0;
		}
		.badge-issued {
			background-color: #fef3c7;
			color: #92400e;
			border: 1px solid #fde68a;
		}
		.badge-overdue {
			background-color: #fee2e2;
			color: #991b1b;
			border: 1px solid #fecaca;
		}
		@media print {
			body {
				background-color: #ffffff;
				margin: 0;
				padding: 0;
			}
			.no-print {
				display: none !important;
			}
			.invoice-card {
				box-shadow: none !important;
				margin: 0 !important;
				width: 100%% !important;
				max-width: 100%% !important;
				padding: 12mm 15mm !important;
				min-height: auto !important;
			}
			@page {
				size: A4 portrait;
				margin: 10mm;
			}
		}
	</style>
</head>
<body class="antialiased">

	<!-- Floating Print & Action Bar (Hidden when printing) -->
	<div class="no-print sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
		<div class="flex items-center gap-3">
			<span class="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
			<span class="font-bold text-sm tracking-wide">Faktur Tagihan Resmi: <span class="font-mono text-emerald-400 font-bold">%s</span></span>
		</div>
		<div class="flex items-center gap-3">
			%s
			<button onclick="window.print()" class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md transition text-sm">
				🖨️ Cetak / Unduh PDF
			</button>
			<a href="https://wa.me/6281100000000?text=Halo%%20NOC%%20ISPSYNC,%%20saya%%20ingin%%20konfirmasi%%20tagihan%%20%s" target="_blank" class="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium rounded-xl transition text-sm">
				💬 Chat Tim NOC
			</a>
		</div>
	</div>

	<!-- Printable A4 Document Container -->
	<div class="invoice-card rounded-2xl border border-slate-200/80">
		<!-- Watermark -->
		<div class="stamp %s">%s</div>

		<!-- Header: Issuer & Invoice Title -->
		<div class="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
			<div>
				<div class="flex items-center gap-3 mb-2">
					<div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-md">
						G
					</div>
					<div>
						<h1 class="text-xl font-extrabold tracking-tight text-slate-900 uppercase">%s</h1>
						<p class="text-xs text-slate-500 font-medium">%s</p>
					</div>
				</div>
				<div class="text-[11px] text-slate-500 leading-relaxed max-w-sm mt-2">
					<p><span class="font-semibold text-slate-700">Izin:</span> %s</p>
					<p><span class="font-semibold text-slate-700">NPWP:</span> <span class="font-mono">%s</span></p>
					<p><span class="font-semibold text-slate-700">Alamat:</span> %s</p>
					<p><span class="font-semibold text-slate-700">Helpdesk NOC:</span> %s | %s</p>
				</div>
			</div>

			<div class="text-right">
				<div class="inline-block uppercase tracking-widest text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-md mb-2">
					FAKTUR TAGIHAN / TAX INVOICE
				</div>
				<div class="font-mono font-bold text-2xl text-slate-900 tracking-tight">%s</div>
				<div class="mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider %s">
					%s
				</div>
				<div class="mt-3 text-xs text-slate-600 space-y-1">
					<p><span class="text-slate-400">Tgl Terbit:</span> <span class="font-mono font-semibold">%s</span></p>
					<p><span class="text-slate-400">Jatuh Tempo:</span> <span class="font-mono font-bold text-rose-600">%s</span></p>
					<p><span class="text-slate-400">Masa Layanan:</span> <span class="font-medium">%s</span></p>
				</div>
			</div>
		</div>

		<!-- Customer Information & Service Specs -->
		<div class="grid grid-cols-2 gap-6 bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 mb-6 text-xs">
			<div>
				<h3 class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Ditagihkan Kepada (Pelanggan):</h3>
				<div class="text-sm font-bold text-slate-900">%s</div>
				<div class="font-mono text-slate-600 mt-0.5">ID Pelanggan (CID): <span class="font-bold text-blue-600">%s</span></div>
				<div class="text-slate-600 mt-1">Telp / WA: <span class="font-mono">%s</span></div>
				<div class="text-slate-600">Email: %s</div>
				<div class="text-slate-500 mt-1.5 leading-relaxed"><span class="font-medium text-slate-700">Alamat Pemasangan:</span><br>%s</div>
			</div>
			<div class="border-l border-slate-200/80 pl-6">
				<h3 class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Informasi Layanan & Jaringan:</h3>
				<div class="space-y-1 text-slate-600">
					<p><span class="text-slate-400">Jenis Jaringan:</span> Fiber-to-the-Home (FTTH) / GPON</p>
					<p><span class="text-slate-400">Mata Uang:</span> <span class="font-mono font-bold">IDR (Rupiah)</span></p>
					<p><span class="text-slate-400">Perlakuan Pajak:</span> Termasuk PPN 11%% UU HPP</p>
					<p><span class="text-slate-400">Metode Verifikasi:</span> Auto-Reconcile Payment Gateway</p>
				</div>
				<div class="mt-3 p-2.5 bg-blue-50/80 border border-blue-100 rounded-lg text-[11px] text-blue-800">
					💡 <em>Layanan internet Anda akan otomatis diperpanjang setelah pelunasan diverifikasi sistem.</em>
				</div>
			</div>
		</div>

		<!-- Line Items Table -->
		<div class="mb-6">
			<table class="w-full text-xs">
				<thead>
					<tr class="border-b-2 border-slate-800 text-slate-500 uppercase tracking-wider text-[10px]">
						<th class="py-2.5 px-2 text-center w-10">No</th>
						<th class="py-2.5 px-2 text-left">Deskripsi Layanan / Item</th>
						<th class="py-2.5 px-2 text-center w-14">Qty</th>
						<th class="py-2.5 px-2 text-right w-28">Harga Satuan</th>
						<th class="py-2.5 px-2 text-center w-16">PPN</th>
						<th class="py-2.5 px-2 text-right w-32">Total (IDR)</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100">
					%s
				</tbody>
			</table>
		</div>

		<!-- Summary & Terbilang -->
		<div class="grid grid-cols-12 gap-6 border-t border-slate-200 pt-4 mb-6">
			<div class="col-span-7 space-y-3">
				<div>
					<span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Terbilang:</span>
					<div class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 italic">
						"%s"
					</div>
				</div>

				<!-- Bank Details & Payment Channels -->
				<div class="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs space-y-1.5">
					<div class="font-bold text-slate-800 flex items-center gap-1.5">
						<span>🏦</span> Rekening Pembayaran Resmi:
					</div>
					<div class="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
						<div>• Bank BCA: <span class="font-mono font-bold text-slate-800">%s</span></div>
						<div>• Bank Mandiri: <span class="font-mono font-bold text-slate-800">%s</span></div>
						<div>• Bank BRI: <span class="font-mono font-bold text-slate-800">%s</span></div>
						<div>a/n <span class="font-semibold text-slate-800">%s</span></div>
					</div>
				</div>
			</div>

			<div class="col-span-5 space-y-1.5 text-xs">
				<div class="flex justify-between py-1 border-b border-slate-100 text-slate-600">
					<span>Subtotal:</span>
					<span class="font-mono font-semibold text-slate-800">%s</span>
				</div>
				<div class="flex justify-between py-1 border-b border-slate-100 text-slate-600">
					<span>PPN 11%%:</span>
					<span class="font-mono font-semibold text-slate-800">%s</span>
				</div>
				<div class="flex justify-between py-1 border-b border-slate-100 text-slate-600">
					<span>Potongan / Diskon:</span>
					<span class="font-mono font-semibold text-slate-800">- %s</span>
				</div>
				<div class="flex justify-between py-2 border-b-2 border-slate-800 text-slate-900 font-bold text-sm bg-slate-50/80 px-2 rounded-lg mt-2">
					<span>TOTAL TAGIHAN:</span>
					<span class="font-mono text-blue-600 text-base">%s</span>
				</div>
				<div class="flex justify-between py-1 text-slate-500 text-[11px]">
					<span>Sudah Dibayar:</span>
					<span class="font-mono font-semibold text-emerald-600">%s</span>
				</div>
				<div class="flex justify-between py-1 text-slate-900 font-bold">
					<span>Sisa Tagihan:</span>
					<span class="font-mono font-bold text-rose-600 text-sm">%s</span>
				</div>
			</div>
		</div>

		<!-- QRIS & Notes Footer -->
		<div class="grid grid-cols-12 gap-6 items-center border-t border-slate-200/80 pt-4 text-xs text-slate-500">
			<div class="col-span-8 space-y-1">
				<p class="font-semibold text-slate-700">Ketentuan & Catatan Pembayaran:</p>
				<p class="text-[11px] leading-relaxed">
					1. Faktur ini merupakan dokumen elektronik yang sah sesuai ketentuan UU ITE dan dapat digunakan sebagai bukti pembayaran pajak.<br>
					2. Pembayaran wajib dilakukan sebelum tanggal jatuh tempo guna menghindari isolir sistem secara otomatis.<br>
					3. Apabila telah melakukan pembayaran, mohon simpan bukti transaksi perbankan Anda.
				</p>
			</div>
			<div class="col-span-4 text-center">
				%s
				<p class="text-[10px] text-slate-400 mt-2">Tercetak Otomatis oleh Sistem Billing ISPSYNC pada %s</p>
			</div>
		</div>
	</div>

</body>
</html>`,
		inv.InvoiceNumber,
		info.BrandName,
		inv.InvoiceNumber,
		payActionHTML,
		inv.InvoiceNumber,
		watermarkClass,
		watermarkText,
		info.BrandName,
		info.CompanyName,
		info.LicenseNo,
		info.TaxID,
		info.Address,
		info.Phone,
		info.Email,
		inv.InvoiceNumber,
		badgeClass,
		badgeText,
		issueDateStr,
		dueDateStr,
		periodStr,
		escapeHTML(custName),
		escapeHTML(custNumber),
		escapeHTML(custPhone),
		escapeHTML(custEmail),
		escapeHTML(custAddress),
		itemsHTML.String(),
		terbilangText,
		info.BankBCA,
		info.BankMandiri,
		info.BankBRI,
		info.AccountHolder,
		inv.Subtotal.String(),
		inv.TaxAmount.String(),
		inv.DiscountAmount.String(),
		inv.TotalAmount.String(),
		inv.AmountPaid.String(),
		inv.AmountDue.String(),
		qrBlockHTML,
		time.Now().Format("02 Jan 2006 15:04 WIB"),
	)
}

func escapeHTML(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	s = strings.ReplaceAll(s, "\"", "&quot;")
	return s
}

// terbilangRupiah converts an integer amount into formal Indonesian words.
func terbilangRupiah(n int64) string {
	if n == 0 {
		return "Nol Rupiah"
	}
	if n < 0 {
		return "Minus " + terbilangRupiah(-n)
	}

	satuan := []string{"", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"}

	var bilang func(int64) string
	bilang = func(num int64) string {
		switch {
		case num < 12:
			return satuan[num]
		case num < 20:
			return bilang(num-10) + " Belas"
		case num < 100:
			sisa := num % 10
			res := bilang(num/10) + " Puluh"
			if sisa > 0 {
				res += " " + bilang(sisa)
			}
			return res
		case num < 200:
			sisa := num % 100
			if sisa == 0 {
				return "Seratus"
			}
			return "Seratus " + bilang(sisa)
		case num < 1000:
			sisa := num % 100
			res := bilang(num/100) + " Ratus"
			if sisa > 0 {
				res += " " + bilang(sisa)
			}
			return res
		case num < 2000:
			sisa := num % 1000
			if sisa == 0 {
				return "Seribu"
			}
			return "Seribu " + bilang(sisa)
		case num < 1000000:
			sisa := num % 1000
			res := bilang(num/1000) + " Ribu"
			if sisa > 0 {
				res += " " + bilang(sisa)
			}
			return res
		case num < 1000000000:
			sisa := num % 1000000
			res := bilang(num/1000000) + " Juta"
			if sisa > 0 {
				res += " " + bilang(sisa)
			}
			return res
		default:
			sisa := num % 1000000000
			res := bilang(num/1000000000) + " Miliar"
			if sisa > 0 {
				res += " " + bilang(sisa)
			}
			return res
		}
	}

	res := strings.TrimSpace(bilang(n)) + " Rupiah"
	return res
}

func FormatThousands(s string) string {
	negative := false
	if strings.HasPrefix(s, "-") {
		negative = true
		s = s[1:]
	}

	n := len(s)
	if n <= 3 {
		if negative {
			return "-" + s
		}
		return s
	}

	var b strings.Builder
	if negative {
		b.WriteByte('-')
	}

	rem := n % 3
	if rem > 0 {
		b.WriteString(s[:rem])
		if n > rem {
			b.WriteByte('.')
		}
	}

	for i := rem; i < n; i += 3 {
		b.WriteString(s[i : i+3])
		if i+3 < n {
			b.WriteByte('.')
		}
	}

	return b.String()
}

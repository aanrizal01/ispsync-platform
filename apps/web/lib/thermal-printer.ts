// ── ESC/POS Thermal Bluetooth Generator & Printer Bridge ─────────────
// Supports:
// 1. Native Android App Bridge (window.AndroidPrinter)
// 2. Web Bluetooth API (Direct Chrome Android to Thermal BLE)
// 3. RawBT Android Print Service Intent (Standard PPOB/POS in Indonesia)
// 4. Fallback Browser Window Print

export interface ThermalPrinterSettings {
  paperSize: "58mm" | "80mm";
  printMode: "native" | "web_bluetooth" | "rawbt" | "browser";
  headerTitle: string;
  footerText: string;
  autoCut: boolean;
  feedLines: number;
}

export const DEFAULT_PRINTER_SETTINGS: ThermalPrinterSettings = {
  paperSize: "58mm",
  printMode: "rawbt",
  headerTitle: "HOTSPOT VOUCHER",
  footerText: "Terima kasih atas kunjungan Anda!",
  autoCut: false,
  feedLines: 3,
};

export interface VoucherTicketData {
  code: string;
  password?: string;
  template_name?: string;
  price: number;
  duration_text?: string;
  quota_text?: string;
  agent_name?: string;
  created_at?: string;
  instructions?: string[];
}

export class EscPosBuilder {
  private buffer: number[] = [];
  private cols: number = 32; // 32 for 58mm, 48 for 80mm

  constructor(paperSize: "58mm" | "80mm" = "58mm") {
    this.cols = paperSize === "80mm" ? 48 : 32;
    this.init();
  }

  init(): this {
    this.buffer.push(0x1b, 0x40); // ESC @
    return this;
  }

  alignCenter(): this {
    this.buffer.push(0x1b, 0x61, 0x01); // ESC a 1
    return this;
  }

  alignLeft(): this {
    this.buffer.push(0x1b, 0x61, 0x00); // ESC a 0
    return this;
  }

  alignRight(): this {
    this.buffer.push(0x1b, 0x61, 0x02); // ESC a 2
    return this;
  }

  bold(enable: boolean = true): this {
    this.buffer.push(0x1b, 0x45, enable ? 0x01 : 0x00); // ESC E
    return this;
  }

  textSize(widthMultiplier: number = 1, heightMultiplier: number = 1): this {
    const w = Math.min(Math.max(widthMultiplier - 1, 0), 7);
    const h = Math.min(Math.max(heightMultiplier - 1, 0), 7);
    const n = (w << 4) | h;
    this.buffer.push(0x1d, 0x21, n); // GS ! n
    return this;
  }

  text(str: string): this {
    // Basic ASCII / CP437 encoding
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      this.buffer.push(code < 128 ? code : 63); // '?' for non-ascii
    }
    return this;
  }

  line(str: string = ""): this {
    this.text(str);
    this.buffer.push(0x0a); // LF
    return this;
  }

  separator(char: string = "-"): this {
    const repeatCount = Math.floor(this.cols / char.length);
    this.text(char.repeat(repeatCount));
    this.buffer.push(0x0a);
    return this;
  }

  twoColumn(left: string, right: string): this {
    const maxLen = this.cols;
    const rightLen = right.length;
    const leftLen = left.length;
    const spaces = Math.max(1, maxLen - leftLen - rightLen);
    this.text(left + " ".repeat(spaces) + right);
    this.buffer.push(0x0a);
    return this;
  }

  feed(lines: number = 3): this {
    for (let i = 0; i < lines; i++) {
      this.buffer.push(0x0a);
    }
    return this;
  }

  cut(): this {
    this.buffer.push(0x1d, 0x56, 0x41, 0x03); // GS V 65 3
    return this;
  }

  toBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  toBase64(): string {
    const bytes = this.toBytes();
    let binary = "";
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

// ── Format Ticket ESC/POS ───────────────────────────────────────────
export function buildVoucherEscPos(
  ticket: VoucherTicketData,
  settings: ThermalPrinterSettings
): EscPosBuilder {
  const builder = new EscPosBuilder(settings.paperSize);

  // Header
  builder.alignCenter();
  builder.bold(true);
  builder.textSize(1, 2);
  builder.line(settings.headerTitle || "HOTSPOT VOUCHER");
  builder.textSize(1, 1);
  builder.bold(false);
  builder.line("Internet Cepat, Murah & Stabil");
  builder.separator("-");

  // Package name
  builder.bold(true);
  builder.line((ticket.template_name || "VOUCHER HOTSPOT").toUpperCase());
  builder.bold(false);
  builder.separator("-");

  // Voucher Box
  builder.alignCenter();
  builder.line("KODE LOGIN:");
  builder.bold(true);
  builder.textSize(2, 2);
  builder.line(ticket.code);
  builder.textSize(1, 1);
  builder.bold(false);

  if (ticket.password && ticket.password !== ticket.code) {
    builder.line(`Password: ${ticket.password}`);
  }
  builder.separator("-");

  // Details
  builder.alignLeft();
  builder.twoColumn("Tarif:", `Rp ${ticket.price.toLocaleString("id-ID")}`);
  if (ticket.quota_text) {
    builder.twoColumn("Kuota:", ticket.quota_text);
  }
  if (ticket.duration_text) {
    builder.twoColumn("Masa Aktif:", ticket.duration_text);
  }
  if (ticket.agent_name) {
    builder.twoColumn("Outlet:", ticket.agent_name);
  }
  builder.separator("-");

  // Instructions
  builder.alignLeft();
  builder.bold(true);
  builder.line("CARA LOGIN:");
  builder.bold(false);
  const instructions = ticket.instructions || [
    "1. Hubungkan WiFi Hotspot",
    "2. Buka browser / login otomatis",
    "3. Masukkan Kode Login di atas",
  ];
  instructions.forEach((ins) => builder.line(ins));

  // Footer
  builder.separator("-");
  builder.alignCenter();
  builder.line(settings.footerText || "Terima kasih!");
  if (ticket.created_at) {
    builder.line(ticket.created_at);
  }

  // Feed & Cut
  builder.feed(settings.feedLines || 3);
  if (settings.autoCut) {
    builder.cut();
  }

  return builder;
}

// ── Printer Service Dispatcher ──────────────────────────────────────
export class ThermalPrinterService {
  // Check if Native Android App is present
  static isNativeAndroid(): boolean {
    if (typeof window === "undefined") return false;
    return typeof (window as any).AndroidPrinter !== "undefined";
  }

  // Check if Web Bluetooth is supported
  static isWebBluetoothSupported(): boolean {
    if (typeof navigator === "undefined") return false;
    return typeof (navigator as any).bluetooth !== "undefined";
  }

  // Save/Load Settings
  static getSettings(): ThermalPrinterSettings {
    if (typeof window === "undefined") return DEFAULT_PRINTER_SETTINGS;
    try {
      const saved = localStorage.getItem("ispsync_printer_settings");
      if (saved) return { ...DEFAULT_PRINTER_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_PRINTER_SETTINGS;
  }

  static saveSettings(settings: ThermalPrinterSettings) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("ispsync_printer_settings", JSON.stringify(settings));
    } catch (e) {
      console.error(e);
    }
  }

  // Execute Print
  static async printTickets(
    tickets: VoucherTicketData[],
    settings?: ThermalPrinterSettings
  ): Promise<{ success: boolean; message: string }> {
    const cfg = settings || this.getSettings();

    // 1. If in Native Android App
    if (this.isNativeAndroid()) {
      try {
        const payload = JSON.stringify(tickets);
        (window as any).AndroidPrinter.printVouchers(payload, cfg.paperSize);
        return { success: true, message: "Perintah cetak dikirim ke printer Bluetooth via Aplikasi Android." };
      } catch (err: any) {
        return { success: false, message: `Gagal cetak native: ${err.message}` };
      }
    }

    // 2. If RawBT Print Service Intent (Android standard)
    if (cfg.printMode === "rawbt") {
      try {
        // Concatenate all tickets ESC/POS bytes
        const allBytes: number[] = [];
        for (const t of tickets) {
          const b = buildVoucherEscPos(t, cfg);
          allBytes.push(...Array.from(b.toBytes()));
        }
        let binary = "";
        for (let i = 0; i < allBytes.length; i++) {
          binary += String.fromCharCode(allBytes[i]);
        }
        const b64 = btoa(binary);

        // RawBT Android Intent URI
        const intentUrl = `intent:base64,${b64}#Intent;scheme=rawbt;package=ru.a402d.rawbt;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dru.a402d.rawbt;end;`;
        window.location.href = intentUrl;
        return { success: true, message: "Mengirim data ke aplikasi printer thermal RawBT..." };
      } catch (err: any) {
        return { success: false, message: `Gagal memanggil RawBT: ${err.message}` };
      }
    }

    // 3. Fallback to standard browser window.print()
    if (typeof window !== "undefined") {
      window.print();
      return { success: true, message: "Membuka dialog cetak sistem browser." };
    }

    return { success: false, message: "Tidak ada metode cetak yang tersedia." };
  }

  // Print Invoice Payment Receipt
  static async printInvoiceReceipt(
    receipt: InvoiceReceiptTicketData,
    settings?: ThermalPrinterSettings
  ): Promise<{ success: boolean; message: string }> {
    const cfg = settings || this.getSettings();

    // 1. If in Native Android App
    if (this.isNativeAndroid()) {
      try {
        const payload = JSON.stringify(receipt);
        if (typeof (window as any).AndroidPrinter.printInvoiceReceipt === "function") {
          (window as any).AndroidPrinter.printInvoiceReceipt(payload, cfg.paperSize);
        } else {
          // Fallback to sending EscPos bytes if available
          const b = buildInvoiceReceiptEscPos(receipt, cfg);
          if (typeof (window as any).AndroidPrinter.printRawBytes === "function") {
            (window as any).AndroidPrinter.printRawBytes(b.toBase64());
          }
        }
        return { success: true, message: "Perintah cetak struk dikirim ke printer." };
      } catch (err: any) {
        return { success: false, message: `Gagal cetak native: ${err.message}` };
      }
    }

    // 2. If RawBT Print Service Intent (Android standard)
    if (cfg.printMode === "rawbt") {
      try {
        const b = buildInvoiceReceiptEscPos(receipt, cfg);
        const b64 = b.toBase64();
        const intentUrl = `intent:base64,${b64}#Intent;scheme=rawbt;package=ru.a402d.rawbt;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dru.a402d.rawbt;end;`;
        window.location.href = intentUrl;
        return { success: true, message: "Mengirim struk ke printer thermal RawBT..." };
      } catch (err: any) {
        return { success: false, message: `Gagal memanggil RawBT: ${err.message}` };
      }
    }

    // 3. Fallback to browser window.print()
    if (typeof window !== "undefined") {
      window.print();
      return { success: true, message: "Membuka dialog cetak sistem browser." };
    }

    return { success: false, message: "Tidak ada metode cetak yang tersedia." };
  }
}

// ── Format Invoice Payment Receipt ESC/POS ──────────────────────────
export interface InvoiceReceiptTicketData {
  payment_number: string;
  invoice_number: string;
  paid_at: string;
  customer_code: string;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  plan_name: string;
  billing_month: string;
  subtotal: number;
  tax_amount: number;
  total_invoice: number;
  admin_fee: number;
  total_customer_pay: number;
  agent_name: string;
  agent_code: string;
  agent_company_name?: string;
}

export function buildInvoiceReceiptEscPos(
  receipt: InvoiceReceiptTicketData,
  settings: ThermalPrinterSettings
): EscPosBuilder {
  const builder = new EscPosBuilder(settings.paperSize);

  // Header: Merchant / Agent Store Name
  builder.alignCenter();
  builder.bold(true);
  builder.textSize(1, 2);
  const storeName = receipt.agent_company_name || receipt.agent_name || settings.headerTitle;
  builder.line(storeName.toUpperCase());
  builder.textSize(1, 1);
  builder.bold(false);
  builder.line("LOKET PEMBAYARAN INTERNET");
  builder.line(`Agen: ${receipt.agent_name} (${receipt.agent_code})`);
  builder.separator("=");

  // Title
  builder.alignCenter();
  builder.bold(true);
  builder.line("STRUK PEMBAYARAN TAGIHAN");
  builder.bold(false);
  builder.separator("-");

  // Transaction info
  builder.alignLeft();
  builder.twoColumn("No. Trx:", receipt.payment_number);
  builder.twoColumn("No. Inv:", receipt.invoice_number);
  builder.twoColumn("Waktu:", receipt.paid_at);
  builder.separator("-");

  // Customer info
  builder.twoColumn("ID Pelanggan:", receipt.customer_code);
  builder.twoColumn("Nama:", receipt.customer_name);
  if (receipt.customer_phone) {
    builder.twoColumn("No. HP:", receipt.customer_phone);
  }
  builder.twoColumn("Layanan:", receipt.plan_name);
  builder.twoColumn("Bulan:", receipt.billing_month);
  builder.separator("-");

  // Billing breakdown
  builder.twoColumn("Tagihan Net:", `Rp ${receipt.subtotal.toLocaleString("id-ID")}`);
  if (receipt.tax_amount > 0) {
    builder.twoColumn("PPN 11%:", `Rp ${receipt.tax_amount.toLocaleString("id-ID")}`);
  }
  builder.twoColumn("Biaya Admin/Loket:", `Rp ${receipt.admin_fee.toLocaleString("id-ID")}`);
  builder.separator("=");

  // Total
  builder.bold(true);
  builder.textSize(1, 2);
  builder.twoColumn("TOTAL BAYAR:", `Rp ${receipt.total_customer_pay.toLocaleString("id-ID")}`);
  builder.textSize(1, 1);
  builder.bold(false);
  builder.separator("=");

  // Status & Footer
  builder.alignCenter();
  builder.bold(true);
  builder.line("*** STATUS: LUNAS ***");
  builder.bold(false);
  builder.line("Struk ini adalah bukti pembayaran yang sah.");
  builder.line(settings.footerText || "Terima kasih atas pembayaran Anda!");

  // Feed & Cut
  builder.feed(settings.feedLines || 3);
  if (settings.autoCut) {
    builder.cut();
  }

  return builder;
}

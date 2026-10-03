import AsyncStorage from "@react-native-async-storage/async-storage";
import { PrinterSettings } from "../types/tenant";

const STORAGE_KEY_PRINTER = "@ispsync_printer_settings";

export interface VoucherPrintItem {
  code: string;
  password?: string;
  serialNumber?: string;
  profileName: string;
  priceFormatted: string;
  validity: string;
  quota?: string;
  brandName?: string;
  wifiBrand?: string;
  csPhone?: string;
  qrData?: string;
}

export class PrinterService {
  /**
   * Mengambil pengaturan printer dari storage lokal
   */
  static async getSettings(): Promise<PrinterSettings> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_PRINTER);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {}
    return {
      selectedDeviceId: "",
      selectedDeviceName: "Belum Dihubungkan",
      paperSize: "58mm",
      autoCut: true,
    };
  }

  /**
   * Menyimpan pengaturan printer
   */
  static async saveSettings(settings: PrinterSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_PRINTER, JSON.stringify(settings));
    } catch (e) {}
  }

  /**
   * Format ESC/POS Receipt Voucher untuk printer thermal 58mm / 80mm
   */
  static generateVoucherEscPos(
    voucher: VoucherPrintItem,
    paperSize: "58mm" | "80mm" = "58mm"
  ): Uint8Array {
    const lineWidth = paperSize === "80mm" ? 48 : 32;
    const separator = "-".repeat(lineWidth);
    const doubleSep = "=".repeat(lineWidth);

    const encoder = new TextEncoder();
    const parts: number[] = [];

    const addText = (text: string) => {
      const bytes = encoder.encode(text);
      for (let i = 0; i < bytes.length; i++) parts.push(bytes[i]);
    };

    // ESC @: Inisialisasi printer
    parts.push(0x1b, 0x40);

    // Header: Rata Tengah (ESC a 1)
    parts.push(0x1b, 0x61, 0x01);

    // Font Bold ON (ESC E 1)
    parts.push(0x1b, 0x45, 0x01);
    addText(`${voucher.brandName || "ISPSYNC NET"}\n`);

    if (voucher.wifiBrand) {
      addText(`Hotspot Zone: ${voucher.wifiBrand}\n`);
    }

    // Font Bold OFF (ESC E 0)
    parts.push(0x1b, 0x45, 0x00);
    addText(`${doubleSep}\n`);

    // Paket & Harga
    parts.push(0x1b, 0x61, 0x01);
    addText(`PAKET: ${voucher.profileName.toUpperCase()}\n`);
    addText(`MASA AKTIF: ${voucher.validity}\n`);
    if (voucher.quota) {
      addText(`KUOTA: ${voucher.quota}\n`);
    }
    addText(`${separator}\n`);

    // Kode Voucher (Besar / Double Height & Width: GS ! 0x11)
    parts.push(0x1d, 0x21, 0x11);
    parts.push(0x1b, 0x45, 0x01);
    addText(`${voucher.code}\n`);

    // Reset ukuran font normal (GS ! 0x00)
    parts.push(0x1d, 0x21, 0x00);
    parts.push(0x1b, 0x45, 0x00);

    if (voucher.password && voucher.password !== voucher.code) {
      addText(`Password: ${voucher.password}\n`);
    }

    if (voucher.serialNumber) {
      addText(`SN: ${voucher.serialNumber}\n`);
    }

    addText(`${separator}\n`);

    // Harga & Info Kasir
    addText(`TARIF: ${voucher.priceFormatted}\n`);
    addText(`Hubungi CS: ${voucher.csPhone || "+62 811-660-1234"}\n`);
    addText(`Terima Kasih Telah Berlangganan\n`);
    addText(`${doubleSep}\n\n\n`);

    // Paper Cut (GS V 66 0)
    parts.push(0x1d, 0x56, 0x42, 0x00);

    return new Uint8Array(parts);
  }
}

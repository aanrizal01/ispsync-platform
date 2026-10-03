export interface TenantProfile {
  slug: string;
  brandName: string;
  companyName: string;
  wifiBrandName?: string;
  wifiDomain: string;
  ledgerDomain?: string;
  portalDomain?: string;
  phone?: string;
  whatsappCS?: string;
  logoUrl?: string;
  accentColor?: string;
}

export type AppMode = "customer" | "agent";

export interface PrinterDevice {
  id: string;
  name: string;
  address?: string; // MAC address on Android or UUID on iOS
  connected?: boolean;
}

export interface PrinterSettings {
  selectedDeviceId: string;
  selectedDeviceName: string;
  paperSize: "58mm" | "80mm";
  autoCut: boolean;
}

export const DEFAULT_TENANTS: TenantProfile[] = [
  {
    slug: "gogiga",
    brandName: "GOGIGA NET",
    companyName: "PT Giga Nusantara Digital",
    wifiBrandName: "@gowifi",
    wifiDomain: "hotspot.gowifi.id",
    ledgerDomain: "ledger.gogiga.net.id",
    portalDomain: "portal.gogiga.net.id",
    phone: "+62 811-660-1234",
    whatsappCS: "628116601234",
    accentColor: "#06b6d4",
  },
  {
    slug: "ispmu",
    brandName: "ISPMU FIBER",
    companyName: "PT Mitra Usaha Data",
    wifiBrandName: "@ispmu",
    wifiDomain: "wifi.ispmu.ispsync.id",
    ledgerDomain: "ledger.ispmu.ispsync.id",
    portalDomain: "portal.ispmu.ispsync.id",
    phone: "+62 812-3456-7890",
    whatsappCS: "6281234567890",
    accentColor: "#3b82f6",
  },
  {
    slug: "dev",
    brandName: "ISPSYNC STAGING",
    companyName: "PT Inovasi Sistem Pintar",
    wifiBrandName: "@gowifi",
    wifiDomain: "wifi.dev.ispsync.id",
    ledgerDomain: "ledger.dev.ispsync.id",
    portalDomain: "portal.dev.ispsync.id",
    phone: "+62 811-660-1234",
    whatsappCS: "628116601234",
    accentColor: "#06b6d4",
  },
];

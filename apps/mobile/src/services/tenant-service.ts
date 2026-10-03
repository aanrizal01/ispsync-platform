import AsyncStorage from "@react-native-async-storage/async-storage";
import { TenantProfile, DEFAULT_TENANTS, AppMode } from "../types/tenant";

const STORAGE_KEY_TENANT = "@ispsync_selected_tenant";
const STORAGE_KEY_MODE = "@ispsync_app_mode";

export class TenantService {
  /**
   * Mendapatkan tenant aktif yang tersimpan di perangkat
   */
  static async getActiveTenant(): Promise<TenantProfile | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_TENANT);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn("Failed to get stored tenant:", e);
    }
    // Default fallback to DEV tenant for preview
    return DEFAULT_TENANTS[2]; // dev
  }

  /**
   * Menyimpan tenant aktif
   */
  static async setActiveTenant(tenant: TenantProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_TENANT, JSON.stringify(tenant));
    } catch (e) {
      console.warn("Failed to save tenant:", e);
    }
  }

  /**
   * Mengambil mode aplikasi aktif (customer / agent)
   */
  static async getAppMode(): Promise<AppMode> {
    try {
      const mode = await AsyncStorage.getItem(STORAGE_KEY_MODE);
      if (mode === "agent" || mode === "customer") {
        return mode;
      }
    } catch (e) {}
    return "customer";
  }

  /**
   * Menyimpan mode aplikasi (customer / agent)
   */
  static async setAppMode(mode: AppMode): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_MODE, mode);
    } catch (e) {}
  }

  /**
   * Menghasilkan URL target WebView berdasarkan tenant dan role
   */
  static getTargetUrl(tenant: TenantProfile, mode: AppMode): string {
    const domain = tenant.wifiDomain || `${tenant.slug}.ispsync.id`;
    if (mode === "agent") {
      return `https://${domain}/agent/dashboard`;
    }
    // Mode customer: Portal belanja voucher & status
    return `https://${domain}/hotspot/buy`;
  }

  /**
   * Ambil profil tenant dari server secara remote
   */
  static async fetchRemoteProfile(slugOrDomain: string): Promise<TenantProfile | null> {
    try {
      // Normalisasi input
      let slug = slugOrDomain.trim().toLowerCase();
      if (slug.includes(".")) {
        // e.g. wifi.ispmu.ispsync.id -> ispmu
        const parts = slug.split(".");
        if (parts.length >= 3) {
          slug = parts[parts.length - 3] === "wifi" ? parts[parts.length - 2] : parts[0];
        }
      }

      // Check default static catalog first
      const found = DEFAULT_TENANTS.find((t) => t.slug === slug);
      if (found) return found;

      // Try fetching from API
      const res = await fetch(`https://api.ispsync.id/api/v1/tenant/${slug}/profile`, {
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.data) {
          return {
            slug: data.data.slug || slug,
            brandName: data.data.brand_name || slug.toUpperCase(),
            companyName: data.data.company_name || "",
            wifiBrandName: data.data.wifi_brand_name || `@${slug}`,
            wifiDomain: data.data.wifi_domain || `wifi.${slug}.ispsync.id`,
            phone: data.data.phone || "",
            whatsappCS: data.data.whatsapp_cs || "",
            accentColor: data.data.accent_color || "#06b6d4",
          };
        }
      }
    } catch (e) {
      console.warn("Could not fetch remote tenant profile:", e);
    }
    return null;
  }
}

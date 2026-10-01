import fs from "fs";
import path from "path";

export type PricingPlan = {
  id: string;
  label: string;
  name: string;
  description: string;
  price: string;
  period: string;
  capacity: string;
  engine?: string;
  color?: string;
  featured?: boolean;
  featuredLabel?: string;
  features: string[];
};

export type AddonItem = {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  icon: string;
};

export type SiteConfig = {
  logo?: { type: string; text?: string; url?: string };
  navbar?: { brand: string; badge?: string };
  hero?: {
    badge: string;
    title: string;
    titleHighlight: string;
    description: string;
    ctaDemo: string;
    ctaDemoUrl: string;
    ctaWA: string;
    ctaWAPhone: string;
  };
  pricing?: PricingPlan[];
  addons?: AddonItem[];
};

export function getSiteConfig(): SiteConfig | null {
  try {
    const configPath = path.join(process.cwd(), "data", "site-config.json");
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Failed to load site-config.json:", err);
  }
  return null;
}

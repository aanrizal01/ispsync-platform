import { Metadata } from "next";
import { LedgerShowcase } from "@/components/showcase/LedgerShowcase";

export const metadata: Metadata = {
  title: {
    absolute: "ISPSYNC Ledger — Financial, Automated Invoicing & AAA Engine Showcase",
  },
  description: "Spesifikasi dan Arsitektur Teknis Carrier-Grade ISPSYNC Ledger (Engine 3).",
};

export default function LedgerShowcasePage() {
  return <LedgerShowcase />;
}

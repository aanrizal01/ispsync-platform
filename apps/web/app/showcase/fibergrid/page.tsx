import { Metadata } from "next";
import { FiberGridShowcase } from "@/components/showcase/FiberGridShowcase";

export const metadata: Metadata = {
  title: {
    absolute: "ISPSYNC FiberGrid — FTTX Physical Infrastructure & Wholesale Showcase",
  },
  description: "Spesifikasi dan Arsitektur Teknis Carrier-Grade ISPSYNC FiberGrid (Engine 1).",
};

export default function FiberGridShowcasePage() {
  return <FiberGridShowcase />;
}

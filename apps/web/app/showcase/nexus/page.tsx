import { Metadata } from "next";
import { NexusShowcase } from "@/components/showcase/NexusShowcase";

export const metadata: Metadata = {
  title: {
    absolute: "ISPSYNC Nexus — Retail CRM, Field Operations & Coverage Showcase",
  },
  description: "Spesifikasi dan Arsitektur Teknis Carrier-Grade ISPSYNC Nexus (Engine 2).",
};

export default function NexusShowcasePage() {
  return <NexusShowcase />;
}

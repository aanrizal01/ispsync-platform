import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/context";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: {
    default: "ISPSYNC — Enterprise Telecom & ISP Operations Platform",
    template: "%s | ISPSYNC",
  },
  description:
    "ISPSYNC — Carrier-Grade Network Orchestration, RADIUS AAA & Telecom Operations Platform for Licensed Operators",
  icons: {
    icon: [
      { url: "/web/ispsync_favicon.svg", type: "image/svg+xml" },
      { url: "/logo-prism.png", type: "image/png" },
    ],
    shortcut: "/web/ispsync_favicon.svg",
    apple: "/logo-prism.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased bg-slate-50 text-slate-900 font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

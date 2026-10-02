import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Masuk ke Dashboard",
  },
  description: "Login ke Backoffice Ledger & Management Platform",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

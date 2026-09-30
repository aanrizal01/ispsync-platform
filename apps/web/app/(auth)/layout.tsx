import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Login ke ISPSYNC CMS — Network & Management Platform",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

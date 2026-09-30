import { MemberProvider } from "./context";

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return <MemberProvider>{children}</MemberProvider>;
}

import { SystemShell } from "@/components/system-shell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SystemShell>{children}</SystemShell>;
}

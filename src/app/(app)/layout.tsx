import { AppShell } from "@/components/app-shell";
import { ProtectedScreen } from "@/components/protected-screen";

export default function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppShell>
      <ProtectedScreen>{children}</ProtectedScreen>
    </AppShell>
  );
}

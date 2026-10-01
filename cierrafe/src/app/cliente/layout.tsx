import { exigirSesionDev } from "@/lib/dev-auth";

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  await exigirSesionDev(["empresa", "estudio"]);
  return children;
}

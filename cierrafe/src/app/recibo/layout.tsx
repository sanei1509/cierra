import { exigirSesionDev } from "@/lib/dev-auth";

export default async function ReciboLayout({ children }: { children: React.ReactNode }) {
  await exigirSesionDev(["empleado", "empresa", "estudio"]);
  return children;
}

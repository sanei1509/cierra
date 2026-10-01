import { exigirSesionDev } from "@/lib/dev-auth";

export default async function PortalEmpleadoLayout({ children }: { children: React.ReactNode }) {
  await exigirSesionDev(["empleado", "estudio"]);
  return children;
}

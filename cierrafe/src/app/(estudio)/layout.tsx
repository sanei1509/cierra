import { Shell } from "@/components/shell";
import { exigirSesionDev } from "@/lib/dev-auth";
import { cerrarSesion } from "../login/actions";

export default async function EstudioLayout({ children }: { children: React.ReactNode }) {
  const sesion = await exigirSesionDev(["estudio"]);
  const esVistaDelegada = "delegadoPor" in sesion && Boolean(sesion.delegadoPor);

  return (
    <Shell vistaDelegada={esVistaDelegada} logoutAction={cerrarSesion}>
      {children}
    </Shell>
  );
}

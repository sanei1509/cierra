import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEV_SESSION_COOKIE, parsearSesionDev, type DevAccess, type DevSession } from "./dev-session";

type ActorPermitido = DevAccess["actor"] | "cualquiera";

export async function obtenerSesionDev(): Promise<DevSession | null> {
  const valor = (await cookies()).get(DEV_SESSION_COOKIE)?.value;
  return parsearSesionDev(valor);
}

export async function exigirSesionDev(permitidos: ActorPermitido[]) {
  const sesion = await obtenerSesionDev();
  if (!sesion) redirect("/login");
  if (!permitidos.includes("cualquiera") && !permitidos.includes(sesion.actor)) redirect("/login");
  return sesion;
}

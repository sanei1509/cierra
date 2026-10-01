import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { actorSesionReal, parsearSesionReal, REAL_SESSION_COOKIE } from "./auth-session";
import { DEV_SESSION_COOKIE, parsearSesionDev, type DevAccess, type DevSession } from "./dev-session";

type ActorPermitido = DevAccess["actor"] | "cualquiera";

export async function obtenerSesionDev(): Promise<DevSession | null> {
  const valor = (await cookies()).get(DEV_SESSION_COOKIE)?.value;
  return parsearSesionDev(valor);
}

export async function exigirSesionDev(permitidos: ActorPermitido[]) {
  const cookieStore = await cookies();
  const sesionReal = parsearSesionReal(cookieStore.get(REAL_SESSION_COOKIE)?.value);
  if (sesionReal) {
    const actor = actorSesionReal(sesionReal.espacio);
    if (permitidos.includes("cualquiera") || permitidos.includes(actor)) return sesionReal;
  }

  const sesion = parsearSesionDev(cookieStore.get(DEV_SESSION_COOKIE)?.value);
  if (!sesion) redirect("/login");
  if (!permitidos.includes("cualquiera") && !permitidos.includes(sesion.actor)) redirect("/login");
  return sesion;
}

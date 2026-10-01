"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESOS_DESARROLLO, DEV_SESSION_COOKIE, buscarAccesoPorEmail, resolverDestinoPorEmail, serializarSesionDev, type DevAccessId } from "@/lib/dev-session";

export interface LoginState {
  email: string;
  error: string | null;
}

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 8,
};

async function guardarSesion(accesoId: DevAccessId) {
  const acceso = ACCESOS_DESARROLLO.find((a) => a.id === accesoId);
  if (!acceso) return null;
  (await cookies()).set(DEV_SESSION_COOKIE, serializarSesionDev(acceso), cookieOptions);
  return acceso.href;
}

export async function iniciarSesion(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { email, error: "Completá email y contraseña para entrar." };
  if (!buscarAccesoPorEmail(email)) return { email, error: "Ese mail todavía no fue cargado por un nivel superior." };

  const destino = resolverDestinoPorEmail(email);
  const acceso = ACCESOS_DESARROLLO.find((a) => a.email.toLowerCase() === email);
  if (acceso) {
    await guardarSesion(acceso.id);
  }

  redirect(destino ?? "/");
}

export async function entrarComoDesarrollo(accesoId: DevAccessId) {
  const destino = await guardarSesion(accesoId);
  redirect(destino ?? "/login");
}

export async function cerrarSesion() {
  (await cookies()).delete(DEV_SESSION_COOKIE);
  redirect("/login");
}

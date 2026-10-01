"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { autenticarConPassword } from "cierrabe/auth";
import type { UsuarioId } from "cierrabe/datos/contexto";
import { ACCESOS_DESARROLLO, DEV_SESSION_COOKIE, buscarAccesoPorEmail, resolverDestinoPorEmail, serializarSesionDev, type DevAccessId } from "@/lib/dev-session";
import { destinoSesionReal, puedeEmitirSesionReal, REAL_SESSION_COOKIE, serializarSesionReal } from "@/lib/auth-session";

export interface LoginState {
  email: string;
  error: string | null;
  submitKey: number;
}

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 8,
};

const realCookieOptions = {
  ...cookieOptions,
  secure: process.env.NODE_ENV === "production",
};

const MARCA_LOGIN_MS = 2800;

async function esperarMarcaLogin(inicio: number) {
  const restante = MARCA_LOGIN_MS - (Date.now() - inicio);
  if (restante > 0) await new Promise((resolve) => setTimeout(resolve, restante));
}

async function guardarSesion(accesoId: DevAccessId) {
  const acceso = ACCESOS_DESARROLLO.find((a) => a.id === accesoId);
  if (!acceso) return null;
  (await cookies()).set(DEV_SESSION_COOKIE, serializarSesionDev(acceso), cookieOptions);
  return acceso.href;
}

async function iniciarSesionReal(email: string, password: string) {
  if (!process.env.DATABASE_URL || !puedeEmitirSesionReal()) return null;

  const [{ crearAuthPasswordRepo }, { db }] = await Promise.all([
    import("cierrabe/datos/repos"),
    import("cierrabe/datos/db"),
  ]);
  const sesion = await autenticarConPassword(
    crearAuthPasswordRepo(db),
    { email, password },
    { adminSistemaUsuarioId: process.env.CIERRA_DEV_ADMIN_ID as UsuarioId | undefined },
  );
  const cookieStore = await cookies();
  cookieStore.set(REAL_SESSION_COOKIE, serializarSesionReal(sesion), realCookieOptions);
  cookieStore.delete(DEV_SESSION_COOKIE);
  return destinoSesionReal(sesion.espacio);
}

export async function iniciarSesion(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const inicio = Date.now();
  const submitKey = Number(formData.get("submitKey") ?? 0) || 0;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { email, error: "Completá email y contraseña para entrar.", submitKey };

  if (process.env.DATABASE_URL) {
    let destinoReal: string | null = null;
    try {
      destinoReal = await iniciarSesionReal(email, password);
    } catch {
      return { email, error: "Email o contraseña inválidos.", submitKey };
    }
    if (destinoReal) {
      await esperarMarcaLogin(inicio);
      redirect(destinoReal);
    }
    if (process.env.NODE_ENV === "production") return { email, error: "No pudimos iniciar sesión.", submitKey };
  }

  if (process.env.NODE_ENV === "production") return { email, error: "Email o contraseña inválidos.", submitKey };
  if (!buscarAccesoPorEmail(email)) return { email, error: "Ese mail todavía no fue cargado por un nivel superior.", submitKey };

  const destino = resolverDestinoPorEmail(email);
  const acceso = ACCESOS_DESARROLLO.find((a) => a.email.toLowerCase() === email);
  if (acceso) {
    await guardarSesion(acceso.id);
  }

  await esperarMarcaLogin(inicio);
  redirect(destino ?? "/");
}

export async function entrarComoDesarrollo(accesoId: DevAccessId) {
  const destino = await guardarSesion(accesoId);
  redirect(destino ?? "/login");
}

export async function cerrarSesion() {
  const cookieStore = await cookies();
  cookieStore.delete(DEV_SESSION_COOKIE);
  cookieStore.delete(REAL_SESSION_COOKIE);
  redirect("/login");
}

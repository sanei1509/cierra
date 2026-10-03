import { NextResponse, type NextRequest } from "next/server";
import { ACCESOS_DESARROLLO, DEV_SESSION_COOKIE, parsearSesionDev, serializarSesionDev } from "@/lib/dev-session";
import { REAL_SESSION_COOKIE } from "@/lib/auth-session";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 8,
};

export async function GET(request: NextRequest) {
  const sesion = parsearSesionDev(request.cookies.get(DEV_SESSION_COOKIE)?.value);
  const admin = ACCESOS_DESARROLLO.find((acceso) => acceso.id === "system_admin");
  const respuesta = NextResponse.redirect(new URL("/admin", request.url));

  if (sesion?.delegadoPor && admin) {
    respuesta.cookies.set(DEV_SESSION_COOKIE, serializarSesionDev(admin), cookieOptions);
    respuesta.cookies.delete(REAL_SESSION_COOKIE);
  }

  return respuesta;
}

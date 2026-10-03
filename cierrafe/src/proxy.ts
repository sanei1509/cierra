import { NextResponse, type NextRequest } from "next/server";

const DEV_SESSION_COOKIE = "cierra_dev_session";
const REAL_SESSION_COOKIE = "cierra_session";

const adminSession = JSON.stringify({
  accesoId: "system_admin",
  email: "admin@cierra.local",
  usuarioId: null,
  actor: "sistema",
  delegadoPor: null,
});

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 8,
};

function esSesionDelegada(valor: string | undefined) {
  if (!valor) return false;

  try {
    const sesion = JSON.parse(valor) as { actor?: string; delegadoPor?: unknown };
    return sesion.actor !== "sistema" && Boolean(sesion.delegadoPor);
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  if (!esSesionDelegada(request.cookies.get(DEV_SESSION_COOKIE)?.value)) return NextResponse.next();

  const respuesta = NextResponse.redirect(new URL(request.nextUrl.pathname + request.nextUrl.search, request.url));
  respuesta.cookies.set(DEV_SESSION_COOKIE, adminSession, cookieOptions);
  respuesta.cookies.delete(REAL_SESSION_COOKIE);
  return respuesta;
}

export const config = {
  matcher: "/admin/:path*",
};

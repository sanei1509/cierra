import { createHmac, timingSafeEqual } from "node:crypto";
import type { EspacioAcceso, SesionAutenticada } from "cierrabe/auth";

export const REAL_SESSION_COOKIE = "cierra_session";

export interface RealSessionPayload {
  usuarioId: string;
  email?: string;
  nombre?: string;
  exp: number;
  espacio: EspacioAcceso;
}

const encoder = new TextEncoder();

function base64url(valor: string) {
  return Buffer.from(valor, "utf8").toString("base64url");
}

function firmar(valor: string, secreto: string) {
  return createHmac("sha256", secreto).update(valor).digest("base64url");
}

function secretoSesion() {
  return process.env.CIERRA_SESSION_SECRET ?? (process.env.NODE_ENV !== "production" ? "cierra-dev-session-secret" : null);
}

export function puedeEmitirSesionReal() {
  return Boolean(secretoSesion());
}

export function serializarSesionReal(sesion: SesionAutenticada) {
  const secreto = secretoSesion();
  if (!secreto) throw new Error("CIERRA_SESSION_SECRET no configurado");

  const payload: RealSessionPayload = {
    usuarioId: sesion.usuario.id,
    email: sesion.usuario.email,
    nombre: sesion.usuario.nombre,
    exp: sesion.expira.getTime(),
    espacio: sesion.espacio,
  };
  const body = base64url(JSON.stringify(payload));
  return `${body}.${firmar(body, secreto)}`;
}

export function parsearSesionReal(valor: string | undefined): RealSessionPayload | null {
  const secreto = secretoSesion();
  if (!valor || !secreto) return null;
  const [body, firma] = valor.split(".");
  if (!body || !firma) return null;

  const esperada = firmar(body, secreto);
  const firmaBytes = encoder.encode(firma);
  const esperadaBytes = encoder.encode(esperada);
  if (firmaBytes.length !== esperadaBytes.length || !timingSafeEqual(firmaBytes, esperadaBytes)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as RealSessionPayload;
    if (!payload.usuarioId || !payload.exp || !payload.espacio || payload.exp <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function destinoSesionReal(espacio: EspacioAcceso) {
  if (espacio.actorTipo === "sistema") return "/admin";
  if (espacio.actorTipo === "estudio") return "/";
  if (espacio.actorTipo === "empresa") return `/cliente/${espacio.empresaId}`;
  return `/portal/${espacio.empleadoId}`;
}

export function actorSesionReal(espacio: EspacioAcceso) {
  return espacio.actorTipo;
}

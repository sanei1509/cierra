import type { AccessContext, EstudioId, UsuarioId } from "cierrabe/datos/contexto";

export const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type EstudioAccessContext = Extract<AccessContext, { actorTipo: "estudio" }>;
export type SistemaAccessContext = Extract<AccessContext, { actorTipo: "sistema" }>;

export function uuidValido(valor: string | undefined) {
  return Boolean(valor && uuidRegex.test(valor));
}

export function backendRealDisponible() {
  return Boolean(process.env.DATABASE_URL);
}

export function contextoAdminDesarrollo(): SistemaAccessContext | null {
  const usuarioId = process.env.CIERRA_DEV_ADMIN_ID;
  if (!backendRealDisponible() || !uuidValido(usuarioId)) return null;
  return {
    actorTipo: "sistema",
    usuarioId: usuarioId as UsuarioId,
    rol: "system_admin",
  };
}

export function contextoEstudioDesarrollo(): EstudioAccessContext | null {
  const estudioId = process.env.CIERRA_DEV_ESTUDIO_ID;
  const usuarioId = process.env.CIERRA_DEV_USUARIO_ID;
  if (!backendRealDisponible() || !uuidValido(estudioId) || !uuidValido(usuarioId)) return null;
  return {
    actorTipo: "estudio",
    usuarioId: usuarioId as UsuarioId,
    estudioId: estudioId as EstudioId,
    rol: "studio_admin",
    empresasPermitidas: "todas",
  };
}

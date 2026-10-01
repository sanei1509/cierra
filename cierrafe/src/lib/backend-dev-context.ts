import type { AccessContext, EstudioId, UsuarioId } from "cierrabe/datos/contexto";
import type { DevSession } from "./dev-session";

export const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type EstudioAccessContext = Extract<AccessContext, { actorTipo: "estudio" }>;
export type SistemaAccessContext = Extract<AccessContext, { actorTipo: "sistema" }>;

export function uuidValido(valor: string | undefined) {
  return Boolean(valor && uuidRegex.test(valor));
}

export function backendRealDisponible() {
  return Boolean(process.env.DATABASE_URL);
}

export function contextoAdminDesarrollo(sesion?: DevSession | null): SistemaAccessContext | null {
  const usuarioId = process.env.CIERRA_DEV_ADMIN_ID;
  if (sesion && (sesion.actor !== "sistema" || sesion.accesoId !== "system_admin")) return null;
  if (!backendRealDisponible() || !uuidValido(usuarioId)) return null;
  return {
    actorTipo: "sistema",
    usuarioId: usuarioId as UsuarioId,
    rol: "system_admin",
  };
}

export function contextoEstudioDesarrollo(sesion?: DevSession | null): EstudioAccessContext | null {
  const estudioId = process.env.CIERRA_DEV_ESTUDIO_ID;
  const usuarioId = process.env.CIERRA_DEV_USUARIO_ID;
  if (sesion && sesion.actor !== "estudio") return null;
  if (!backendRealDisponible() || !uuidValido(estudioId) || !uuidValido(usuarioId)) return null;

  const rol =
    sesion?.accesoId === "payroll_operator"
      ? "payroll_operator"
      : sesion?.accesoId === "studio_readonly"
        ? "studio_readonly"
        : "studio_admin";

  const delegadoPor =
    sesion?.accesoId === "admin_as_study"
      ? (() => {
          const adminId = process.env.CIERRA_DEV_ADMIN_ID;
          if (!uuidValido(adminId)) return null;
          return {
            usuarioId: adminId as UsuarioId,
            rol: "system_admin" as const,
            motivo: sesion.delegadoPor?.motivo ?? "Sesion de desarrollo delegada",
            iniciadaEn: new Date(),
          };
        })()
      : undefined;

  if (sesion?.accesoId === "admin_as_study" && !delegadoPor) return null;

  return {
    actorTipo: "estudio",
    usuarioId: usuarioId as UsuarioId,
    estudioId: estudioId as EstudioId,
    rol,
    empresasPermitidas: "todas",
    ...(delegadoPor ? { delegadoPor } : {}),
  };
}

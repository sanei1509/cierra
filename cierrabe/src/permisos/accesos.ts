import type { AccessContext, EmpleadoId, EmpresaId, EstudioId } from "../datos/contexto";
import { noAutenticado, noEncontrado, sinPermiso } from "../datos/errores";

export type RecursoEstudio = { estudioId: EstudioId };
export type RecursoEmpresa = RecursoEstudio & { empresaId: EmpresaId };
export type RecursoEmpleado = RecursoEmpresa & { empleadoId: EmpleadoId };

export type AccionEstudio = "ver" | "editar" | "configurar" | "liquidar" | "cerrar" | "administrar_comercial";
export type AccionEmpresa = "ver" | "editar" | "cargar_novedades" | "aprobar_liquidacion";
export type AccionEmpleado = "ver" | "editar_datos" | "ver_recibos";

export function assertAutenticado(ctx: AccessContext | null | undefined): asserts ctx is AccessContext {
  if (!ctx) noAutenticado();
}

export function puedeVerEstudio(ctx: AccessContext, recurso: RecursoEstudio) {
  if (ctx.actorTipo === "sistema") return true;
  return ctx.estudioId === recurso.estudioId;
}

export function puedeAdministrarSistema(ctx: AccessContext) {
  return ctx.actorTipo === "sistema" && ctx.rol === "system_admin";
}

export function puedeAdministrarComercial(ctx: AccessContext) {
  return puedeAdministrarSistema(ctx);
}

export function puedeDarAltaEstudio(ctx: AccessContext) {
  return puedeAdministrarSistema(ctx);
}

export function puedeDarAltaEmpresa(ctx: AccessContext, recurso: RecursoEstudio) {
  if (!puedeVerEstudio(ctx, recurso)) return false;
  if (ctx.actorTipo === "sistema") return ctx.rol === "system_admin";
  return ctx.actorTipo === "estudio" && (ctx.rol === "studio_owner" || ctx.rol === "studio_admin");
}

export function puedeDarAltaEmpleado(ctx: AccessContext, recurso: RecursoEmpresa) {
  if (!puedeVerEmpresa(ctx, recurso)) return false;
  if (ctx.actorTipo === "sistema") return ctx.rol === "system_admin";
  if (ctx.actorTipo === "estudio") return ctx.rol !== "studio_readonly";
  return ctx.actorTipo === "empresa" && (ctx.rol === "company_owner" || ctx.rol === "company_operator");
}

export function puedeVerEmpresa(ctx: AccessContext, recurso: RecursoEmpresa) {
  if (!puedeVerEstudio(ctx, recurso)) return false;
  if (ctx.actorTipo === "sistema") return true;
  if (ctx.actorTipo === "estudio") return ctx.empresasPermitidas === "todas" || ctx.empresasPermitidas.includes(recurso.empresaId);
  return ctx.empresaId === recurso.empresaId;
}

export function puedeVerEmpleado(ctx: AccessContext, recurso: RecursoEmpleado) {
  if (!puedeVerEmpresa(ctx, recurso)) return false;
  if (ctx.actorTipo === "empleado") return ctx.empleadoId === recurso.empleadoId;
  return true;
}

export function puedeAccionEstudio(ctx: AccessContext, accion: AccionEstudio, recurso: RecursoEstudio) {
  if (!puedeVerEstudio(ctx, recurso)) return false;
  if (accion === "administrar_comercial") return puedeAdministrarComercial(ctx);
  if (ctx.actorTipo === "sistema") return true;
  if (ctx.actorTipo !== "estudio") return false;
  if (ctx.rol === "studio_readonly") return accion === "ver";
  if (ctx.rol === "payroll_operator") return accion === "ver" || accion === "liquidar" || accion === "cerrar";
  return true;
}

export function puedeAccionEmpresa(ctx: AccessContext, accion: AccionEmpresa, recurso: RecursoEmpresa) {
  if (!puedeVerEmpresa(ctx, recurso)) return false;
  if (ctx.actorTipo === "sistema") return true;
  if (ctx.actorTipo === "estudio") {
    if (ctx.rol === "studio_readonly") return accion === "ver";
    return true;
  }
  if (ctx.actorTipo === "empresa") {
    if (ctx.rol === "company_readonly") return accion === "ver";
    if (ctx.rol === "company_operator") return accion === "ver" || accion === "cargar_novedades";
    return true;
  }
  return false;
}

export function puedeAccionEmpleado(ctx: AccessContext, accion: AccionEmpleado, recurso: RecursoEmpleado) {
  if (!puedeVerEmpleado(ctx, recurso)) return false;
  if (ctx.actorTipo === "sistema") return true;
  if (ctx.actorTipo === "estudio") return ctx.rol !== "studio_readonly" || accion === "ver" || accion === "ver_recibos";
  if (ctx.actorTipo === "empresa") return accion === "ver" || accion === "ver_recibos";
  return accion === "ver" || accion === "editar_datos" || accion === "ver_recibos";
}

export function exigirEstudio(ctx: AccessContext | null | undefined, accion: AccionEstudio, recurso: RecursoEstudio) {
  assertAutenticado(ctx);
  if (!puedeVerEstudio(ctx, recurso)) noEncontrado();
  if (!puedeAccionEstudio(ctx, accion, recurso)) sinPermiso();
}

export function exigirEmpresa(ctx: AccessContext | null | undefined, accion: AccionEmpresa, recurso: RecursoEmpresa) {
  assertAutenticado(ctx);
  if (!puedeVerEmpresa(ctx, recurso)) noEncontrado();
  if (!puedeAccionEmpresa(ctx, accion, recurso)) sinPermiso();
}

export function exigirEmpleado(ctx: AccessContext | null | undefined, accion: AccionEmpleado, recurso: RecursoEmpleado) {
  assertAutenticado(ctx);
  if (!puedeVerEmpleado(ctx, recurso)) noEncontrado();
  if (!puedeAccionEmpleado(ctx, accion, recurso)) sinPermiso();
}

export function exigirAltaEstudio(ctx: AccessContext | null | undefined) {
  assertAutenticado(ctx);
  if (!puedeDarAltaEstudio(ctx)) sinPermiso();
}

export function exigirAltaEmpresa(ctx: AccessContext | null | undefined, recurso: RecursoEstudio) {
  assertAutenticado(ctx);
  if (!puedeVerEstudio(ctx, recurso)) noEncontrado();
  if (!puedeDarAltaEmpresa(ctx, recurso)) sinPermiso();
}

export function exigirAltaEmpleado(ctx: AccessContext | null | undefined, recurso: RecursoEmpresa) {
  assertAutenticado(ctx);
  if (!puedeVerEmpresa(ctx, recurso)) noEncontrado();
  if (!puedeDarAltaEmpleado(ctx, recurso)) sinPermiso();
}

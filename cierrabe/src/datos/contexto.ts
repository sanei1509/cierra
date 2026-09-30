import type { Rol } from "../dominio/types";

export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type EstudioId = Brand<string, "EstudioId">;
export type UsuarioId = Brand<string, "UsuarioId">;
export type EmpresaId = Brand<string, "EmpresaId">;
export type EmpleadoId = Brand<string, "EmpleadoId">;
export type PeriodoId = Brand<string, "PeriodoId">;
export type NovedadId = Brand<string, "NovedadId">;
export type AuditEventId = Brand<string, "AuditEventId">;

export interface TenantContext {
  estudioId: EstudioId;
  usuarioId: UsuarioId;
  rol: Rol;
  empresasPermitidas: EmpresaId[] | "todas";
}

export function puedeVerEmpresa(ctx: TenantContext, empresaId: EmpresaId) {
  return ctx.empresasPermitidas === "todas" || ctx.empresasPermitidas.includes(empresaId);
}

export function puedeEscribir(ctx: TenantContext) {
  return ctx.rol === "admin" || ctx.rol === "liquidador";
}

export function puedeConfigurar(ctx: TenantContext) {
  return ctx.rol === "admin";
}

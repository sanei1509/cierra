import type { Rol } from "../dominio/types";

export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type EstudioId = Brand<string, "EstudioId">;
export type UsuarioId = Brand<string, "UsuarioId">;
export type EmpresaId = Brand<string, "EmpresaId">;
export type EmpleadoId = Brand<string, "EmpleadoId">;
export type PeriodoId = Brand<string, "PeriodoId">;
export type NovedadId = Brand<string, "NovedadId">;
export type AuditEventId = Brand<string, "AuditEventId">;

export type RolSistema = "system_admin" | "support_admin";
export type RolEstudio = "studio_owner" | "studio_admin" | "payroll_operator" | "studio_readonly";
export type RolEmpresa = "company_owner" | "company_operator" | "company_readonly";
export type RolEmpleado = "employee_self";
export type RolAcceso = RolSistema | RolEstudio | RolEmpresa | RolEmpleado;

export interface DelegacionSistema {
  usuarioId: UsuarioId;
  rol: RolSistema;
  motivo: string;
  iniciadaEn: Date;
}

export type AccessContext =
  | {
      actorTipo: "sistema";
      usuarioId: UsuarioId;
      rol: RolSistema;
    }
  | {
      actorTipo: "estudio";
      usuarioId: UsuarioId;
      estudioId: EstudioId;
      rol: RolEstudio;
      empresasPermitidas: EmpresaId[] | "todas";
      delegadoPor?: DelegacionSistema;
    }
  | {
      actorTipo: "empresa";
      usuarioId: UsuarioId;
      estudioId: EstudioId;
      empresaId: EmpresaId;
      rol: RolEmpresa;
    }
  | {
      actorTipo: "empleado";
      usuarioId: UsuarioId;
      estudioId: EstudioId;
      empresaId: EmpresaId;
      empleadoId: EmpleadoId;
      rol: RolEmpleado;
    };

export interface TenantContext {
  estudioId: EstudioId;
  usuarioId: UsuarioId;
  rol: Rol;
  empresasPermitidas: EmpresaId[] | "todas";
  delegadoPor?: DelegacionSistema;
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

export function tenantContextDesdeAcceso(ctx: AccessContext): TenantContext | null {
  if (ctx.actorTipo === "sistema") return null;
  if (ctx.actorTipo === "empresa") {
    return { estudioId: ctx.estudioId, usuarioId: ctx.usuarioId, rol: "lectura", empresasPermitidas: [ctx.empresaId] };
  }
  if (ctx.actorTipo === "empleado") {
    return { estudioId: ctx.estudioId, usuarioId: ctx.usuarioId, rol: "lectura", empresasPermitidas: [ctx.empresaId] };
  }
  const rol: Rol = ctx.rol === "studio_readonly" ? "lectura" : ctx.rol === "payroll_operator" ? "liquidador" : "admin";
  return { estudioId: ctx.estudioId, usuarioId: ctx.usuarioId, rol, empresasPermitidas: ctx.empresasPermitidas, delegadoPor: ctx.delegadoPor };
}

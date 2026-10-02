import { cookies } from "next/headers";
import { listarEmpleadosEmpresa, listarEmpresasEstudio } from "cierrabe/acciones";
import {
  tenantContextDesdeAcceso,
  type AccessContext,
  type EmpleadoId,
  type EmpresaId,
  type EstudioId,
  type PeriodoId,
  type TenantContext,
  type UsuarioId,
} from "cierrabe/datos/contexto";
import { crearAuditoriaRepo, crearEmpleadosRepo, crearEmpresasRepo, crearNovedadesRepo, crearPeriodosRepo, crearReciboVistasRepo } from "cierrabe/datos/repos";
import { parsearSesionReal, REAL_SESSION_COOKIE } from "./auth-session";
import { contextoEstudioDesarrollo, uuidValido } from "./backend-dev-context";
import { obtenerSesionDev } from "./dev-auth";
import type { AuditEvent, Empleado, Empresa, Novedad, Periodo } from "./types";

const DEV_ESTUDIO_ID_DEFAULT = "00000000-0000-4000-8000-000000000002";
const DEV_USUARIO_ID_DEFAULT = "00000000-0000-4000-8000-000000000003";

export interface DatosOperativosIniciales {
  modo: "real" | "demo";
  empresas: Empresa[];
  empleados: Empleado[];
  periodos: Periodo[];
  novedades: Novedad[];
  audit: AuditEvent[];
  vistas: Record<string, string>;
}

export async function contextoEstudioActual(): Promise<Extract<AccessContext, { actorTipo: "estudio" }> | null> {
  const sesionReal = parsearSesionReal((await cookies()).get(REAL_SESSION_COOKIE)?.value);
  if (sesionReal?.espacio.actorTipo === "estudio") {
    return {
      actorTipo: "estudio",
      usuarioId: sesionReal.usuarioId as UsuarioId,
      estudioId: sesionReal.espacio.estudioId,
      rol: sesionReal.espacio.rol,
      empresasPermitidas: sesionReal.espacio.empresasPermitidas,
      delegadoPor: sesionReal.espacio.delegadoPor,
    };
  }

  return contextoEstudioDesarrollo(await obtenerSesionDev());
}

export async function contextoOperativoActual(): Promise<Exclude<AccessContext, { actorTipo: "sistema" }> | null> {
  const sesionReal = parsearSesionReal((await cookies()).get(REAL_SESSION_COOKIE)?.value);
  if (sesionReal && sesionReal.espacio.actorTipo !== "sistema") {
    return { ...sesionReal.espacio, usuarioId: sesionReal.usuarioId } as Exclude<AccessContext, { actorTipo: "sistema" }>;
  }

  const contextoDev = contextoEstudioDesarrollo(await obtenerSesionDev());
  if (contextoDev) return contextoDev;
  if (process.env.NODE_ENV === "production") return null;

  return {
    actorTipo: "estudio",
    usuarioId: (process.env.CIERRA_DEV_USUARIO_ID ?? DEV_USUARIO_ID_DEFAULT) as UsuarioId,
    estudioId: (process.env.CIERRA_DEV_ESTUDIO_ID ?? DEV_ESTUDIO_ID_DEFAULT) as EstudioId,
    rol: "studio_admin",
    empresasPermitidas: "todas",
  };
}

export async function cargarDatosOperativosIniciales(): Promise<DatosOperativosIniciales> {
  const ctx = await contextoEstudioActual();
  if (!ctx || !process.env.DATABASE_URL) return { modo: "demo", empresas: [], empleados: [], periodos: [], novedades: [], audit: [], vistas: {} };

  const { db } = await import("cierrabe/datos/db");
  const empresasRepo = crearEmpresasRepo(db);
  const empleadosRepo = crearEmpleadosRepo(db);
  const periodosRepo = crearPeriodosRepo(db);
  const novedadesRepo = crearNovedadesRepo(db);
  const auditoriaRepo = crearAuditoriaRepo(db);
  const reciboVistasRepo = crearReciboVistasRepo(db);
  const tenant = tenantContextDesdeAcceso(ctx);
  if (!tenant) return { modo: "demo", empresas: [], empleados: [], periodos: [], novedades: [], audit: [], vistas: {} };

  const empresas = (await listarEmpresasEstudio(ctx, empresasRepo, ctx.estudioId as EstudioId)) as Empresa[];
  const empleadosPorEmpresa = await Promise.all(
    empresas.map((empresa) => listarEmpleadosEmpresa(ctx, empleadosRepo, { estudioId: ctx.estudioId, empresaId: empresa.id as EmpresaId })),
  );
  const periodosPorEmpresa = await Promise.all(
    empresas.map((empresa) => periodosRepo.listarPorEmpresa(tenant, empresa.id as EmpresaId)),
  );
  const periodos = periodosPorEmpresa.flat() as Periodo[];
  const novedadesPorPeriodo = await Promise.all(
    periodos.map(async (periodo) => {
      const novedades = (await novedadesRepo.listarPorPeriodo(tenant, periodo.id as PeriodoId)) as Novedad[];
      return novedades.map((novedad) => ({ ...novedad, mes: periodo.mes }));
    }),
  );
  const auditPorEmpresa = await Promise.all(
    empresas.map((empresa) => auditoriaRepo.listar(tenant, { empresaId: empresa.id as EmpresaId, limite: 30 })),
  );
  const vistasPorEmpresa = await Promise.all(empresas.map((empresa) => reciboVistasRepo.listarPorEmpresa(tenant, empresa.id as EmpresaId)));

  return {
    modo: "real",
    empresas,
    empleados: empleadosPorEmpresa.flat() as Empleado[],
    periodos,
    novedades: novedadesPorPeriodo.flat(),
    audit: auditPorEmpresa.flat() as AuditEvent[],
    vistas: Object.fromEntries(vistasPorEmpresa.flat().map((vista) => [`${vista.empleadoId}|${vista.mes}`, vista.visto])),
  };
}

async function cargarDatosEmpresaDesdeTenant(tenant: TenantContext, empresaId: string): Promise<DatosOperativosIniciales> {
  const { db } = await import("cierrabe/datos/db");
  const empresasRepo = crearEmpresasRepo(db);
  const empleadosRepo = crearEmpleadosRepo(db);
  const periodosRepo = crearPeriodosRepo(db);
  const novedadesRepo = crearNovedadesRepo(db);
  const auditoriaRepo = crearAuditoriaRepo(db);
  const reciboVistasRepo = crearReciboVistasRepo(db);
  const empresa = await empresasRepo.obtener(tenant, empresaId as EmpresaId);
  if (!empresa) return { modo: "real", empresas: [], empleados: [], periodos: [], novedades: [], audit: [], vistas: {} };

  const empleados = (await empleadosRepo.listarPorEmpresa(tenant, empresa.id as EmpresaId)) as Empleado[];
  const periodos = (await periodosRepo.listarPorEmpresa(tenant, empresa.id as EmpresaId)) as Periodo[];
  const novedadesPorPeriodo = await Promise.all(
    periodos.map(async (periodo) => {
      const novedades = (await novedadesRepo.listarPorPeriodo(tenant, periodo.id as PeriodoId)) as Novedad[];
      return novedades.map((novedad) => ({ ...novedad, mes: periodo.mes }));
    }),
  );
  const audit = (await auditoriaRepo.listar(tenant, { empresaId: empresa.id as EmpresaId, limite: 30 })) as AuditEvent[];
  const vistas = await reciboVistasRepo.listarPorEmpresa(tenant, empresa.id as EmpresaId);

  return {
    modo: "real",
    empresas: [empresa as Empresa],
    empleados,
    periodos,
    novedades: novedadesPorPeriodo.flat(),
    audit,
    vistas: Object.fromEntries(vistas.map((vista) => [`${vista.empleadoId}|${vista.mes}`, vista.visto])),
  };
}

export async function cargarDatosPortalEmpresa(empresaId: string): Promise<DatosOperativosIniciales> {
  const ctx = await contextoOperativoActual();
  if (!ctx || !process.env.DATABASE_URL || !uuidValido(empresaId)) return { modo: "demo", empresas: [], empleados: [], periodos: [], novedades: [], audit: [], vistas: {} };

  const tenant = tenantContextDesdeAcceso(ctx);
  if (!tenant) return { modo: "demo", empresas: [], empleados: [], periodos: [], novedades: [], audit: [], vistas: {} };

  return cargarDatosEmpresaDesdeTenant(tenant, empresaId);
}

export async function cargarDatosRecibosEmpresa(empresaId: string): Promise<DatosOperativosIniciales> {
  const ctx = await contextoEstudioActual();
  if (!ctx || !process.env.DATABASE_URL || !uuidValido(empresaId)) return { modo: "demo", empresas: [], empleados: [], periodos: [], novedades: [], audit: [], vistas: {} };

  const tenant = tenantContextDesdeAcceso(ctx);
  if (!tenant) return { modo: "demo", empresas: [], empleados: [], periodos: [], novedades: [], audit: [], vistas: {} };

  return cargarDatosEmpresaDesdeTenant(tenant, empresaId);
}

export async function cargarDatosPortalEmpleado(empleadoId: string): Promise<DatosOperativosIniciales> {
  const ctx = await contextoOperativoActual();
  if (!ctx || !process.env.DATABASE_URL || !uuidValido(empleadoId)) return { modo: "demo", empresas: [], empleados: [], periodos: [], novedades: [], audit: [], vistas: {} };

  const tenant = tenantContextDesdeAcceso(ctx);
  if (!tenant) return { modo: "demo", empresas: [], empleados: [], periodos: [], novedades: [], audit: [], vistas: {} };

  const { db } = await import("cierrabe/datos/db");
  const empleadosRepo = crearEmpleadosRepo(db);
  const empleado = await empleadosRepo.obtener(tenant, empleadoId as EmpleadoId);
  if (!empleado) return { modo: "real", empresas: [], empleados: [], periodos: [], novedades: [], audit: [], vistas: {} };
  return cargarDatosPortalEmpresa(empleado.empresaId);
}

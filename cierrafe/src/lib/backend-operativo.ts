import { cookies } from "next/headers";
import { listarEmpleadosEmpresa, listarEmpresasEstudio } from "cierrabe/acciones";
import { tenantContextDesdeAcceso, type AccessContext, type EmpresaId, type EstudioId, type PeriodoId, type UsuarioId } from "cierrabe/datos/contexto";
import { crearAuditoriaRepo, crearEmpleadosRepo, crearEmpresasRepo, crearNovedadesRepo, crearPeriodosRepo } from "cierrabe/datos/repos";
import { parsearSesionReal, REAL_SESSION_COOKIE } from "./auth-session";
import { contextoEstudioDesarrollo } from "./backend-dev-context";
import { obtenerSesionDev } from "./dev-auth";
import type { AuditEvent, Empleado, Empresa, Novedad, Periodo } from "./types";

export interface DatosOperativosIniciales {
  modo: "real" | "demo";
  empresas: Empresa[];
  empleados: Empleado[];
  periodos: Periodo[];
  novedades: Novedad[];
  audit: AuditEvent[];
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

export async function cargarDatosOperativosIniciales(): Promise<DatosOperativosIniciales> {
  const ctx = await contextoEstudioActual();
  if (!ctx || !process.env.DATABASE_URL) return { modo: "demo", empresas: [], empleados: [], periodos: [], novedades: [], audit: [] };

  const { db } = await import("cierrabe/datos/db");
  const empresasRepo = crearEmpresasRepo(db);
  const empleadosRepo = crearEmpleadosRepo(db);
  const periodosRepo = crearPeriodosRepo(db);
  const novedadesRepo = crearNovedadesRepo(db);
  const auditoriaRepo = crearAuditoriaRepo(db);
  const tenant = tenantContextDesdeAcceso(ctx);
  if (!tenant) return { modo: "demo", empresas: [], empleados: [], periodos: [], novedades: [], audit: [] };

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

  return {
    modo: "real",
    empresas,
    empleados: empleadosPorEmpresa.flat() as Empleado[],
    periodos,
    novedades: novedadesPorPeriodo.flat(),
    audit: auditPorEmpresa.flat() as AuditEvent[],
  };
}

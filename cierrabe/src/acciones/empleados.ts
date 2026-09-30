import type { AccessContext, EmpleadoId, EmpresaId, EstudioId } from "../datos/contexto";
import type { ActualizarEmpleadoInput, CrearEmpleadoInput, EmpleadosRepo } from "../datos/contratos";
import { noEncontrado } from "../datos/errores";
import { exigirAltaEmpleado, exigirEmpleado, exigirEmpresa } from "../permisos";
import { tenantParaEmpresa } from "./contexto";

export type RecursoEmpleadoCompleto = { estudioId: EstudioId; empresaId: EmpresaId; empleadoId: EmpleadoId };

export async function listarEmpleadosEmpresa(ctx: AccessContext, repo: EmpleadosRepo, recurso: { estudioId: EstudioId; empresaId: EmpresaId }) {
  exigirEmpresa(ctx, "ver", recurso);
  return repo.listarPorEmpresa(tenantParaEmpresa(ctx, recurso.estudioId, recurso.empresaId), recurso.empresaId);
}

export async function obtenerEmpleado(ctx: AccessContext, repo: EmpleadosRepo, recurso: RecursoEmpleadoCompleto) {
  exigirEmpleado(ctx, "ver", recurso);
  const empleado = await repo.obtener(tenantParaEmpresa(ctx, recurso.estudioId, recurso.empresaId), recurso.empleadoId);
  return empleado ?? noEncontrado();
}

export async function crearEmpleado(ctx: AccessContext, repo: EmpleadosRepo, recurso: { estudioId: EstudioId; empresaId: EmpresaId }, input: CrearEmpleadoInput) {
  exigirAltaEmpleado(ctx, recurso);
  return repo.crear(tenantParaEmpresa(ctx, recurso.estudioId, recurso.empresaId), input);
}

export async function actualizarEmpleado(ctx: AccessContext, repo: EmpleadosRepo, recurso: RecursoEmpleadoCompleto, input: ActualizarEmpleadoInput) {
  exigirEmpleado(ctx, "editar_datos", recurso);
  return repo.actualizar(tenantParaEmpresa(ctx, recurso.estudioId, recurso.empresaId), recurso.empleadoId, input);
}

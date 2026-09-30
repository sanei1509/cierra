import type { AccessContext, EmpresaId, EstudioId } from "../datos/contexto";
import type { ActualizarEmpresaInput, CrearEmpresaInput, EmpresasRepo } from "../datos/contratos";
import { noEncontrado } from "../datos/errores";
import { exigirAltaEmpresa, exigirEmpresa, exigirEstudio } from "../permisos";
import { tenantParaEmpresa, tenantParaEstudio } from "./contexto";

export async function listarEmpresasEstudio(ctx: AccessContext, repo: EmpresasRepo, estudioId: EstudioId) {
  exigirEstudio(ctx, "ver", { estudioId });
  return repo.listar(tenantParaEstudio(ctx, estudioId));
}

export async function obtenerEmpresa(ctx: AccessContext, repo: EmpresasRepo, recurso: { estudioId: EstudioId; empresaId: EmpresaId }) {
  exigirEmpresa(ctx, "ver", recurso);
  const empresa = await repo.obtener(tenantParaEmpresa(ctx, recurso.estudioId, recurso.empresaId), recurso.empresaId);
  return empresa ?? noEncontrado();
}

export async function crearEmpresa(ctx: AccessContext, repo: EmpresasRepo, estudioId: EstudioId, input: CrearEmpresaInput) {
  exigirAltaEmpresa(ctx, { estudioId });
  return repo.crear(tenantParaEstudio(ctx, estudioId), input);
}

export async function actualizarEmpresa(ctx: AccessContext, repo: EmpresasRepo, recurso: { estudioId: EstudioId; empresaId: EmpresaId }, input: ActualizarEmpresaInput) {
  exigirEmpresa(ctx, "editar", recurso);
  return repo.actualizar(tenantParaEmpresa(ctx, recurso.estudioId, recurso.empresaId), recurso.empresaId, input);
}

import type { AccessContext, EmpresaId, EstudioId } from "../datos/contexto";
import type { AuditoriaRepo, CrearAuditEventInput } from "../datos/contratos";
import { exigirEmpresa, exigirEstudio } from "../permisos";
import { tenantParaEmpresa, tenantParaEstudio } from "./contexto";

export async function listarAuditoriaEstudio(ctx: AccessContext, repo: AuditoriaRepo, estudioId: EstudioId, filtros?: { limite?: number }) {
  exigirEstudio(ctx, "ver", { estudioId });
  return repo.listar(tenantParaEstudio(ctx, estudioId), filtros);
}

export async function listarAuditoriaEmpresa(ctx: AccessContext, repo: AuditoriaRepo, recurso: { estudioId: EstudioId; empresaId: EmpresaId }, filtros?: { limite?: number }) {
  exigirEmpresa(ctx, "ver", recurso);
  return repo.listar(tenantParaEmpresa(ctx, recurso.estudioId, recurso.empresaId), { ...filtros, empresaId: recurso.empresaId });
}

export async function registrarAuditoria(ctx: AccessContext, repo: AuditoriaRepo, estudioId: EstudioId, input: CrearAuditEventInput) {
  if (input.empresaId) {
    exigirEmpresa(ctx, "ver", { estudioId, empresaId: input.empresaId });
    return repo.registrar(tenantParaEmpresa(ctx, estudioId, input.empresaId), input);
  }
  exigirEstudio(ctx, "ver", { estudioId });
  return repo.registrar(tenantParaEstudio(ctx, estudioId), input);
}

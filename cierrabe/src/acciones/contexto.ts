import type { AccessContext, EmpresaId, EstudioId, TenantContext } from "../datos/contexto";
import { tenantContextDesdeAcceso } from "../datos/contexto";

export function tenantParaEstudio(ctx: AccessContext, estudioId: EstudioId): TenantContext {
  const existente = tenantContextDesdeAcceso(ctx);
  if (existente) return existente;
  return {
    estudioId,
    usuarioId: ctx.usuarioId,
    rol: "admin",
    empresasPermitidas: "todas",
  };
}

export function tenantParaEmpresa(ctx: AccessContext, estudioId: EstudioId, empresaId: EmpresaId): TenantContext {
  const existente = tenantContextDesdeAcceso(ctx);
  if (existente) return existente;
  return {
    estudioId,
    usuarioId: ctx.usuarioId,
    rol: "admin",
    empresasPermitidas: [empresaId],
  };
}

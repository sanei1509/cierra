import type { AccessContext, EstudioId } from "../datos/contexto";
import type { AjusteManualCobro, ResumenCobroEstudio } from "../facturacion";
import type { AuditoriaRepo, PlanesRepo, ResumenesCobroRepo, SuscripcionesRepo, UsoFacturableRepo } from "../datos/contratos";
import { noEncontrado, sinPermiso } from "../datos/errores";
import { generarResumenCobroEstudio } from "../facturacion";
import { assertAutenticado, puedeAdministrarSistema } from "../permisos";
import { tenantParaEstudio } from "./contexto";

export interface GenerarResumenCobroAdminInput {
  mes: string;
  ajustes?: AjusteManualCobro[];
  generado?: string;
}

export async function generarResumenCobroAdmin(
  ctx: AccessContext | null | undefined,
  repos: {
    suscripciones: SuscripcionesRepo;
    planes: PlanesRepo;
    usoFacturable: UsoFacturableRepo;
    resumenesCobro: ResumenesCobroRepo;
    auditoria: AuditoriaRepo;
  },
  estudioId: EstudioId,
  input: GenerarResumenCobroAdminInput,
): Promise<ResumenCobroEstudio> {
  assertAutenticado(ctx);
  if (!puedeAdministrarSistema(ctx)) sinPermiso();

  const suscripcion = await repos.suscripciones.obtenerVigente(estudioId);
  if (!suscripcion) noEncontrado("No encontramos una suscripcion vigente para facturar", { estudioId });

  const plan = await repos.planes.obtener(suscripcion.planId);
  if (!plan) noEncontrado("No encontramos el plan de la suscripcion", { planId: suscripcion.planId });

  const eventosUso = await repos.usoFacturable.listar({ estudioId, mes: input.mes });
  const resumen = generarResumenCobroEstudio({
    mes: input.mes,
    plan,
    suscripcion,
    ajustes: input.ajustes,
    eventosUso,
    generado: input.generado,
  });

  const guardado = await repos.resumenesCobro.guardar(resumen);
  await repos.auditoria.registrar(tenantParaEstudio(ctx, estudioId), {
    actor: ctx.usuarioId,
    entidad: "ResumenCobro",
    entidadId: estudioId,
    accion: "resumen_cobro_generado",
    detalle: `Resumen de cobro ${input.mes}`,
    despues: JSON.stringify({
      mes: guardado.mes,
      totalCent: guardado.totalCent,
      moneda: guardado.moneda,
      lineas: guardado.lineas.map((linea) => ({ tipo: linea.tipo, concepto: linea.concepto, totalCent: linea.totalCent })),
    }),
  });

  return guardado;
}

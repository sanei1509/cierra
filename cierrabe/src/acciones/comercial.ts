import type { AccessContext, EstudioId } from "../datos/contexto";
import type { AuditoriaRepo, SuscripcionesRepo } from "../datos/contratos";
import type { CrearSuscripcionEstudioInput } from "../facturacion";
import { validarSuscripcionEstudio } from "../facturacion";
import { exigirAltaEstudio } from "../permisos";
import { tenantParaEstudio } from "./contexto";

export async function configurarSuscripcionEstudio(
  ctx: AccessContext,
  repos: { suscripciones: SuscripcionesRepo; auditoria: AuditoriaRepo },
  estudioId: EstudioId,
  input: CrearSuscripcionEstudioInput,
) {
  exigirAltaEstudio(ctx);
  const suscripcion = validarSuscripcionEstudio(input);
  const guardada = await repos.suscripciones.crearOActualizar(estudioId, suscripcion);

  await repos.auditoria.registrar(tenantParaEstudio(ctx, estudioId), {
    actor: ctx.usuarioId,
    entidad: "SuscripcionEstudio",
    entidadId: suscripcion.id,
    accion: "suscripcion_estudio_configurada",
    detalle: suscripcion.resumen,
    despues: JSON.stringify({
      planId: suscripcion.planId,
      estado: suscripcion.estado,
      moneda: suscripcion.moneda,
      precioMensualCent: suscripcion.precioMensualCent,
      addons: suscripcion.addons?.map((addon) => addon.moduloCodigo) ?? [],
      overrides: suscripcion.overrides?.map((override) => `${override.tipo}:${override.moduloCodigo}`) ?? [],
    }),
  });

  return guardada;
}

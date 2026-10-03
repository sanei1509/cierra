import type { AccessContext, EstudioId } from "../datos/contexto";
import type { AjusteManualCobro, PagoEstudio, ResumenCobroEstudio } from "../facturacion";
import { calcularEstadoCobro, crearAplicacionesPagoAdelantado, validarPagoEstudio } from "../facturacion";
import type { AuditoriaRepo, PagosRepo, PlanesRepo, ResumenesCobroRepo, SuscripcionesRepo, UsoFacturableRepo } from "../datos/contratos";
import { noEncontrado, sinPermiso } from "../datos/errores";
import { generarResumenCobroEstudio } from "../facturacion";
import { assertAutenticado, puedeAdministrarSistema } from "../permisos";
import { tenantParaEstudio } from "./contexto";

export interface GenerarResumenCobroAdminInput {
  mes: string;
  ajustes?: AjusteManualCobro[];
  generado?: string;
}

export interface RegistrarPagoEstudioAdminInput extends Omit<PagoEstudio, "estudioId"> {
  desdeMes: string;
  mesesCubiertos?: number;
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

export async function registrarPagoEstudioAdmin(
  ctx: AccessContext | null | undefined,
  repos: {
    pagos: PagosRepo;
    resumenesCobro: ResumenesCobroRepo;
    auditoria: AuditoriaRepo;
  },
  estudioId: EstudioId,
  input: RegistrarPagoEstudioAdminInput,
) {
  assertAutenticado(ctx);
  if (!puedeAdministrarSistema(ctx)) sinPermiso();

  const pago = validarPagoEstudio({ ...input, estudioId });
  const mesesCubiertos = input.mesesCubiertos ?? 1;
  const aplicaciones = crearAplicacionesPagoAdelantado({
    estudioId,
    pagoId: input.id,
    desdeMes: input.desdeMes,
    meses: mesesCubiertos,
    importeTotalCent: pago.importeCent,
    nota: pago.nota,
  });

  const guardado = await repos.pagos.registrarPago(pago, aplicaciones);
  const resumenes = await repos.resumenesCobro.listar({ estudioId });
  const estados = resumenes.map((resumen) => ({
    mes: resumen.mes,
    ...calcularEstadoCobro(resumen, guardado.aplicaciones),
  }));

  await repos.auditoria.registrar(tenantParaEstudio(ctx, estudioId), {
    actor: ctx.usuarioId,
    entidad: "PagoEstudio",
    entidadId: estudioId,
    accion: "pago_estudio_registrado",
    detalle: `Pago registrado por ${pago.moneda} ${pago.importeCent / 100}`,
    despues: JSON.stringify({
      importeCent: pago.importeCent,
      fecha: pago.fecha,
      desdeMes: input.desdeMes,
      mesesCubiertos,
      aplicaciones: guardado.aplicaciones.map((aplicacion) => ({ mes: aplicacion.mes, importeCent: aplicacion.importeCent })),
    }),
  });

  return { ...guardado, estados };
}

export async function cancelarPagoEstudioAdmin(
  ctx: AccessContext | null | undefined,
  repos: {
    pagos: PagosRepo;
    auditoria: AuditoriaRepo;
  },
  estudioId: EstudioId,
  pagoId: string,
) {
  assertAutenticado(ctx);
  if (!puedeAdministrarSistema(ctx)) sinPermiso();

  const cancelado = await repos.pagos.cancelarPago({ estudioId, pagoId });
  if (!cancelado.pago) noEncontrado("No encontramos el pago para cancelar", { estudioId, pagoId });

  await repos.auditoria.registrar(tenantParaEstudio(ctx, estudioId), {
    actor: ctx.usuarioId,
    entidad: "PagoEstudio",
    entidadId: estudioId,
    accion: "pago_estudio_cancelado",
    detalle: `Pago cancelado por ${cancelado.pago.moneda} ${cancelado.pago.importeCent / 100}`,
    antes: JSON.stringify({
      pagoId,
      importeCent: cancelado.pago.importeCent,
      aplicaciones: cancelado.aplicaciones.map((aplicacion) => ({ mes: aplicacion.mes, importeCent: aplicacion.importeCent })),
    }),
  });

  return cancelado;
}

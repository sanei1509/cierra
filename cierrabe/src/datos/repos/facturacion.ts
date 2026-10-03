import { and, desc, eq } from "drizzle-orm";
import type { Db } from "../db";
import type { EstudioId } from "../contexto";
import type { ResumenesCobroRepo, UsoFacturableRepo } from "../contratos";
import { eventosUsoFacturable, resumenesCobro } from "../schema";
import { aplicacionesPago, pagosEstudio } from "../schema";
import type { AplicacionPago, EventoUsoFacturable, Moneda, PagoEstudio, ResumenCobroEstudio } from "../../facturacion";
import type { PagosRepo } from "../contratos";

type EventoUsoRow = typeof eventosUsoFacturable.$inferSelect;
type ResumenCobroRow = typeof resumenesCobro.$inferSelect;
type PagoRow = typeof pagosEstudio.$inferSelect;
type AplicacionRow = typeof aplicacionesPago.$inferSelect;

function mapEvento(row: EventoUsoRow): EventoUsoFacturable {
  return {
    id: row.id,
    estudioId: row.estudioId as EstudioId,
    mes: row.mes,
    tipo: row.tipo,
    cantidad: row.cantidad,
    referenciaId: row.referenciaId ?? undefined,
    nota: row.nota ?? undefined,
  };
}

function mapResumen(row: ResumenCobroRow): ResumenCobroEstudio {
  return {
    estudioId: row.estudioId as EstudioId,
    mes: row.mes,
    moneda: row.moneda as Moneda,
    suscripcionId: row.suscripcionId,
    planId: row.planId,
    estadoSuscripcion: row.estadoSuscripcion,
    lineas: row.lineas,
    eventosUso: row.eventosUso,
    totalCent: row.totalCent,
    notasInternas: row.notasInternas ?? undefined,
    generado: row.generado.toISOString(),
  };
}

function fecha(row: Date | string) {
  return row instanceof Date ? row.toISOString().slice(0, 10) : String(row).slice(0, 10);
}

function mapPago(row: PagoRow): PagoEstudio {
  return {
    id: row.id,
    estudioId: row.estudioId as EstudioId,
    moneda: row.moneda as Moneda,
    importeCent: row.importeCent,
    fecha: fecha(row.fecha),
    medio: row.medio ?? undefined,
    referencia: row.referencia ?? undefined,
    nota: row.nota ?? undefined,
  };
}

function mapAplicacion(row: AplicacionRow): AplicacionPago {
  return {
    id: row.id,
    pagoId: row.pagoId,
    estudioId: row.estudioId as EstudioId,
    mes: row.mes,
    importeCent: row.importeCent,
    nota: row.nota ?? undefined,
  };
}

export function crearUsoFacturableRepo(db: Db): UsoFacturableRepo {
  return {
    async registrar(input) {
      const [guardado] = await db
        .insert(eventosUsoFacturable)
        .values({
          id: input.id,
          estudioId: input.estudioId,
          mes: input.mes,
          tipo: input.tipo,
          cantidad: input.cantidad,
          referenciaId: input.referenciaId,
          nota: input.nota,
        })
        .returning();

      return mapEvento(guardado);
    },

    async listar(filtros) {
      const condiciones = [filtros.mes ? eq(eventosUsoFacturable.mes, filtros.mes) : undefined, filtros.estudioId ? eq(eventosUsoFacturable.estudioId, filtros.estudioId) : undefined].filter(
        Boolean,
      );
      const rows = await db
        .select()
        .from(eventosUsoFacturable)
        .where(condiciones.length ? and(...condiciones) : undefined)
        .orderBy(desc(eventosUsoFacturable.creado));

      return rows.map(mapEvento);
    },
  };
}

export function crearResumenesCobroRepo(db: Db): ResumenesCobroRepo {
  return {
    async guardar(resumen) {
      const [guardado] = await db
        .insert(resumenesCobro)
        .values({
          estudioId: resumen.estudioId,
          mes: resumen.mes,
          moneda: resumen.moneda,
          suscripcionId: resumen.suscripcionId,
          planId: resumen.planId,
          estadoSuscripcion: resumen.estadoSuscripcion,
          lineas: resumen.lineas,
          eventosUso: resumen.eventosUso,
          totalCent: resumen.totalCent,
          notasInternas: resumen.notasInternas,
          generado: new Date(resumen.generado),
        })
        .onConflictDoUpdate({
          target: [resumenesCobro.estudioId, resumenesCobro.mes],
          set: {
            moneda: resumen.moneda,
            suscripcionId: resumen.suscripcionId,
            planId: resumen.planId,
            estadoSuscripcion: resumen.estadoSuscripcion,
            lineas: resumen.lineas,
            eventosUso: resumen.eventosUso,
            totalCent: resumen.totalCent,
            notasInternas: resumen.notasInternas,
            generado: new Date(resumen.generado),
          },
        })
        .returning();

      return mapResumen(guardado);
    },

    async listar(filtros) {
      const condiciones = [filtros.mes ? eq(resumenesCobro.mes, filtros.mes) : undefined, filtros.estudioId ? eq(resumenesCobro.estudioId, filtros.estudioId) : undefined].filter(Boolean);
      const rows = await db
        .select()
        .from(resumenesCobro)
        .where(condiciones.length ? and(...condiciones) : undefined)
        .orderBy(desc(resumenesCobro.generado));

      return rows.map(mapResumen);
    },
  };
}

export function crearPagosRepo(db: Db): PagosRepo {
  return {
    async registrarPago(input, aplicaciones) {
      return db.transaction(async (tx) => {
        const [pago] = await tx
          .insert(pagosEstudio)
          .values({
            id: input.id,
            estudioId: input.estudioId,
            moneda: input.moneda,
            importeCent: input.importeCent,
            fecha: new Date(`${input.fecha}T00:00:00`),
            medio: input.medio,
            referencia: input.referencia,
            nota: input.nota,
          })
          .returning();

        const guardadas = aplicaciones.length
          ? await tx
              .insert(aplicacionesPago)
              .values(
                aplicaciones.map((aplicacion) => ({
                  id: aplicacion.id,
                  pagoId: pago.id,
                  estudioId: aplicacion.estudioId,
                  mes: aplicacion.mes,
                  importeCent: aplicacion.importeCent,
                  nota: aplicacion.nota,
                })),
              )
              .returning()
          : [];

        return { pago: mapPago(pago), aplicaciones: guardadas.map(mapAplicacion) };
      });
    },

    async cancelarPago(input) {
      return db.transaction(async (tx) => {
        const [pago] = await tx
          .select()
          .from(pagosEstudio)
          .where(and(eq(pagosEstudio.id, input.pagoId), eq(pagosEstudio.estudioId, input.estudioId)));

        if (!pago) return { pago: null, aplicaciones: [] };

        const aplicaciones = await tx
          .select()
          .from(aplicacionesPago)
          .where(and(eq(aplicacionesPago.pagoId, input.pagoId), eq(aplicacionesPago.estudioId, input.estudioId)));

        await tx.delete(aplicacionesPago).where(and(eq(aplicacionesPago.pagoId, input.pagoId), eq(aplicacionesPago.estudioId, input.estudioId)));
        await tx.delete(pagosEstudio).where(and(eq(pagosEstudio.id, input.pagoId), eq(pagosEstudio.estudioId, input.estudioId)));

        return { pago: mapPago(pago), aplicaciones: aplicaciones.map(mapAplicacion) };
      });
    },

    async listarPagos(filtros) {
      const rows = await db
        .select()
        .from(pagosEstudio)
        .where(filtros.estudioId ? eq(pagosEstudio.estudioId, filtros.estudioId) : undefined)
        .orderBy(desc(pagosEstudio.fecha));

      return rows.map(mapPago);
    },

    async listarAplicaciones(filtros) {
      const condiciones = [filtros.estudioId ? eq(aplicacionesPago.estudioId, filtros.estudioId) : undefined, filtros.mes ? eq(aplicacionesPago.mes, filtros.mes) : undefined].filter(Boolean);
      const rows = await db
        .select()
        .from(aplicacionesPago)
        .where(condiciones.length ? and(...condiciones) : undefined)
        .orderBy(desc(aplicacionesPago.creado));

      return rows.map(mapAplicacion);
    },
  };
}

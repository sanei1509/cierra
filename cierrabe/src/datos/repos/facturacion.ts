import { and, desc, eq } from "drizzle-orm";
import type { Db } from "../db";
import type { EstudioId } from "../contexto";
import type { ResumenesCobroRepo, UsoFacturableRepo } from "../contratos";
import { eventosUsoFacturable, resumenesCobro } from "../schema";
import type { EventoUsoFacturable, Moneda, ResumenCobroEstudio } from "../../facturacion";

type EventoUsoRow = typeof eventosUsoFacturable.$inferSelect;
type ResumenCobroRow = typeof resumenesCobro.$inferSelect;

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

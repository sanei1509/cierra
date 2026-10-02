import { and, eq } from "drizzle-orm";
import type { Db } from "../db";
import type { ReciboVistaId } from "../contexto";
import type { ReciboVista, ReciboVistasRepo } from "../contratos";
import { reciboVistas } from "../schema";

type ReciboVistaRow = typeof reciboVistas.$inferSelect;

function mapReciboVista(row: ReciboVistaRow): ReciboVista {
  return {
    id: row.id,
    empresaId: row.empresaId,
    empleadoId: row.empleadoId,
    mes: row.mes,
    visto: row.visto.toISOString(),
  };
}

export function crearReciboVistasRepo(db: Db): ReciboVistasRepo {
  return {
    async listarPorEmpresa(ctx, empresaId, mes) {
      const condiciones = [eq(reciboVistas.estudioId, ctx.estudioId), eq(reciboVistas.empresaId, empresaId)];
      if (mes) condiciones.push(eq(reciboVistas.mes, mes));
      const rows = await db.select().from(reciboVistas).where(and(...condiciones));
      return rows.map(mapReciboVista);
    },

    async registrar(ctx, input) {
      const visto = input.visto ? new Date(input.visto) : new Date();
      const [row] = await db
        .insert(reciboVistas)
        .values({
          id: input.id as ReciboVistaId | undefined,
          estudioId: ctx.estudioId,
          empresaId: input.empresaId,
          empleadoId: input.empleadoId,
          mes: input.mes,
          visto,
        })
        .onConflictDoUpdate({
          target: [reciboVistas.empleadoId, reciboVistas.mes],
          set: { visto },
        })
        .returning();
      return mapReciboVista(row);
    },
  };
}

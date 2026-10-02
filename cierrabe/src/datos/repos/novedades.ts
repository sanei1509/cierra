import { and, eq } from "drizzle-orm";
import type { Db } from "../db";
import type { NovedadId } from "../contexto";
import type { ActualizarNovedadInput, CrearNovedadInput, NovedadesRepo } from "../contratos";
import { novedades } from "../schema";
import type { Novedad } from "../../dominio/types";

type NovedadRow = typeof novedades.$inferSelect;

function mapNovedad(row: NovedadRow): Novedad {
  return {
    id: row.id,
    empresaId: row.empresaId,
    mes: "",
    empleadoId: row.empleadoId,
    tipo: row.tipo,
    cantidad: row.cantidad ?? undefined,
    importe: row.importeCent !== null && row.importeCent !== undefined ? Math.round(row.importeCent / 100) : undefined,
    nota: row.nota ?? undefined,
    adjunto: row.adjunto ?? undefined,
    datos: row.datos ?? undefined,
    origen: row.origen,
    autor: row.autor,
    fecha: row.creada.toISOString(),
  };
}

function valoresActualizacion(input: ActualizarNovedadInput) {
  return {
    empleadoId: input.empleadoId,
    tipo: input.tipo,
    cantidad: input.cantidad ?? null,
    importeCent: input.importe !== undefined ? Math.round(input.importe * 100) : null,
    nota: input.nota,
    adjunto: input.adjunto,
    datos: input.datos,
    origen: input.origen,
    autor: input.autor,
  };
}

export function crearNovedadesRepo(db: Db): NovedadesRepo {
  return {
    async listarPorPeriodo(ctx, periodoId) {
      const rows = await db.select().from(novedades).where(and(eq(novedades.estudioId, ctx.estudioId), eq(novedades.periodoId, periodoId)));
      return rows.map(mapNovedad);
    },

    async crear(ctx, input: CrearNovedadInput) {
      const [row] = await db
        .insert(novedades)
        .values({
          id: input.id,
          estudioId: ctx.estudioId,
          periodoId: input.periodoId,
          empresaId: input.empresaId,
          empleadoId: input.empleadoId,
          tipo: input.tipo,
          cantidad: input.cantidad,
          importeCent: input.importe !== undefined ? Math.round(input.importe * 100) : undefined,
          nota: input.nota,
          adjunto: input.adjunto,
          datos: input.datos,
          origen: input.origen,
          autor: input.autor,
          creada: input.fecha ? new Date(input.fecha) : undefined,
        })
        .returning();
      return { ...mapNovedad(row), mes: input.mes };
    },

    async actualizar(ctx, novedadId, input) {
      const [row] = await db
        .update(novedades)
        .set(valoresActualizacion(input))
        .where(and(eq(novedades.estudioId, ctx.estudioId), eq(novedades.id, novedadId as NovedadId)))
        .returning();
      if (!row) throw new Error("Novedad no encontrada");
      return mapNovedad(row);
    },

    async borrar(ctx, novedadId) {
      await db.delete(novedades).where(and(eq(novedades.estudioId, ctx.estudioId), eq(novedades.id, novedadId as NovedadId)));
    },
  };
}

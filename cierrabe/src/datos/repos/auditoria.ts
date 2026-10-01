import { desc, eq } from "drizzle-orm";
import type { Db } from "../db";
import type { AuditEventId } from "../contexto";
import type { AuditoriaRepo, CrearAuditEventInput } from "../contratos";
import { auditoria } from "../schema";
import type { AuditEvent } from "../../dominio/types";

type AuditRow = typeof auditoria.$inferSelect;

function mapAudit(row: AuditRow): AuditEvent {
  return {
    id: row.id,
    fecha: row.fecha.toISOString(),
    actor: row.actorId ?? "sistema",
    empresaId: row.empresaId ?? undefined,
    entidad: row.entidad,
    entidadId: row.entidadId ?? undefined,
    accion: row.accion,
    detalle: row.detalle ?? undefined,
    antes: row.antes ? JSON.stringify(row.antes) : undefined,
    despues: row.despues ? JSON.stringify(row.despues) : undefined,
  };
}

function jsonSeguro(valor: string | undefined) {
  if (!valor) return null;
  try {
    return JSON.parse(valor) as unknown;
  } catch {
    return valor;
  }
}

export function crearAuditoriaRepo(db: Db): AuditoriaRepo {
  return {
    async listar(ctx, filtros) {
      const limite = filtros?.limite ?? 50;
      const rows = await db
        .select()
        .from(auditoria)
        .where(eq(auditoria.estudioId, ctx.estudioId))
        .orderBy(desc(auditoria.fecha))
        .limit(limite);

      return rows.filter((row) => !filtros?.empresaId || row.empresaId === filtros.empresaId).map(mapAudit);
    },

    async registrar(ctx, input: CrearAuditEventInput) {
      const [guardado] = await db
        .insert(auditoria)
        .values({
          id: input.id as AuditEventId | undefined,
          estudioId: ctx.estudioId,
          actorId: ctx.usuarioId,
          empresaId: input.empresaId,
          entidad: input.entidad,
          entidadId: input.entidadId,
          accion: input.accion,
          detalle: input.detalle,
          antes: jsonSeguro(input.antes),
          despues: jsonSeguro(input.despues),
        })
        .returning();

      return mapAudit(guardado);
    },
  };
}

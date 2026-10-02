import { and, desc, eq } from "drizzle-orm";
import type { Db } from "../db";
import type { AuditEventId } from "../contexto";
import type { AuditoriaRepo, CrearAuditEventInput } from "../contratos";
import { auditoria, usuarios } from "../schema";
import type { AuditEvent } from "../../dominio/types";

type AuditRow = typeof auditoria.$inferSelect;

function mapAudit(row: AuditRow, actorNombre?: string | null): AuditEvent {
  return {
    id: row.id,
    fecha: row.fecha.toISOString(),
    actor: actorNombre ?? row.actorId ?? "sistema",
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
        .select({ evento: auditoria, actorNombre: usuarios.nombre, actorEmail: usuarios.email })
        .from(auditoria)
        .leftJoin(usuarios, eq(auditoria.actorId, usuarios.id))
        .where(
          filtros?.empresaId
            ? and(eq(auditoria.estudioId, ctx.estudioId), eq(auditoria.empresaId, filtros.empresaId))
            : eq(auditoria.estudioId, ctx.estudioId),
        )
        .orderBy(desc(auditoria.fecha))
        .limit(limite);

      return rows.map((row) => mapAudit(row.evento, row.actorNombre ?? row.actorEmail));
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

      return mapAudit(guardado, input.actor);
    },
  };
}

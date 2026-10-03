import { and, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "../db";
import type { EstudioId, UsuarioId } from "../contexto";
import type { ModulosRepo, PlanesRepo, SuscripcionesRepo } from "../contratos";
import { noEncontrado } from "../errores";
import { moduloOverrides, planModulos, planes, suscripcionAddons, suscripcionesEstudio } from "../schema";
import { modulos } from "../schema";
import type { AddonSuscripcion, CrearSuscripcionEstudioInput, Moneda, OverrideModulo, PlanComercial, SuscripcionEstudio } from "../../facturacion";
import type { CodigoModulo, ModuloCatalogo } from "../../modulos";

type PlanRow = typeof planes.$inferSelect;
type PlanModuloRow = typeof planModulos.$inferSelect;
type SuscripcionRow = typeof suscripcionesEstudio.$inferSelect;
type AddonRow = typeof suscripcionAddons.$inferSelect;
type OverrideRow = typeof moduloOverrides.$inferSelect;
type ModuloRow = typeof modulos.$inferSelect;

const fecha = (valor: Date | string | null | undefined) => {
  if (!valor) return undefined;
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  return String(valor).slice(0, 10);
};

const fechaDb = (valor: string | undefined) => (valor ? new Date(`${valor}T00:00:00`) : null);

export function mapPlan(row: PlanRow, modulos: PlanModuloRow[] = []): PlanComercial {
  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    descripcion: row.descripcion,
    estado: row.estado,
    moneda: row.moneda as Moneda,
    precioMensualCent: row.precioMensualCent,
    modulos: modulos.filter((m) => m.planId === row.id).map((m) => m.moduloCodigo as CodigoModulo),
  };
}

export function mapSuscripcion(row: SuscripcionRow, addons: AddonRow[] = [], overrides: OverrideRow[] = []): SuscripcionEstudio {
  return {
    id: row.id,
    estudioId: row.estudioId as EstudioId,
    planId: row.planId,
    estado: row.estado,
    moneda: row.moneda as Moneda,
    precioMensualCent: row.precioMensualCent,
    inicio: fecha(row.inicio)!,
    fin: fecha(row.fin),
    notasInternas: row.notasInternas ?? undefined,
    addons: addons
      .filter((a) => a.suscripcionId === row.id)
      .map(
        (a): AddonSuscripcion => ({
          moduloCodigo: a.moduloCodigo as CodigoModulo,
          precioMensualCent: a.precioMensualCent,
          inicio: fecha(a.inicio)!,
          fin: fecha(a.fin),
        }),
      ),
    overrides: overrides
      .filter((o) => o.suscripcionId === row.id)
      .map(
        (o): OverrideModulo => ({
          id: o.id,
          moduloCodigo: o.moduloCodigo as CodigoModulo,
          tipo: o.tipo,
          motivo: o.motivo,
          inicio: fecha(o.inicio)!,
          fin: fecha(o.fin),
          creadoPorUsuarioId: (o.creadoPorUsuarioId as UsuarioId | null) ?? undefined,
        }),
      ),
  };
}

export function crearPlanesRepo(db: Db): PlanesRepo {
  return {
    async listar() {
      const [planRows, moduloRows] = await Promise.all([db.select().from(planes), db.select().from(planModulos)]);
      return planRows.map((plan) => mapPlan(plan, moduloRows));
    },

    async obtener(planId) {
      const [plan] = await db.select().from(planes).where(eq(planes.id, planId)).limit(1);
      if (!plan) return null;
      const modulos = await db.select().from(planModulos).where(eq(planModulos.planId, plan.id));
      return mapPlan(plan, modulos);
    },
  };
}

function mapModulo(row: ModuloRow): ModuloCatalogo {
  return {
    codigo: row.codigo as CodigoModulo,
    nombre: row.nombre,
    descripcion: row.descripcion,
    estado: row.estado,
    alcance: row.alcance,
    dependeDe: row.dependeDe as CodigoModulo[],
  };
}

export function crearModulosRepo(db: Db): ModulosRepo {
  return {
    async listarCatalogo() {
      const rows = await db.select().from(modulos);
      return rows.map(mapModulo);
    },

    async listarActivos() {
      const rows = await db.select().from(modulos).where(inArray(modulos.estado, ["activo", "beta"]));
      return rows.map(mapModulo);
    },

    async obtenerPorCodigo(codigo) {
      const [row] = await db.select().from(modulos).where(eq(modulos.codigo, codigo)).limit(1);
      return row ? mapModulo(row) : null;
    },
  };
}

export function crearSuscripcionesRepo(db: Db): SuscripcionesRepo {
  return {
    async obtenerVigente(estudioId) {
      const [suscripcion] = await db
        .select()
        .from(suscripcionesEstudio)
        .where(and(eq(suscripcionesEstudio.estudioId, estudioId), inArray(suscripcionesEstudio.estado, ["prueba", "activo", "pausado"])))
        .orderBy(desc(suscripcionesEstudio.creado))
        .limit(1);

      if (!suscripcion) return null;
      const [addons, overrides] = await Promise.all([
        db.select().from(suscripcionAddons).where(eq(suscripcionAddons.suscripcionId, suscripcion.id)),
        db.select().from(moduloOverrides).where(eq(moduloOverrides.suscripcionId, suscripcion.id)),
      ]);

      return mapSuscripcion(suscripcion, addons, overrides);
    },

    async crearOActualizar(estudioId, input: CrearSuscripcionEstudioInput) {
      const valores = {
        estudioId,
        planId: input.planId,
        estado: input.estado,
        moneda: input.moneda,
        precioMensualCent: input.precioMensualCent,
        inicio: fechaDb(input.inicio)!,
        fin: fechaDb(input.fin),
        notasInternas: input.notasInternas,
      };

      return db.transaction(async (tx) => {
        const [guardada] = input.id
          ? await tx.update(suscripcionesEstudio).set(valores).where(eq(suscripcionesEstudio.id, input.id)).returning()
          : await tx.insert(suscripcionesEstudio).values(valores).returning();

        if (!guardada) noEncontrado("No encontramos la suscripcion comercial a actualizar", { id: input.id });

        await tx.delete(suscripcionAddons).where(eq(suscripcionAddons.suscripcionId, guardada.id));
        await tx.delete(moduloOverrides).where(eq(moduloOverrides.suscripcionId, guardada.id));

        const addons = input.addons ?? [];
        if (addons.length) {
          await tx.insert(suscripcionAddons).values(
            addons.map((addon) => ({
              suscripcionId: guardada.id,
              moduloCodigo: addon.moduloCodigo,
              precioMensualCent: addon.precioMensualCent,
              inicio: fechaDb(addon.inicio)!,
              fin: fechaDb(addon.fin),
            })),
          );
        }

        const overrides = input.overrides ?? [];
        if (overrides.length) {
          await tx.insert(moduloOverrides).values(
            overrides.map((override) => ({
              suscripcionId: guardada.id,
              moduloCodigo: override.moduloCodigo,
              tipo: override.tipo,
              motivo: override.motivo,
              inicio: fechaDb(override.inicio)!,
              fin: fechaDb(override.fin),
              creadoPorUsuarioId: override.creadoPorUsuarioId,
            })),
          );
        }

        return mapSuscripcion(
          guardada,
          addons.map((addon) => ({
            suscripcionId: guardada.id,
            moduloCodigo: addon.moduloCodigo,
            precioMensualCent: addon.precioMensualCent,
            inicio: fechaDb(addon.inicio)!,
            fin: fechaDb(addon.fin),
          })),
          overrides.map((override) => ({
            id: override.id ?? "",
            suscripcionId: guardada.id,
            moduloCodigo: override.moduloCodigo,
            tipo: override.tipo,
            motivo: override.motivo,
            inicio: fechaDb(override.inicio)!,
            fin: fechaDb(override.fin),
            creadoPorUsuarioId: override.creadoPorUsuarioId ?? null,
            creado: new Date(),
          })),
        );
      });
    },
  };
}

import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { crearPasswordHash } from "../auth";
import { db, cerrarDb } from "../datos/db";
import { credencialesPassword, estudios, membresias, modulos, planModulos, planes, usuarios } from "../datos/schema";
import { CATALOGO_MODULOS } from "../modulos";
import { resolverSeedDesarrollo } from "./seed-config";
import { PLANES_COMERCIALES_BASE } from "./seed-comercial";

async function seedDesarrollo() {
  const config = resolverSeedDesarrollo(process.env);
  const passwordHash = crearPasswordHash(config.password);

  await db.transaction(async (tx) => {
    await tx
      .insert(estudios)
      .values({
        id: config.estudioId,
        nombre: config.estudioNombre,
        nombreVisible: config.estudioNombre,
        ciudad: "Montevideo",
        emailContacto: config.estudioEmail,
      })
      .onConflictDoUpdate({
        target: estudios.id,
        set: {
          nombre: config.estudioNombre,
          nombreVisible: config.estudioNombre,
          emailContacto: config.estudioEmail,
        },
      });

    await tx
      .insert(usuarios)
      .values({
        id: config.adminId,
        email: config.adminEmail,
        nombre: "Admin Cierra",
        estado: "activo",
      })
      .onConflictDoUpdate({
        target: usuarios.id,
        set: {
          email: config.adminEmail,
          nombre: "Admin Cierra",
          estado: "activo",
        },
      });

    await tx
      .insert(credencialesPassword)
      .values({
        usuarioId: config.adminId,
        passwordHash,
      })
      .onConflictDoUpdate({
        target: credencialesPassword.usuarioId,
        set: {
          passwordHash,
          actualizada: sql`now()`,
        },
      });

    await tx
      .insert(usuarios)
      .values({
        id: config.usuarioEstudioId,
        email: config.estudioEmail,
        nombre: config.usuarioEstudioNombre,
        estado: "activo",
      })
      .onConflictDoUpdate({
        target: usuarios.id,
        set: {
          email: config.estudioEmail,
          nombre: config.usuarioEstudioNombre,
          estado: "activo",
        },
      });

    await tx
      .insert(credencialesPassword)
      .values({
        usuarioId: config.usuarioEstudioId,
        passwordHash,
      })
      .onConflictDoUpdate({
        target: credencialesPassword.usuarioId,
        set: {
          passwordHash,
          actualizada: sql`now()`,
        },
      });

    await tx
      .insert(membresias)
      .values({
        usuarioId: config.usuarioEstudioId,
        estudioId: config.estudioId,
        rol: "admin",
      })
      .onConflictDoUpdate({
        target: [membresias.usuarioId, membresias.estudioId],
        set: { rol: "admin" },
      });

    await tx
      .insert(modulos)
      .values(
        CATALOGO_MODULOS.map((modulo) => ({
          codigo: modulo.codigo,
          nombre: modulo.nombre,
          descripcion: modulo.descripcion,
          estado: modulo.estado,
          alcance: modulo.alcance,
          dependeDe: modulo.dependeDe,
        })),
      )
      .onConflictDoUpdate({
        target: modulos.codigo,
        set: {
          nombre: sql`excluded.nombre`,
          descripcion: sql`excluded.descripcion`,
          estado: sql`excluded.estado`,
          alcance: sql`excluded.alcance`,
          dependeDe: sql`excluded.depende_de`,
        },
      });

    for (const plan of PLANES_COMERCIALES_BASE) {
      await tx
        .insert(planes)
        .values({
          id: plan.id,
          codigo: plan.codigo,
          nombre: plan.nombre,
          descripcion: plan.descripcion,
          estado: "activo",
          moneda: "UYU",
          precioMensualCent: plan.precioMensualCent,
        })
        .onConflictDoUpdate({
          target: planes.id,
          set: {
            codigo: plan.codigo,
            nombre: plan.nombre,
            descripcion: plan.descripcion,
            estado: "activo",
            moneda: "UYU",
            precioMensualCent: plan.precioMensualCent,
          },
        });

      await tx.delete(planModulos).where(eq(planModulos.planId, plan.id));
      await tx.insert(planModulos).values(plan.modulos.map((moduloCodigo) => ({ planId: plan.id, moduloCodigo })));
    }
  });

  console.log("Seed de desarrollo listo:");
  console.log(`- Admin sistema: ${config.adminEmail} (${config.adminId})`);
  console.log(`- Estudio: ${config.estudioNombre} (${config.estudioId})`);
  console.log(`- Usuario estudio: ${config.estudioEmail} (${config.usuarioEstudioId})`);
  console.log("- Credenciales password dev actualizadas");
  console.log(`- Modulos comerciales: ${CATALOGO_MODULOS.length}`);
  console.log(`- Planes comerciales: ${PLANES_COMERCIALES_BASE.map((plan) => plan.codigo).join(", ")}`);
}

seedDesarrollo()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cerrarDb();
  });

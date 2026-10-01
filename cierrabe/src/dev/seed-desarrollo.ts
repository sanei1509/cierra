import "dotenv/config";
import { db, cerrarDb } from "../datos/db";
import { estudios, membresias, usuarios } from "../datos/schema";
import { resolverSeedDesarrollo } from "./seed-config";

async function seedDesarrollo() {
  const config = resolverSeedDesarrollo(process.env);

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
  });

  console.log("Seed de desarrollo listo:");
  console.log(`- Admin sistema: ${config.adminEmail} (${config.adminId})`);
  console.log(`- Estudio: ${config.estudioNombre} (${config.estudioId})`);
  console.log(`- Usuario estudio: ${config.estudioEmail} (${config.usuarioEstudioId})`);
}

seedDesarrollo()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cerrarDb();
  });

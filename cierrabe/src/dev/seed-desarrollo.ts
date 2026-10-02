import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { crearPasswordHash } from "../auth";
import { db, cerrarDb } from "../datos/db";
import { credencialesPassword, empleadoVigencias, empleados, empresas, estudios, membresiaEmpresas, membresias, modulos, periodos, planModulos, planes, relacionesLaborales, usuarios } from "../datos/schema";
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

    const upsertUsuario = async (input: { id: string; email: string; nombre: string }) => {
      await tx
        .insert(usuarios)
        .values({
          id: input.id,
          email: input.email,
          nombre: input.nombre,
          estado: "activo",
        })
        .onConflictDoUpdate({
          target: usuarios.id,
          set: {
            email: input.email,
            nombre: input.nombre,
            estado: "activo",
          },
        });

      await tx
        .insert(credencialesPassword)
        .values({
          usuarioId: input.id,
          passwordHash,
        })
        .onConflictDoUpdate({
          target: credencialesPassword.usuarioId,
          set: {
            passwordHash,
            actualizada: sql`now()`,
          },
        });
    };

    const upsertMembresia = async (input: { usuarioId: string; rol: "admin" | "liquidador" | "lectura"; empresaId?: string }) => {
      const [membresia] = await tx
        .insert(membresias)
        .values({
          usuarioId: input.usuarioId,
          estudioId: config.estudioId,
          rol: input.rol,
        })
        .onConflictDoUpdate({
          target: [membresias.usuarioId, membresias.estudioId],
          set: { rol: input.rol },
        })
        .returning();

      if (input.empresaId) {
        await tx
          .insert(membresiaEmpresas)
          .values({
            membresiaId: membresia.id,
            empresaId: input.empresaId,
          })
          .onConflictDoNothing();
      }
    };

    await upsertUsuario({ id: config.adminId, email: config.adminEmail, nombre: "Admin Cierra" });
    await upsertUsuario({ id: config.usuarioEstudioId, email: config.estudioEmail, nombre: config.usuarioEstudioNombre });
    await upsertUsuario({ id: config.liquidadorId, email: config.liquidadorEmail, nombre: config.liquidadorNombre });
    await upsertUsuario({ id: config.soloLecturaId, email: config.soloLecturaEmail, nombre: config.soloLecturaNombre });
    await upsertUsuario({ id: config.adminComoEstudioId, email: config.adminComoEstudioEmail, nombre: "Admin Cierra como estudio" });
    await upsertUsuario({ id: config.empresaUsuarioId, email: config.empresaEmail, nombre: config.empresaUsuarioNombre });
    await upsertUsuario({ id: config.empleadoUsuarioId, email: config.empleadoEmail, nombre: config.empleadoUsuarioNombre });

    await tx
      .insert(empresas)
      .values([
        {
          id: config.empresaColonId,
          estudioId: config.estudioId,
          nombre: "Taller Mecanico Colon",
          nombreVisible: "Taller Mecanico Colon",
          rut: "218844660015",
          nroBps: "4880213",
          actividad: "Reparacion de automotores",
          grupo: 10,
          subgrupo: "01",
          responsableId: config.empresaUsuarioId,
          requiereAprobacion: true,
          contactoNombre: config.empresaUsuarioNombre,
          contactoEmail: config.empresaEmail,
        },
        {
          id: config.empresaEspigaId,
          estudioId: config.estudioId,
          nombre: "Panaderia La Espiga",
          nombreVisible: "Panaderia La Espiga",
          rut: "215478330012",
          nroBps: "4521877",
          actividad: "Elaboracion y venta de pan",
          grupo: 1,
          subgrupo: "06",
          responsableId: config.usuarioEstudioId,
          requiereAprobacion: true,
          contactoNombre: "Graciela Nunez",
          contactoEmail: "graciela@laespiga.uy",
        },
      ])
      .onConflictDoUpdate({
        target: [empresas.estudioId, empresas.rut],
        set: {
          nombre: sql`excluded.nombre`,
          nombreVisible: sql`excluded.nombre_visible`,
          nroBps: sql`excluded.nro_bps`,
          actividad: sql`excluded.actividad`,
          grupo: sql`excluded.grupo`,
          subgrupo: sql`excluded.subgrupo`,
          responsableId: sql`excluded.responsable_id`,
          contactoNombre: sql`excluded.contacto_nombre`,
          contactoEmail: sql`excluded.contacto_email`,
        },
      });

    await tx
      .insert(empleados)
      .values([
        {
          id: config.empleadoValentinaId,
          estudioId: config.estudioId,
          empresaId: config.empresaEspigaId,
          nombre: "Valentina",
          apellido: "Correa",
          ci: "1.237.570-3",
          email: config.empleadoEmail,
          cargo: "Atencion al publico",
          categoria: "Vendedor",
          modalidad: "mensual",
        },
        {
          id: "00000000-0000-4000-8000-000000000202",
          estudioId: config.estudioId,
          empresaId: config.empresaColonId,
          nombre: "Fabian",
          apellido: "Suarez",
          ci: "2.184.466-0",
          email: "fabian.suarez@tallercolon.uy",
          cargo: "Mecanico",
          categoria: "Encargado",
          modalidad: "mensual",
        },
        {
          id: "00000000-0000-4000-8000-000000000203",
          estudioId: config.estudioId,
          empresaId: config.empresaColonId,
          nombre: "Leandro",
          apellido: "Castro",
          ci: "3.410.928-4",
          email: "leandro.castro@tallercolon.uy",
          cargo: "Ayudante",
          categoria: "Cadete",
          modalidad: "mensual",
        },
        {
          id: "00000000-0000-4000-8000-000000000204",
          estudioId: config.estudioId,
          empresaId: config.empresaColonId,
          nombre: "Mauricio",
          apellido: "Bello",
          ci: "4.202.119-7",
          email: "mauricio.bello@tallercolon.uy",
          cargo: "Administrativo",
          categoria: "Administrativo",
          modalidad: "mensual",
        },
      ])
      .onConflictDoUpdate({
        target: empleados.id,
        set: {
          email: sql`excluded.email`,
          nombre: sql`excluded.nombre`,
          apellido: sql`excluded.apellido`,
          cargo: sql`excluded.cargo`,
          categoria: sql`excluded.categoria`,
        },
      });

    const empleadosDev = [
      { id: config.empleadoValentinaId, ingreso: "2023-02-01", sueldoCent: 4020000, categoria: "Vendedor", hijos: 0 },
      { id: "00000000-0000-4000-8000-000000000202", ingreso: "2011-02-14", sueldoCent: 6270000, categoria: "Encargado", hijos: 2 },
      { id: "00000000-0000-4000-8000-000000000203", ingreso: "2023-10-09", sueldoCent: 3690000, categoria: "Cadete", hijos: 0 },
      { id: "00000000-0000-4000-8000-000000000204", ingreso: "2020-04-06", sueldoCent: 4510000, categoria: "Administrativo", hijos: 1 },
    ];

    for (const empleado of empleadosDev) {
      await tx.delete(relacionesLaborales).where(eq(relacionesLaborales.empleadoId, empleado.id));

      await tx
        .insert(relacionesLaborales)
        .values({
          estudioId: config.estudioId,
          empleadoId: empleado.id,
          ingreso: new Date(`${empleado.ingreso}T00:00:00`),
        })
        .returning();

      await tx
        .insert(empleadoVigencias)
        .values({
          estudioId: config.estudioId,
          empleadoId: empleado.id,
          desde: new Date("2026-07-01T00:00:00"),
          sueldoBaseCent: empleado.sueldoCent,
          categoria: empleado.categoria,
          hijos: empleado.hijos,
          conyugeFonasa: false,
        })
        .onConflictDoUpdate({
          target: [empleadoVigencias.empleadoId, empleadoVigencias.desde],
          set: {
            sueldoBaseCent: empleado.sueldoCent,
            categoria: empleado.categoria,
            hijos: empleado.hijos,
          },
        });
    }

    await tx
      .insert(periodos)
      .values([
        {
          estudioId: config.estudioId,
          empresaId: config.empresaColonId,
          mes: "2026-09",
          etapa: "novedades",
          fechaObjetivo: new Date("2026-09-28T00:00:00"),
          sinNovedades: false,
          bpsEstado: "pendiente",
        },
        {
          estudioId: config.estudioId,
          empresaId: config.empresaEspigaId,
          mes: "2026-09",
          etapa: "novedades",
          fechaObjetivo: new Date("2026-09-28T00:00:00"),
          sinNovedades: false,
          bpsEstado: "pendiente",
        },
      ])
      .onConflictDoUpdate({
        target: [periodos.empresaId, periodos.mes],
        set: {
          etapa: "novedades",
          fechaObjetivo: new Date("2026-09-28T00:00:00"),
          sinNovedades: false,
          bpsEstado: "pendiente",
        },
      });

    await upsertMembresia({ usuarioId: config.usuarioEstudioId, rol: "admin" });
    await upsertMembresia({ usuarioId: config.adminComoEstudioId, rol: "admin" });
    await upsertMembresia({ usuarioId: config.liquidadorId, rol: "liquidador" });
    await upsertMembresia({ usuarioId: config.soloLecturaId, rol: "lectura" });
    await upsertMembresia({ usuarioId: config.empresaUsuarioId, rol: "admin", empresaId: config.empresaColonId });

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
  console.log(`- Liquidador: ${config.liquidadorEmail} (${config.liquidadorId})`);
  console.log(`- Solo lectura: ${config.soloLecturaEmail} (${config.soloLecturaId})`);
  console.log(`- Empresa: ${config.empresaEmail} (${config.empresaUsuarioId})`);
  console.log(`- Empleado: ${config.empleadoEmail} (${config.empleadoUsuarioId})`);
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

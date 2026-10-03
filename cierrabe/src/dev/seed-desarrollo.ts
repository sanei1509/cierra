import "dotenv/config";
import { and, eq, inArray, sql } from "drizzle-orm";
import { crearPasswordHash } from "../auth";
import type { EstudioId } from "../datos/contexto";
import { db, cerrarDb } from "../datos/db";
import {
  credencialesPassword,
  empleadoVigencias,
  empleados,
  empresas,
  estudios,
  eventosUsoFacturable,
  aplicacionesPago,
  membresiaEmpresas,
  membresias,
  modulos,
  periodos,
  planModulos,
  planes,
  moduloOverrides,
  pagosEstudio,
  relacionesLaborales,
  resumenesCobro,
  suscripcionAddons,
  suscripcionesEstudio,
  usuarios,
} from "../datos/schema";
import { generarResumenCobroEstudio } from "../facturacion";
import { CATALOGO_MODULOS } from "../modulos";
import { resolverSeedDesarrollo } from "./seed-config";
import { addonComercialPorModulo, ESTUDIOS_COMERCIALES_BASE, planComercialPorCodigo, PLANES_COMERCIALES_BASE } from "./seed-comercial";

function nombreMesSeed(mes: string) {
  const [anio, mesNumero] = mes.split("-").map(Number);
  if (!anio || !mesNumero) return mes;
  return new Intl.DateTimeFormat("es-UY", { month: "long", year: "numeric" }).format(new Date(anio, mesNumero - 1, 1));
}

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

    const estudiosComerciales = ESTUDIOS_COMERCIALES_BASE;
    const mesUsoComercial = "2026-10";
    const idsEstudiosComerciales = ESTUDIOS_COMERCIALES_BASE.map((estudio) => estudio.id);
    const idsPlanesComerciales = PLANES_COMERCIALES_BASE.map((plan) => plan.id);
    const mesesHistoricosPereira = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"];
    const pereiraComercialId = "00000000-0000-4000-8000-000000000001";
    const estudiosSinHistoricoPereira = idsEstudiosComerciales.filter((id) => id !== pereiraComercialId);
    const idsResumenesHistoricosPereira = Array.from({ length: 6 }, (_, index) => `00000000-0000-4000-8000-00000000050${index + 1}`);
    const idsPagosHistoricosPereira = Array.from({ length: 6 }, (_, index) => `00000000-0000-4000-8000-00000000060${index + 1}`);
    const idsAplicacionesHistoricasPereira = Array.from({ length: 6 }, (_, index) => `00000000-0000-4000-8000-00000000070${index + 1}`);
    if (!idsEstudiosComerciales.includes(config.estudioId)) {
      const suscripcionesComercialesObsoletas = await tx
        .select({ id: suscripcionesEstudio.id })
        .from(suscripcionesEstudio)
        .where(and(eq(suscripcionesEstudio.estudioId, config.estudioId), inArray(suscripcionesEstudio.planId, idsPlanesComerciales)));
      const idsSuscripcionesObsoletas = suscripcionesComercialesObsoletas.map((suscripcion) => suscripcion.id);
      if (idsSuscripcionesObsoletas.length) {
        await tx.delete(resumenesCobro).where(inArray(resumenesCobro.suscripcionId, idsSuscripcionesObsoletas));
        await tx.delete(suscripcionAddons).where(inArray(suscripcionAddons.suscripcionId, idsSuscripcionesObsoletas));
        await tx.delete(moduloOverrides).where(inArray(moduloOverrides.suscripcionId, idsSuscripcionesObsoletas));
        await tx.delete(suscripcionesEstudio).where(inArray(suscripcionesEstudio.id, idsSuscripcionesObsoletas));
      }
    }
    for (const id of idsAplicacionesHistoricasPereira) await tx.delete(aplicacionesPago).where(eq(aplicacionesPago.id, id));
    for (const id of idsPagosHistoricosPereira) await tx.delete(pagosEstudio).where(eq(pagosEstudio.id, id));
    for (const id of idsResumenesHistoricosPereira) await tx.delete(resumenesCobro).where(eq(resumenesCobro.id, id));
    if (estudiosSinHistoricoPereira.length) {
      const pagosHistoricosNoPereira = await tx
        .select({ id: pagosEstudio.id })
        .from(pagosEstudio)
        .where(and(inArray(pagosEstudio.estudioId, estudiosSinHistoricoPereira), inArray(sql<string>`to_char(${pagosEstudio.fecha}, 'YYYY-MM')`, mesesHistoricosPereira)));
      await tx
        .delete(aplicacionesPago)
        .where(and(inArray(aplicacionesPago.estudioId, estudiosSinHistoricoPereira), inArray(aplicacionesPago.mes, mesesHistoricosPereira)));
      if (pagosHistoricosNoPereira.length) await tx.delete(pagosEstudio).where(inArray(pagosEstudio.id, pagosHistoricosNoPereira.map((pago) => pago.id)));
      await tx
        .delete(resumenesCobro)
        .where(and(inArray(resumenesCobro.estudioId, estudiosSinHistoricoPereira), inArray(resumenesCobro.mes, mesesHistoricosPereira)));
      await tx
        .delete(eventosUsoFacturable)
        .where(and(inArray(eventosUsoFacturable.estudioId, estudiosSinHistoricoPereira), inArray(eventosUsoFacturable.mes, mesesHistoricosPereira)));
    }

    for (const estudio of estudiosComerciales) {
      const plan = planComercialPorCodigo(estudio.planCodigo);
      await tx
        .insert(estudios)
        .values({
          id: estudio.id,
          nombre: estudio.nombre,
          nombreVisible: estudio.nombre,
          ciudad: "Montevideo",
          emailContacto: estudio.emailContacto,
        })
        .onConflictDoUpdate({
          target: estudios.id,
          set: {
            nombre: estudio.nombre,
            nombreVisible: estudio.nombre,
            emailContacto: estudio.emailContacto,
          },
        });

      await tx
        .insert(suscripcionesEstudio)
        .values({
          id: estudio.suscripcionId,
          estudioId: estudio.id,
          planId: plan.id,
          estado: estudio.estado,
          moneda: estudio.moneda,
          precioMensualCent: plan.precioMensualCent,
          inicio: new Date("2026-10-01T00:00:00"),
          notasInternas: estudio.notasInternas,
        })
        .onConflictDoUpdate({
          target: suscripcionesEstudio.id,
          set: {
            estudioId: estudio.id,
            planId: plan.id,
            estado: estudio.estado,
            moneda: estudio.moneda,
            precioMensualCent: plan.precioMensualCent,
            inicio: new Date("2026-10-01T00:00:00"),
            fin: null,
            notasInternas: estudio.notasInternas,
          },
        });

      await tx.delete(suscripcionAddons).where(eq(suscripcionAddons.suscripcionId, estudio.suscripcionId));
      if (estudio.addons.length) {
        await tx.insert(suscripcionAddons).values(
          estudio.addons.map((moduloCodigo) => ({
            suscripcionId: estudio.suscripcionId,
            moduloCodigo,
            precioMensualCent: addonComercialPorModulo(moduloCodigo)?.precioMensualCent ?? 0,
            inicio: new Date("2026-10-01T00:00:00"),
          })),
        );
      }

      await tx.delete(eventosUsoFacturable).where(and(eq(eventosUsoFacturable.estudioId, estudio.id), eq(eventosUsoFacturable.mes, mesUsoComercial)));
      await tx.insert(eventosUsoFacturable).values(
        estudio.eventosUso.map((evento) => ({
          estudioId: estudio.id,
          mes: mesUsoComercial,
          tipo: evento.tipo,
          cantidad: evento.cantidad,
          nota: "Seed comercial de desarrollo",
        })),
      );

      if (estudio.nombre === "Estudio Pereira & Asociados") {
        const mesesHistoricos = [
          { mes: "2026-04", empresas: 9, empleados: 146, recibos: 146, pagadoCent: 1800000 },
          { mes: "2026-05", empresas: 10, empleados: 158, recibos: 158, pagadoCent: 1800000 },
          { mes: "2026-06", empresas: 10, empleados: 164, recibos: 164, pagadoCent: 1800000 },
          { mes: "2026-07", empresas: 11, empleados: 171, recibos: 171, pagadoCent: 1800000 },
          { mes: "2026-08", empresas: 11, empleados: 176, recibos: 176, pagadoCent: 1800000 },
          { mes: "2026-09", empresas: 12, empleados: 181, recibos: 181, pagadoCent: 0 },
        ];
        const planResumen = {
          id: plan.id,
          codigo: plan.codigo,
          nombre: plan.nombre,
          descripcion: plan.descripcion,
          estado: "activo" as const,
          moneda: "UYU" as const,
          precioMensualCent: plan.precioMensualCent,
          modulos: plan.modulos,
        };
        const suscripcionResumen = {
          id: estudio.suscripcionId,
          estudioId: estudio.id,
          planId: plan.id,
          estado: estudio.estado,
          moneda: estudio.moneda,
          precioMensualCent: plan.precioMensualCent,
          inicio: "2026-04-01",
          notasInternas: estudio.notasInternas,
          addons: estudio.addons.map((moduloCodigo) => ({
            moduloCodigo,
            precioMensualCent: addonComercialPorModulo(moduloCodigo)?.precioMensualCent ?? 0,
            inicio: "2026-04-01",
          })),
          overrides: [],
        };

        for (const [index, historico] of mesesHistoricos.entries()) {
          const eventosHistoricos = [
            { id: `00000000-0000-4000-8000-000000001${index}01`, estudioId: estudio.id as EstudioId, mes: historico.mes, tipo: "empresa_activa" as const, cantidad: historico.empresas, nota: "Seed historico comercial" },
            { id: `00000000-0000-4000-8000-000000001${index}02`, estudioId: estudio.id as EstudioId, mes: historico.mes, tipo: "empleado_activo" as const, cantidad: historico.empleados, nota: "Seed historico comercial" },
            { id: `00000000-0000-4000-8000-000000001${index}03`, estudioId: estudio.id as EstudioId, mes: historico.mes, tipo: "recibo_generado" as const, cantidad: historico.recibos, nota: "Seed historico comercial" },
          ];
          await tx.delete(eventosUsoFacturable).where(and(eq(eventosUsoFacturable.estudioId, estudio.id), eq(eventosUsoFacturable.mes, historico.mes)));
          await tx.insert(eventosUsoFacturable).values(eventosHistoricos);

          const resumen = generarResumenCobroEstudio({
            mes: historico.mes,
            plan: planResumen,
            suscripcion: { ...suscripcionResumen, estudioId: estudio.id as EstudioId },
            eventosUso: eventosHistoricos,
            generado: `${historico.mes}-28T12:00:00.000Z`,
          });

          await tx
            .insert(resumenesCobro)
            .values({
              id: `00000000-0000-4000-8000-00000000050${index + 1}`,
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
            });

          if (historico.pagadoCent > 0) {
            const pagoId = `00000000-0000-4000-8000-00000000060${index + 1}`;
            await tx
              .insert(pagosEstudio)
              .values({
                id: pagoId,
                estudioId: estudio.id,
                moneda: estudio.moneda,
                importeCent: historico.pagadoCent,
                fecha: new Date(`${historico.mes}-29T00:00:00`),
                medio: "transferencia",
                referencia: `seed-pereira-${historico.mes}`,
                nota: `Pago de ${nombreMesSeed(historico.mes)}`,
              })
              .onConflictDoUpdate({
                target: pagosEstudio.id,
                set: {
                  importeCent: historico.pagadoCent,
                  fecha: new Date(`${historico.mes}-29T00:00:00`),
                  medio: "transferencia",
                  referencia: `seed-pereira-${historico.mes}`,
                  nota: `Pago de ${nombreMesSeed(historico.mes)}`,
                },
              });

            await tx
              .insert(aplicacionesPago)
              .values({
                id: `00000000-0000-4000-8000-00000000070${index + 1}`,
                pagoId,
                estudioId: estudio.id,
                mes: historico.mes,
                importeCent: resumen.totalCent,
                nota: "Pago completo seed",
              })
              .onConflictDoUpdate({
                target: aplicacionesPago.id,
                set: {
                  importeCent: resumen.totalCent,
                  nota: "Pago completo seed",
                },
              });
          }
        }
      }
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
  console.log(`- Estudios comerciales seed: ${ESTUDIOS_COMERCIALES_BASE.length}`);
}

seedDesarrollo()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cerrarDb();
  });

import { and, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "../db";
import type { EmpleadoId, EmpresaId, EstudioId, RolAcceso, UsuarioId } from "../contexto";
import type {
  ActualizarEmpleadoInput,
  ActualizarEmpresaInput,
  ActualizarPerfilEstudioInput,
  CrearEmpleadoInput,
  CrearEmpresaInput,
  CrearEstudioInput,
  CrearUsuarioAccesoInput,
  EmpleadosRepo,
  EmpresasRepo,
  Estudio,
  EstudiosRepo,
  PeriodosRepo,
  UsuarioAccesoCreado,
  UsuariosRepo,
} from "../contratos";
import { empleadoVigencias, empleados, empresas, estudios, membresiaEmpresas, membresias, periodos, relacionesLaborales, usuarios } from "../schema";
import type { Empleado, Empresa, Periodo, Rol, Usuario } from "../../dominio/types";
import { noEncontrado } from "../errores";

type EstudioRow = typeof estudios.$inferSelect;
type UsuarioRow = typeof usuarios.$inferSelect;
type EmpresaRow = typeof empresas.$inferSelect;
type EmpleadoRow = typeof empleados.$inferSelect;
type RelacionRow = typeof relacionesLaborales.$inferSelect;
type VigenciaRow = typeof empleadoVigencias.$inferSelect;
type PeriodoRow = typeof periodos.$inferSelect;

const fecha = (valor: Date | string | null | undefined) => {
  if (!valor) return undefined;
  return valor instanceof Date ? valor.toISOString().slice(0, 10) : String(valor).slice(0, 10);
};

const fechaDb = (valor: string | undefined) => (valor ? new Date(`${valor}T00:00:00`) : undefined);
const pesosACent = (valor: number) => Math.round(valor * 100);
const centAPesos = (valor: number) => Math.round(valor / 100);

export function rolLegacyProvisioning(rol: RolAcceso): Rol {
  if (rol === "payroll_operator" || rol === "company_operator") return "liquidador";
  if (rol === "studio_readonly" || rol === "company_readonly" || rol === "employee_self") return "lectura";
  return "admin";
}

function mapEstudio(row: EstudioRow): Estudio {
  return {
    id: row.id as EstudioId,
    nombre: row.nombre,
    nombreVisible: row.nombreVisible ?? undefined,
    razonSocial: row.razonSocial ?? undefined,
    rut: row.rut ?? undefined,
    ciudad: row.ciudad ?? undefined,
    telefono: row.telefono ?? undefined,
    emailContacto: row.emailContacto ?? undefined,
    logoArchivoId: row.logoArchivoId ?? undefined,
    fotoArchivoId: row.fotoArchivoId ?? undefined,
    creado: row.creado.toISOString(),
  };
}

function mapUsuario(row: UsuarioRow, rol: Rol = "lectura"): Usuario {
  return {
    id: row.id,
    nombre: row.nombre,
    email: row.email,
    rol,
  };
}

function mapEmpresa(row: EmpresaRow): Empresa {
  return {
    id: row.id,
    nombre: row.nombre,
    rut: row.rut,
    nroBps: row.nroBps,
    actividad: row.actividad,
    grupo: row.grupo,
    subgrupo: row.subgrupo,
    responsableId: row.responsableId ?? "",
    requiereAprobacion: row.requiereAprobacion,
    contacto: { nombre: row.contactoNombre, email: row.contactoEmail },
    tono: "menta",
  };
}

function mapEmpleado(row: EmpleadoRow, relaciones: RelacionRow[], vigencias: VigenciaRow[]): Empleado {
  const relacion = relaciones.find((r) => r.empleadoId === row.id);
  const propias = vigencias
    .filter((v) => v.empleadoId === row.id)
    .sort((a, b) => a.desde.getTime() - b.desde.getTime());
  const ultima = propias.at(-1);
  return {
    id: row.id,
    empresaId: row.empresaId,
    nombre: row.nombre,
    apellido: row.apellido,
    ci: row.ci,
    email: row.email ?? "",
    cargo: row.cargo,
    categoria: ultima?.categoria ?? row.categoria,
    modalidad: row.modalidad,
    ingreso: fecha(relacion?.ingreso) ?? "",
    egreso: fecha(relacion?.egreso),
    area: row.area ?? undefined,
    tipoContrato: row.tipoContrato ?? undefined,
    telefono: row.telefono ?? undefined,
    direccion: row.direccion ?? undefined,
    licenciaDisponible: ultima?.licenciaDisponible ?? undefined,
    licenciaTomada: ultima?.licenciaTomada ?? undefined,
    sueldos: propias.map((v) => ({ desde: fecha(v.desde)!, monto: centAPesos(v.sueldoBaseCent) })),
    hijos: ultima?.hijos ?? 0,
    conyugeFonasa: ultima?.conyugeFonasa ?? false,
    cuenta: row.cuentaCobro ?? undefined,
  };
}

function mapPeriodo(row: PeriodoRow): Periodo {
  return {
    id: row.id,
    empresaId: row.empresaId,
    mes: row.mes,
    etapa: row.etapa,
    fechaObjetivo: fecha(row.fechaObjetivo) ?? `${row.mes}-28`,
    sinNovedades: row.sinNovedades,
    versiones: [],
    advertenciasAceptadas: {},
    bps: row.bpsEstado,
    rectificaciones: [],
    notas: [],
  };
}

export function crearEstudiosRepo(db: Db): EstudiosRepo {
  return {
    async crear(input: CrearEstudioInput) {
      const [row] = await db
        .insert(estudios)
        .values({
          id: input.id,
          nombre: input.nombre,
          nombreVisible: input.nombreVisible,
          razonSocial: input.razonSocial,
          rut: input.rut,
          ciudad: input.ciudad,
          telefono: input.telefono,
          emailContacto: input.emailContacto,
          logoArchivoId: input.logoArchivoId,
          fotoArchivoId: input.fotoArchivoId,
        })
        .returning();
      return mapEstudio(row);
    },

    async obtener(ctx) {
      const [row] = await db.select().from(estudios).where(eq(estudios.id, ctx.estudioId)).limit(1);
      return row ? mapEstudio(row) : null;
    },

    async actualizarPerfil(ctx, input: ActualizarPerfilEstudioInput) {
      const [row] = await db
        .update(estudios)
        .set({
          nombreVisible: input.nombreVisible,
          razonSocial: input.razonSocial,
          rut: input.rut,
          ciudad: input.ciudad,
          telefono: input.telefono,
          emailContacto: input.emailContacto,
          logoArchivoId: input.logoArchivoId,
          fotoArchivoId: input.fotoArchivoId,
        })
        .where(eq(estudios.id, ctx.estudioId))
        .returning();
      if (!row) noEncontrado("No encontramos el estudio para actualizar");
      return mapEstudio(row);
    },
  };
}

export function crearUsuariosRepo(db: Db): UsuariosRepo {
  return {
    async obtener(ctx, usuarioId) {
      const [row] = await db.select().from(usuarios).where(eq(usuarios.id, usuarioId)).limit(1);
      if (!row) return null;
      const [membresia] = await db
        .select()
        .from(membresias)
        .where(and(eq(membresias.usuarioId, usuarioId), eq(membresias.estudioId, ctx.estudioId)))
        .limit(1);
      return mapUsuario(row, membresia?.rol ?? "lectura");
    },

    async crearAcceso(input: CrearUsuarioAccesoInput): Promise<UsuarioAccesoCreado> {
      return db.transaction(async (tx) => {
        const [usuario] = await tx
          .insert(usuarios)
          .values({
            email: input.email,
            nombre: input.nombre,
            estado: "invitado",
          })
          .onConflictDoUpdate({
            target: usuarios.email,
            set: { nombre: input.nombre },
          })
          .returning();

        if (input.estudioId) {
          const [membresia] = await tx
            .insert(membresias)
            .values({
              usuarioId: usuario.id,
              estudioId: input.estudioId,
              rol: rolLegacyProvisioning(input.rol),
            })
            .onConflictDoUpdate({
              target: [membresias.usuarioId, membresias.estudioId],
              set: { rol: rolLegacyProvisioning(input.rol) },
            })
            .returning();

          if (input.empresaId) {
            await tx
              .insert(membresiaEmpresas)
              .values({ membresiaId: membresia.id, empresaId: input.empresaId })
              .onConflictDoNothing();
          }
        }

        return {
          usuarioId: usuario.id as UsuarioId,
          email: usuario.email,
          nombre: usuario.nombre,
          estado: "invitado",
          rol: input.rol,
          estudioId: input.estudioId,
          empresaId: input.empresaId,
          empleadoId: input.empleadoId,
        };
      });
    },
  };
}

export function crearEmpresasRepo(db: Db): EmpresasRepo {
  return {
    async listar(ctx) {
      const rows = await db.select().from(empresas).where(eq(empresas.estudioId, ctx.estudioId)).orderBy(desc(empresas.creada));
      return rows.filter((row) => ctx.empresasPermitidas === "todas" || ctx.empresasPermitidas.includes(row.id as EmpresaId)).map(mapEmpresa);
    },

    async obtener(ctx, empresaId) {
      const [row] = await db.select().from(empresas).where(and(eq(empresas.estudioId, ctx.estudioId), eq(empresas.id, empresaId))).limit(1);
      if (!row) return null;
      if (ctx.empresasPermitidas !== "todas" && !ctx.empresasPermitidas.includes(row.id as EmpresaId)) return null;
      return mapEmpresa(row);
    },

    async crear(ctx, input: CrearEmpresaInput) {
      const [row] = await db
        .insert(empresas)
        .values({
          id: input.id,
          estudioId: ctx.estudioId,
          nombre: input.nombre,
          rut: input.rut,
          nroBps: input.nroBps,
          actividad: input.actividad,
          grupo: input.grupo,
          subgrupo: input.subgrupo,
          responsableId: input.responsableId || null,
          requiereAprobacion: input.requiereAprobacion,
          contactoNombre: input.contacto.nombre,
          contactoEmail: input.contacto.email,
        })
        .returning();
      return mapEmpresa(row);
    },

    async actualizar(ctx, empresaId, input: ActualizarEmpresaInput) {
      const [row] = await db
        .update(empresas)
        .set({
          nombre: input.nombre,
          rut: input.rut,
          nroBps: input.nroBps,
          actividad: input.actividad,
          grupo: input.grupo,
          subgrupo: input.subgrupo,
          responsableId: input.responsableId || undefined,
          requiereAprobacion: input.requiereAprobacion,
          contactoNombre: input.contacto?.nombre,
          contactoEmail: input.contacto?.email,
        })
        .where(and(eq(empresas.estudioId, ctx.estudioId), eq(empresas.id, empresaId)))
        .returning();
      if (!row) noEncontrado("No encontramos la empresa para actualizar");
      return mapEmpresa(row);
    },
  };
}

export function crearEmpleadosRepo(db: Db): EmpleadosRepo {
  async function hidratar(rows: EmpleadoRow[]) {
    if (!rows.length) return [];
    const ids = rows.map((row) => row.id);
    const [rels, vigs] = await Promise.all([
      db.select().from(relacionesLaborales).where(inArray(relacionesLaborales.empleadoId, ids)),
      db.select().from(empleadoVigencias).where(inArray(empleadoVigencias.empleadoId, ids)),
    ]);
    return rows.map((row) => mapEmpleado(row, rels, vigs));
  }

  return {
    async listarPorEmpresa(ctx, empresaId) {
      if (ctx.empresasPermitidas !== "todas" && !ctx.empresasPermitidas.includes(empresaId)) return [];
      const rows = await db.select().from(empleados).where(and(eq(empleados.estudioId, ctx.estudioId), eq(empleados.empresaId, empresaId)));
      return hidratar(rows);
    },

    async obtener(ctx, empleadoId) {
      const [row] = await db.select().from(empleados).where(and(eq(empleados.estudioId, ctx.estudioId), eq(empleados.id, empleadoId))).limit(1);
      if (!row) return null;
      if (ctx.empresasPermitidas !== "todas" && !ctx.empresasPermitidas.includes(row.empresaId as EmpresaId)) return null;
      return (await hidratar([row]))[0] ?? null;
    },

    async crear(ctx, input: CrearEmpleadoInput) {
      return db.transaction(async (tx) => {
        const [row] = await tx
          .insert(empleados)
          .values({
            id: input.id,
            estudioId: ctx.estudioId,
            empresaId: input.empresaId as EmpresaId,
            nombre: input.nombre,
            apellido: input.apellido,
            ci: input.ci,
            email: input.email,
            telefono: input.telefono,
            direccion: input.direccion,
            cargo: input.cargo,
            area: input.area,
            categoria: input.categoria,
            modalidad: input.modalidad,
            tipoContrato: input.tipoContrato,
            cuentaCobro: input.cuenta,
          })
          .returning();

        await tx.insert(relacionesLaborales).values({
          estudioId: ctx.estudioId,
          empleadoId: row.id,
          ingreso: fechaDb(input.ingreso)!,
          egreso: fechaDb(input.egreso) ?? null,
        });

        const sueldos = input.sueldos.length ? input.sueldos : [{ desde: input.ingreso, monto: 0 }];
        await tx.insert(empleadoVigencias).values(
          sueldos.map((sueldo) => ({
            estudioId: ctx.estudioId,
            empleadoId: row.id,
            desde: fechaDb(sueldo.desde)!,
            sueldoBaseCent: pesosACent(sueldo.monto),
            categoria: input.categoria,
            hijos: input.hijos,
            conyugeFonasa: input.conyugeFonasa,
            licenciaDisponible: input.licenciaDisponible,
            licenciaTomada: input.licenciaTomada,
          })),
        );

        return mapEmpleado(
          row,
          [{ id: "", estudioId: ctx.estudioId, empleadoId: row.id, ingreso: fechaDb(input.ingreso)!, egreso: fechaDb(input.egreso) ?? null, motivoEgreso: null }],
          sueldos.map((sueldo) => ({
            id: "",
            estudioId: ctx.estudioId,
            empleadoId: row.id,
            desde: fechaDb(sueldo.desde)!,
            sueldoBaseCent: pesosACent(sueldo.monto),
            categoria: input.categoria,
            horario: null,
            hijos: input.hijos,
            conyugeFonasa: input.conyugeFonasa,
            licenciaDisponible: input.licenciaDisponible ?? null,
            licenciaTomada: input.licenciaTomada ?? null,
          })),
        );
      });
    },

    async actualizar(ctx, empleadoId, input: ActualizarEmpleadoInput) {
      const [row] = await db
        .update(empleados)
        .set({
          nombre: input.nombre,
          apellido: input.apellido,
          ci: input.ci,
          email: input.email,
          telefono: input.telefono,
          direccion: input.direccion,
          cargo: input.cargo,
          area: input.area,
          categoria: input.categoria,
          modalidad: input.modalidad,
          tipoContrato: input.tipoContrato,
          cuentaCobro: input.cuenta,
        })
        .where(and(eq(empleados.estudioId, ctx.estudioId), eq(empleados.id, empleadoId)))
        .returning();
      if (!row) noEncontrado("No encontramos el empleado para actualizar");
      return (await hidratar([row]))[0];
    },
  };
}

export function crearPeriodosRepo(db: Db): PeriodosRepo {
  return {
    async listarPorEmpresa(ctx, empresaId) {
      if (ctx.empresasPermitidas !== "todas" && !ctx.empresasPermitidas.includes(empresaId)) return [];
      const rows = await db
        .select()
        .from(periodos)
        .where(and(eq(periodos.estudioId, ctx.estudioId), eq(periodos.empresaId, empresaId)))
        .orderBy(desc(periodos.mes));
      return rows.map(mapPeriodo);
    },

    async obtener(ctx, periodoId) {
      const [row] = await db.select().from(periodos).where(and(eq(periodos.estudioId, ctx.estudioId), eq(periodos.id, periodoId))).limit(1);
      if (!row) return null;
      if (ctx.empresasPermitidas !== "todas" && !ctx.empresasPermitidas.includes(row.empresaId as EmpresaId)) return null;
      return mapPeriodo(row);
    },

    async guardar(ctx, periodo) {
      if (ctx.empresasPermitidas !== "todas" && !ctx.empresasPermitidas.includes(periodo.empresaId as EmpresaId)) noEncontrado("No encontramos la empresa del periodo");
      const [row] = await db
        .insert(periodos)
        .values({
          id: periodo.id,
          estudioId: ctx.estudioId,
          empresaId: periodo.empresaId as EmpresaId,
          mes: periodo.mes,
          etapa: periodo.etapa,
          fechaObjetivo: fechaDb(periodo.fechaObjetivo)!,
          sinNovedades: periodo.sinNovedades,
          bpsEstado: periodo.bps,
        })
        .onConflictDoUpdate({
          target: [periodos.empresaId, periodos.mes],
          set: {
            etapa: periodo.etapa,
            fechaObjetivo: fechaDb(periodo.fechaObjetivo)!,
            sinNovedades: periodo.sinNovedades,
            bpsEstado: periodo.bps,
          },
        })
        .returning();
      return mapPeriodo(row);
    },
  };
}

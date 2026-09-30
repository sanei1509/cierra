import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const rolEnum = pgEnum("rol", ["admin", "liquidador", "lectura"]);
export const estadoUsuarioEnum = pgEnum("estado_usuario", ["invitado", "activo", "suspendido"]);
export const temaPreferidoEnum = pgEnum("tema_preferido", ["system", "light", "dark"]);
export const proveedorAuthEnum = pgEnum("proveedor_auth", ["password", "magic_link", "google", "microsoft"]);
export const etapaPeriodoEnum = pgEnum("etapa_periodo", ["novedades", "recibidas", "borrador", "enviada", "devuelta", "aprobada", "cerrada"]);
export const bpsEstadoEnum = pgEnum("bps_estado", ["pendiente", "generado", "presentado"]);
export const modalidadEnum = pgEnum("modalidad", ["mensual", "jornalero"]);
export const tipoNovedadEnum = pgEnum("tipo_novedad", [
  "hora_extra",
  "falta",
  "licencia",
  "bono",
  "adelanto",
  "cambio_salarial",
  "llegada_tarde",
  "feriado",
  "certificacion",
]);
export const origenNovedadEnum = pgEnum("origen_novedad", ["cliente", "estudio"]);

export const estudios = pgTable("estudios", {
  id: uuid("id").defaultRandom().primaryKey(),
  nombre: text("nombre").notNull(),
  ciudad: text("ciudad"),
  plan: text("plan").default("piloto").notNull(),
  creado: timestamp("creado", { withTimezone: true }).defaultNow().notNull(),
});

export const usuarios = pgTable(
  "usuarios",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    nombre: text("nombre").notNull(),
    estado: estadoUsuarioEnum("estado").default("invitado").notNull(),
    temaPreferido: temaPreferidoEnum("tema_preferido").default("system").notNull(),
    mfaActivo: boolean("mfa_activo").default(false).notNull(),
    ultimoAcceso: timestamp("ultimo_acceso", { withTimezone: true }),
    creado: timestamp("creado", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("usuarios_email_unique").on(t.email)],
);

export const credencialesPassword = pgTable(
  "credenciales_password",
  {
    usuarioId: uuid("usuario_id").primaryKey().references(() => usuarios.id),
    passwordHash: text("password_hash").notNull(),
    actualizada: timestamp("actualizada", { withTimezone: true }).defaultNow().notNull(),
  },
);

export const magicLinks = pgTable(
  "magic_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    usuarioId: uuid("usuario_id").notNull().references(() => usuarios.id),
    tokenHash: text("token_hash").notNull(),
    email: text("email").notNull(),
    expira: timestamp("expira", { withTimezone: true }).notNull(),
    usado: timestamp("usado", { withTimezone: true }),
    creado: timestamp("creado", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("magic_links_token_hash_unique").on(t.tokenHash),
    index("magic_links_usuario_idx").on(t.usuarioId),
  ],
);

export const sesiones = pgTable(
  "sesiones",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    usuarioId: uuid("usuario_id").notNull().references(() => usuarios.id),
    tokenHash: text("token_hash").notNull(),
    expira: timestamp("expira", { withTimezone: true }).notNull(),
    revocada: timestamp("revocada", { withTimezone: true }),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    creada: timestamp("creada", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("sesiones_token_hash_unique").on(t.tokenHash),
    index("sesiones_usuario_idx").on(t.usuarioId),
  ],
);

export const cuentasOauth = pgTable(
  "cuentas_oauth",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    usuarioId: uuid("usuario_id").notNull().references(() => usuarios.id),
    proveedor: proveedorAuthEnum("proveedor").notNull(),
    proveedorCuentaId: text("proveedor_cuenta_id").notNull(),
    email: text("email").notNull(),
    creada: timestamp("creada", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("cuentas_oauth_proveedor_cuenta_unique").on(t.proveedor, t.proveedorCuentaId),
    index("cuentas_oauth_usuario_idx").on(t.usuarioId),
  ],
);

export const membresias = pgTable(
  "membresias",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    usuarioId: uuid("usuario_id").notNull().references(() => usuarios.id),
    estudioId: uuid("estudio_id").notNull().references(() => estudios.id),
    rol: rolEnum("rol").notNull(),
    creada: timestamp("creada", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("membresias_usuario_estudio_unique").on(t.usuarioId, t.estudioId),
    index("membresias_estudio_idx").on(t.estudioId),
  ],
);

export const empresas = pgTable(
  "empresas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    estudioId: uuid("estudio_id").notNull().references(() => estudios.id),
    nombre: text("nombre").notNull(),
    rut: varchar("rut", { length: 20 }).notNull(),
    nroBps: text("nro_bps").notNull(),
    actividad: text("actividad").notNull(),
    grupo: integer("grupo").notNull(),
    subgrupo: text("subgrupo").notNull(),
    responsableId: uuid("responsable_id").references(() => usuarios.id),
    requiereAprobacion: boolean("requiere_aprobacion").default(true).notNull(),
    contactoNombre: text("contacto_nombre").notNull(),
    contactoEmail: text("contacto_email").notNull(),
    logoArchivoId: uuid("logo_archivo_id"),
    activa: boolean("activa").default(true).notNull(),
    creada: timestamp("creada", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("empresas_estudio_rut_unique").on(t.estudioId, t.rut),
    index("empresas_estudio_idx").on(t.estudioId),
  ],
);

export const membresiaEmpresas = pgTable(
  "membresia_empresas",
  {
    membresiaId: uuid("membresia_id").notNull().references(() => membresias.id),
    empresaId: uuid("empresa_id").notNull().references(() => empresas.id),
  },
  (t) => [primaryKey({ columns: [t.membresiaId, t.empresaId] })],
);

export const empleados = pgTable(
  "empleados",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    estudioId: uuid("estudio_id").notNull().references(() => estudios.id),
    empresaId: uuid("empresa_id").notNull().references(() => empresas.id),
    nombre: text("nombre").notNull(),
    apellido: text("apellido").notNull(),
    ci: varchar("ci", { length: 20 }).notNull(),
    email: text("email"),
    telefono: text("telefono"),
    direccion: text("direccion"),
    cargo: text("cargo").notNull(),
    area: text("area"),
    categoria: text("categoria").notNull(),
    modalidad: modalidadEnum("modalidad").notNull(),
    tipoContrato: text("tipo_contrato"),
    cuentaCobro: text("cuenta_cobro"),
    creado: timestamp("creado", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("empleados_estudio_ci_unique").on(t.estudioId, t.ci),
    index("empleados_estudio_empresa_idx").on(t.estudioId, t.empresaId),
  ],
);

export const relacionesLaborales = pgTable(
  "relaciones_laborales",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    estudioId: uuid("estudio_id").notNull().references(() => estudios.id),
    empleadoId: uuid("empleado_id").notNull().references(() => empleados.id),
    ingreso: timestamp("ingreso", { withTimezone: false }).notNull(),
    egreso: timestamp("egreso", { withTimezone: false }),
    motivoEgreso: text("motivo_egreso"),
  },
  (t) => [index("relaciones_empleado_idx").on(t.estudioId, t.empleadoId)],
);

export const empleadoVigencias = pgTable(
  "empleado_vigencias",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    estudioId: uuid("estudio_id").notNull().references(() => estudios.id),
    empleadoId: uuid("empleado_id").notNull().references(() => empleados.id),
    desde: timestamp("desde", { withTimezone: false }).notNull(),
    sueldoBaseCent: integer("sueldo_base_cent").notNull(),
    categoria: text("categoria").notNull(),
    horario: text("horario"),
    hijos: integer("hijos").default(0).notNull(),
    conyugeFonasa: boolean("conyuge_fonasa").default(false).notNull(),
    licenciaDisponible: integer("licencia_disponible"),
    licenciaTomada: integer("licencia_tomada"),
  },
  (t) => [
    uniqueIndex("empleado_vigencias_empleado_desde_unique").on(t.empleadoId, t.desde),
    index("empleado_vigencias_estudio_idx").on(t.estudioId),
  ],
);

export const periodos = pgTable(
  "periodos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    estudioId: uuid("estudio_id").notNull().references(() => estudios.id),
    empresaId: uuid("empresa_id").notNull().references(() => empresas.id),
    mes: varchar("mes", { length: 7 }).notNull(),
    etapa: etapaPeriodoEnum("etapa").default("novedades").notNull(),
    fechaObjetivo: timestamp("fecha_objetivo", { withTimezone: false }).notNull(),
    sinNovedades: boolean("sin_novedades").default(false).notNull(),
    bpsEstado: bpsEstadoEnum("bps_estado").default("pendiente").notNull(),
    creado: timestamp("creado", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("periodos_empresa_mes_unique").on(t.empresaId, t.mes),
    index("periodos_estudio_idx").on(t.estudioId),
  ],
);

export const novedades = pgTable(
  "novedades",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    estudioId: uuid("estudio_id").notNull().references(() => estudios.id),
    periodoId: uuid("periodo_id").notNull().references(() => periodos.id),
    empresaId: uuid("empresa_id").notNull().references(() => empresas.id),
    empleadoId: uuid("empleado_id").notNull().references(() => empleados.id),
    tipo: tipoNovedadEnum("tipo").notNull(),
    cantidad: integer("cantidad"),
    importeCent: integer("importe_cent"),
    nota: text("nota"),
    adjunto: jsonb("adjunto").$type<{ nombre: string; tipo: string; tamano: number }>(),
    origen: origenNovedadEnum("origen").notNull(),
    autor: text("autor").notNull(),
    creada: timestamp("creada", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("novedades_periodo_idx").on(t.estudioId, t.periodoId),
    index("novedades_empleado_idx").on(t.estudioId, t.empleadoId),
  ],
);

export const auditoria = pgTable(
  "auditoria",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    estudioId: uuid("estudio_id").notNull().references(() => estudios.id),
    actorTipo: text("actor_tipo").default("usuario").notNull(),
    actorId: uuid("actor_id"),
    empresaId: uuid("empresa_id").references(() => empresas.id),
    entidad: text("entidad").notNull(),
    entidadId: uuid("entidad_id"),
    accion: text("accion").notNull(),
    detalle: text("detalle"),
    antes: jsonb("antes"),
    despues: jsonb("despues"),
    ipHash: text("ip_hash"),
    fecha: timestamp("fecha", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("auditoria_estudio_fecha_idx").on(t.estudioId, t.fecha),
    index("auditoria_empresa_idx").on(t.estudioId, t.empresaId),
  ],
);

export const estudiosRelations = relations(estudios, ({ many }) => ({
  membresias: many(membresias),
  empresas: many(empresas),
}));

export const empresasRelations = relations(empresas, ({ many, one }) => ({
  estudio: one(estudios, { fields: [empresas.estudioId], references: [estudios.id] }),
  empleados: many(empleados),
  periodos: many(periodos),
}));

export const empleadosRelations = relations(empleados, ({ many, one }) => ({
  empresa: one(empresas, { fields: [empleados.empresaId], references: [empresas.id] }),
  relaciones: many(relacionesLaborales),
  vigencias: many(empleadoVigencias),
  novedades: many(novedades),
}));

export const periodosRelations = relations(periodos, ({ many, one }) => ({
  empresa: one(empresas, { fields: [periodos.empresaId], references: [empresas.id] }),
  novedades: many(novedades),
}));

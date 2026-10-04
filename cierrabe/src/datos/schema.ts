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
import type { Aprobacion, NovedadDatos, Periodo, PortalEmpresaConfig, ReglasLiquidacionEmpresa, VersionLiquidacion } from "../dominio/types";
import type { EventoUsoFacturable, LineaCobro } from "../facturacion";

export const rolEnum = pgEnum("rol", ["admin", "liquidador", "lectura"]);
export const estadoUsuarioEnum = pgEnum("estado_usuario", ["invitado", "activo", "suspendido"]);
export const temaPreferidoEnum = pgEnum("tema_preferido", ["system", "light", "dark"]);
export const proveedorAuthEnum = pgEnum("proveedor_auth", ["password", "magic_link", "google", "microsoft"]);
export const duenoArchivoMarcaEnum = pgEnum("dueno_archivo_marca", ["estudio", "empresa", "empleado"]);
export const tipoArchivoMarcaEnum = pgEnum("tipo_archivo_marca", ["logo", "foto"]);
export const estadoModuloEnum = pgEnum("estado_modulo", ["activo", "oculto", "beta", "discontinuado"]);
export const alcanceModuloEnum = pgEnum("alcance_modulo", ["sistema", "estudio", "empresa", "empleado"]);
export const estadoPlanEnum = pgEnum("estado_plan", ["activo", "oculto", "discontinuado"]);
export const estadoSuscripcionEnum = pgEnum("estado_suscripcion", ["prueba", "activo", "pausado", "cancelado", "vencido"]);
export const monedaEnum = pgEnum("moneda", ["UYU", "USD"]);
export const tipoOverrideModuloEnum = pgEnum("tipo_override_modulo", ["habilitar", "deshabilitar"]);
export const tipoEventoUsoEnum = pgEnum("tipo_evento_uso", ["empresa_activa", "empleado_activo", "recibo_generado", "recibo_enviado"]);
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
  "suspension",
  "ausencia_justificada",
  "licencia_especial",
  "seguro_paro",
  "accidente_laboral",
  "maternidad",
  "egreso",
  "ingreso_mes",
  "cambio_horario",
  "cambio_categoria",
  "viatico",
  "presentismo",
  "productividad",
  "descuento_manual",
  "prestamo_retencion",
  "reintegro",
  "retroactivo",
  "ajuste_mes_anterior",
  "salario_vacacional_ajuste",
  "licencia_pendiente",
]);
export const origenNovedadEnum = pgEnum("origen_novedad", ["cliente", "estudio"]);

export const estudios = pgTable("estudios", {
  id: uuid("id").defaultRandom().primaryKey(),
  nombre: text("nombre").notNull(),
  nombreVisible: text("nombre_visible"),
  razonSocial: text("razon_social"),
  rut: varchar("rut", { length: 20 }),
  ciudad: text("ciudad"),
  telefono: text("telefono"),
  emailContacto: text("email_contacto"),
  logoArchivoId: uuid("logo_archivo_id"),
  fotoArchivoId: uuid("foto_archivo_id"),
  plan: text("plan").default("piloto").notNull(),
  creado: timestamp("creado", { withTimezone: true }).defaultNow().notNull(),
});

export const modulos = pgTable(
  "modulos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    codigo: varchar("codigo", { length: 80 }).notNull(),
    nombre: text("nombre").notNull(),
    descripcion: text("descripcion").notNull(),
    estado: estadoModuloEnum("estado").default("activo").notNull(),
    alcance: alcanceModuloEnum("alcance").notNull(),
    dependeDe: jsonb("depende_de").$type<string[]>().default([]).notNull(),
    creado: timestamp("creado", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("modulos_codigo_unique").on(t.codigo)],
);

export const planes = pgTable(
  "planes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    codigo: varchar("codigo", { length: 80 }).notNull(),
    nombre: text("nombre").notNull(),
    descripcion: text("descripcion").notNull(),
    estado: estadoPlanEnum("estado").default("activo").notNull(),
    moneda: monedaEnum("moneda").default("UYU").notNull(),
    precioMensualCent: integer("precio_mensual_cent").default(0).notNull(),
    creado: timestamp("creado", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("planes_codigo_unique").on(t.codigo)],
);

export const planModulos = pgTable(
  "plan_modulos",
  {
    planId: uuid("plan_id").notNull().references(() => planes.id),
    moduloCodigo: varchar("modulo_codigo", { length: 80 }).notNull().references(() => modulos.codigo),
  },
  (t) => [primaryKey({ columns: [t.planId, t.moduloCodigo] })],
);

export const suscripcionesEstudio = pgTable(
  "suscripciones_estudio",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    estudioId: uuid("estudio_id").notNull().references(() => estudios.id),
    planId: uuid("plan_id").notNull().references(() => planes.id),
    estado: estadoSuscripcionEnum("estado").default("prueba").notNull(),
    moneda: monedaEnum("moneda").default("UYU").notNull(),
    precioMensualCent: integer("precio_mensual_cent").default(0).notNull(),
    inicio: timestamp("inicio", { withTimezone: false }).notNull(),
    fin: timestamp("fin", { withTimezone: false }),
    notasInternas: text("notas_internas"),
    creado: timestamp("creado", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("suscripciones_estudio_idx").on(t.estudioId, t.estado)],
);

export const suscripcionAddons = pgTable(
  "suscripcion_addons",
  {
    suscripcionId: uuid("suscripcion_id").notNull().references(() => suscripcionesEstudio.id),
    moduloCodigo: varchar("modulo_codigo", { length: 80 }).notNull().references(() => modulos.codigo),
    precioMensualCent: integer("precio_mensual_cent").default(0).notNull(),
    inicio: timestamp("inicio", { withTimezone: false }).notNull(),
    fin: timestamp("fin", { withTimezone: false }),
  },
  (t) => [primaryKey({ columns: [t.suscripcionId, t.moduloCodigo] })],
);

export const moduloOverrides = pgTable(
  "modulo_overrides",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    suscripcionId: uuid("suscripcion_id").notNull().references(() => suscripcionesEstudio.id),
    moduloCodigo: varchar("modulo_codigo", { length: 80 }).notNull().references(() => modulos.codigo),
    tipo: tipoOverrideModuloEnum("tipo").notNull(),
    motivo: text("motivo").notNull(),
    inicio: timestamp("inicio", { withTimezone: false }).notNull(),
    fin: timestamp("fin", { withTimezone: false }),
    creadoPorUsuarioId: uuid("creado_por_usuario_id").references(() => usuarios.id),
    creado: timestamp("creado", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("modulo_overrides_suscripcion_idx").on(t.suscripcionId, t.moduloCodigo)],
);

export const eventosUsoFacturable = pgTable(
  "eventos_uso_facturable",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    estudioId: uuid("estudio_id").notNull().references(() => estudios.id),
    mes: varchar("mes", { length: 7 }).notNull(),
    tipo: tipoEventoUsoEnum("tipo").notNull(),
    cantidad: integer("cantidad").notNull(),
    referenciaId: text("referencia_id"),
    nota: text("nota"),
    creado: timestamp("creado", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("eventos_uso_estudio_mes_idx").on(t.estudioId, t.mes),
    index("eventos_uso_tipo_idx").on(t.tipo),
  ],
);

export const resumenesCobro = pgTable(
  "resumenes_cobro",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    estudioId: uuid("estudio_id").notNull().references(() => estudios.id),
    mes: varchar("mes", { length: 7 }).notNull(),
    moneda: monedaEnum("moneda").default("UYU").notNull(),
    suscripcionId: uuid("suscripcion_id").notNull().references(() => suscripcionesEstudio.id),
    planId: uuid("plan_id").notNull().references(() => planes.id),
    estadoSuscripcion: estadoSuscripcionEnum("estado_suscripcion").notNull(),
    lineas: jsonb("lineas").$type<LineaCobro[]>().default([]).notNull(),
    eventosUso: jsonb("eventos_uso").$type<EventoUsoFacturable[]>().default([]).notNull(),
    totalCent: integer("total_cent").default(0).notNull(),
    notasInternas: text("notas_internas"),
    generado: timestamp("generado", { withTimezone: true }).notNull(),
    creado: timestamp("creado", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("resumenes_cobro_estudio_mes_unique").on(t.estudioId, t.mes),
    index("resumenes_cobro_mes_idx").on(t.mes),
  ],
);

export const pagosEstudio = pgTable(
  "pagos_estudio",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    estudioId: uuid("estudio_id").notNull().references(() => estudios.id),
    moneda: monedaEnum("moneda").default("UYU").notNull(),
    importeCent: integer("importe_cent").notNull(),
    fecha: timestamp("fecha", { withTimezone: false }).notNull(),
    medio: text("medio"),
    referencia: text("referencia"),
    nota: text("nota"),
    creado: timestamp("creado", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("pagos_estudio_fecha_idx").on(t.estudioId, t.fecha)],
);

export const aplicacionesPago = pgTable(
  "aplicaciones_pago",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pagoId: uuid("pago_id").notNull().references(() => pagosEstudio.id),
    estudioId: uuid("estudio_id").notNull().references(() => estudios.id),
    mes: varchar("mes", { length: 7 }).notNull(),
    importeCent: integer("importe_cent").notNull(),
    nota: text("nota"),
    creado: timestamp("creado", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("aplicaciones_pago_estudio_mes_idx").on(t.estudioId, t.mes)],
);

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
    nombreVisible: text("nombre_visible"),
    razonSocial: text("razon_social"),
    rut: varchar("rut", { length: 20 }).notNull(),
    nroBps: text("nro_bps").notNull(),
    actividad: text("actividad").notNull(),
    grupo: integer("grupo").notNull(),
    subgrupo: text("subgrupo").notNull(),
    responsableId: uuid("responsable_id").references(() => usuarios.id),
    requiereAprobacion: boolean("requiere_aprobacion").default(true).notNull(),
    contactoNombre: text("contacto_nombre").notNull(),
    contactoEmail: text("contacto_email").notNull(),
    contactoTelefono: text("contacto_telefono"),
    direccion: text("direccion"),
    logoArchivoId: uuid("logo_archivo_id"),
    logoDataUrl: text("logo_data_url"),
    reglasLiquidacion: jsonb("reglas_liquidacion").$type<ReglasLiquidacionEmpresa>(),
    portalConfig: jsonb("portal_config").$type<PortalEmpresaConfig>(),
    activa: boolean("activa").default(true).notNull(),
    creada: timestamp("creada", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("empresas_estudio_rut_unique").on(t.estudioId, t.rut),
    index("empresas_estudio_idx").on(t.estudioId),
  ],
);

export const archivosMarca = pgTable(
  "archivos_marca",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    estudioId: uuid("estudio_id").notNull().references(() => estudios.id),
    empresaId: uuid("empresa_id").references(() => empresas.id),
    empleadoId: uuid("empleado_id"),
    duenoTipo: duenoArchivoMarcaEnum("dueno_tipo").notNull(),
    tipo: tipoArchivoMarcaEnum("tipo").notNull(),
    nombreOriginal: text("nombre_original").notNull(),
    mimeType: text("mime_type").notNull(),
    tamanoBytes: integer("tamano_bytes").notNull(),
    storageKey: text("storage_key").notNull(),
    checksumSha256: text("checksum_sha256"),
    creadoPorUsuarioId: uuid("creado_por_usuario_id").references(() => usuarios.id),
    creado: timestamp("creado", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("archivos_marca_estudio_idx").on(t.estudioId),
    index("archivos_marca_empresa_idx").on(t.estudioId, t.empresaId),
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
    solicitud: jsonb("solicitud").$type<Periodo["solicitud"]>(),
    sinNovedades: boolean("sin_novedades").default(false).notNull(),
    versiones: jsonb("versiones").$type<VersionLiquidacion[]>().default([]).notNull(),
    aprobacion: jsonb("aprobacion").$type<Aprobacion>(),
    advertenciasAceptadas: jsonb("advertencias_aceptadas").$type<Record<string, string>>().default({}).notNull(),
    cerrado: jsonb("cerrado").$type<Periodo["cerrado"]>(),
    bpsEstado: bpsEstadoEnum("bps_estado").default("pendiente").notNull(),
    rectificaciones: jsonb("rectificaciones").$type<Periodo["rectificaciones"]>().default([]).notNull(),
    notas: jsonb("notas").$type<Periodo["notas"]>().default([]).notNull(),
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
    adjunto: jsonb("adjunto").$type<{ nombre: string; tipo: string; tamano: number; dataUrl?: string }>(),
    datos: jsonb("datos").$type<NovedadDatos>(),
    origen: origenNovedadEnum("origen").notNull(),
    autor: text("autor").notNull(),
    creada: timestamp("creada", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("novedades_periodo_idx").on(t.estudioId, t.periodoId),
    index("novedades_empleado_idx").on(t.estudioId, t.empleadoId),
  ],
);

export const reciboVistas = pgTable(
  "recibo_vistas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    estudioId: uuid("estudio_id").notNull().references(() => estudios.id),
    empresaId: uuid("empresa_id").notNull().references(() => empresas.id),
    empleadoId: uuid("empleado_id").notNull().references(() => empleados.id),
    mes: varchar("mes", { length: 7 }).notNull(),
    visto: timestamp("visto", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("recibo_vistas_empleado_mes_unique").on(t.empleadoId, t.mes),
    index("recibo_vistas_empresa_mes_idx").on(t.estudioId, t.empresaId, t.mes),
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

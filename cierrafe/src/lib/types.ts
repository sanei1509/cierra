export type Rol = "admin" | "liquidador" | "lectura";

export interface Usuario {
  id: string;
  nombre: string;
  rol: Rol;
  email: string;
}

export interface Empresa {
  id: string;
  nombre: string;
  nombreVisible?: string;
  razonSocial?: string;
  rut: string;
  nroBps: string;
  actividad: string;
  grupo: number;
  subgrupo: string;
  responsableId: string;
  requiereAprobacion: boolean;
  contacto: { nombre: string; email: string };
  direccion?: string;
  tono: Tono;
  /** Logo como data URL (en producción: archivo en storage) */
  logo?: string;
}

export type Tono = "menta" | "lila" | "crema" | "cielo" | "rosa";

export type Modalidad = "mensual" | "jornalero";

export interface Empleado {
  id: string;
  empresaId: string;
  nombre: string;
  apellido: string;
  ci: string;
  email: string;
  cargo: string;
  categoria: string;
  modalidad: Modalidad;
  ingreso: string; // YYYY-MM-DD
  egreso?: string;
  area?: string;
  tipoContrato?: string;
  telefono?: string;
  direccion?: string;
  licenciaDisponible?: number;
  licenciaTomada?: number;
  /** Historia de sueldo base con vigencia (RF-021) */
  sueldos: { desde: string; monto: number }[];
  hijos: number;
  conyugeFonasa: boolean;
  cuenta?: string;
}

export type TipoNovedad =
  | "hora_extra"
  | "falta"
  | "licencia"
  | "bono"
  | "adelanto"
  | "cambio_salarial"
  | "llegada_tarde"
  | "feriado"
  | "certificacion"
  | "suspension"
  | "ausencia_justificada"
  | "licencia_especial"
  | "seguro_paro"
  | "accidente_laboral"
  | "maternidad"
  | "egreso"
  | "ingreso_mes"
  | "cambio_horario"
  | "cambio_categoria"
  | "viatico"
  | "presentismo"
  | "productividad"
  | "descuento_manual"
  | "prestamo_retencion"
  | "reintegro"
  | "retroactivo"
  | "ajuste_mes_anterior"
  | "salario_vacacional_ajuste"
  | "licencia_pendiente";

export interface Adjunto {
  nombre: string;
  tipo: string;
  tamano: number;
  dataUrl?: string;
}

export interface Novedad {
  id: string;
  empresaId: string;
  mes: string; // YYYY-MM
  empleadoId: string;
  tipo: TipoNovedad;
  cantidad?: number; // horas, días o minutos
  importe?: number;
  nota?: string;
  adjunto?: Adjunto;
  origen: "cliente" | "estudio";
  autor: string;
  fecha: string; // ISO
}

export type Etapa =
  | "novedades"
  | "recibidas"
  | "borrador"
  | "enviada"
  | "devuelta"
  | "aprobada"
  | "cerrada";

export interface Linea {
  codigo: string;
  concepto: string;
  tipo: "haber" | "descuento" | "patronal";
  gravadoBps: boolean;
  base?: number;
  cantidad?: number;
  tasa?: number;
  importe: number;
  /** explicación legible del cálculo (RF-042) */
  formula: string;
  parametros?: string[];
}

export interface ResultadoEmpleado {
  empleadoId: string;
  lineas: Linea[];
  totalHaberes: number;
  nominalGravado: number;
  descuentos: number;
  liquido: number;
  aportesPatronales: number;
  costoEmpresa: number;
  fueraDeAlcance?: string;
  irpf: {
    ingreso: number;
    incremento6: boolean;
    impuestoBruto: number;
    tasaDeduccion: number;
    deducciones: number;
    franjas: { desde: number; hasta: number | null; tasa: number; impuesto: number }[];
  } | null;
}

export interface VersionLiquidacion {
  version: number;
  creada: string;
  por: string;
  motor: string;
  parametros: string;
  resultados: ResultadoEmpleado[];
  hash: string;
}

export interface Aprobacion {
  version: number;
  estado: "pendiente" | "aprobada" | "devuelta";
  comentario?: string;
  por?: string;
  fecha?: string;
  enviada: string;
}

export interface Periodo {
  id: string;
  empresaId: string;
  mes: string;
  etapa: Etapa;
  fechaObjetivo: string;
  solicitud?: { enviada: string; abierta?: string; respondida?: string };
  sinNovedades: boolean;
  versiones: VersionLiquidacion[];
  aprobacion?: Aprobacion;
  advertenciasAceptadas: Record<string, string>;
  cerrado?: { fecha: string; por: string; version: number };
  bps: "pendiente" | "generado" | "presentado";
  rectificaciones: { fecha: string; por: string; motivo: string; desdeVersion: number }[];
  notas: { fecha: string; por: string; texto: string }[];
}

export interface AuditEvent {
  id: string;
  fecha: string;
  actor: string;
  empresaId?: string;
  entidad: string;
  accion: string;
  detalle?: string;
  antes?: string;
  despues?: string;
}

export type NivelAlerta = "bloqueante" | "advertencia" | "info";

export interface Alerta {
  id: string;
  nivel: NivelAlerta;
  empleadoId?: string;
  titulo: string;
  detalle: string;
}

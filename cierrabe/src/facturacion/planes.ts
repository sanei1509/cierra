import type { EstudioId, UsuarioId } from "../datos/contexto";
import { validacion } from "../datos/errores";
import { expandirDependencias, obtenerModulo, type CodigoModulo } from "../modulos";

export type Moneda = "UYU" | "USD";
export type EstadoPlan = "activo" | "oculto" | "discontinuado";
export type EstadoSuscripcion = "prueba" | "activo" | "pausado" | "cancelado" | "vencido";
export type TipoOverrideModulo = "habilitar" | "deshabilitar";

export interface PlanComercial {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  estado: EstadoPlan;
  moneda: Moneda;
  precioMensualCent: number;
  modulos: CodigoModulo[];
}

export interface AddonSuscripcion {
  moduloCodigo: CodigoModulo;
  precioMensualCent: number;
  inicio: string;
  fin?: string;
}

export interface OverrideModulo {
  id?: string;
  moduloCodigo: CodigoModulo;
  tipo: TipoOverrideModulo;
  motivo: string;
  inicio: string;
  fin?: string;
  creadoPorUsuarioId?: UsuarioId;
}

export interface SuscripcionEstudio {
  id: string;
  estudioId: EstudioId;
  planId: string;
  estado: EstadoSuscripcion;
  moneda: Moneda;
  precioMensualCent: number;
  inicio: string;
  fin?: string;
  notasInternas?: string;
  addons: AddonSuscripcion[];
  overrides: OverrideModulo[];
}

export interface CrearSuscripcionEstudioInput extends Omit<SuscripcionEstudio, "id" | "addons" | "overrides"> {
  id?: string;
  addons?: AddonSuscripcion[];
  overrides?: OverrideModulo[];
  resumen: string;
}

function validarPrecio(precioMensualCent: number, campo: string) {
  if (!Number.isInteger(precioMensualCent) || precioMensualCent < 0) {
    validacion(`${campo} debe ser un importe entero en centesimos y no negativo`);
  }
}

function validarMoneda(moneda: Moneda) {
  if (!["UYU", "USD"].includes(moneda)) validacion("La moneda debe ser UYU o USD");
}

function validarFecha(fecha: string, campo: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) validacion(`${campo} debe tener formato YYYY-MM-DD`);
}

function validarModulo(codigo: CodigoModulo) {
  if (!obtenerModulo(codigo)) validacion(`El modulo ${codigo} no existe en el catalogo`);
}

export function validarPlanComercial(plan: PlanComercial) {
  if (!plan.codigo.trim()) validacion("El codigo del plan es obligatorio");
  if (!plan.nombre.trim()) validacion("El nombre del plan es obligatorio");
  validarMoneda(plan.moneda);
  validarPrecio(plan.precioMensualCent, "El precio mensual del plan");
  for (const codigo of plan.modulos) validarModulo(codigo);
  return plan;
}

export function validarSuscripcionEstudio(input: CrearSuscripcionEstudioInput) {
  validarMoneda(input.moneda);
  validarPrecio(input.precioMensualCent, "El precio mensual de la suscripcion");
  validarFecha(input.inicio, "La fecha de inicio");
  if (input.fin) validarFecha(input.fin, "La fecha de fin");
  if (!input.resumen.trim()) validacion("El resumen comercial es obligatorio");

  for (const addon of input.addons ?? []) {
    validarModulo(addon.moduloCodigo);
    validarPrecio(addon.precioMensualCent, "El precio mensual del add-on");
    validarFecha(addon.inicio, "La fecha de inicio del add-on");
    if (addon.fin) validarFecha(addon.fin, "La fecha de fin del add-on");
  }

  for (const override of input.overrides ?? []) {
    validarModulo(override.moduloCodigo);
    if (!override.motivo.trim()) validacion("El motivo del override es obligatorio");
    validarFecha(override.inicio, "La fecha de inicio del override");
    if (override.fin) validarFecha(override.fin, "La fecha de fin del override");
  }

  return input;
}

export function modulosContratados(plan: PlanComercial, suscripcion: Pick<SuscripcionEstudio, "estado" | "addons" | "overrides">) {
  if (["pausado", "cancelado", "vencido"].includes(suscripcion.estado)) return [];

  const habilitados = new Set(expandirDependencias([...plan.modulos, ...suscripcion.addons.map((addon) => addon.moduloCodigo)]));
  for (const override of suscripcion.overrides) {
    if (override.tipo === "habilitar") {
      for (const codigo of expandirDependencias([override.moduloCodigo])) habilitados.add(codigo);
    } else {
      habilitados.delete(override.moduloCodigo);
    }
  }
  return [...habilitados];
}

export function totalMensualContratado(suscripcion: Pick<SuscripcionEstudio, "precioMensualCent" | "addons">) {
  return suscripcion.precioMensualCent + suscripcion.addons.reduce((total, addon) => total + addon.precioMensualCent, 0);
}

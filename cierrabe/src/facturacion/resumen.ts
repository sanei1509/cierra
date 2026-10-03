import type { EstudioId } from "../datos/contexto";
import { validacion } from "../datos/errores";
import type { CodigoModulo } from "../modulos";
import type { Moneda, PlanComercial, SuscripcionEstudio } from "./planes";

export type TipoEventoUso = "empresa_activa" | "empleado_activo" | "recibo_generado" | "recibo_enviado";
export type TipoLineaCobro = "plan" | "addon" | "ajuste";

export interface EventoUsoFacturable {
  id?: string;
  estudioId: EstudioId;
  mes: string;
  tipo: TipoEventoUso;
  cantidad: number;
  referenciaId?: string;
  nota?: string;
}

export interface AjusteManualCobro {
  id?: string;
  descripcion: string;
  importeCent: number;
  nota?: string;
}

export interface LineaCobro {
  tipo: TipoLineaCobro;
  concepto: string;
  cantidad: number;
  importeUnitarioCent: number;
  totalCent: number;
  planId?: string;
  moduloCodigo?: CodigoModulo;
  nota?: string;
}

export interface ResumenCobroEstudio {
  estudioId: EstudioId;
  mes: string;
  moneda: Moneda;
  suscripcionId: string;
  planId: string;
  estadoSuscripcion: SuscripcionEstudio["estado"];
  lineas: LineaCobro[];
  eventosUso: EventoUsoFacturable[];
  totalCent: number;
  notasInternas?: string;
  generado: string;
}

export interface GenerarResumenCobroInput {
  mes: string;
  plan: PlanComercial;
  suscripcion: SuscripcionEstudio;
  ajustes?: AjusteManualCobro[];
  eventosUso?: EventoUsoFacturable[];
  generado?: string;
}

function validarMes(mes: string) {
  if (!/^\d{4}-\d{2}$/.test(mes)) validacion("El mes de facturacion debe tener formato YYYY-MM");
}

function validarImporte(importeCent: number, campo: string) {
  if (!Number.isInteger(importeCent)) validacion(`${campo} debe ser un importe entero en centesimos`);
}

function validarCantidad(cantidad: number) {
  if (!Number.isInteger(cantidad) || cantidad < 0) validacion("La cantidad de uso debe ser entera y no negativa");
}

function periodoCobrable(estado: SuscripcionEstudio["estado"]) {
  return estado === "activo" || estado === "prueba";
}

export function generarResumenCobroEstudio(input: GenerarResumenCobroInput): ResumenCobroEstudio {
  validarMes(input.mes);
  if (input.plan.id !== input.suscripcion.planId) validacion("El plan no corresponde a la suscripcion del estudio");

  const eventosUso = input.eventosUso ?? [];
  for (const evento of eventosUso) {
    if (evento.mes !== input.mes) validacion("Los eventos de uso deben pertenecer al mes del resumen");
    if (evento.estudioId !== input.suscripcion.estudioId) validacion("Los eventos de uso deben pertenecer al estudio del resumen");
    validarCantidad(evento.cantidad);
  }

  const lineas: LineaCobro[] = [];
  if (periodoCobrable(input.suscripcion.estado)) {
    lineas.push({
      tipo: "plan",
      concepto: `Plan ${input.plan.nombre}`,
      cantidad: 1,
      importeUnitarioCent: input.suscripcion.precioMensualCent,
      totalCent: input.suscripcion.precioMensualCent,
      planId: input.plan.id,
      nota: "Precio mensual del plan.",
    });

    for (const addon of input.suscripcion.addons) {
      lineas.push({
        tipo: "addon",
        concepto: "Modulo adicional",
        cantidad: 1,
        importeUnitarioCent: addon.precioMensualCent,
        totalCent: addon.precioMensualCent,
        moduloCodigo: addon.moduloCodigo,
        nota: "Modulo adicional contratado.",
      });
    }
  }

  for (const ajuste of input.ajustes ?? []) {
    if (!ajuste.descripcion.trim()) validacion("La descripcion del ajuste manual es obligatoria");
    validarImporte(ajuste.importeCent, "El importe del ajuste manual");
    lineas.push({
      tipo: "ajuste",
      concepto: ajuste.descripcion,
      cantidad: 1,
      importeUnitarioCent: ajuste.importeCent,
      totalCent: ajuste.importeCent,
      nota: ajuste.nota,
    });
  }

  return {
    estudioId: input.suscripcion.estudioId,
    mes: input.mes,
    moneda: input.suscripcion.moneda,
    suscripcionId: input.suscripcion.id,
    planId: input.suscripcion.planId,
    estadoSuscripcion: input.suscripcion.estado,
    lineas,
    eventosUso,
    totalCent: lineas.reduce((total, linea) => total + linea.totalCent, 0),
    notasInternas: input.suscripcion.notasInternas,
    generado: input.generado ?? new Date().toISOString(),
  };
}

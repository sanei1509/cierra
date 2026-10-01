import type { EstudioId } from "../datos/contexto";
import { validacion } from "../datos/errores";
import type { Moneda } from "./planes";
import type { ResumenCobroEstudio } from "./resumen";

export type EstadoCobro = "pendiente" | "parcial" | "pagado" | "saldo_a_favor";

export interface PagoEstudio {
  id?: string;
  estudioId: EstudioId;
  moneda: Moneda;
  importeCent: number;
  fecha: string;
  medio?: string;
  referencia?: string;
  nota?: string;
}

export interface AplicacionPago {
  id?: string;
  pagoId?: string;
  estudioId: EstudioId;
  mes: string;
  importeCent: number;
  nota?: string;
}

export interface EstadoCobroEstudio {
  estado: EstadoCobro;
  totalCent: number;
  pagadoCent: number;
  saldoPendienteCent: number;
  saldoAFavorCent: number;
}

export interface CrearAplicacionesPagoAdelantadoInput {
  estudioId: EstudioId;
  pagoId?: string;
  desdeMes: string;
  meses: number;
  importeTotalCent: number;
  nota?: string;
}

function validarMes(mes: string) {
  if (!/^\d{4}-\d{2}$/.test(mes)) validacion("El mes debe tener formato YYYY-MM");
}

function validarImportePositivo(importeCent: number, campo: string) {
  if (!Number.isInteger(importeCent) || importeCent <= 0) validacion(`${campo} debe ser un entero positivo en centesimos`);
}

function sumarMeses(mes: string, cantidad: number) {
  validarMes(mes);
  const [anio, mesNumero] = mes.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mesNumero - 1 + cantidad, 1));
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function calcularEstadoCobro(resumen: Pick<ResumenCobroEstudio, "estudioId" | "mes" | "totalCent">, aplicaciones: AplicacionPago[]): EstadoCobroEstudio {
  const pagadoCent = aplicaciones
    .filter((aplicacion) => aplicacion.estudioId === resumen.estudioId && aplicacion.mes === resumen.mes)
    .reduce((total, aplicacion) => total + aplicacion.importeCent, 0);

  if (pagadoCent <= 0) {
    return { estado: "pendiente", totalCent: resumen.totalCent, pagadoCent: 0, saldoPendienteCent: resumen.totalCent, saldoAFavorCent: 0 };
  }

  if (pagadoCent < resumen.totalCent) {
    return { estado: "parcial", totalCent: resumen.totalCent, pagadoCent, saldoPendienteCent: resumen.totalCent - pagadoCent, saldoAFavorCent: 0 };
  }

  const saldoAFavorCent = pagadoCent - resumen.totalCent;
  return {
    estado: saldoAFavorCent > 0 ? "saldo_a_favor" : "pagado",
    totalCent: resumen.totalCent,
    pagadoCent,
    saldoPendienteCent: 0,
    saldoAFavorCent,
  };
}

export function crearAplicacionesPagoAdelantado(input: CrearAplicacionesPagoAdelantadoInput): AplicacionPago[] {
  validarMes(input.desdeMes);
  if (!Number.isInteger(input.meses) || input.meses <= 0) validacion("La cantidad de meses adelantados debe ser positiva");
  validarImportePositivo(input.importeTotalCent, "El importe del pago adelantado");

  const base = Math.trunc(input.importeTotalCent / input.meses);
  let resto = input.importeTotalCent - base * input.meses;

  return Array.from({ length: input.meses }, (_, index) => {
    const extra = resto > 0 ? 1 : 0;
    resto -= extra;
    return {
      pagoId: input.pagoId,
      estudioId: input.estudioId,
      mes: sumarMeses(input.desdeMes, index),
      importeCent: base + extra,
      nota: input.nota,
    };
  });
}

export function validarPagoEstudio(input: PagoEstudio) {
  validarImportePositivo(input.importeCent, "El importe del pago");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fecha)) validacion("La fecha de pago debe tener formato YYYY-MM-DD");
  if (!["UYU", "USD"].includes(input.moneda)) validacion("La moneda debe ser UYU o USD");
  return input;
}

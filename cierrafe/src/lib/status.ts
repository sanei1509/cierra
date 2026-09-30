import type { Alerta, Periodo, Tono } from "./types";
import { pendientes } from "./validations";

export type EstadoVisible =
  | "pendiente"
  | "alertas"
  | "lista"
  | "borrador"
  | "esperando"
  | "devuelta"
  | "aprobada"
  | "cerrada"
  | "rectificacion";

export const ESTADOS: Record<EstadoVisible, { label: string; corto: string; cta: string; tono: Tono | "tinta"; orden: number }> = {
  pendiente: { corto: "Sin novedades", label: "Pendiente de novedades", cta: "Solicitar novedades", tono: "crema", orden: 0 },
  alertas: { corto: "Alertas", label: "Con alertas", cta: "Resolver alertas", tono: "rosa", orden: 1 },
  devuelta: { corto: "Devuelta", label: "Devuelta por el cliente", cta: "Corregir", tono: "rosa", orden: 2 },
  lista: { corto: "Calcular", label: "Lista para liquidar", cta: "Calcular", tono: "cielo", orden: 3 },
  borrador: { corto: "Borrador", label: "Borrador calculado", cta: "Revisar", tono: "lila", orden: 4 },
  esperando: { corto: "Esperando", label: "Esperando aprobación", cta: "Ver aprobación", tono: "lila", orden: 5 },
  aprobada: { corto: "Aprobada", label: "Aprobada", cta: "Cerrar y emitir recibos", tono: "menta", orden: 6 },
  rectificacion: { corto: "Rectificación", label: "Rectificación", cta: "Revisar cambios", tono: "crema", orden: 7 },
  cerrada: { corto: "Cerrada", label: "Cerrada", cta: "Ver salidas", tono: "tinta", orden: 8 },
};

export function estadoVisible(p: Periodo, alertas: Alerta[]): EstadoVisible {
  const { total, bloq } = pendientes(alertas, p);
  switch (p.etapa) {
    case "novedades":
      return "pendiente";
    case "recibidas":
      return bloq.length ? "alertas" : "lista";
    case "borrador":
      if (p.rectificaciones.length && total === 0) return "rectificacion";
      return total ? "alertas" : "borrador";
    case "enviada":
      return "esperando";
    case "devuelta":
      return "devuelta";
    case "aprobada":
      return "aprobada";
    case "cerrada":
      return "cerrada";
  }
}

export const PASOS = ["Novedades", "Validación", "Liquidación", "Aprobación", "Recibos", "BPS"] as const;

/** Índice del paso activo en el stepper (0..6; 6 = todo completo) */
export function pasoActual(p: Periodo, alertasPend: number): number {
  switch (p.etapa) {
    case "novedades":
      return 0;
    case "recibidas":
      return alertasPend ? 1 : 2;
    case "borrador":
      return alertasPend ? 1 : 2;
    case "devuelta":
      return 2;
    case "enviada":
      return 3;
    case "aprobada":
      return 4;
    case "cerrada":
      return p.bps === "presentado" ? 6 : 5;
  }
}

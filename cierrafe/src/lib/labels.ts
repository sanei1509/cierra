import type { Novedad, Periodo, TipoNovedad, Tono } from "./types";
import { fecha, fmt } from "./format";

export const TIPOS: Record<TipoNovedad, { label: string; corto: string; unidad: "horas" | "días" | "minutos" | "$"; tono: Tono; ayuda: string }> = {
  hora_extra: { label: "Horas extra", corto: "Hora extra", unidad: "horas", tono: "cielo", ayuda: "Cantidad de horas extra comunes del mes" },
  falta: { label: "Faltas", corto: "Falta", unidad: "días", tono: "rosa", ayuda: "Días no trabajados sin justificar" },
  licencia: { label: "Licencia", corto: "Licencia", unidad: "días", tono: "menta", ayuda: "Días de licencia gozados en el mes" },
  bono: { label: "Bono o comisión", corto: "Bono", unidad: "$", tono: "crema", ayuda: "Importe nominal a pagar" },
  adelanto: { label: "Adelanto", corto: "Adelanto", unidad: "$", tono: "lila", ayuda: "Dinero ya entregado que se descuenta" },
  llegada_tarde: { label: "Llegada tarde", corto: "Llegada tarde", unidad: "minutos", tono: "rosa", ayuda: "Total de minutos de llegadas tarde del mes" },
  feriado: { label: "Feriado trabajado", corto: "Feriado", unidad: "días", tono: "cielo", ayuda: "Feriados pagos (1/1, 1/5, 18/7, 25/8, 25/12) trabajados" },
  certificacion: { label: "Certificación médica", corto: "Certificación", unidad: "días", tono: "menta", ayuda: "Días de enfermedad con certificado. Adjuntá el certificado" },
  cambio_salarial: { label: "Cambio de sueldo", corto: "Nuevo sueldo", unidad: "$", tono: "lila", ayuda: "Nuevo sueldo base mensual desde este mes" },
};

export const valorNovedad = (n: Novedad) => {
  const t = TIPOS[n.tipo];
  if (t.unidad === "$") return fmt(n.importe ?? 0);
  if (t.unidad === "horas") return `${n.cantidad} h`;
  if (t.unidad === "minutos") return `${n.cantidad} min`;
  return `${n.cantidad} ${n.cantidad === 1 ? "día" : "días"}`;
};

export function estadoNovedades(p: Periodo): { texto: string; tono: Tono | "gris" } {
  if (p.sinNovedades && p.etapa !== "novedades") return { texto: "Sin novedades (confirmado)", tono: "menta" };
  if (p.solicitud?.respondida) return { texto: `Recibidas ${fecha(p.solicitud.respondida)}`, tono: "menta" };
  if (p.etapa !== "novedades") return { texto: "Cargadas por el estudio", tono: "menta" };
  if (p.solicitud?.abierta) return { texto: `Cliente abrió ${fecha(p.solicitud.abierta)}`, tono: "crema" };
  if (p.solicitud) return { texto: `Sin respuesta · pedida ${fecha(p.solicitud.enviada)}`, tono: "rosa" };
  return { texto: "No solicitadas", tono: "gris" };
}

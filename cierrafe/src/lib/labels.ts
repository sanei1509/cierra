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
  suspension: { label: "Suspensión", corto: "Suspensión", unidad: "días", tono: "rosa", ayuda: "Días suspendidos sin goce. Aclarar motivo en comentario" },
  ausencia_justificada: { label: "Ausencia justificada", corto: "Aus. justificada", unidad: "días", tono: "menta", ayuda: "Días justificados sin descuento automático" },
  licencia_especial: { label: "Licencia especial", corto: "Lic. especial", unidad: "días", tono: "menta", ayuda: "Estudio, duelo, matrimonio, paternidad u otra licencia especial" },
  seguro_paro: { label: "Seguro de paro", corto: "Seguro de paro", unidad: "días", tono: "rosa", ayuda: "Días cubiertos por seguro de paro total o parcial" },
  accidente_laboral: { label: "Accidente laboral / BSE", corto: "Accidente BSE", unidad: "días", tono: "rosa", ayuda: "Días cubiertos por BSE. Adjuntá constancia si aplica" },
  maternidad: { label: "Maternidad / subsidio", corto: "Maternidad", unidad: "días", tono: "menta", ayuda: "Días cubiertos por subsidio BPS" },
  egreso: { label: "Egreso / baja", corto: "Egreso", unidad: "días", tono: "rosa", ayuda: "Días no trabajados por egreso. Detallar fecha y causal en comentario" },
  ingreso_mes: { label: "Ingreso en el mes", corto: "Ingreso mes", unidad: "días", tono: "cielo", ayuda: "Fecha real de ingreso y datos iniciales para corregir la ficha laboral" },
  cambio_horario: { label: "Cambio de horario", corto: "Cambio horario", unidad: "horas", tono: "lila", ayuda: "Horas semanales nuevas o diferencia a revisar. Detallar en comentario" },
  cambio_categoria: { label: "Cambio de categoría", corto: "Cambio categoría", unidad: "$", tono: "lila", ayuda: "Nuevo sueldo/categoría a revisar. Detallar categoría en comentario" },
  viatico: { label: "Viáticos", corto: "Viático", unidad: "$", tono: "crema", ayuda: "Importe de viáticos. Regla simplificada no gravada" },
  presentismo: { label: "Presentismo", corto: "Presentismo", unidad: "$", tono: "crema", ayuda: "Prima por asistencia o presentismo nominal gravado" },
  productividad: { label: "Productividad / premio", corto: "Productividad", unidad: "$", tono: "crema", ayuda: "Premio o productividad nominal gravada" },
  descuento_manual: { label: "Descuento manual", corto: "Descuento", unidad: "$", tono: "rosa", ayuda: "Descuento no BPS informado por el estudio" },
  prestamo_retencion: { label: "Préstamo / retención", corto: "Retención", unidad: "$", tono: "rosa", ayuda: "Préstamo, retención o embargo a descontar del líquido" },
  reintegro: { label: "Reintegro", corto: "Reintegro", unidad: "$", tono: "menta", ayuda: "Reintegro no gravado al empleado" },
  retroactivo: { label: "Retroactivo", corto: "Retroactivo", unidad: "$", tono: "crema", ayuda: "Diferencia retroactiva nominal gravada" },
  ajuste_mes_anterior: { label: "Ajuste mes anterior", corto: "Ajuste anterior", unidad: "$", tono: "lila", ayuda: "Ajuste positivo de meses anteriores. Usá descuento manual si resta" },
  salario_vacacional_ajuste: { label: "Ajuste salario vacacional", corto: "Ajuste SV", unidad: "$", tono: "menta", ayuda: "Ajuste de salario vacacional no gravado BPS" },
  licencia_pendiente: { label: "Licencia pendiente", corto: "Lic. pendiente", unidad: "días", tono: "menta", ayuda: "Días de licencia pendiente informados para control" },
};

export const valorNovedad = (n: Novedad) => {
  const t = TIPOS[n.tipo];
  if (n.tipo === "egreso" && n.datos?.egresoFecha) return n.datos.egresoFecha;
  if (n.tipo === "ingreso_mes" && n.datos?.ingresoFecha) return n.datos.ingresoFecha;
  if (n.tipo === "seguro_paro" && n.datos?.seguroParoDesde && n.datos?.seguroParoHasta) return `${n.datos.seguroParoDesde} a ${n.datos.seguroParoHasta}`;
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

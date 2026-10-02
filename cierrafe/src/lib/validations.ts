import type { Alerta, Empleado, Empresa, Novedad, Periodo, ResultadoEmpleado } from "./types";
import { activoEn, calcularEmpresa } from "./engine";
import { laudoDe } from "./params";
import { fmt, mesAnterior, pct } from "./format";

export const UMBRAL_VARIACION = 0.15;

/**
 * Motor de validaciones (RF-050..054, sección 13).
 * Bloqueantes impiden calcular/cerrar; advertencias se aceptan con nota.
 */
export function validar(
  empresa: Empresa,
  empleadosTodos: Empleado[],
  periodo: Periodo,
  novedades: Novedad[],
  resultados?: ResultadoEmpleado[],
): Alerta[] {
  const out: Alerta[] = [];
  const mes = periodo.mes;
  const empleados = empleadosTodos.filter((e) => e.empresaId === empresa.id && activoEn(e, mes));
  const nom = (e: Empleado) => `${e.nombre} ${e.apellido}`;

  for (const e of empleados) {
    if (e.modalidad !== "mensual" || [9, 21, 22].includes(empresa.grupo)) {
      out.push({
        id: `alcance-${e.id}`,
        nivel: "bloqueante",
        empleadoId: e.id,
        titulo: `${nom(e)}: caso fuera de alcance`,
        detalle:
          empresa.grupo === 9
            ? "Construcción tiene régimen de aportación propio. El sistema no calcula este caso: liquidalo por fuera y adjuntá el comprobante."
            : "Jornaleros no están soportados todavía. El sistema no estima este resultado.",
      });
      continue;
    }
    if (!e.ci)
      out.push({
        id: `ci-${e.id}`,
        nivel: "bloqueante",
        empleadoId: e.id,
        titulo: `${nom(e)} no tiene cédula cargada`,
        detalle: "La cédula es obligatoria para la nómina de BPS y el recibo.",
      });
    const sueldo = [...e.sueldos].filter((s) => s.desde.slice(0, 7) <= mes).sort((a, b) => b.desde.localeCompare(a.desde))[0]?.monto ?? 0;
    const cambio = novedades.find((n) => n.empleadoId === e.id && n.mes === mes && n.tipo === "cambio_salarial")?.importe;
    const efectivo = cambio ?? sueldo;
    const laudo = laudoDe(empresa.grupo, empresa.subgrupo, e.categoria);
    if (laudo && efectivo < laudo.minimo)
      out.push({
        id: `laudo-${e.id}`,
        nivel: "bloqueante",
        empleadoId: e.id,
        titulo: `${nom(e)} cobra menos que el mínimo de su categoría`,
        detalle: `Sueldo ${fmt(efectivo)} y el laudo de ${laudo.categoria} (grupo ${laudo.grupo}.${laudo.subgrupo}) es ${fmt(laudo.minimo)} desde ${laudo.vigenciaDesde}.`,
      });
    if (!e.email)
      out.push({
        id: `mail-${e.id}`,
        nivel: "info",
        empleadoId: e.id,
        titulo: `${nom(e)} no tiene email`,
        detalle: "No va a recibir el aviso del recibo. Puede entrar al portal con su cédula.",
      });

    const comprobanteRequerido = new Set<Novedad["tipo"]>(["certificacion", "accidente_laboral", "maternidad"]);
    const certSinAdjunto = novedades.filter((n) => n.empleadoId === e.id && n.mes === mes && comprobanteRequerido.has(n.tipo) && !n.adjunto);
    if (certSinAdjunto.length)
      out.push({
        id: `cert-${e.id}`,
        nivel: "advertencia",
        empleadoId: e.id,
        titulo: `${nom(e)}: novedad de subsidio sin comprobante`,
        detalle: "Pedile al cliente el certificado/constancia o adjuntalo desde la novedad. Sin comprobante, el descuento puede ser observado.",
      });

    // Variables recurrentes sin novedad este mes
    const prev1 = mesAnterior(mes);
    const prev2 = mesAnterior(prev1);
    const tuvoHE = (m: string) => novedades.some((n) => n.empleadoId === e.id && n.mes === m && n.tipo === "hora_extra");
    if (tuvoHE(prev1) && tuvoHE(prev2) && !tuvoHE(mes) && periodo.etapa !== "novedades")
      out.push({
        id: `sinhe-${e.id}`,
        nivel: "advertencia",
        empleadoId: e.id,
        titulo: `${nom(e)} no tiene horas extra este mes`,
        detalle: "Tuvo horas extra en los dos meses anteriores. Confirmá con el cliente que no falte información.",
      });
  }

  if (resultados) {
    const prev = calcularEmpresa(empresa, empleadosTodos, mesAnterior(mes), novedades);
    for (const r of resultados) {
      if (r.fueraDeAlcance) continue;
      const e = empleados.find((x) => x.id === r.empleadoId);
      if (!e) continue;
      if (r.liquido < 0)
        out.push({
          id: `neg-${e.id}`,
          nivel: "bloqueante",
          empleadoId: e.id,
          titulo: `${nom(e)} tiene líquido negativo`,
          detalle: `Líquido ${fmt(r.liquido)}. Revisá adelantos y descuentos.`,
        });
      const p = prev.find((x) => x.empleadoId === r.empleadoId);
      if (p && p.totalHaberes > 0) {
        const v = (r.totalHaberes - p.totalHaberes) / p.totalHaberes;
        if (Math.abs(v) > UMBRAL_VARIACION)
          out.push({
            id: `var-${e.id}`,
            nivel: "advertencia",
            empleadoId: e.id,
            titulo: `${nom(e)}: nominal ${v > 0 ? "+" : ""}${pct(v, 0)} vs. mes anterior`,
            detalle: `Pasó de ${fmt(p.totalHaberes)} a ${fmt(r.totalHaberes)}. Supera el umbral de ${pct(UMBRAL_VARIACION, 0)}.`,
          });
      }
      const bono = r.lineas.filter((l) => l.concepto.startsWith("Bono") || l.concepto.startsWith("Productividad")).reduce((s, l) => s + l.importe, 0);
      const base = r.lineas.find((l) => l.codigo === "001")?.base ?? 0;
      if (bono > base * 0.4)
        out.push({
          id: `bono-${e.id}`,
          nivel: "advertencia",
          empleadoId: e.id,
          titulo: `${nom(e)}: bono alto`,
          detalle: `El bono (${fmt(bono)}) supera el 40% del sueldo base.`,
        });
    }
  }

  if (periodo.etapa === "novedades" && periodo.solicitud && !periodo.solicitud.abierta)
    out.push({
      id: "sol-noabierta",
      nivel: "info",
      titulo: "El cliente todavía no abrió la solicitud",
      detalle: `Enviada el ${new Date(periodo.solicitud.enviada).toLocaleDateString("es-UY")}. Podés reenviarla o cargar las novedades vos.`,
    });

  return out;
}

export function pendientes(alertas: Alerta[], periodo: Periodo) {
  const bloq = alertas.filter((a) => a.nivel === "bloqueante");
  const adv = alertas.filter((a) => a.nivel === "advertencia" && !periodo.advertenciasAceptadas[a.id]);
  return { bloq, adv, total: bloq.length + adv.length };
}

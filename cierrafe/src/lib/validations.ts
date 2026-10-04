import type { Alerta, AuditEvent, Empleado, Empresa, Novedad, Periodo, ResultadoEmpleado } from "./types";
import { activoEn, calcularEmpresa } from "./engine";
import { laudoDe } from "./params";
import { fmt, mesAnterior, pct } from "./format";

export const UMBRAL_VARIACION = 0.15;

export interface ControlFichaEmpleado {
  bloqueos: string[];
  advertencias: string[];
}

export interface DatosControlFichaEmpleado {
  nombre: string;
  apellido: string;
  ci: string;
  email: string;
  cargo: string;
  categoria: string;
  area?: string;
  tipoContrato?: string;
  ingreso: string;
  sueldo: number;
  telefono?: string;
  direccion?: string;
  cuenta?: string;
}

const EMAIL_SIMPLE = /^\S+@\S+\.\S+$/;

function ciLimpia(ci: string) {
  return ci.replace(/\D/g, "");
}

export function controlarFichaEmpleado(datos: DatosControlFichaEmpleado): ControlFichaEmpleado {
  const bloqueos: string[] = [];
  const advertencias: string[] = [];

  if (!datos.nombre.trim() || !datos.apellido.trim()) bloqueos.push("Falta nombre o apellido.");
  const ci = ciLimpia(datos.ci);
  if (!ci) bloqueos.push("Falta la cédula.");
  else if (ci.length < 7 || ci.length > 8) bloqueos.push("La cédula debe tener 7 u 8 dígitos.");
  if (!datos.email.trim()) bloqueos.push("Falta el email de acceso al portal de recibos.");
  else if (!EMAIL_SIMPLE.test(datos.email.trim())) bloqueos.push("El email de acceso no tiene un formato válido.");
  if (!datos.cargo.trim()) bloqueos.push("Falta el cargo.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.ingreso)) bloqueos.push("Falta una fecha de ingreso válida.");
  if (!Number.isFinite(datos.sueldo) || datos.sueldo <= 0) bloqueos.push("Falta un sueldo mensual nominal mayor a cero.");

  if (!datos.categoria.trim()) advertencias.push("Falta categoría / grupo de Consejo de Salario.");
  if (!datos.area?.trim()) advertencias.push("Falta área.");
  if (!datos.tipoContrato?.trim()) advertencias.push("Falta tipo de contrato.");
  if (!datos.telefono?.trim()) advertencias.push("Falta teléfono.");
  if (!datos.direccion?.trim()) advertencias.push("Falta dirección.");
  if (!datos.cuenta?.trim()) advertencias.push("Falta banco / cuenta bancaria.");

  return { bloqueos, advertencias };
}

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
  audit: AuditEvent[] = [],
): Alerta[] {
  const out: Alerta[] = [];
  const mes = periodo.mes;
  const empleados = empleadosTodos.filter((e) => e.empresaId === empresa.id && activoEn(e, mes));
  const nom = (e: Empleado) => `${e.nombre} ${e.apellido}`;
  const altasPorRevisar = new Set(
    audit
      .filter((evento) => evento.empresaId === empresa.id && evento.entidad === "Empleado" && evento.accion.startsWith("Empleado nuevo para revisar") && evento.entidadId)
      .map((evento) => evento.entidadId!),
  );

  for (const e of empleados) {
    const sueldoVigente = [...e.sueldos].filter((s) => s.desde.slice(0, 7) <= mes).sort((a, b) => b.desde.localeCompare(a.desde))[0]?.monto ?? 0;
    const controlFicha = controlarFichaEmpleado({
      nombre: e.nombre,
      apellido: e.apellido,
      ci: e.ci,
      email: e.email,
      cargo: e.cargo,
      categoria: e.categoria,
      area: e.area,
      tipoContrato: e.tipoContrato,
      ingreso: e.ingreso,
      sueldo: sueldoVigente,
      telefono: e.telefono,
      direccion: e.direccion,
      cuenta: e.cuenta,
    });

    const requiereRevisionAlta = altasPorRevisar.has(e.id) || e.ingreso.slice(0, 7) === mes;

    if (requiereRevisionAlta) {
      out.push({
        id: `alta-${e.id}-${mes}`,
        nivel: "advertencia",
        empleadoId: e.id,
        titulo: `${nom(e)} es un alta nueva`,
        detalle: "La empresa cargó una persona nueva este mes. Revisá ficha, contrato, categoría, sueldo, cuenta y acceso antes de cerrar.",
      });
    }

    if (requiereRevisionAlta && controlFicha.advertencias.length) {
      out.push({
        id: `ficha-${e.id}`,
        nivel: "advertencia",
        empleadoId: e.id,
        titulo: `${nom(e)} tiene datos de ficha incompletos`,
        detalle: controlFicha.advertencias.join(" "),
      });
    }

    if (controlFicha.bloqueos.length) {
      out.push({
        id: `ficha-bloq-${e.id}`,
        nivel: "bloqueante",
        empleadoId: e.id,
        titulo: `${nom(e)} tiene datos obligatorios incompletos`,
        detalle: controlFicha.bloqueos.join(" "),
      });
    }

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
    const cambio = novedades.find((n) => n.empleadoId === e.id && n.mes === mes && n.tipo === "cambio_salarial")?.importe;
    const efectivo = cambio ?? sueldoVigente;
    const laudo = laudoDe(empresa.grupo, empresa.subgrupo, e.categoria);
    if (laudo && efectivo < laudo.minimo)
      out.push({
        id: `laudo-${e.id}`,
        nivel: "bloqueante",
        empleadoId: e.id,
        titulo: `${nom(e)} cobra menos que el mínimo de su categoría`,
        detalle: `Sueldo ${fmt(efectivo)} y el laudo de ${laudo.categoria} (grupo ${laudo.grupo}.${laudo.subgrupo}) es ${fmt(laudo.minimo)} desde ${laudo.vigenciaDesde}.`,
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

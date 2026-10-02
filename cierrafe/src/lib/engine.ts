/**
 * Motor de liquidación determinista (sección 19 de la spec).
 * Mismos datos + misma versión de parámetros => mismo resultado.
 * Alcance: trabajadores mensuales, Industria y Comercio / servicios.
 */
import type { Empleado, Empresa, Linea, Novedad, ResultadoEmpleado } from "./types";
import { GRUPOS_FUERA_DE_ALCANCE, parametrosVigentes, type Parametros } from "./params";
import { fmt, pct } from "./format";

const r2 = (n: number) => Math.round(n * 100) / 100;

const sumaCantidad = (novs: Novedad[], tipo: Novedad["tipo"]) => novs.filter((n) => n.tipo === tipo).reduce((s, n) => s + (n.cantidad ?? 0), 0);
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const NOVEDADES_CORTAN_PRESENTISMO: Novedad["tipo"][] = [
  "falta",
  "certificacion",
  "suspension",
  "seguro_paro",
  "accidente_laboral",
  "maternidad",
  "llegada_tarde",
];

function conceptoDinero(tipo: Novedad["tipo"]) {
  switch (tipo) {
    case "bono":
      return "Bono / comisión";
    case "presentismo":
      return "Presentismo";
    case "productividad":
      return "Productividad / premio";
    case "retroactivo":
      return "Retroactivo";
    case "ajuste_mes_anterior":
      return "Ajuste mes anterior";
    case "cambio_categoria":
      return "Cambio de categoría";
    case "viatico":
      return "Viático";
    case "reintegro":
      return "Reintegro";
    case "salario_vacacional_ajuste":
      return "Ajuste salario vacacional";
    case "adelanto":
      return "Adelanto de sueldo";
    case "descuento_manual":
      return "Descuento manual";
    case "prestamo_retencion":
      return "Préstamo / retención";
    default:
      return "Novedad";
  }
}

export function sueldoVigente(emp: Empleado, mes: string, novs: Novedad[] = []): { monto: number; origen: string } {
  const cambio = novs.find((n) => n.empleadoId === emp.id && n.tipo === "cambio_salarial" && n.importe);
  if (cambio) return { monto: cambio.importe!, origen: `novedad de cambio salarial (${mes})` };
  const cambioCategoria = novs.find((n) => n.empleadoId === emp.id && n.tipo === "cambio_categoria" && (n.datos?.sueldoNuevo || n.datos?.nuevoSueldo || n.importe));
  if (cambioCategoria) {
    const categoria = cambioCategoria.datos?.categoriaNueva ?? cambioCategoria.datos?.nuevaCategoria;
    return {
      monto: cambioCategoria.datos?.sueldoNuevo ?? cambioCategoria.datos?.nuevoSueldo ?? cambioCategoria.importe!,
      origen: categoria ? `cambio de categoría a ${categoria} (${mes})` : `cambio de categoría (${mes})`,
    };
  }
  const vig = [...emp.sueldos].filter((s) => s.desde.slice(0, 7) <= mes).sort((a, b) => b.desde.localeCompare(a.desde))[0];
  return vig ? { monto: vig.monto, origen: `sueldo base vigente desde ${vig.desde}` } : { monto: 0, origen: "sin sueldo cargado" };
}

function sumarHaberes(lineas: Linea[]) {
  return lineas.filter((l) => l.tipo === "haber").reduce((s, l) => s + l.importe, 0);
}

function sumarNominalGravado(lineas: Linea[]) {
  return lineas.filter((l) => l.tipo === "haber" && l.gravadoBps).reduce((s, l) => s + l.importe, 0);
}

function montoPresentismo(empresa: Empresa, emp: Empleado, lineas: Linea[], base: number, P: Parametros) {
  const regla = empresa.reglasLiquidacion?.presentismo;
  if (!regla?.habilitado) return 0;
  const valor = regla.valor ?? regla.monto ?? 0;
  if (valor <= 0) return 0;
  if (regla.tipoCalculo === "porcentaje_sueldo_base") return r2(base * (valor / 100));
  if (regla.tipoCalculo === "porcentaje_liquido_estimado") {
    const nominal = sumarNominalGravado(lineas);
    const baseJub = Math.min(nominal, P.topeJubilatorio);
    const bajo = nominal <= P.fonasa.umbralBpc * P.bpc;
    const tasaFonasa =
      (bajo ? P.fonasa.tasaBaja : emp.hijos > 0 ? P.fonasa.tasaConHijos : P.fonasa.tasaSinHijos) +
      (emp.conyugeFonasa ? P.fonasa.adicionalConyuge : 0);
    const liquidoEstimado = sumarHaberes(lineas) - baseJub * P.personal.jubilatorio - nominal * tasaFonasa - nominal * P.personal.frl;
    return r2(liquidoEstimado * (valor / 100));
  }
  return r2(valor);
}

function porcentajePresentismo(empresa: Empresa, novs: Novedad[]) {
  const presentismo = empresa.reglasLiquidacion?.presentismo;
  const condiciones =
    presentismo?.condiciones ??
    (presentismo?.descontarConNovedades ?? NOVEDADES_CORTAN_PRESENTISMO).map((tipo) => ({ tipo, accion: "no_paga" as const, desdeCantidad: 0 }));
  let porcentaje = 100;
  for (const condicion of condiciones) {
    const candidatas = novs.filter((n) => n.tipo === condicion.tipo && (n.tipo !== "seguro_paro" || n.datos?.seguroParoAfectaPresentismo !== false));
    const cantidad = candidatas.reduce((s, n) => s + (n.cantidad ?? 0), 0);
    const aplica = candidatas.some((n) => ((n.cantidad ?? 0) > 0 || (n.importe ?? 0) > 0));
    if (!aplica || cantidad < (condicion.desdeCantidad ?? 0)) continue;
    if (condicion.accion === "no_paga") porcentaje = Math.min(porcentaje, 0);
    if (condicion.accion === "paga_mitad") porcentaje = Math.min(porcentaje, 50);
    if (condicion.accion === "paga_porcentaje") porcentaje = Math.min(porcentaje, condicion.porcentajePago ?? 0);
  }
  return porcentaje;
}

export function activoEn(emp: Empleado, mes: string) {
  return emp.ingreso.slice(0, 7) <= mes && (!emp.egreso || emp.egreso.slice(0, 7) >= mes);
}

function diasTrabajados(emp: Empleado, mes: string) {
  let desde = 1;
  let hasta = 30;
  if (emp.ingreso.slice(0, 7) === mes) desde = Math.min(30, Number(emp.ingreso.slice(8, 10)));
  if (emp.egreso && emp.egreso.slice(0, 7) === mes) hasta = Math.min(30, Number(emp.egreso.slice(8, 10)));
  return Math.max(0, hasta - desde + 1);
}

function mesesSemestre(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  const inicio = m <= 6 ? 1 : 7;
  return Array.from({ length: 6 }, (_, i) => `${y}-${String(inicio + i).padStart(2, "0")}`);
}

export function calcularEmpleado(
  empresa: Empresa,
  emp: Empleado,
  mes: string,
  novedadesMes: Novedad[],
  P: Parametros = parametrosVigentes(mes),
): ResultadoEmpleado {
  const vacio = (motivo: string): ResultadoEmpleado => ({
    empleadoId: emp.id,
    lineas: [],
    totalHaberes: 0,
    nominalGravado: 0,
    descuentos: 0,
    liquido: 0,
    aportesPatronales: 0,
    costoEmpresa: 0,
    fueraDeAlcance: motivo,
    irpf: null,
  });

  if (GRUPOS_FUERA_DE_ALCANCE[empresa.grupo])
    return vacio(`Grupo ${empresa.grupo}: ${GRUPOS_FUERA_DE_ALCANCE[empresa.grupo]}. Requiere liquidación externa.`);
  if (emp.modalidad !== "mensual") return vacio("Trabajador jornalero: fuera del alcance del MVP.");

  const novs = novedadesMes.filter((n) => n.empleadoId === emp.id);
  const L: Linea[] = [];
  const bpcRef = `BPC ${fmt(P.bpc)} (${P.id})`;

  // Sueldo básico
  const { monto: base, origen } = sueldoVigente(emp, mes, novs);
  const jornal = base / 30;
  const dias = diasTrabajados(emp, mes);
  const horasExtraFactor = empresa.reglasLiquidacion?.horasExtraFactor ?? 1 + P.horas.recargoExtra;
  const feriadoFactor = empresa.reglasLiquidacion?.feriadoFactor ?? P.feriadoFactor;
  const sueldo = dias >= 30 ? base : jornal * dias;
  L.push({
    codigo: "001",
    concepto: "Sueldo básico",
    tipo: "haber",
    gravadoBps: true,
    base,
    cantidad: dias,
    importe: r2(sueldo),
    formula:
      dias >= 30
        ? `Sueldo mensual completo: ${fmt(base)} (${origen}).`
        : `Mes parcial: ${fmt(base)} ÷ 30 × ${dias} días trabajados = ${fmt(sueldo)}.`,
  });

  // Faltas
  const faltas = novs.filter((n) => n.tipo === "falta").reduce((s, n) => s + (n.cantidad ?? 0), 0);
  if (faltas > 0)
    L.push({
      codigo: "010",
      concepto: "Descuento por inasistencias",
      tipo: "haber",
      gravadoBps: true,
      base: jornal,
      cantidad: faltas,
      importe: r2(-jornal * faltas),
      formula: `Jornal ${fmt(jornal)} (sueldo ÷ 30) × ${faltas} día(s) de falta sin justificar.`,
    });

  // Certificación médica: esos días los cubre el subsidio por enfermedad, no el empleador
  const cert = novs.filter((n) => n.tipo === "certificacion").reduce((s, n) => s + (n.cantidad ?? 0), 0);
  if (cert > 0)
    L.push({
      codigo: "011",
      concepto: "Días con certificación médica",
      tipo: "haber",
      gravadoBps: true,
      base: jornal,
      cantidad: cert,
      importe: r2(-jornal * cert),
      formula: `Jornal ${fmt(jornal)} × ${cert} día(s) certificados. Esos días los paga el subsidio por enfermedad, no la empresa (regla simplificada, sin días de carencia).`,
    });

  const descuentosDias: Array<{ tipo: Novedad["tipo"]; codigo: string; concepto: string; formula: string }> = [
    {
      tipo: "suspension",
      codigo: "013",
      concepto: "Suspensión sin goce",
      formula: "Días de suspensión informados. Se descuentan del nominal del mes.",
    },
    {
      tipo: "accidente_laboral",
      codigo: "015",
      concepto: "Accidente laboral / BSE",
      formula: "Días cubiertos por BSE. Regla simplificada: no los paga la empresa.",
    },
    {
      tipo: "maternidad",
      codigo: "016",
      concepto: "Maternidad / subsidio BPS",
      formula: "Días cubiertos por subsidio BPS. Regla simplificada: no los paga la empresa.",
    },
    {
      tipo: "egreso",
      codigo: "017",
      concepto: "Egreso informado",
      formula: "Días no trabajados por egreso cuando la ficha todavía no refleja la baja.",
    },
    {
      tipo: "ingreso_mes",
      codigo: "018",
      concepto: "Ingreso en el mes",
      formula: "Días previos al ingreso cuando la ficha todavía no refleja el alta real.",
    },
  ];
  descuentosDias.forEach((regla) => {
    const diasDescuento = sumaCantidad(novs, regla.tipo);
    if (diasDescuento <= 0) return;
    L.push({
      codigo: regla.codigo,
      concepto: regla.concepto,
      tipo: "haber",
      gravadoBps: true,
      base: jornal,
      cantidad: diasDescuento,
      importe: r2(-jornal * diasDescuento),
      formula: `${regla.formula} Jornal ${fmt(jornal)} × ${diasDescuento} día(s).`,
    });
  });

  novs
    .filter((n) => n.tipo === "seguro_paro" && (n.cantidad ?? 0) > 0)
    .forEach((n, i) => {
      const diasSeguro = n.cantidad ?? 0;
      const pagaBps = n.datos?.seguroParoPagaBps !== false;
      const parcial = n.datos?.seguroParoTipo === "parcial";
      const reduccion = parcial ? clamp((n.datos?.seguroParoReduccionPorcentaje ?? 0) / 100, 0, 1) : 1;
      if (!pagaBps || reduccion <= 0) {
        L.push({
          codigo: `014I${i}`,
          concepto: "Seguro de paro informado",
          tipo: "haber",
          gravadoBps: false,
          cantidad: diasSeguro,
          importe: 0,
          formula: `Registro informativo de seguro de paro${n.datos?.seguroParoDesde && n.datos?.seguroParoHasta ? ` (${n.datos.seguroParoDesde} a ${n.datos.seguroParoHasta})` : ""}. Se marcó que no descuenta pago de la empresa.`,
        });
        return;
      }
      L.push({
        codigo: `014${i}`,
        concepto: parcial ? "Seguro de paro parcial" : "Seguro de paro",
        tipo: "haber",
        gravadoBps: true,
        base: jornal,
        cantidad: diasSeguro,
        tasa: reduccion,
        importe: r2(-jornal * diasSeguro * reduccion),
        formula: parcial
          ? `Seguro de paro parcial${n.datos?.seguroParoDesde && n.datos?.seguroParoHasta ? ` (${n.datos.seguroParoDesde} a ${n.datos.seguroParoHasta})` : ""}: jornal ${fmt(jornal)} × ${diasSeguro} día(s) × reducción ${pct(reduccion)}.`
          : `Días cubiertos por seguro de paro${n.datos?.seguroParoDesde && n.datos?.seguroParoHasta ? ` (${n.datos.seguroParoDesde} a ${n.datos.seguroParoHasta})` : ""}. Jornal ${fmt(jornal)} × ${diasSeguro} día(s). Esos días los paga BPS/no la empresa.`,
      });
    });

  const diasInformativos: Array<{ tipo: Novedad["tipo"]; codigo: string; concepto: string; formula: string }> = [
    { tipo: "ausencia_justificada", codigo: "019", concepto: "Ausencia justificada", formula: "Registro informativo sin descuento automático." },
    { tipo: "licencia_especial", codigo: "019A", concepto: "Licencia especial", formula: "Registro informativo sin descuento automático. Validar causal y goce con el estudio." },
    { tipo: "licencia_pendiente", codigo: "019B", concepto: "Licencia pendiente informada", formula: "Registro para control de saldo de licencia." },
  ];
  diasInformativos.forEach((regla) => {
    const cantidad =
      regla.tipo === "ausencia_justificada"
        ? novs.filter((n) => n.tipo === regla.tipo && !n.datos?.ausenciaDescuenta).reduce((s, n) => s + (n.cantidad ?? 0), 0)
        : sumaCantidad(novs, regla.tipo);
    if (cantidad <= 0) return;
    L.push({
      codigo: regla.codigo,
      concepto: regla.concepto,
      tipo: "haber",
      gravadoBps: false,
      cantidad,
      importe: 0,
      formula: `${regla.formula} Cantidad informada: ${cantidad} día(s).`,
    });
  });

  novs
    .filter((n) => n.tipo === "ausencia_justificada" && n.datos?.ausenciaDescuenta && (n.cantidad ?? 0) > 0)
    .forEach((n, i) =>
      L.push({
        codigo: `019D${i}`,
        concepto: n.nota ? `Ausencia justificada con descuento · ${n.nota}` : "Ausencia justificada con descuento",
        tipo: "haber",
        gravadoBps: true,
        base: jornal,
        cantidad: n.cantidad,
        importe: r2(-jornal * (n.cantidad ?? 0)),
        formula: `Se marcó que esta ausencia justificada descuenta. Jornal ${fmt(jornal)} × ${n.cantidad} día(s).`,
      }),
    );

  // Llegadas tarde (minutos)
  const tarde = novs.filter((n) => n.tipo === "llegada_tarde").reduce((s, n) => s + (n.cantidad ?? 0), 0);
  if (tarde > 0) {
    const vh = base / P.horas.divisor;
    L.push({
      codigo: "012",
      concepto: "Descuento por llegadas tarde",
      tipo: "haber",
      gravadoBps: true,
      base: vh,
      cantidad: tarde,
      importe: r2(-(vh * tarde) / 60),
      formula: `Valor hora ${fmt(vh)} × ${tarde} minutos ÷ 60.`,
      parametros: [`Divisor horario ${P.horas.divisor}`],
    });
  }

  // Feriados pagos trabajados
  const fer = novs.filter((n) => n.tipo === "feriado").reduce((s, n) => s + (n.cantidad ?? 0), 0);
  if (fer > 0)
    L.push({
      codigo: "025",
      concepto: "Feriado trabajado",
      tipo: "haber",
      gravadoBps: true,
      base: jornal,
      cantidad: fer,
      tasa: feriadoFactor,
      importe: r2(jornal * feriadoFactor * fer),
      formula: `Jornal ${fmt(jornal)} × ${feriadoFactor} × ${fer} feriado(s) pago(s) trabajado(s). Factor configurado para la empresa.`,
      parametros: [`Factor feriado ${feriadoFactor}`],
    });

  // Horas extra
  const he = novs.filter((n) => n.tipo === "hora_extra").reduce((s, n) => s + (n.cantidad ?? 0), 0);
  if (he > 0) {
    const vh = base / P.horas.divisor;
    const imp = vh * horasExtraFactor * he;
    L.push({
      codigo: "020",
      concepto: "Horas extra",
      tipo: "haber",
      gravadoBps: true,
      base: vh,
      cantidad: he,
      tasa: horasExtraFactor,
      importe: r2(imp),
      formula: `Valor hora ${fmt(vh)} (sueldo ÷ ${P.horas.divisor}) × factor ${horasExtraFactor} × ${he} h. Factor configurado para la empresa.`,
      parametros: [`Divisor horario ${P.horas.divisor}`, `Factor hora extra ${horasExtraFactor}`],
    });
  }

  const presentismo = empresa.reglasLiquidacion?.presentismo;
  const tienePresentismoManual = novs.some((n) => n.tipo === "presentismo" && n.importe);
  const montoBasePresentismo = montoPresentismo(empresa, emp, L, base, P);
  const porcentajePagoPresentismo = porcentajePresentismo(empresa, novs);
  const importePresentismo = r2(montoBasePresentismo * (porcentajePagoPresentismo / 100));
  if (presentismo?.habilitado && importePresentismo > 0 && !tienePresentismoManual) {
    L.push({
      codigo: "029",
      concepto: "Presentismo automático",
      tipo: "haber",
      gravadoBps: true,
      importe: importePresentismo,
      formula:
        porcentajePagoPresentismo === 100
          ? `Presentismo configurado para la empresa: ${fmt(montoBasePresentismo)}. No hubo novedades que lo reduzcan.`
          : `Presentismo configurado: ${fmt(montoBasePresentismo)} × ${porcentajePagoPresentismo}% según novedades del mes.`,
    });
  }

  // Bonos / comisiones
  novs
    .filter((n) => ["bono", "presentismo", "productividad", "retroactivo", "ajuste_mes_anterior"].includes(n.tipo) && n.importe)
    .forEach((n, i) =>
      L.push({
        codigo: `03${i}`,
        concepto: n.nota ? `${conceptoDinero(n.tipo)} · ${n.nota}` : conceptoDinero(n.tipo),
        tipo: "haber",
        gravadoBps: true,
        importe: r2(n.importe!),
        formula: `Importe informado por ${n.origen === "cliente" ? "el cliente" : "el estudio"} (${n.autor}).`,
      }),
    );

  // Aguinaldo (junio / diciembre)
  const m = Number(mes.slice(5, 7));
  if (m === 6 || m === 12) {
    const meses = mesesSemestre(mes).filter((x) => activoEn(emp, x));
    const acumulado = meses.reduce((s, x) => {
      const b = sueldoVigente(emp, x).monto;
      return s + (diasTrabajados(emp, x) >= 30 ? b : (b / 30) * diasTrabajados(emp, x));
    }, 0);
    L.push({
      codigo: "040",
      concepto: "Aguinaldo",
      tipo: "haber",
      gravadoBps: true,
      base: acumulado,
      importe: r2(acumulado / 12),
      formula: `Total nominal del semestre (${meses.length} meses: ${fmt(acumulado)}) ÷ 12. Simplificado: considera sueldo básico, no variables.`,
    });
  }

  novs
    .filter((n) => ["viatico", "reintegro", "salario_vacacional_ajuste"].includes(n.tipo) && n.importe)
    .forEach((n, i) =>
      L.push({
        codigo: `06${i}`,
        concepto: n.nota ? `${conceptoDinero(n.tipo)} · ${n.nota}` : conceptoDinero(n.tipo),
        tipo: "haber",
        gravadoBps: false,
        importe: r2(n.importe!),
        formula: "Importe no gravado BPS en regla simplificada. Validar tratamiento final antes de presentar.",
      }),
    );

  const cambiosInformativos: Array<{ tipo: Novedad["tipo"]; codigo: string; concepto: string }> = [
    { tipo: "cambio_horario", codigo: "070", concepto: "Cambio de horario informado" },
  ];
  cambiosInformativos.forEach((regla) => {
    const cantidad = sumaCantidad(novs, regla.tipo);
    if (cantidad <= 0) return;
    L.push({
      codigo: regla.codigo,
      concepto: regla.concepto,
      tipo: "haber",
      gravadoBps: false,
      cantidad,
      importe: 0,
      formula: `Registro informativo para revisar ficha laboral. Cantidad informada: ${cantidad}.`,
    });
  });

  // Salario vacacional (no gravado BPS)
  const lic = novs.filter((n) => n.tipo === "licencia").reduce((s, n) => s + (n.cantidad ?? 0), 0);
  const tasaPersonalRef = P.personal.jubilatorio + P.fonasa.tasaSinHijos + P.personal.frl;
  let salarioVacacional = 0;
  if (lic > 0) {
    salarioVacacional = jornal * lic * (1 - tasaPersonalRef);
    L.push({
      codigo: "050",
      concepto: "Salario vacacional",
      tipo: "haber",
      gravadoBps: false,
      base: jornal,
      cantidad: lic,
      importe: r2(salarioVacacional),
      formula: `Jornal líquido estimado ${fmt(jornal * (1 - tasaPersonalRef))} × ${lic} días de licencia. No genera aportes BPS.`,
    });
  }

  const totalHaberes = sumarHaberes(L);
  const nominalGravado = sumarNominalGravado(L);

  // Aportes personales
  const baseJub = Math.min(nominalGravado, P.topeJubilatorio);
  const jub = baseJub * P.personal.jubilatorio;
  L.push({
    codigo: "100",
    concepto: "Aporte jubilatorio",
    tipo: "descuento",
    gravadoBps: false,
    base: baseJub,
    tasa: P.personal.jubilatorio,
    importe: r2(jub),
    formula: `${pct(P.personal.jubilatorio)} sobre nominal gravado ${fmt(baseJub)}${nominalGravado > P.topeJubilatorio ? ` (topeado en ${fmt(P.topeJubilatorio)})` : ""}.`,
    parametros: [`Tope ${fmt(P.topeJubilatorio)}`],
  });

  const bajo = nominalGravado <= P.fonasa.umbralBpc * P.bpc;
  const tFon =
    (bajo ? P.fonasa.tasaBaja : emp.hijos > 0 ? P.fonasa.tasaConHijos : P.fonasa.tasaSinHijos) +
    (emp.conyugeFonasa ? P.fonasa.adicionalConyuge : 0);
  const fonasa = nominalGravado * tFon;
  L.push({
    codigo: "110",
    concepto: "FONASA",
    tipo: "descuento",
    gravadoBps: false,
    base: nominalGravado,
    tasa: tFon,
    importe: r2(fonasa),
    formula: bajo
      ? `Nominal ≤ ${P.fonasa.umbralBpc} BPC: tasa ${pct(P.fonasa.tasaBaja)}${emp.conyugeFonasa ? ` + ${pct(P.fonasa.adicionalConyuge)} cónyuge` : ""}.`
      : `Nominal > ${P.fonasa.umbralBpc} BPC, ${emp.hijos > 0 ? `con ${emp.hijos} hijo(s): ${pct(P.fonasa.tasaConHijos)}` : `sin hijos: ${pct(P.fonasa.tasaSinHijos)}`}${emp.conyugeFonasa ? ` + ${pct(P.fonasa.adicionalConyuge)} cónyuge` : ""}.`,
    parametros: [bpcRef],
  });

  const frl = nominalGravado * P.personal.frl;
  L.push({
    codigo: "120",
    concepto: "FRL",
    tipo: "descuento",
    gravadoBps: false,
    base: nominalGravado,
    tasa: P.personal.frl,
    importe: r2(frl),
    formula: `Fondo de Reconversión Laboral ${pct(P.personal.frl, 2)} sobre nominal gravado.`,
  });

  // IRPF
  const ingresoBase = nominalGravado + salarioVacacional;
  const inc6 = ingresoBase > P.irpf.incremento6DesdeBpc * P.bpc;
  const ingreso = inc6 ? ingresoBase * 1.06 : ingresoBase;
  const franjas = P.irpf.franjasBpc.map((f) => {
    const d = f.desde * P.bpc;
    const h = f.hasta === null ? Infinity : f.hasta * P.bpc;
    const imp = Math.max(0, Math.min(ingreso, h) - d) * f.tasa;
    return { desde: d, hasta: f.hasta === null ? null : h, tasa: f.tasa, impuesto: imp };
  });
  const impuestoBruto = franjas.reduce((s, f) => s + f.impuesto, 0);
  const tasaDed = ingreso <= P.irpf.umbralTasaDeduccionBpc * P.bpc ? P.irpf.tasaDeduccionBaja : P.irpf.tasaDeduccionAlta;
  const dedHijos = (emp.hijos * P.irpf.deduccionHijoBpcAnual * P.bpc) / 12;
  const deducciones = (jub + fonasa + frl + dedHijos) * tasaDed;
  const irpf = Math.max(0, impuestoBruto - deducciones);
  L.push({
    codigo: "130",
    concepto: "IRPF",
    tipo: "descuento",
    gravadoBps: false,
    base: ingreso,
    importe: r2(irpf),
    formula:
      irpf === 0 && impuestoBruto === 0
        ? `Ingreso ${fmt(ingreso)} dentro de la franja exenta (hasta 7 BPC = ${fmt(7 * P.bpc)}).`
        : `Impuesto por franjas ${fmt(impuestoBruto)} − deducciones ${fmt(deducciones)} (${pct(tasaDed)} × aportes${emp.hijos ? ` e hijos` : ""}).`,
    parametros: [bpcRef, inc6 ? "Incremento 6% aplicado (> 10 BPC)" : "Sin incremento 6%"],
  });

  // Adelantos / otros descuentos
  novs
    .filter((n) => ["adelanto", "descuento_manual", "prestamo_retencion"].includes(n.tipo) && n.importe)
    .forEach((n, i) =>
      L.push({
        codigo: `14${i}`,
        concepto: n.nota ? `${conceptoDinero(n.tipo)} · ${n.nota}` : conceptoDinero(n.tipo),
        tipo: "descuento",
        gravadoBps: false,
        importe: r2(n.importe!),
        formula: "Importe informado durante el mes, se descuenta del líquido.",
      }),
    );

  // Aportes patronales
  const pat = [
    { c: "200", n: "Aporte patronal jubilatorio", t: P.patronal.jubilatorio, b: baseJub },
    { c: "210", n: "FONASA patronal", t: P.patronal.fonasa, b: nominalGravado },
    { c: "220", n: "FRL patronal", t: P.patronal.frl, b: nominalGravado },
    { c: "230", n: "FGCL", t: P.patronal.fgcl, b: nominalGravado },
  ];
  pat.forEach((p) =>
    L.push({
      codigo: p.c,
      concepto: p.n,
      tipo: "patronal",
      gravadoBps: false,
      base: p.b,
      tasa: p.t,
      importe: r2(p.b * p.t),
      formula: `${pct(p.t, 3)} sobre ${fmt(p.b)}.`,
    }),
  );

  const descuentos = L.filter((l) => l.tipo === "descuento").reduce((s, l) => s + l.importe, 0);
  const aportesPatronales = L.filter((l) => l.tipo === "patronal").reduce((s, l) => s + l.importe, 0);

  return {
    empleadoId: emp.id,
    lineas: L,
    totalHaberes: r2(totalHaberes),
    nominalGravado: r2(nominalGravado),
    descuentos: r2(descuentos),
    liquido: r2(totalHaberes - descuentos),
    aportesPatronales: r2(aportesPatronales),
    costoEmpresa: r2(totalHaberes + aportesPatronales),
    irpf: { ingreso, incremento6: inc6, impuestoBruto, tasaDeduccion: tasaDed, deducciones, franjas },
  };
}

export function calcularEmpresa(empresa: Empresa, empleados: Empleado[], mes: string, novedades: Novedad[]) {
  const novsMes = novedades.filter((n) => n.empresaId === empresa.id && n.mes === mes);
  return empleados
    .filter((e) => e.empresaId === empresa.id && activoEn(e, mes))
    .map((e) => calcularEmpleado(empresa, e, mes, novsMes));
}

export function totales(rs: ResultadoEmpleado[]) {
  return rs.reduce(
    (t, r) => ({
      nominal: t.nominal + r.totalHaberes,
      descuentos: t.descuentos + r.descuentos,
      liquido: t.liquido + r.liquido,
      costo: t.costo + r.costoEmpresa,
      patronal: t.patronal + r.aportesPatronales,
    }),
    { nominal: 0, descuentos: 0, liquido: 0, costo: 0, patronal: 0 },
  );
}

/** Hash simple para integridad de artefactos (RNF-13). En producción: SHA-256. */
export function hashDe(obj: unknown) {
  const s = JSON.stringify(obj);
  let h1 = 0x811c9dc5;
  let h2 = 0;
  for (let i = 0; i < s.length; i++) {
    h1 = Math.imul(h1 ^ s.charCodeAt(i), 16777619);
    h2 = (h2 * 31 + s.charCodeAt(i)) | 0;
  }
  return ((h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0")).toUpperCase();
}

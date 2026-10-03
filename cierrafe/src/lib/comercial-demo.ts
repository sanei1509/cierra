export type CodigoModulo = string;

export interface ModuloAdmin {
  codigo: CodigoModulo;
  nombre: string;
  estado: string;
}

export interface PlanAdmin {
  id: string;
  codigo: string;
  nombre: string;
  precioMensualCent: number;
  modulos: CodigoModulo[];
}

export interface AddonAdmin {
  moduloCodigo: CodigoModulo;
  precioMensualCent: number;
}

export interface EstudioAdmin {
  id: string;
  nombre: string;
  estado: "prueba" | "activo" | "pausado";
  planCodigo: string;
  addons: CodigoModulo[];
  moneda: "UYU" | "USD";
  notas: string;
  eventosUso?: EventoUsoAdmin[];
}

export interface AjusteCobroAdmin {
  descripcion: string;
  importeCent: number;
  nota?: string;
}

export interface LineaCobroAdmin {
  tipo: "plan" | "addon" | "ajuste";
  concepto: string;
  cantidad: number;
  totalCent: number;
  nota?: string;
}

export interface EventoUsoAdmin {
  tipo: "empresa_activa" | "empleado_activo" | "recibo_generado" | "recibo_enviado";
  cantidad: number;
}

export interface ResumenCobroAdmin {
  estudioId: string;
  mes: string;
  moneda: EstudioAdmin["moneda"];
  lineas: LineaCobroAdmin[];
  eventosUso: EventoUsoAdmin[];
  totalCent: number;
  notasInternas?: string;
  generado: string;
}

export interface EstadoPagoAdmin {
  estado: "pendiente" | "parcial" | "pagado" | "saldo_a_favor";
  pagadoCent: number;
  saldoPendienteCent: number;
  saldoAFavorCent: number;
}

export function moduloNombre(codigo: CodigoModulo, modulos: ModuloAdmin[] = []) {
  return modulos.find((m) => m.codigo === codigo)?.nombre ?? codigo;
}

export function planPorCodigo(codigo: string, planes: PlanAdmin[]) {
  return planes.find((p) => p.codigo === codigo) ?? planes[0];
}

export function modulosHabilitados(estudio: EstudioAdmin, planes: PlanAdmin[], modulosDisponibles: ModuloAdmin[] = []) {
  if (estudio.estado === "prueba") return modulosDisponibles.map((modulo) => modulo.codigo);
  if (estudio.estado === "pausado") return [];
  const plan = planPorCodigo(estudio.planCodigo, planes);
  return [...new Set([...(plan?.modulos ?? []), ...estudio.addons])];
}

export function totalMensualCent(estudio: EstudioAdmin, planes: PlanAdmin[], addonsDisponibles: AddonAdmin[]) {
  const plan = planPorCodigo(estudio.planCodigo, planes);
  return (plan?.precioMensualCent ?? 0) + addonsDisponibles.filter((a) => estudio.addons.includes(a.moduloCodigo)).reduce((s, a) => s + a.precioMensualCent, 0);
}

export function resumenCobroDemo(
  estudio: EstudioAdmin,
  mes: string,
  ajustes: AjusteCobroAdmin[] = [],
  planes: PlanAdmin[],
  addonsDisponibles: AddonAdmin[],
  modulos: ModuloAdmin[] = [],
): ResumenCobroAdmin {
  const plan = planPorCodigo(estudio.planCodigo, planes);
  const addons = addonsDisponibles.filter((addon) => estudio.addons.includes(addon.moduloCodigo));
  const lineas: LineaCobroAdmin[] =
    !plan || estudio.estado === "pausado"
      ? []
      : [
          {
            tipo: "plan",
            concepto: `Plan ${plan.nombre}`,
            cantidad: 1,
            totalCent: plan.precioMensualCent,
            nota: "Precio mensual del plan.",
          },
          ...addons.map((addon) => ({
            tipo: "addon" as const,
            concepto: moduloNombre(addon.moduloCodigo, modulos),
            cantidad: 1,
            totalCent: addon.precioMensualCent,
            nota: "Módulo adicional contratado.",
          })),
        ];

  lineas.push(
    ...ajustes
      .filter((ajuste) => ajuste.descripcion.trim() && Number.isFinite(ajuste.importeCent))
      .map((ajuste) => ({
        tipo: "ajuste" as const,
        concepto: ajuste.descripcion,
        cantidad: 1,
        totalCent: Math.trunc(ajuste.importeCent),
        nota: ajuste.nota,
      })),
  );

  return {
    estudioId: estudio.id,
    mes,
    moneda: estudio.moneda,
    lineas,
    eventosUso: estudio.eventosUso ?? [],
    totalCent: lineas.reduce((total, linea) => total + linea.totalCent, 0),
    notasInternas: estudio.notas,
    generado: new Date().toISOString(),
  };
}

export function estadoPagoDemo(totalCent: number, pagadoCent: number): EstadoPagoAdmin {
  if (pagadoCent <= 0) return { estado: "pendiente", pagadoCent: 0, saldoPendienteCent: totalCent, saldoAFavorCent: 0 };
  if (pagadoCent < totalCent) return { estado: "parcial", pagadoCent, saldoPendienteCent: totalCent - pagadoCent, saldoAFavorCent: 0 };
  return {
    estado: pagadoCent > totalCent ? "saldo_a_favor" : "pagado",
    pagadoCent,
    saldoPendienteCent: 0,
    saldoAFavorCent: pagadoCent - totalCent,
  };
}

export function fmtCent(montoCent: number, moneda = "UYU") {
  return `${moneda} ${(montoCent / 100).toLocaleString("es-UY", { maximumFractionDigits: 0 })}`;
}

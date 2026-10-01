export type CodigoModulo =
  | "rrhh_core"
  | "payroll_core"
  | "payroll_receipts"
  | "bps_exports"
  | "irpf_calculation"
  | "leave_management"
  | "salary_history"
  | "accounting_entries"
  | "company_portal"
  | "employee_portal"
  | "bulk_import_excel"
  | "audit_basic"
  | "automatic_receipt_email"
  | "advanced_reports";

export interface ModuloAdmin {
  codigo: CodigoModulo;
  nombre: string;
  grupo: "Base" | "Liquidacion" | "Portales" | "Add-on";
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

export const MODULOS_ADMIN: ModuloAdmin[] = [
  { codigo: "rrhh_core", nombre: "Datos RRHH base", grupo: "Base" },
  { codigo: "payroll_core", nombre: "Liquidacion de sueldos", grupo: "Liquidacion" },
  { codigo: "payroll_receipts", nombre: "Recibos de sueldo", grupo: "Liquidacion" },
  { codigo: "bps_exports", nombre: "BPS y CESS", grupo: "Liquidacion" },
  { codigo: "irpf_calculation", nombre: "IRPF", grupo: "Liquidacion" },
  { codigo: "leave_management", nombre: "Licencias", grupo: "Base" },
  { codigo: "salary_history", nombre: "Historia salarial", grupo: "Base" },
  { codigo: "accounting_entries", nombre: "Asiento de sueldos", grupo: "Liquidacion" },
  { codigo: "company_portal", nombre: "Portal empresa", grupo: "Portales" },
  { codigo: "employee_portal", nombre: "Portal empleado", grupo: "Portales" },
  { codigo: "bulk_import_excel", nombre: "Importacion Excel", grupo: "Base" },
  { codigo: "audit_basic", nombre: "Auditoria basica", grupo: "Base" },
  { codigo: "automatic_receipt_email", nombre: "Envio automatico por email", grupo: "Add-on" },
  { codigo: "advanced_reports", nombre: "Reportes avanzados", grupo: "Add-on" },
];

export const PLANES_ADMIN: PlanAdmin[] = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    codigo: "basico",
    nombre: "Basico",
    precioMensualCent: 900000,
    modulos: ["rrhh_core", "salary_history", "bulk_import_excel", "payroll_core", "payroll_receipts", "audit_basic"],
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    codigo: "profesional",
    nombre: "Profesional",
    precioMensualCent: 1450000,
    modulos: ["rrhh_core", "salary_history", "bulk_import_excel", "payroll_core", "payroll_receipts", "bps_exports", "irpf_calculation", "company_portal", "employee_portal", "audit_basic"],
  },
  {
    id: "00000000-0000-4000-8000-000000000103",
    codigo: "full",
    nombre: "Full",
    precioMensualCent: 2150000,
    modulos: ["rrhh_core", "salary_history", "bulk_import_excel", "payroll_core", "payroll_receipts", "bps_exports", "irpf_calculation", "leave_management", "accounting_entries", "company_portal", "employee_portal", "audit_basic"],
  },
];

export const ADDONS_ADMIN: AddonAdmin[] = [
  { moduloCodigo: "automatic_receipt_email", precioMensualCent: 350000 },
  { moduloCodigo: "advanced_reports", precioMensualCent: 450000 },
];

export const ESTUDIOS_ADMIN: EstudioAdmin[] = [
  { id: "pereira", nombre: "Estudio Pereira & Asociados", estado: "activo", planCodigo: "profesional", addons: ["automatic_receipt_email"], moneda: "UYU", notas: "Piloto inicial con cartera completa." },
  { id: "don-pedrito", nombre: "Estudio Don Pedrito", estado: "prueba", planCodigo: "basico", addons: [], moneda: "UYU", notas: "Definir alcance final al alta." },
  { id: "norte", nombre: "Contadores del Norte", estado: "pausado", planCodigo: "full", addons: ["advanced_reports"], moneda: "UYU", notas: "Cuenta pausada por revision comercial." },
];

export function moduloNombre(codigo: CodigoModulo) {
  return MODULOS_ADMIN.find((m) => m.codigo === codigo)?.nombre ?? codigo;
}

export function planPorCodigo(codigo: string) {
  return PLANES_ADMIN.find((p) => p.codigo === codigo) ?? PLANES_ADMIN[0];
}

export function modulosHabilitados(estudio: EstudioAdmin) {
  const plan = planPorCodigo(estudio.planCodigo);
  return [...new Set([...plan.modulos, ...estudio.addons])];
}

export function totalMensualCent(estudio: EstudioAdmin) {
  const plan = planPorCodigo(estudio.planCodigo);
  return plan.precioMensualCent + ADDONS_ADMIN.filter((a) => estudio.addons.includes(a.moduloCodigo)).reduce((s, a) => s + a.precioMensualCent, 0);
}

export function resumenCobroDemo(estudio: EstudioAdmin, mes: string, ajustes: AjusteCobroAdmin[] = []): ResumenCobroAdmin {
  const plan = planPorCodigo(estudio.planCodigo);
  const addons = ADDONS_ADMIN.filter((addon) => estudio.addons.includes(addon.moduloCodigo));
  const lineas: LineaCobroAdmin[] =
    estudio.estado === "pausado"
      ? []
      : [
          {
            tipo: "plan",
            concepto: `Plan ${plan.nombre}`,
            cantidad: 1,
            totalCent: plan.precioMensualCent,
            nota: "Precio fijo mensual del paquete contratado.",
          },
          ...addons.map((addon) => ({
            tipo: "addon" as const,
            concepto: moduloNombre(addon.moduloCodigo),
            cantidad: 1,
            totalCent: addon.precioMensualCent,
            nota: "Modulo adicional fijo mensual.",
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
    eventosUso: [
      { tipo: "empresa_activa", cantidad: estudio.id === "pereira" ? 12 : estudio.id === "don-pedrito" ? 3 : 7 },
      { tipo: "empleado_activo", cantidad: estudio.id === "pereira" ? 184 : estudio.id === "don-pedrito" ? 38 : 96 },
      { tipo: "recibo_generado", cantidad: estudio.id === "pereira" ? 184 : estudio.id === "don-pedrito" ? 38 : 0 },
    ],
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

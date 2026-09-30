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
    codigo: "basico",
    nombre: "Basico",
    precioMensualCent: 900000,
    modulos: ["rrhh_core", "salary_history", "bulk_import_excel", "payroll_core", "payroll_receipts", "audit_basic"],
  },
  {
    codigo: "profesional",
    nombre: "Profesional",
    precioMensualCent: 1450000,
    modulos: ["rrhh_core", "salary_history", "bulk_import_excel", "payroll_core", "payroll_receipts", "bps_exports", "irpf_calculation", "company_portal", "employee_portal", "audit_basic"],
  },
  {
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

export function fmtCent(montoCent: number, moneda = "UYU") {
  return `${moneda} ${(montoCent / 100).toLocaleString("es-UY", { maximumFractionDigits: 0 })}`;
}

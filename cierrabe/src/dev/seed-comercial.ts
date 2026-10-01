import type { CodigoModulo } from "../modulos";

export interface PlanComercialBase {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  precioMensualCent: number;
  modulos: CodigoModulo[];
}

export const PLANES_COMERCIALES_BASE: PlanComercialBase[] = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    codigo: "basico",
    nombre: "Basico",
    descripcion: "Paquete inicial para operar RRHH, liquidacion mensual y recibos publicados.",
    precioMensualCent: 900000,
    modulos: ["rrhh_core", "salary_history", "bulk_import_excel", "payroll_core", "payroll_receipts", "audit_basic"],
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    codigo: "profesional",
    nombre: "Profesional",
    descripcion: "Paquete recomendado para estudios que liquidan sueldos con portales, BPS e IRPF.",
    precioMensualCent: 1450000,
    modulos: [
      "rrhh_core",
      "salary_history",
      "bulk_import_excel",
      "payroll_core",
      "payroll_receipts",
      "bps_exports",
      "irpf_calculation",
      "company_portal",
      "employee_portal",
      "audit_basic",
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000103",
    codigo: "full",
    nombre: "Full",
    descripcion: "Paquete completo para estudios que necesitan liquidacion, portales, licencias y asiento contable.",
    precioMensualCent: 2150000,
    modulos: [
      "rrhh_core",
      "salary_history",
      "bulk_import_excel",
      "payroll_core",
      "payroll_receipts",
      "bps_exports",
      "irpf_calculation",
      "leave_management",
      "accounting_entries",
      "company_portal",
      "employee_portal",
      "audit_basic",
    ],
  },
];

export function filasPlanModuloBase() {
  return PLANES_COMERCIALES_BASE.flatMap((plan) => plan.modulos.map((moduloCodigo) => ({ planId: plan.id, moduloCodigo })));
}

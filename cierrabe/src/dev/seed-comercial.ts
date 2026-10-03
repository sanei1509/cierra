import type { CodigoModulo } from "../modulos";
import type { EstadoSuscripcion, Moneda } from "../facturacion";

export interface PlanComercialBase {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  precioMensualCent: number;
  modulos: CodigoModulo[];
}

export interface AddonComercialBase {
  moduloCodigo: CodigoModulo;
  precioMensualCent: number;
}

export interface EstudioComercialBase {
  id: string;
  nombre: string;
  emailContacto: string;
  suscripcionId: string;
  planCodigo: string;
  estado: EstadoSuscripcion;
  moneda: Moneda;
  addons: CodigoModulo[];
  notasInternas: string;
  eventosUso: { tipo: "empresa_activa" | "empleado_activo" | "recibo_generado" | "recibo_enviado"; cantidad: number }[];
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
      "salary_disbursement",
      "company_portal",
      "employee_portal",
      "audit_basic",
    ],
  },
];

export const ADDONS_COMERCIALES_BASE: AddonComercialBase[] = [
  { moduloCodigo: "automatic_receipt_email", precioMensualCent: 350000 },
  { moduloCodigo: "advanced_reports", precioMensualCent: 450000 },
  { moduloCodigo: "digital_receipt_acceptance", precioMensualCent: 300000 },
  { moduloCodigo: "labor_document_storage", precioMensualCent: 250000 },
];

export const ESTUDIOS_COMERCIALES_BASE: EstudioComercialBase[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    nombre: "Estudio Pereira & Asociados",
    emailContacto: "lucia@estudiopereira.uy",
    suscripcionId: "00000000-0000-4000-8000-000000000401",
    planCodigo: "profesional",
    estado: "activo",
    moneda: "UYU",
    addons: ["automatic_receipt_email"],
    notasInternas: "Piloto inicial con cartera completa.",
    eventosUso: [
      { tipo: "empresa_activa", cantidad: 12 },
      { tipo: "empleado_activo", cantidad: 184 },
      { tipo: "recibo_generado", cantidad: 184 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000301",
    nombre: "Estudio Don Pedrito",
    emailContacto: "contacto@donpedrito.uy",
    suscripcionId: "00000000-0000-4000-8000-000000000402",
    planCodigo: "full",
    estado: "prueba",
    moneda: "UYU",
    addons: ["automatic_receipt_email", "advanced_reports", "digital_receipt_acceptance", "labor_document_storage"],
    notasInternas: "",
    eventosUso: [
      { tipo: "empresa_activa", cantidad: 3 },
      { tipo: "empleado_activo", cantidad: 38 },
      { tipo: "recibo_generado", cantidad: 38 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000302",
    nombre: "Contadores del Norte",
    emailContacto: "admin@contadoresnorte.uy",
    suscripcionId: "00000000-0000-4000-8000-000000000403",
    planCodigo: "full",
    estado: "pausado",
    moneda: "UYU",
    addons: ["advanced_reports"],
    notasInternas: "Cuenta pausada por revision comercial.",
    eventosUso: [
      { tipo: "empresa_activa", cantidad: 7 },
      { tipo: "empleado_activo", cantidad: 96 },
      { tipo: "recibo_generado", cantidad: 0 },
    ],
  },
];

export function filasPlanModuloBase() {
  return PLANES_COMERCIALES_BASE.flatMap((plan) => plan.modulos.map((moduloCodigo) => ({ planId: plan.id, moduloCodigo })));
}

export function addonComercialPorModulo(codigo: CodigoModulo) {
  return ADDONS_COMERCIALES_BASE.find((addon) => addon.moduloCodigo === codigo);
}

export function planComercialPorCodigo(codigo: string) {
  return PLANES_COMERCIALES_BASE.find((plan) => plan.codigo === codigo) ?? PLANES_COMERCIALES_BASE[0];
}

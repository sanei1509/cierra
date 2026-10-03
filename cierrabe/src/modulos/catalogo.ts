export type CodigoModulo =
  | "rrhh_core"
  | "payroll_core"
  | "payroll_receipts"
  | "bps_exports"
  | "irpf_calculation"
  | "leave_management"
  | "salary_history"
  | "accounting_entries"
  | "salary_disbursement"
  | "company_portal"
  | "employee_portal"
  | "bulk_import_excel"
  | "audit_basic"
  | "automatic_receipt_email"
  | "automatic_receipt_whatsapp"
  | "advanced_reports"
  | "digital_receipt_acceptance"
  | "labor_document_storage";

export type EstadoModulo = "activo" | "oculto" | "beta" | "discontinuado";
export type AlcanceModulo = "sistema" | "estudio" | "empresa" | "empleado";

export interface ModuloCatalogo {
  codigo: CodigoModulo;
  nombre: string;
  descripcion: string;
  estado: EstadoModulo;
  alcance: AlcanceModulo;
  dependeDe: CodigoModulo[];
}

export const CATALOGO_MODULOS = [
  {
    codigo: "rrhh_core",
    nombre: "Datos RRHH base",
    descripcion: "Empresas, empleados, datos madre y parametros generales del estudio.",
    estado: "activo",
    alcance: "estudio",
    dependeDe: [],
  },
  {
    codigo: "payroll_core",
    nombre: "Liquidacion de sueldos",
    descripcion: "Calculos mensuales, nomina, versiones de liquidacion y cierre del periodo.",
    estado: "activo",
    alcance: "estudio",
    dependeDe: ["rrhh_core", "salary_history"],
  },
  {
    codigo: "payroll_receipts",
    nombre: "Recibos de sueldo",
    descripcion: "Generacion, publicacion y descarga de recibos de sueldo.",
    estado: "activo",
    alcance: "empleado",
    dependeDe: ["payroll_core"],
  },
  {
    codigo: "bps_exports",
    nombre: "BPS y CESS",
    descripcion: "Reglas CESS-BPS, CESS-BPS socios y archivo de nomina para BPS.",
    estado: "activo",
    alcance: "estudio",
    dependeDe: ["payroll_core"],
  },
  {
    codigo: "irpf_calculation",
    nombre: "IRPF",
    descripcion: "Calculo mensual de IRPF, anticipo y deducciones aplicables.",
    estado: "activo",
    alcance: "estudio",
    dependeDe: ["payroll_core"],
  },
  {
    codigo: "leave_management",
    nombre: "Licencias",
    descripcion: "Licencia generada, gozada, saldos y novedades de licencia.",
    estado: "activo",
    alcance: "empresa",
    dependeDe: ["rrhh_core"],
  },
  {
    codigo: "salary_history",
    nombre: "Historia laboral y salarial",
    descripcion: "Vigencias de sueldo, categoria, ingreso, egreso y cambios laborales.",
    estado: "activo",
    alcance: "empresa",
    dependeDe: ["rrhh_core"],
  },
  {
    codigo: "accounting_entries",
    nombre: "Asiento de sueldos",
    descripcion: "Generacion del asiento contable mensual de sueldos.",
    estado: "activo",
    alcance: "estudio",
    dependeDe: ["payroll_core"],
  },
  {
    codigo: "salary_disbursement",
    nombre: "Dispersion de sueldos",
    descripcion: "Control de liquidaciones, ordenes de pago y seguimiento de transferencias de sueldos.",
    estado: "beta",
    alcance: "estudio",
    dependeDe: ["payroll_core", "payroll_receipts"],
  },
  {
    codigo: "company_portal",
    nombre: "Portal empresa",
    descripcion: "Carga de novedades, revision y aprobacion por parte de empresas cliente.",
    estado: "activo",
    alcance: "empresa",
    dependeDe: ["rrhh_core", "payroll_core"],
  },
  {
    codigo: "employee_portal",
    nombre: "Portal empleado",
    descripcion: "Acceso personal de empleados a recibos publicados y datos propios.",
    estado: "activo",
    alcance: "empleado",
    dependeDe: ["payroll_receipts"],
  },
  {
    codigo: "bulk_import_excel",
    nombre: "Importacion Excel",
    descripcion: "Carga masiva desde planillas de empleados, datos RRHH y novedades.",
    estado: "activo",
    alcance: "estudio",
    dependeDe: ["rrhh_core"],
  },
  {
    codigo: "audit_basic",
    nombre: "Auditoria basica",
    descripcion: "Registro de actividad y cambios relevantes del sistema.",
    estado: "activo",
    alcance: "sistema",
    dependeDe: [],
  },
  {
    codigo: "automatic_receipt_email",
    nombre: "Envio automatico de recibos por email",
    descripcion: "Envio automatico de recibos publicados a empleados por correo.",
    estado: "beta",
    alcance: "empleado",
    dependeDe: ["payroll_receipts", "employee_portal"],
  },
  {
    codigo: "automatic_receipt_whatsapp",
    nombre: "Envio automatico por WhatsApp",
    descripcion: "Envio automatico de avisos o recibos por WhatsApp.",
    estado: "oculto",
    alcance: "empleado",
    dependeDe: ["payroll_receipts", "employee_portal"],
  },
  {
    codigo: "advanced_reports",
    nombre: "Reportes avanzados",
    descripcion: "Reportes comparativos, indicadores y exportaciones internas avanzadas.",
    estado: "beta",
    alcance: "estudio",
    dependeDe: ["payroll_core"],
  },
  {
    codigo: "digital_receipt_acceptance",
    nombre: "Aceptacion digital de recibos",
    descripcion: "Registro de aceptacion o firma digital de recibos por empleados.",
    estado: "beta",
    alcance: "empleado",
    dependeDe: ["payroll_receipts", "employee_portal"],
  },
  {
    codigo: "labor_document_storage",
    nombre: "Documentos laborales",
    descripcion: "Almacenamiento y consulta de documentos laborales por empresa o empleado.",
    estado: "beta",
    alcance: "empresa",
    dependeDe: ["rrhh_core"],
  },
] as const satisfies readonly ModuloCatalogo[];

export type CodigoFuncionOpcional =
  | "importar_excel"
  | "calcular_sueldos"
  | "emitir_recibos"
  | "ver_portal_empresa"
  | "ver_portal_empleado"
  | "exportar_bps"
  | "calcular_irpf"
  | "gestionar_licencias"
  | "generar_asiento_sueldos"
  | "gestionar_dispersion_sueldos"
  | "enviar_recibos_email";

export const MODULO_POR_FUNCION: Record<CodigoFuncionOpcional, CodigoModulo> = {
  importar_excel: "bulk_import_excel",
  calcular_sueldos: "payroll_core",
  emitir_recibos: "payroll_receipts",
  ver_portal_empresa: "company_portal",
  ver_portal_empleado: "employee_portal",
  exportar_bps: "bps_exports",
  calcular_irpf: "irpf_calculation",
  gestionar_licencias: "leave_management",
  generar_asiento_sueldos: "accounting_entries",
  gestionar_dispersion_sueldos: "salary_disbursement",
  enviar_recibos_email: "automatic_receipt_email",
};

export function listarModulosCatalogo() {
  return [...CATALOGO_MODULOS];
}

export function listarModulosActivos() {
  return CATALOGO_MODULOS.filter((modulo) => modulo.estado === "activo");
}

export function obtenerModulo(codigo: CodigoModulo) {
  return CATALOGO_MODULOS.find((modulo) => modulo.codigo === codigo) ?? null;
}

export function moduloParaFuncion(funcion: CodigoFuncionOpcional) {
  return MODULO_POR_FUNCION[funcion];
}

export function expandirDependencias(codigos: readonly CodigoModulo[]) {
  const resueltos = new Set<CodigoModulo>();

  const visitar = (codigo: CodigoModulo) => {
    if (resueltos.has(codigo)) return;
    const modulo = obtenerModulo(codigo);
    if (!modulo) return;
    for (const dependencia of modulo.dependeDe) visitar(dependencia);
    resueltos.add(codigo);
  };

  for (const codigo of codigos) visitar(codigo);
  return [...resueltos];
}

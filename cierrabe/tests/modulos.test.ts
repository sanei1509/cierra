import { describe, expect, it } from "vitest";
import {
  CATALOGO_MODULOS,
  expandirDependencias,
  listarModulosActivos,
  moduloParaFuncion,
  obtenerModulo,
  type CodigoModulo,
} from "../src/modulos";

const modulosExcel: CodigoModulo[] = [
  "rrhh_core",
  "payroll_core",
  "payroll_receipts",
  "bps_exports",
  "irpf_calculation",
  "leave_management",
  "salary_history",
  "accounting_entries",
  "salary_disbursement",
];

describe("catalogo de modulos", () => {
  it("mantiene codigos estables para reemplazar el Excel inicial", () => {
    expect(CATALOGO_MODULOS.map((m) => m.codigo)).toEqual(expect.arrayContaining(modulosExcel));
  });

  it("cada modulo tiene metadatos, alcance y dependencias existentes", () => {
    const codigos = new Set(CATALOGO_MODULOS.map((m) => m.codigo));

    for (const modulo of CATALOGO_MODULOS) {
      expect(modulo.nombre.length).toBeGreaterThan(2);
      expect(modulo.descripcion.length).toBeGreaterThan(10);
      expect(["activo", "oculto", "beta", "discontinuado"]).toContain(modulo.estado);
      expect(["sistema", "estudio", "empresa", "empleado"]).toContain(modulo.alcance);
      for (const dependencia of modulo.dependeDe) expect(codigos.has(dependencia)).toBe(true);
    }
  });

  it("lista como activos solo los modulos listos para vender/usar inicialmente", () => {
    const activos = listarModulosActivos();

    expect(activos.every((m) => m.estado === "activo")).toBe(true);
    expect(activos.map((m) => m.codigo)).toContain("payroll_receipts");
    expect(activos.map((m) => m.codigo)).not.toContain("automatic_receipt_whatsapp");
  });

  it("expande dependencias antes de activar una funcion", () => {
    expect(expandirDependencias(["employee_portal"])).toEqual(["rrhh_core", "salary_history", "payroll_core", "payroll_receipts", "employee_portal"]);
  });

  it("conecta funciones opcionales con codigos de modulo", () => {
    expect(moduloParaFuncion("emitir_recibos")).toBe("payroll_receipts");
    expect(moduloParaFuncion("gestionar_dispersion_sueldos")).toBe("salary_disbursement");
    expect(obtenerModulo(moduloParaFuncion("enviar_recibos_email"))?.estado).toBe("beta");
  });
});

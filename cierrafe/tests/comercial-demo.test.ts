import { describe, expect, it } from "vitest";
import { estadoPagoDemo, fmtCent, modulosHabilitados, resumenCobroDemo, totalMensualCent, type AddonAdmin, type EstudioAdmin, type ModuloAdmin, type PlanAdmin } from "../src/lib/comercial-demo";

const planes: PlanAdmin[] = [
  { id: "plan-pro", codigo: "profesional", nombre: "Profesional", precioMensualCent: 1450000, modulos: ["payroll_core", "payroll_receipts"] },
];
const addons: AddonAdmin[] = [{ moduloCodigo: "automatic_receipt_email", precioMensualCent: 350000 }];
const modulos: ModuloAdmin[] = [
  { codigo: "payroll_core", nombre: "Liquidacion de sueldos", estado: "activo" },
  { codigo: "payroll_receipts", nombre: "Recibos de sueldo", estado: "activo" },
  { codigo: "automatic_receipt_email", nombre: "Envio automatico por email", estado: "beta" },
];
const estudio: EstudioAdmin = {
  id: "estudio",
  nombre: "Estudio Pereira & Asociados",
  estado: "activo",
  planCodigo: "profesional",
  addons: ["automatic_receipt_email"],
  moneda: "UYU",
  notas: "Piloto inicial con cartera completa.",
};

describe("consola comercial demo", () => {
  it("calcula el total mensual como plan mas add-ons", () => {
    expect(totalMensualCent(estudio, planes, addons)).toBe(1800000);
    expect(fmtCent(totalMensualCent(estudio, planes, addons), estudio.moneda)).toBe("UYU 18.000");
  });

  it("muestra modulos de plan y add-ons sin duplicados", () => {
    expect(modulosHabilitados(estudio, planes, modulos)).toContain("payroll_receipts");
    expect(modulosHabilitados(estudio, planes, modulos)).toContain("automatic_receipt_email");
    expect(new Set(modulosHabilitados(estudio, planes, modulos)).size).toBe(modulosHabilitados(estudio, planes, modulos).length);
  });

  it("en prueba muestra todos los modulos disponibles y pausado no opera modulos", () => {
    expect(modulosHabilitados({ ...estudio, estado: "prueba" }, planes, modulos)).toEqual(modulos.map((modulo) => modulo.codigo));
    expect(modulosHabilitados({ ...estudio, estado: "pausado" }, planes, modulos)).toEqual([]);
  });

  it("arma un resumen de cobro con notas y ajustes manuales", () => {
    const resumen = resumenCobroDemo(estudio, "2026-10", [{ descripcion: "Descuento piloto", importeCent: -150000, nota: "Primer mes" }], planes, addons, modulos);

    expect(resumen.totalCent).toBe(1650000);
    expect(resumen.lineas).toMatchObject([
      { tipo: "plan", totalCent: 1450000 },
      { tipo: "addon", totalCent: 350000 },
      { tipo: "ajuste", totalCent: -150000, nota: "Primer mes" },
    ]);
    expect(resumen.notasInternas).toContain("Piloto");
  });

  it("muestra si un resumen esta pendiente, pagado o con saldo a favor", () => {
    expect(estadoPagoDemo(100000, 0)).toMatchObject({ estado: "pendiente", saldoPendienteCent: 100000 });
    expect(estadoPagoDemo(100000, 50000)).toMatchObject({ estado: "parcial", saldoPendienteCent: 50000 });
    expect(estadoPagoDemo(100000, 100000)).toMatchObject({ estado: "pagado", saldoPendienteCent: 0 });
    expect(estadoPagoDemo(100000, 120000)).toMatchObject({ estado: "saldo_a_favor", saldoAFavorCent: 20000 });
  });
});

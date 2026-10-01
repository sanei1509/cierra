import { describe, expect, it } from "vitest";
import { estadoPagoDemo, ESTUDIOS_ADMIN, fmtCent, modulosHabilitados, resumenCobroDemo, totalMensualCent } from "../src/lib/comercial-demo";

describe("consola comercial demo", () => {
  it("calcula el total mensual como plan mas add-ons", () => {
    const estudio = ESTUDIOS_ADMIN.find((e) => e.id === "pereira")!;

    expect(totalMensualCent(estudio)).toBe(1800000);
    expect(fmtCent(totalMensualCent(estudio), estudio.moneda)).toBe("UYU 18.000");
  });

  it("muestra modulos de plan y add-ons sin duplicados", () => {
    const estudio = ESTUDIOS_ADMIN.find((e) => e.id === "pereira")!;

    expect(modulosHabilitados(estudio)).toContain("payroll_receipts");
    expect(modulosHabilitados(estudio)).toContain("automatic_receipt_email");
    expect(new Set(modulosHabilitados(estudio)).size).toBe(modulosHabilitados(estudio).length);
  });

  it("arma un resumen de cobro con notas y ajustes manuales", () => {
    const estudio = ESTUDIOS_ADMIN.find((e) => e.id === "pereira")!;
    const resumen = resumenCobroDemo(estudio, "2026-10", [{ descripcion: "Descuento piloto", importeCent: -150000, nota: "Primer mes" }]);

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

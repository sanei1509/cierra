import { describe, expect, it } from "vitest";
import { ESTUDIOS_ADMIN, fmtCent, modulosHabilitados, totalMensualCent } from "../src/lib/comercial-demo";

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
});

import { describe, expect, it } from "vitest";
import { CATALOGO_MODULOS } from "../src/modulos";
import { ADDONS_COMERCIALES_BASE, ESTUDIOS_COMERCIALES_BASE, filasPlanModuloBase, PLANES_COMERCIALES_BASE } from "../src/dev/seed-comercial";

describe("seed comercial de desarrollo", () => {
  it("define los paquetes base esperados para alta comercial", () => {
    expect(PLANES_COMERCIALES_BASE.map((plan) => plan.codigo)).toEqual(["basico", "profesional", "full"]);
    expect(PLANES_COMERCIALES_BASE.map((plan) => plan.id)).toEqual([
      "00000000-0000-4000-8000-000000000101",
      "00000000-0000-4000-8000-000000000102",
      "00000000-0000-4000-8000-000000000103",
    ]);
  });

  it("solo referencia modulos existentes en el catalogo backend", () => {
    const catalogo = new Set(CATALOGO_MODULOS.map((modulo) => modulo.codigo));

    for (const plan of PLANES_COMERCIALES_BASE) {
      expect(plan.precioMensualCent).toBeGreaterThan(0);
      expect(plan.modulos.length).toBeGreaterThan(0);
      for (const modulo of plan.modulos) expect(catalogo.has(modulo)).toBe(true);
    }
  });

  it("genera filas plan-modulo sin duplicados", () => {
    const filas = filasPlanModuloBase();
    const claves = filas.map((fila) => `${fila.planId}:${fila.moduloCodigo}`);

    expect(new Set(claves).size).toBe(claves.length);
    expect(filas.length).toBe(29);
  });

  it("define estudios comerciales seed con suscripciones y add-ons existentes", () => {
    const planes = new Set(PLANES_COMERCIALES_BASE.map((plan) => plan.codigo));
    const addons = new Set(ADDONS_COMERCIALES_BASE.map((addon) => addon.moduloCodigo));

    expect(ESTUDIOS_COMERCIALES_BASE.length).toBeGreaterThanOrEqual(3);
    for (const estudio of ESTUDIOS_COMERCIALES_BASE) {
      expect(estudio.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(estudio.suscripcionId).toMatch(/^[0-9a-f-]{36}$/);
      expect(planes.has(estudio.planCodigo)).toBe(true);
      for (const addon of estudio.addons) expect(addons.has(addon)).toBe(true);
    }
  });
});

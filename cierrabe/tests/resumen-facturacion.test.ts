import { describe, expect, it } from "vitest";
import type { EstudioId } from "../src/datos/contexto";
import { ErrorDominio } from "../src/datos/errores";
import { generarResumenCobroEstudio, type PlanComercial, type SuscripcionEstudio } from "../src/facturacion";

const estudioId = "estudio-a" as EstudioId;

const plan: PlanComercial = {
  id: "plan-profesional",
  codigo: "profesional",
  nombre: "Profesional",
  descripcion: "Plan para estudios con liquidacion, recibos y portales.",
  estado: "activo",
  moneda: "UYU",
  precioMensualCent: 999999,
  modulos: ["rrhh_core", "payroll_core", "payroll_receipts"],
};

const suscripcion: SuscripcionEstudio = {
  id: "sub-1",
  estudioId,
  planId: plan.id,
  estado: "activo",
  moneda: "UYU",
  precioMensualCent: 150000,
  inicio: "2026-10-01",
  notasInternas: "Precio especial pactado por piloto.",
  addons: [{ moduloCodigo: "automatic_receipt_email", precioMensualCent: 35000, inicio: "2026-10-01" }],
  overrides: [],
};

describe("resumen interno de facturacion", () => {
  it("calcula plan, add-ons y ajustes manuales del mes", () => {
    const resumen = generarResumenCobroEstudio({
      mes: "2026-10",
      plan,
      suscripcion,
      ajustes: [{ descripcion: "Descuento lanzamiento", importeCent: -20000, nota: "Acordado por primer mes" }],
      eventosUso: [
        { estudioId, mes: "2026-10", tipo: "empresa_activa", cantidad: 3 },
        { estudioId, mes: "2026-10", tipo: "recibo_generado", cantidad: 120 },
      ],
      generado: "2026-10-31T12:00:00.000Z",
    });

    expect(resumen.totalCent).toBe(165000);
    expect(resumen.lineas).toMatchObject([
      { tipo: "plan", totalCent: 150000, planId: plan.id },
      { tipo: "addon", totalCent: 35000, moduloCodigo: "automatic_receipt_email" },
      { tipo: "ajuste", totalCent: -20000, concepto: "Descuento lanzamiento" },
    ]);
    expect(resumen.eventosUso).toHaveLength(2);
  });

  it("usa precios snapshot de la suscripcion aunque el plan vigente cambie", () => {
    const resumen = generarResumenCobroEstudio({
      mes: "2026-10",
      plan: { ...plan, precioMensualCent: 999999 },
      suscripcion: { ...suscripcion, precioMensualCent: 150000 },
      generado: "2026-10-31T12:00:00.000Z",
    });

    expect(resumen.lineas[0]).toMatchObject({
      tipo: "plan",
      importeUnitarioCent: 150000,
      totalCent: 150000,
    });
    expect(resumen.totalCent).toBe(185000);
  });

  it("mantiene eventos de uso como referencia interna sin cobrarlos automaticamente", () => {
    const resumen = generarResumenCobroEstudio({
      mes: "2026-10",
      plan,
      suscripcion,
      eventosUso: [{ estudioId, mes: "2026-10", tipo: "recibo_enviado", cantidad: 120 }],
    });

    expect(resumen.eventosUso[0]).toMatchObject({ tipo: "recibo_enviado", cantidad: 120 });
    expect(resumen.totalCent).toBe(185000);
  });

  it("valida mes, plan y eventos antes de calcular", () => {
    expect(() => generarResumenCobroEstudio({ mes: "10-2026", plan, suscripcion })).toThrow(ErrorDominio);
    expect(() => generarResumenCobroEstudio({ mes: "2026-10", plan: { ...plan, id: "otro-plan" }, suscripcion })).toThrow(ErrorDominio);
    expect(() =>
      generarResumenCobroEstudio({
        mes: "2026-10",
        plan,
        suscripcion,
        eventosUso: [{ estudioId, mes: "2026-09", tipo: "empleado_activo", cantidad: 5 }],
      }),
    ).toThrow(ErrorDominio);
  });
});

import { describe, expect, it } from "vitest";
import { mapPlan, mapSuscripcion } from "../src/datos/repos";
import type { EstudioId } from "../src/datos/contexto";

describe("repos comerciales", () => {
  it("mapea planes con sus modulos contratados", () => {
    const plan = mapPlan(
      {
        id: "plan-1",
        codigo: "profesional",
        nombre: "Profesional",
        descripcion: "Plan profesional",
        estado: "activo",
        moneda: "UYU",
        precioMensualCent: 1450000,
        creado: new Date("2026-10-01T00:00:00Z"),
      },
      [
        { planId: "plan-1", moduloCodigo: "rrhh_core" },
        { planId: "plan-1", moduloCodigo: "payroll_core" },
        { planId: "otro", moduloCodigo: "advanced_reports" },
      ],
    );

    expect(plan).toMatchObject({
      id: "plan-1",
      codigo: "profesional",
      precioMensualCent: 1450000,
      modulos: ["rrhh_core", "payroll_core"],
    });
  });

  it("mapea suscripciones con add-ons y overrides desde filas SQL", () => {
    const suscripcion = mapSuscripcion(
      {
        id: "sub-1",
        estudioId: "estudio-a",
        planId: "plan-1",
        estado: "activo",
        moneda: "UYU",
        precioMensualCent: 1450000,
        inicio: new Date("2026-10-01T00:00:00"),
        fin: null,
        notasInternas: "Alta comercial",
        creado: new Date("2026-10-01T00:00:00Z"),
      },
      [
        {
          suscripcionId: "sub-1",
          moduloCodigo: "automatic_receipt_email",
          precioMensualCent: 350000,
          inicio: new Date("2026-10-01T00:00:00"),
          fin: null,
        },
      ],
      [
        {
          id: "ov-1",
          suscripcionId: "sub-1",
          moduloCodigo: "advanced_reports",
          tipo: "habilitar",
          motivo: "Piloto",
          inicio: new Date("2026-10-01T00:00:00"),
          fin: null,
          creadoPorUsuarioId: "usuario-1",
          creado: new Date("2026-10-01T00:00:00Z"),
        },
      ],
    );

    expect(suscripcion.estudioId).toBe("estudio-a" as EstudioId);
    expect(suscripcion.inicio).toBe("2026-10-01");
    expect(suscripcion.addons[0]).toMatchObject({ moduloCodigo: "automatic_receipt_email", precioMensualCent: 350000 });
    expect(suscripcion.overrides[0]).toMatchObject({ moduloCodigo: "advanced_reports", tipo: "habilitar", motivo: "Piloto" });
  });
});

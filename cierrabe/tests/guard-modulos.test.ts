import { describe, expect, it, vi } from "vitest";
import type { EstudioId } from "../src/datos/contexto";
import type { PlanesRepo, SuscripcionesRepo } from "../src/datos/contratos";
import { ErrorDominio } from "../src/datos/errores";
import { exigirModuloContratado, type PlanComercial, type SuscripcionEstudio } from "../src/facturacion";

const estudioId = "estudio-a" as EstudioId;

const plan: PlanComercial = {
  id: "plan-basico",
  codigo: "basico",
  nombre: "Basico",
  descripcion: "Plan con datos, liquidacion y recibos.",
  estado: "activo",
  moneda: "UYU",
  precioMensualCent: 100000,
  modulos: ["rrhh_core", "payroll_core", "payroll_receipts"],
};

const suscripcionActiva: SuscripcionEstudio = {
  id: "sub-1",
  estudioId,
  planId: plan.id,
  estado: "activo",
  moneda: "UYU",
  precioMensualCent: 100000,
  inicio: "2026-10-01",
  addons: [],
  overrides: [],
};

function repos(suscripcion: SuscripcionEstudio | null, planContratado: PlanComercial | null = plan): { planes: PlanesRepo; suscripciones: SuscripcionesRepo } {
  return {
    planes: {
      listar: vi.fn(async () => (planContratado ? [planContratado] : [])),
      obtener: vi.fn(async () => planContratado),
    },
    suscripciones: {
      obtenerVigente: vi.fn(async () => suscripcion),
      crearOActualizar: vi.fn(async (_estudioId, input) => ({ ...input, id: input.id ?? "sub-1", addons: input.addons ?? [], overrides: input.overrides ?? [] })),
    },
  };
}

describe("guard de modulos contratados", () => {
  it("permite ejecutar una funcion incluida por el plan", async () => {
    const resultado = await exigirModuloContratado(repos(suscripcionActiva), { estudioId, funcion: "emitir_recibos" });

    expect(resultado.modulo).toBe("payroll_receipts");
    expect(resultado.habilitados).toContain("payroll_receipts");
  });

  it("permite ejecutar un modulo habilitado por add-on", async () => {
    const resultado = await exigirModuloContratado(
      repos({
        ...suscripcionActiva,
        addons: [{ moduloCodigo: "automatic_receipt_email", precioMensualCent: 35000, inicio: "2026-10-01" }],
      }),
      { estudioId, funcion: "enviar_recibos_email" },
    );

    expect(resultado.habilitados).toContain("automatic_receipt_email");
  });

  it("permite ejecutar un modulo habilitado por override administrativo", async () => {
    const resultado = await exigirModuloContratado(
      repos({
        ...suscripcionActiva,
        overrides: [{ moduloCodigo: "advanced_reports", tipo: "habilitar", motivo: "Beta piloto", inicio: "2026-10-01" }],
      }),
      { estudioId, modulo: "advanced_reports" },
    );

    expect(resultado.habilitados).toContain("advanced_reports");
  });

  it("bloquea modulo no contratado con mensaje claro", async () => {
    await expect(exigirModuloContratado(repos(suscripcionActiva), { estudioId, funcion: "enviar_recibos_email" })).rejects.toMatchObject({
      codigo: "MODULO_NO_CONTRATADO",
      message: "Este modulo no esta incluido en tu plan",
    });
  });

  it("bloquea una suscripcion pausada sin confundirla con permisos", async () => {
    await expect(
      exigirModuloContratado(repos({ ...suscripcionActiva, estado: "pausado" }), { estudioId, funcion: "emitir_recibos" }),
    ).rejects.toMatchObject({
      codigo: "SUSCRIPCION_INACTIVA",
      message: "La cuenta no esta activa para usar esta funcion",
    });
  });

  it("bloquea si no existe suscripcion vigente", async () => {
    await expect(exigirModuloContratado(repos(null), { estudioId, modulo: "payroll_core" })).rejects.toBeInstanceOf(ErrorDominio);
  });
});

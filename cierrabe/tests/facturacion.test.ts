import { describe, expect, it, vi } from "vitest";
import type { AccessContext, EstudioId, TenantContext, UsuarioId } from "../src/datos/contexto";
import type { AuditoriaRepo, SuscripcionesRepo } from "../src/datos/contratos";
import type { AuditEvent } from "../src/dominio/types";
import { ErrorDominio } from "../src/datos/errores";
import { configurarSuscripcionEstudio } from "../src/acciones";
import {
  modulosContratados,
  totalMensualContratado,
  validarSuscripcionEstudio,
  type PlanComercial,
  type SuscripcionEstudio,
} from "../src/facturacion";

const estudioId = "estudio-a" as EstudioId;
const usuarioId = "usuario-admin" as UsuarioId;
const systemAdmin: AccessContext = { actorTipo: "sistema", usuarioId, rol: "system_admin" };
const estudioAdmin: AccessContext = { actorTipo: "estudio", usuarioId, estudioId, rol: "studio_admin", empresasPermitidas: "todas" };

const plan: PlanComercial = {
  id: "plan-profesional",
  codigo: "profesional",
  nombre: "Profesional",
  descripcion: "Plan para estudios con liquidacion, recibos y portales.",
  estado: "activo",
  moneda: "UYU",
  precioMensualCent: 150000,
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
  addons: [{ moduloCodigo: "automatic_receipt_email", precioMensualCent: 35000, inicio: "2026-10-01" }],
  overrides: [],
};

function auditoriaRepoMock(): AuditoriaRepo & { ctxs: TenantContext[] } {
  const ctxs: TenantContext[] = [];
  return {
    ctxs,
    listar: vi.fn(async () => []),
    registrar: vi.fn(async (ctx, input) => {
      ctxs.push(ctx);
      return { ...input, id: "audit-1", fecha: "2026-09-30T12:00:00.000Z" } as AuditEvent;
    }),
  };
}

function suscripcionesRepoMock(): SuscripcionesRepo {
  return {
    obtenerVigente: vi.fn(async () => null),
    crearOActualizar: vi.fn(async (_estudioId, input) => ({ ...input, id: input.id ?? "sub-1", addons: input.addons ?? [], overrides: input.overrides ?? [] })),
  };
}

describe("planes y suscripciones", () => {
  it("combina modulos de plan, add-ons y dependencias", () => {
    expect(modulosContratados(plan, suscripcion)).toEqual([
      "rrhh_core",
      "salary_history",
      "payroll_core",
      "payroll_receipts",
      "employee_portal",
      "automatic_receipt_email",
    ]);
  });

  it("permite deshabilitar un modulo por override administrativo", () => {
    expect(
      modulosContratados(plan, {
        ...suscripcion,
        overrides: [{ moduloCodigo: "payroll_receipts", tipo: "deshabilitar", motivo: "Prueba finalizada", inicio: "2026-10-15" }],
      }),
    ).toEqual(["rrhh_core", "salary_history", "payroll_core", "employee_portal", "automatic_receipt_email"]);
  });

  it("calcula precio mensual fijo del plan mas add-ons", () => {
    expect(totalMensualContratado(suscripcion)).toBe(185000);
  });

  it("valida precios, moneda y modulos de la suscripcion", () => {
    expect(() =>
      validarSuscripcionEstudio({
        ...suscripcion,
        moneda: "UYU",
        precioMensualCent: -1,
        resumen: "Alta comercial",
      }),
    ).toThrow(ErrorDominio);
  });

  it("solo admin sistema configura la suscripcion comercial y deja auditoria", async () => {
    const suscripciones = suscripcionesRepoMock();
    const auditoria = auditoriaRepoMock();

    await configurarSuscripcionEstudio(systemAdmin, { suscripciones, auditoria }, estudioId, {
      ...suscripcion,
      resumen: "Alta del plan profesional",
    });

    expect(suscripciones.crearOActualizar).toHaveBeenCalledTimes(1);
    expect(auditoria.registrar).toHaveBeenCalledWith(expect.objectContaining({ estudioId }), expect.objectContaining({ accion: "suscripcion_estudio_configurada" }));

    await expect(
      configurarSuscripcionEstudio(estudioAdmin, { suscripciones, auditoria }, estudioId, {
        ...suscripcion,
        resumen: "Intento de autogestion comercial",
      }),
    ).rejects.toBeInstanceOf(ErrorDominio);
  });
});

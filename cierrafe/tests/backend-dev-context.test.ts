import { afterEach, describe, expect, it } from "vitest";
import { contextoAdminDesarrollo, contextoEstudioDesarrollo, uuidValido } from "../src/lib/backend-dev-context";
import type { DevSession } from "../src/lib/dev-session";

const envOriginal = { ...process.env };
const adminUuid = "00000000-0000-4000-8000-000000000001";
const estudioUuid = "00000000-0000-4000-8000-000000000002";
const usuarioUuid = "00000000-0000-4000-8000-000000000003";

function resetEnv() {
  process.env = { ...envOriginal };
  delete process.env.DATABASE_URL;
  delete process.env.CIERRA_DEV_ADMIN_ID;
  delete process.env.CIERRA_DEV_ESTUDIO_ID;
  delete process.env.CIERRA_DEV_USUARIO_ID;
}

function habilitarBackendReal() {
  resetEnv();
  process.env.DATABASE_URL = "postgresql://local";
  process.env.CIERRA_DEV_ADMIN_ID = adminUuid;
  process.env.CIERRA_DEV_ESTUDIO_ID = estudioUuid;
  process.env.CIERRA_DEV_USUARIO_ID = usuarioUuid;
}

function sesionDev(overrides: Partial<DevSession>): DevSession {
  return {
    accesoId: "studio_admin",
    email: "lucia@estudiopereira.uy",
    usuarioId: "u1",
    actor: "estudio",
    delegadoPor: null,
    ...overrides,
  };
}

describe("contextos backend de desarrollo", () => {
  afterEach(() => {
    process.env = { ...envOriginal };
  });

  it("valida UUIDs reales para habilitar backend", () => {
    expect(uuidValido("00000000-0000-4000-8000-000000000001")).toBe(true);
    expect(uuidValido("u1")).toBe(false);
    expect(uuidValido(undefined)).toBe(false);
  });

  it("devuelve null si falta base o ids reales", () => {
    resetEnv();

    expect(contextoAdminDesarrollo()).toBeNull();
    expect(contextoEstudioDesarrollo()).toBeNull();

    process.env.DATABASE_URL = "postgresql://local";
    process.env.CIERRA_DEV_ADMIN_ID = "u-admin";
    process.env.CIERRA_DEV_ESTUDIO_ID = "estudio";
    process.env.CIERRA_DEV_USUARIO_ID = "u1";

    expect(contextoAdminDesarrollo()).toBeNull();
    expect(contextoEstudioDesarrollo()).toBeNull();
  });

  it("arma contextos reales cuando hay DATABASE_URL e ids UUID", () => {
    habilitarBackendReal();

    expect(contextoAdminDesarrollo()).toMatchObject({ actorTipo: "sistema", rol: "system_admin" });
    expect(contextoEstudioDesarrollo()).toMatchObject({ actorTipo: "estudio", rol: "studio_admin", empresasPermitidas: "todas" });
  });

  it("requiere que la sesion dev coincida con el actor del contexto", () => {
    habilitarBackendReal();

    expect(contextoAdminDesarrollo(sesionDev({ actor: "estudio", accesoId: "studio_admin" }))).toBeNull();
    expect(contextoEstudioDesarrollo(sesionDev({ actor: "sistema", accesoId: "system_admin" }))).toBeNull();
  });

  it("mapea roles de estudio desde la sesion dev activa", () => {
    habilitarBackendReal();

    expect(contextoEstudioDesarrollo(sesionDev({ accesoId: "studio_admin" }))).toMatchObject({ rol: "studio_admin" });
    expect(contextoEstudioDesarrollo(sesionDev({ accesoId: "payroll_operator" }))).toMatchObject({ rol: "payroll_operator" });
    expect(contextoEstudioDesarrollo(sesionDev({ accesoId: "studio_readonly" }))).toMatchObject({ rol: "studio_readonly" });
  });

  it("preserva el delegador sistema cuando admin opera como estudio", () => {
    habilitarBackendReal();

    const ctx = contextoEstudioDesarrollo(
      sesionDev({
        accesoId: "admin_as_study",
        email: "admin+estudio@cierra.local",
        delegadoPor: { email: "admin@cierra.local", motivo: "Soporte solicitado" },
      }),
    );

    expect(ctx).toMatchObject({
      actorTipo: "estudio",
      rol: "studio_admin",
      delegadoPor: { usuarioId: adminUuid, rol: "system_admin", motivo: "Soporte solicitado" },
    });
  });
});

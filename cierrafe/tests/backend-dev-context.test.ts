import { afterEach, describe, expect, it } from "vitest";
import { contextoAdminDesarrollo, contextoEstudioDesarrollo, uuidValido } from "../src/lib/backend-dev-context";

const envOriginal = { ...process.env };

function resetEnv() {
  process.env = { ...envOriginal };
  delete process.env.DATABASE_URL;
  delete process.env.CIERRA_DEV_ADMIN_ID;
  delete process.env.CIERRA_DEV_ESTUDIO_ID;
  delete process.env.CIERRA_DEV_USUARIO_ID;
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
    resetEnv();
    process.env.DATABASE_URL = "postgresql://local";
    process.env.CIERRA_DEV_ADMIN_ID = "00000000-0000-4000-8000-000000000001";
    process.env.CIERRA_DEV_ESTUDIO_ID = "00000000-0000-4000-8000-000000000002";
    process.env.CIERRA_DEV_USUARIO_ID = "00000000-0000-4000-8000-000000000003";

    expect(contextoAdminDesarrollo()).toMatchObject({ actorTipo: "sistema", rol: "system_admin" });
    expect(contextoEstudioDesarrollo()).toMatchObject({ actorTipo: "estudio", rol: "studio_admin", empresasPermitidas: "todas" });
  });
});

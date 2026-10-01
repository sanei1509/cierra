import { afterEach, describe, expect, it, vi } from "vitest";
import type { EstudioId, UsuarioId } from "cierrabe/datos/contexto";
import type { SesionAutenticada, UsuarioAuth } from "cierrabe/auth";
import { actorSesionReal, destinoSesionReal, parsearSesionReal, serializarSesionReal } from "../src/lib/auth-session";

const envOriginal = { ...process.env };

const usuario: UsuarioAuth = {
  id: "00000000-0000-4000-8000-000000000003" as UsuarioId,
  email: "lucia@estudiopereira.uy",
  nombre: "Lucia Pereira",
  estado: "activo",
  temaPreferido: "system",
  mfaActivo: false,
};

function sesion(expira = new Date("2026-10-01T18:00:00Z")): SesionAutenticada {
  return {
    usuario,
    metodo: "password",
    expira,
    espacio: {
      actorTipo: "estudio",
      estudioId: "00000000-0000-4000-8000-000000000002" as EstudioId,
      rol: "studio_admin",
      empresasPermitidas: "todas",
    },
  };
}

describe("sesion real frontend", () => {
  afterEach(() => {
    process.env = { ...envOriginal };
    vi.useRealTimers();
  });

  it("serializa y valida una sesion firmada", () => {
    process.env.CIERRA_SESSION_SECRET = "secret-test";
    vi.setSystemTime(new Date("2026-10-01T17:00:00Z"));

    const token = serializarSesionReal(sesion());
    const payload = parsearSesionReal(token);

    expect(payload).toMatchObject({
      usuarioId: usuario.id,
      espacio: { actorTipo: "estudio", rol: "studio_admin" },
    });
  });

  it("rechaza sesiones manipuladas o vencidas", () => {
    process.env.CIERRA_SESSION_SECRET = "secret-test";
    vi.setSystemTime(new Date("2026-10-01T17:00:00Z"));

    const token = serializarSesionReal(sesion());
    const [body, firma] = token.split(".");

    expect(parsearSesionReal(`${body}x.${firma}`)).toBeNull();

    vi.setSystemTime(new Date("2026-10-01T19:00:00Z"));
    expect(parsearSesionReal(token)).toBeNull();
  });

  it("resuelve destinos por tipo de actor", () => {
    expect(destinoSesionReal({ actorTipo: "sistema", rol: "system_admin" })).toBe("/admin");
    expect(destinoSesionReal(sesion().espacio)).toBe("/");
    expect(actorSesionReal(sesion().espacio)).toBe("estudio");
  });
});

import { describe, expect, it, vi } from "vitest";
import type { EmpresaId, EstudioId, UsuarioId } from "../src/datos/contexto";
import { ErrorDominio } from "../src/datos/errores";
import { crearAuthContext, crearPasswordHash, crearTokenSeguro, hashToken, normalizarEmail, verificarPassword } from "../src/auth";
import type { SesionAutenticada, UsuarioAuth } from "../src/auth";

const usuarioId = "usuario-1" as UsuarioId;
const estudioId = "estudio-1" as EstudioId;
const empresaId = "empresa-1" as EmpresaId;

const usuario: UsuarioAuth = {
  id: usuarioId,
  email: "persona@estudio.uy",
  nombre: "Persona",
  estado: "activo",
  temaPreferido: "system",
  mfaActivo: false,
};

describe("auth foundation", () => {
  it("normaliza emails y rechaza formatos invalidos", () => {
    expect(normalizarEmail("  Lucia@Estudio.UY ")).toBe("lucia@estudio.uy");
    expect(() => normalizarEmail("sin-arroba")).toThrow(ErrorDominio);
  });

  it("hashea contrasenas y no acepta la incorrecta", () => {
    const hash = crearPasswordHash("ClaveSegura123");

    expect(hash.startsWith("scrypt:")).toBe(true);
    expect(hash).not.toContain("ClaveSegura123");
    expect(verificarPassword("ClaveSegura123", hash)).toBe(true);
    expect(verificarPassword("OtraClave123", hash)).toBe(false);
  });

  it("genera tokens seguros que se guardan hasheados", () => {
    const token = crearTokenSeguro();
    const hash = hashToken(token);

    expect(token.length).toBeGreaterThan(30);
    expect(hash).toHaveLength(64);
    expect(hash).not.toBe(token);
  });

  it("resuelve contexto de estudio desde una sesion activa", () => {
    const sesion: SesionAutenticada = {
      usuario,
      metodo: "magic_link",
      expira: new Date(Date.now() + 60_000),
      espacio: { actorTipo: "estudio", estudioId, rol: "studio_admin", empresasPermitidas: "todas" },
    };

    expect(crearAuthContext(sesion).acceso).toEqual({
      actorTipo: "estudio",
      usuarioId,
      estudioId,
      rol: "studio_admin",
      empresasPermitidas: "todas",
    });
  });

  it("rechaza usuarios suspendidos", () => {
    const sesion: SesionAutenticada = {
      usuario: { ...usuario, estado: "suspendido" },
      metodo: "password",
      expira: new Date(Date.now() + 60_000),
      espacio: { actorTipo: "empresa", estudioId, empresaId, rol: "company_owner" },
    };

    expect(() => crearAuthContext(sesion)).toThrow(ErrorDominio);
  });

  it("rechaza sesiones vencidas", () => {
    vi.setSystemTime(new Date("2026-09-30T18:00:00Z"));
    const sesion: SesionAutenticada = {
      usuario,
      metodo: "password",
      expira: new Date("2026-09-30T17:59:00Z"),
      espacio: { actorTipo: "sistema", rol: "system_admin" },
    };

    try {
      crearAuthContext(sesion);
    } catch (e) {
      expect(e).toBeInstanceOf(ErrorDominio);
      expect((e as ErrorDominio).codigo).toBe("NO_AUTENTICADO");
    } finally {
      vi.useRealTimers();
    }
  });
});

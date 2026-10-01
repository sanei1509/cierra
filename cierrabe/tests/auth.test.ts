import { describe, expect, it, vi } from "vitest";
import type { EmpresaId, EstudioId, UsuarioId } from "../src/datos/contexto";
import { ErrorDominio } from "../src/datos/errores";
import { autenticarConPassword, crearAuthContext, crearPasswordHash, crearTokenSeguro, hashToken, normalizarEmail, verificarPassword } from "../src/auth";
import type { AuthPasswordRepo, CredencialesPasswordAuth, SesionAutenticada, UsuarioAuth } from "../src/auth";

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

function repoPassword(record: CredencialesPasswordAuth | null): AuthPasswordRepo & { ultimoAcceso: Date | null } {
  return {
    ultimoAcceso: null,
    async obtenerPorEmail() {
      return record;
    },
    async registrarUltimoAcceso(_usuarioId, fecha) {
      this.ultimoAcceso = fecha;
    },
  };
}

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

  it("autentica credenciales password y registra ultimo acceso", async () => {
    const ahora = new Date("2026-10-01T12:00:00Z");
    const repo = repoPassword({
      usuario,
      passwordHash: crearPasswordHash("ClaveSegura123"),
      espacios: [{ actorTipo: "estudio", estudioId, rol: "studio_admin", empresasPermitidas: "todas" }],
    });

    const sesion = await autenticarConPassword(repo, { email: " Persona@Estudio.UY ", password: "ClaveSegura123" }, { ahora, duracionMs: 60_000 });

    expect(sesion).toMatchObject({ metodo: "password", espacio: { actorTipo: "estudio", rol: "studio_admin" } });
    expect(sesion.expira.toISOString()).toBe("2026-10-01T12:01:00.000Z");
    expect(repo.ultimoAcceso).toBe(ahora);
  });

  it("usa mensaje generico para usuario inexistente, sin hash o password incorrecta", async () => {
    const hash = crearPasswordHash("ClaveSegura123");

    await expect(autenticarConPassword(repoPassword(null), { email: "persona@estudio.uy", password: "ClaveSegura123" })).rejects.toMatchObject({
      codigo: "NO_AUTENTICADO",
      message: "Email o contrasena invalidos",
    });
    await expect(autenticarConPassword(repoPassword({ usuario, passwordHash: null, espacios: [] }), { email: "persona@estudio.uy", password: "ClaveSegura123" })).rejects.toMatchObject({
      codigo: "NO_AUTENTICADO",
      message: "Email o contrasena invalidos",
    });
    await expect(autenticarConPassword(repoPassword({ usuario, passwordHash: hash, espacios: [] }), { email: "persona@estudio.uy", password: "OtraClave123" })).rejects.toMatchObject({
      codigo: "NO_AUTENTICADO",
      message: "Email o contrasena invalidos",
    });
  });

  it("rechaza login password de usuarios suspendidos", async () => {
    const repo = repoPassword({
      usuario: { ...usuario, estado: "suspendido" },
      passwordHash: crearPasswordHash("ClaveSegura123"),
      espacios: [{ actorTipo: "estudio", estudioId, rol: "studio_admin", empresasPermitidas: "todas" }],
    });

    await expect(autenticarConPassword(repo, { email: "persona@estudio.uy", password: "ClaveSegura123" })).rejects.toMatchObject({
      codigo: "SIN_PERMISO",
    });
  });

  it("habilita contexto sistema cuando el usuario coincide con el admin configurado", async () => {
    const repo = repoPassword({
      usuario,
      passwordHash: crearPasswordHash("ClaveSegura123"),
      espacios: [{ actorTipo: "estudio", estudioId, rol: "studio_admin", empresasPermitidas: "todas" }],
    });

    const sesion = await autenticarConPassword(repo, { email: "persona@estudio.uy", password: "ClaveSegura123" }, { adminSistemaUsuarioId: usuario.id });

    expect(sesion.espacio).toEqual({ actorTipo: "sistema", rol: "system_admin" });
  });
});

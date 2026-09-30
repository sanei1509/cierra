import { describe, expect, it, vi } from "vitest";
import type { AccessContext, EmpresaId, EstudioId, TenantContext, UsuarioId } from "../src/datos/contexto";
import type { ArchivoMarca, ArchivosMarcaRepo, AuditoriaRepo, EmpresasRepo, EstudiosRepo } from "../src/datos/contratos";
import { ErrorDominio } from "../src/datos/errores";
import {
  actualizarPerfilEmpresa,
  actualizarPerfilEstudio,
  registrarArchivoMarcaEmpresa,
  registrarArchivoMarcaEstudio,
} from "../src/acciones";
import type { AuditEvent, Empresa } from "../src/dominio/types";
import { MAX_ARCHIVO_MARCA_BYTES, validarArchivoMarca } from "../src/perfiles";

const estudioA = "estudio-a" as EstudioId;
const empresaA = "empresa-a" as EmpresaId;
const usuario = "usuario-1" as UsuarioId;

const estudioAdmin: AccessContext = { actorTipo: "estudio", usuarioId: usuario, estudioId: estudioA, rol: "studio_admin", empresasPermitidas: "todas" };
const liquidador: AccessContext = { actorTipo: "estudio", usuarioId: usuario, estudioId: estudioA, rol: "payroll_operator", empresasPermitidas: "todas" };
const empresaOwner: AccessContext = { actorTipo: "empresa", usuarioId: usuario, estudioId: estudioA, empresaId: empresaA, rol: "company_owner" };
const empresaLectura: AccessContext = { actorTipo: "empresa", usuarioId: usuario, estudioId: estudioA, empresaId: empresaA, rol: "company_readonly" };

function empresa(): Empresa {
  return {
    id: empresaA,
    nombre: "Empresa",
    rut: "123456789012",
    nroBps: "456",
    actividad: "Servicios",
    grupo: 10,
    subgrupo: "01",
    responsableId: "resp",
    requiereAprobacion: true,
    contacto: { nombre: "Contacto", email: "contacto@example.com" },
    tono: "menta",
  };
}

function auditoriaRepoMock(): AuditoriaRepo {
  return {
    listar: vi.fn(async () => []),
    registrar: vi.fn(async (_ctx, input) => ({ ...input, id: "audit-1", fecha: "2026-09-30T12:00:00.000Z" }) as AuditEvent),
  };
}

function estudiosRepoMock(): EstudiosRepo {
  return {
    obtener: vi.fn(async () => ({ id: estudioA, nombre: "Estudio", creado: "2026-01-01" })),
    actualizarPerfil: vi.fn(async (_ctx, input) => ({ id: estudioA, nombre: "Estudio", creado: "2026-01-01", ...input })),
  };
}

function empresasRepoMock(): EmpresasRepo & { ctxs: TenantContext[] } {
  const ctxs: TenantContext[] = [];
  return {
    ctxs,
    listar: vi.fn(async () => [empresa()]),
    obtener: vi.fn(async () => empresa()),
    crear: vi.fn(async (_ctx, input) => ({ ...input, id: input.id ?? empresaA })),
    actualizar: vi.fn(async (ctx, _id, input) => {
      ctxs.push(ctx);
      return { ...empresa(), ...input };
    }),
  };
}

function archivosRepoMock(): ArchivosMarcaRepo {
  return {
    crear: vi.fn(async (_ctx, input) => ({ ...input, id: input.id ?? "archivo-1", creado: "2026-09-30T12:00:00.000Z" }) as ArchivoMarca),
    obtener: vi.fn(async () => null),
  };
}

describe("perfiles y marca", () => {
  it("valida tipo, tamano y ruta de archivos de marca", () => {
    expect(() =>
      validarArchivoMarca({
        estudioId: estudioA,
        duenoTipo: "estudio",
        tipo: "logo",
        nombreOriginal: "logo.svg",
        mimeType: "image/svg+xml",
        tamanoBytes: 100,
        storageKey: "estudios/logo.svg",
      }),
    ).toThrow(ErrorDominio);

    expect(() =>
      validarArchivoMarca({
        estudioId: estudioA,
        duenoTipo: "empresa",
        tipo: "logo",
        nombreOriginal: "logo.png",
        mimeType: "image/png",
        tamanoBytes: MAX_ARCHIVO_MARCA_BYTES + 1,
        storageKey: "empresas/logo.png",
      }),
    ).toThrow(ErrorDominio);

    expect(() =>
      validarArchivoMarca({
        estudioId: estudioA,
        duenoTipo: "empresa",
        tipo: "logo",
        nombreOriginal: "logo.png",
        mimeType: "image/png",
        tamanoBytes: 100,
        storageKey: "../secretos/logo.png",
      }),
    ).toThrow(ErrorDominio);
  });

  it("permite al admin del estudio editar su perfil y audita el cambio", async () => {
    const estudios = estudiosRepoMock();
    const auditoria = auditoriaRepoMock();

    await actualizarPerfilEstudio(estudioAdmin, { estudios, auditoria }, estudioA, {
      nombreVisible: "Estudio Don Pedrito",
      emailContacto: "hola@donpedrito.uy",
      resumen: "Carga inicial de marca",
    });

    expect(estudios.actualizarPerfil).toHaveBeenCalledTimes(1);
    expect(auditoria.registrar).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ accion: "perfil_estudio_actualizado" }));
  });

  it("bloquea a liquidador para editar configuracion del estudio", async () => {
    const estudios = estudiosRepoMock();
    const auditoria = auditoriaRepoMock();

    await expect(
      actualizarPerfilEstudio(liquidador, { estudios, auditoria }, estudioA, {
        nombreVisible: "Otro nombre",
        resumen: "Intento sin permiso",
      }),
    ).rejects.toBeInstanceOf(ErrorDominio);

    expect(estudios.actualizarPerfil).not.toHaveBeenCalled();
    expect(auditoria.registrar).not.toHaveBeenCalled();
  });

  it("permite a la empresa editar su perfil y bloquea modo lectura", async () => {
    const empresas = empresasRepoMock();
    const auditoria = auditoriaRepoMock();

    await actualizarPerfilEmpresa(empresaOwner, { empresas, auditoria }, { estudioId: estudioA, empresaId: empresaA }, {
      nombreVisible: "Panaderia La Espiga",
      contactoEmail: "rrhh@espiga.uy",
      resumen: "Actualiza datos visibles",
    });

    expect(empresas.actualizar).toHaveBeenCalledTimes(1);
    expect(auditoria.registrar).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ accion: "perfil_empresa_actualizado" }));

    await expect(
      actualizarPerfilEmpresa(empresaLectura, { empresas, auditoria }, { estudioId: estudioA, empresaId: empresaA }, {
        nombreVisible: "No permitido",
        resumen: "Intento sin permiso",
      }),
    ).rejects.toBeInstanceOf(ErrorDominio);
  });

  it("registra logos de empresa y fotos/logos de estudio con auditoria", async () => {
    const archivosMarca = archivosRepoMock();
    const auditoria = auditoriaRepoMock();

    await registrarArchivoMarcaEstudio(estudioAdmin, { archivosMarca, auditoria }, estudioA, {
      estudioId: estudioA,
      duenoTipo: "estudio",
      tipo: "foto",
      nombreOriginal: "perfil.webp",
      mimeType: "image/webp",
      tamanoBytes: 2048,
      storageKey: "estudios/estudio-a/perfil.webp",
    });

    await registrarArchivoMarcaEmpresa(empresaOwner, { archivosMarca, auditoria }, { estudioId: estudioA, empresaId: empresaA }, {
      estudioId: estudioA,
      empresaId: empresaA,
      duenoTipo: "empresa",
      tipo: "logo",
      nombreOriginal: "logo.jpg",
      mimeType: "image/jpeg",
      tamanoBytes: 2048,
      storageKey: "empresas/empresa-a/logo.jpg",
    });

    expect(archivosMarca.crear).toHaveBeenCalledTimes(2);
    expect(auditoria.registrar).toHaveBeenCalledTimes(2);
  });
});

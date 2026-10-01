import { describe, expect, it, vi } from "vitest";
import type { AccessContext, EmpleadoId, EmpresaId, EstudioId, TenantContext, UsuarioId } from "../src/datos/contexto";
import type { CrearEmpleadoInput, EmpresasRepo, EmpleadosRepo } from "../src/datos/contratos";
import { ErrorDominio } from "../src/datos/errores";
import { crearEmpleado, listarEmpresasEstudio, obtenerEmpleado, obtenerEmpresa } from "../src/acciones";
import type { Empleado, Empresa } from "../src/dominio/types";

const estudioA = "estudio-a" as EstudioId;
const estudioB = "estudio-b" as EstudioId;
const empresaA = "empresa-a" as EmpresaId;
const empresaB = "empresa-b" as EmpresaId;
const empleadoA = "empleado-a" as EmpleadoId;
const usuario = "usuario-1" as UsuarioId;

const systemAdmin: AccessContext = { actorTipo: "sistema", usuarioId: usuario, rol: "system_admin" };
const estudioAdmin: AccessContext = { actorTipo: "estudio", usuarioId: usuario, estudioId: estudioA, rol: "studio_admin", empresasPermitidas: "todas" };
const adminDelegado: AccessContext = {
  actorTipo: "estudio",
  usuarioId: "usuario-estudio-a" as UsuarioId,
  estudioId: estudioA,
  rol: "studio_admin",
  empresasPermitidas: "todas",
  delegadoPor: { usuarioId: usuario, rol: "system_admin", motivo: "Servicio directo de recibos", iniciadaEn: new Date("2026-10-01T10:00:00Z") },
};
const liquidadorLimitado: AccessContext = { actorTipo: "estudio", usuarioId: usuario, estudioId: estudioA, rol: "payroll_operator", empresasPermitidas: [empresaA] };
const empresaOwner: AccessContext = { actorTipo: "empresa", usuarioId: usuario, estudioId: estudioA, empresaId: empresaA, rol: "company_owner" };
const empleadoSelf: AccessContext = { actorTipo: "empleado", usuarioId: usuario, estudioId: estudioA, empresaId: empresaA, empleadoId: empleadoA, rol: "employee_self" };

function empresa(id = empresaA): Empresa {
  return {
    id,
    nombre: "Empresa",
    rut: "123",
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

function empleado(id = empleadoA, empresaId = empresaA): Empleado {
  return {
    id,
    empresaId,
    nombre: "Ana",
    apellido: "Paz",
    ci: "1.234.567-8",
    email: "ana@example.com",
    cargo: "Administrativa",
    categoria: "Administrativo",
    modalidad: "mensual",
    ingreso: "2026-01-01",
    sueldos: [{ desde: "2026-01-01", monto: 50000 }],
    hijos: 0,
    conyugeFonasa: false,
  };
}

function empresasRepoMock(): EmpresasRepo & { ctxs: TenantContext[] } {
  const ctxs: TenantContext[] = [];
  return {
    ctxs,
    listar: vi.fn(async (ctx) => {
      ctxs.push(ctx);
      return [empresa()];
    }),
    obtener: vi.fn(async (ctx, id) => {
      ctxs.push(ctx);
      return empresa(id);
    }),
    crear: vi.fn(async (ctx, input) => {
      ctxs.push(ctx);
      return { ...input, id: input.id ?? empresaA };
    }),
    actualizar: vi.fn(async (ctx, id, input) => {
      ctxs.push(ctx);
      return { ...empresa(id), ...input };
    }),
  };
}

function empleadosRepoMock(): EmpleadosRepo & { ctxs: TenantContext[] } {
  const ctxs: TenantContext[] = [];
  return {
    ctxs,
    listarPorEmpresa: vi.fn(async (ctx, id) => {
      ctxs.push(ctx);
      return [empleado(empleadoA, id)];
    }),
    obtener: vi.fn(async (ctx, id) => {
      ctxs.push(ctx);
      return empleado(id);
    }),
    crear: vi.fn(async (ctx, input) => {
      ctxs.push(ctx);
      return { ...input, id: input.id ?? empleadoA };
    }),
    actualizar: vi.fn(async (ctx, id, input) => {
      ctxs.push(ctx);
      return { ...empleado(id), ...input };
    }),
  };
}

describe("acciones backend con guards", () => {
  it("admin sistema lista empresas usando tenant del estudio objetivo", async () => {
    const repo = empresasRepoMock();

    await listarEmpresasEstudio(systemAdmin, repo, estudioB);

    expect(repo.listar).toHaveBeenCalledTimes(1);
    expect(repo.ctxs[0]).toMatchObject({ estudioId: estudioB, rol: "admin", empresasPermitidas: "todas" });
  });

  it("estudio no puede obtener empresa fuera de su alcance", async () => {
    const repo = empresasRepoMock();

    await expect(obtenerEmpresa(liquidadorLimitado, repo, { estudioId: estudioA, empresaId: empresaB })).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
    expect(repo.obtener).not.toHaveBeenCalled();
  });

  it("empresa solo puede crear empleados de su empresa", async () => {
    const repo = empleadosRepoMock();
    const input: CrearEmpleadoInput = { ...empleado(), id: undefined };

    await crearEmpleado(empresaOwner, repo, { estudioId: estudioA, empresaId: empresaA }, input);

    expect(repo.crear).toHaveBeenCalledTimes(1);
    expect(repo.ctxs[0].empresasPermitidas).toEqual([empresaA]);
  });

  it("estudio puede crear empleados de sus empresas cliente", async () => {
    const repo = empleadosRepoMock();
    const input: CrearEmpleadoInput = { ...empleado(), id: undefined };

    await crearEmpleado(estudioAdmin, repo, { estudioId: estudioA, empresaId: empresaA }, input);

    expect(repo.crear).toHaveBeenCalledTimes(1);
    expect(repo.ctxs[0]).toMatchObject({ estudioId: estudioA, rol: "admin", empresasPermitidas: "todas" });
  });

  it("admin delegado como estudio crea empleados preservando la delegacion en el tenant", async () => {
    const repo = empleadosRepoMock();
    const input: CrearEmpleadoInput = { ...empleado(), id: undefined };

    await crearEmpleado(adminDelegado, repo, { estudioId: estudioA, empresaId: empresaA }, input);

    expect(repo.crear).toHaveBeenCalledTimes(1);
    expect(repo.ctxs[0]).toMatchObject({
      estudioId: estudioA,
      rol: "admin",
      empresasPermitidas: "todas",
      delegadoPor: { usuarioId: usuario, rol: "system_admin", motivo: "Servicio directo de recibos" },
    });
  });

  it("estudio no puede crear empleados en empresas fuera de su alcance", async () => {
    const repo = empleadosRepoMock();
    const input: CrearEmpleadoInput = { ...empleado(), id: undefined };

    await expect(crearEmpleado(liquidadorLimitado, repo, { estudioId: estudioA, empresaId: empresaB }, input)).rejects.toBeInstanceOf(ErrorDominio);
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it("empleado puede obtener solo su propio registro", async () => {
    const repo = empleadosRepoMock();

    await obtenerEmpleado(empleadoSelf, repo, { estudioId: estudioA, empresaId: empresaA, empleadoId: empleadoA });

    expect(repo.obtener).toHaveBeenCalledTimes(1);
    await expect(obtenerEmpleado(empleadoSelf, repo, { estudioId: estudioA, empresaId: empresaA, empleadoId: "otro" as EmpleadoId })).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
  });
});

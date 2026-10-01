import { describe, expect, it, vi } from "vitest";
import type { AccessContext, EmpleadoId, EmpresaId, EstudioId, TenantContext, UsuarioId } from "../src/datos/contexto";
import type {
  AuditoriaRepo,
  CrearEmpleadoInput,
  CrearEmpresaInput,
  CrearEstudioInput,
  EmpleadosRepo,
  EmpresasRepo,
  EstudiosRepo,
  PeriodosRepo,
  UsuariosRepo,
} from "../src/datos/contratos";
import type { AuditEvent, Empleado, Empresa, Periodo } from "../src/dominio/types";
import { crearEmpleadoConAccesoInicial, crearEmpresaConAccesoInicial, crearEstudioConAccesoInicial } from "../src/acciones";

const usuarioAdmin = "usuario-admin" as UsuarioId;
const usuarioEstudio = "usuario-estudio" as UsuarioId;
const estudioA = "estudio-a" as EstudioId;
const empresaA = "empresa-a" as EmpresaId;
const empleadoA = "empleado-a" as EmpleadoId;

const systemAdmin: AccessContext = { actorTipo: "sistema", usuarioId: usuarioAdmin, rol: "system_admin" };
const estudioAdmin: AccessContext = { actorTipo: "estudio", usuarioId: usuarioEstudio, estudioId: estudioA, rol: "studio_admin", empresasPermitidas: "todas" };
const empresaOwner: AccessContext = { actorTipo: "empresa", usuarioId: "usuario-empresa" as UsuarioId, estudioId: estudioA, empresaId: empresaA, rol: "company_owner" };

function estudioInput(): CrearEstudioInput {
  return { id: estudioA, nombre: "Estudio Nuevo", ciudad: "Montevideo", emailContacto: "hola@estudio.uy" };
}

function empresaInput(): CrearEmpresaInput {
  return {
    id: empresaA,
    nombre: "Empresa Nueva",
    rut: "219999990012",
    nroBps: "1234567",
    actividad: "Servicios",
    grupo: 10,
    subgrupo: "01",
    responsableId: "usuario-empresa",
    requiereAprobacion: true,
    contacto: { nombre: "Responsable Empresa", email: "Empresa@Example.COM" },
    tono: "menta",
  };
}

function empleadoInput(): CrearEmpleadoInput {
  return {
    id: empleadoA,
    empresaId: empresaA,
    nombre: "Ana",
    apellido: "Paz",
    ci: "1.234.567-8",
    email: "ANA@EXAMPLE.COM",
    cargo: "Administrativa",
    categoria: "Administrativo",
    modalidad: "mensual",
    ingreso: "2026-01-01",
    sueldos: [{ desde: "2026-01-01", monto: 50000 }],
    hijos: 0,
    conyugeFonasa: false,
  };
}

function auditoriaRepoMock(): AuditoriaRepo {
  return {
    listar: vi.fn(async () => []),
    registrar: vi.fn(async (_ctx: TenantContext, input) => ({ ...input, id: "audit-1", fecha: "2026-10-01T10:00:00Z" }) as AuditEvent),
  };
}

function usuariosRepoMock(): UsuariosRepo {
  return {
    obtener: vi.fn(async () => null),
    crearAcceso: vi.fn(async (input) => ({
      usuarioId: "usuario-creado" as UsuarioId,
      estado: "invitado",
      ...input,
    })),
  };
}

function estudiosRepoMock(): EstudiosRepo {
  return {
    crear: vi.fn(async (input) => ({ ...input, id: input.id ?? estudioA, creado: input.creado ?? "2026-10-01T10:00:00Z" })),
    obtener: vi.fn(async () => null),
    actualizarPerfil: vi.fn(),
  };
}

function empresasRepoMock(): EmpresasRepo {
  return {
    listar: vi.fn(async () => []),
    obtener: vi.fn(async () => null),
    crear: vi.fn(async (_ctx, input) => ({ ...input, id: input.id ?? empresaA }) as Empresa),
    actualizar: vi.fn(),
  };
}

function periodoInicial(): Omit<Periodo, "empresaId"> {
  return {
    id: "periodo-a",
    mes: "2026-09",
    etapa: "novedades",
    fechaObjetivo: "2026-09-28",
    sinNovedades: false,
    versiones: [],
    advertenciasAceptadas: {},
    bps: "pendiente",
    rectificaciones: [],
    notas: [],
  };
}

function periodosRepoMock(): PeriodosRepo {
  return {
    listarPorEmpresa: vi.fn(async () => []),
    obtener: vi.fn(async () => null),
    guardar: vi.fn(async (_ctx, input) => input),
  };
}

function empleadosRepoMock(): EmpleadosRepo {
  return {
    listarPorEmpresa: vi.fn(async () => []),
    obtener: vi.fn(async () => null),
    crear: vi.fn(async (_ctx, input) => ({ ...input, id: input.id ?? empleadoA }) as Empleado),
    actualizar: vi.fn(),
  };
}

describe("altas con acceso inicial", () => {
  it("admin sistema crea estudio con usuario duenio invitado", async () => {
    const repos = { estudios: estudiosRepoMock(), usuarios: usuariosRepoMock(), auditoria: auditoriaRepoMock() };

    const res = await crearEstudioConAccesoInicial(systemAdmin, repos, {
      estudio: estudioInput(),
      dueno: { nombre: " Duena Estudio ", email: "DUENA@ESTUDIO.UY" },
    });

    expect(res.estudio.id).toBe(estudioA);
    expect(repos.usuarios.crearAcceso).toHaveBeenCalledWith(expect.objectContaining({ email: "duena@estudio.uy", rol: "studio_owner", estudioId: estudioA }));
    expect(repos.auditoria.registrar).toHaveBeenCalledWith(expect.objectContaining({ estudioId: estudioA }), expect.objectContaining({ accion: "estudio_alta_inicial" }));
  });

  it("estudio crea empresa con usuario company_owner", async () => {
    const repos = { empresas: empresasRepoMock(), usuarios: usuariosRepoMock(), auditoria: auditoriaRepoMock(), periodos: periodosRepoMock() };

    const res = await crearEmpresaConAccesoInicial(estudioAdmin, repos, estudioA, {
      empresa: empresaInput(),
      usuarioEmpresa: { nombre: "Responsable Empresa", email: "RESPONSABLE@EMPRESA.UY" },
      periodoInicial: periodoInicial(),
    });

    expect(repos.empresas.crear).toHaveBeenCalledTimes(1);
    expect(res.periodo?.empresaId).toBe(empresaA);
    expect(repos.periodos.guardar).toHaveBeenCalledWith(expect.objectContaining({ estudioId: estudioA, empresasPermitidas: "todas" }), expect.objectContaining({ empresaId: empresaA, mes: "2026-09" }));
    expect(repos.usuarios.crearAcceso).toHaveBeenCalledWith(expect.objectContaining({ rol: "company_owner", estudioId: estudioA, empresaId: empresaA }));
    expect(repos.auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ estudioId: estudioA }),
      expect.objectContaining({ accion: "empresa_alta_inicial", empresaId: empresaA, detalle: expect.stringContaining("periodo inicial 2026-09") }),
    );
  });

  it("empresa crea empleado con usuario employee_self", async () => {
    const repos = { empleados: empleadosRepoMock(), usuarios: usuariosRepoMock(), auditoria: auditoriaRepoMock() };

    await crearEmpleadoConAccesoInicial(empresaOwner, repos, { estudioId: estudioA, empresaId: empresaA }, { empleado: empleadoInput() });

    expect(repos.empleados.crear).toHaveBeenCalledTimes(1);
    expect(repos.usuarios.crearAcceso).toHaveBeenCalledWith(expect.objectContaining({ email: "ana@example.com", rol: "employee_self", empleadoId: empleadoA }));
    expect(repos.auditoria.registrar).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ accion: "empleado_alta_inicial" }));
  });

  it("rechaza emails invalidos y empleados en otra empresa", async () => {
    const reposEstudio = { estudios: estudiosRepoMock(), usuarios: usuariosRepoMock(), auditoria: auditoriaRepoMock() };
    await expect(
      crearEstudioConAccesoInicial(systemAdmin, reposEstudio, { estudio: estudioInput(), dueno: { nombre: "A", email: "mal" } }),
    ).rejects.toMatchObject({ codigo: "VALIDACION" });

    const reposEmpleado = { empleados: empleadosRepoMock(), usuarios: usuariosRepoMock(), auditoria: auditoriaRepoMock() };
    await expect(
      crearEmpleadoConAccesoInicial(empresaOwner, reposEmpleado, { estudioId: estudioA, empresaId: empresaA }, { empleado: { ...empleadoInput(), empresaId: "otra" as EmpresaId } }),
    ).rejects.toMatchObject({ codigo: "VALIDACION" });
  });

  it("no permite que empresa cree otra empresa ni que estudio cree otro estudio", async () => {
    const reposEmpresa = { empresas: empresasRepoMock(), usuarios: usuariosRepoMock(), auditoria: auditoriaRepoMock() };
    await expect(
      crearEmpresaConAccesoInicial(empresaOwner, reposEmpresa, estudioA, {
        empresa: empresaInput(),
        usuarioEmpresa: { nombre: "Responsable", email: "responsable@empresa.uy" },
      }),
    ).rejects.toMatchObject({ codigo: "SIN_PERMISO" });

    const reposEstudio = { estudios: estudiosRepoMock(), usuarios: usuariosRepoMock(), auditoria: auditoriaRepoMock() };
    await expect(
      crearEstudioConAccesoInicial(estudioAdmin, reposEstudio, {
        estudio: estudioInput(),
        dueno: { nombre: "Dueno", email: "dueno@estudio.uy" },
      }),
    ).rejects.toMatchObject({ codigo: "SIN_PERMISO" });
  });
});

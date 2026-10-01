import type { AccessContext, EmpleadoId, EmpresaId, EstudioId } from "../datos/contexto";
import type {
  AccesoInicialInput,
  AuditoriaRepo,
  CrearEmpleadoInput,
  CrearEmpresaInput,
  CrearEstudioInput,
  EmpleadosRepo,
  EmpresasRepo,
  EstudiosRepo,
  PeriodosRepo,
  UsuariosRepo,
} from "../datos/contratos";
import type { Periodo } from "../dominio/types";
import { validacion } from "../datos/errores";
import { exigirAltaEmpleado, exigirAltaEmpresa, exigirAltaEstudio } from "../permisos";
import { tenantParaEmpresa, tenantParaEstudio } from "./contexto";

const EMAIL_SIMPLE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CrearEstudioConAccesoInput {
  estudio: CrearEstudioInput;
  dueno: AccesoInicialInput;
}

export interface CrearEmpresaConAccesoInput {
  empresa: CrearEmpresaInput;
  usuarioEmpresa: AccesoInicialInput;
  periodoInicial?: Omit<Periodo, "empresaId">;
}

export interface CrearEmpleadoConAccesoInput {
  empleado: CrearEmpleadoInput;
  usuarioEmpleado?: AccesoInicialInput;
}

function limpiarTexto(valor: string, campo: string) {
  const limpio = valor.trim();
  if (limpio.length < 2) validacion(`${campo} debe tener al menos 2 caracteres`);
  return limpio;
}

function normalizarAcceso(input: AccesoInicialInput): AccesoInicialInput {
  const nombre = limpiarTexto(input.nombre, "El nombre del usuario");
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_SIMPLE.test(email)) validacion("El email del usuario no es valido");
  return { nombre, email };
}

function assertEmpresaCoherente(empresa: CrearEmpresaInput) {
  if (!empresa.nombre.trim()) validacion("La empresa necesita nombre");
  if (!empresa.rut.trim()) validacion("La empresa necesita RUT");
  if (!empresa.contacto.email.trim()) validacion("La empresa necesita email de contacto");
  return empresa;
}

function assertEmpleadoCoherente(empresaId: EmpresaId, empleado: CrearEmpleadoInput) {
  if (empleado.empresaId !== empresaId) validacion("El empleado debe pertenecer a la empresa indicada");
  if (!empleado.nombre.trim() || !empleado.apellido.trim()) validacion("El empleado necesita nombre y apellido");
  if (!empleado.email.trim()) validacion("El empleado necesita email para darle acceso");
  return empleado;
}

export async function crearEstudioConAccesoInicial(
  ctx: AccessContext,
  repos: { estudios: EstudiosRepo; usuarios: UsuariosRepo; auditoria: AuditoriaRepo },
  input: CrearEstudioConAccesoInput,
) {
  exigirAltaEstudio(ctx);
  const dueno = normalizarAcceso(input.dueno);
  const estudio = await repos.estudios.crear({ ...input.estudio, nombre: limpiarTexto(input.estudio.nombre, "El estudio") });
  const usuario = await repos.usuarios.crearAcceso({
    ...dueno,
    rol: "studio_owner",
    estudioId: estudio.id,
    creadoPorUsuarioId: ctx.usuarioId,
  });
  await repos.auditoria.registrar(tenantParaEstudio(ctx, estudio.id), {
    actor: ctx.usuarioId,
    entidad: "Estudio",
    entidadId: estudio.id,
    accion: "estudio_alta_inicial",
    detalle: `Alta de estudio con usuario dueno ${usuario.email}`,
  });
  return { estudio, usuario };
}

export async function crearEmpresaConAccesoInicial(
  ctx: AccessContext,
  repos: { empresas: EmpresasRepo; usuarios: UsuariosRepo; auditoria: AuditoriaRepo; periodos?: PeriodosRepo },
  estudioId: EstudioId,
  input: CrearEmpresaConAccesoInput,
) {
  exigirAltaEmpresa(ctx, { estudioId });
  const usuarioEmpresa = normalizarAcceso(input.usuarioEmpresa);
  const empresaInput = assertEmpresaCoherente(input.empresa);
  const empresa = await repos.empresas.crear(tenantParaEstudio(ctx, estudioId), empresaInput);
  const empresaId = empresa.id as EmpresaId;
  const periodo = input.periodoInicial
    ? await repos.periodos?.guardar(tenantParaEmpresa(ctx, estudioId, empresaId), {
        ...input.periodoInicial,
        empresaId,
      })
    : undefined;
  const usuario = await repos.usuarios.crearAcceso({
    ...usuarioEmpresa,
    rol: "company_owner",
    estudioId,
    empresaId,
    creadoPorUsuarioId: ctx.usuarioId,
  });
  await repos.auditoria.registrar(tenantParaEmpresa(ctx, estudioId, empresaId), {
    actor: ctx.usuarioId,
    empresaId,
    entidad: "Empresa",
    entidadId: empresa.id,
    accion: "empresa_alta_inicial",
    detalle: periodo ? `Alta de empresa con usuario responsable ${usuario.email} y periodo inicial ${periodo.mes}` : `Alta de empresa con usuario responsable ${usuario.email}`,
  });
  return { empresa, usuario, periodo };
}

export async function crearEmpleadoConAccesoInicial(
  ctx: AccessContext,
  repos: { empleados: EmpleadosRepo; usuarios: UsuariosRepo; auditoria: AuditoriaRepo },
  recurso: { estudioId: EstudioId; empresaId: EmpresaId },
  input: CrearEmpleadoConAccesoInput,
) {
  exigirAltaEmpleado(ctx, recurso);
  const empleadoInput = assertEmpleadoCoherente(recurso.empresaId, input.empleado);
  const usuarioEmpleado = normalizarAcceso(input.usuarioEmpleado ?? { nombre: `${empleadoInput.nombre} ${empleadoInput.apellido}`, email: empleadoInput.email });
  const empleado = await repos.empleados.crear(tenantParaEmpresa(ctx, recurso.estudioId, recurso.empresaId), empleadoInput);
  const usuario = await repos.usuarios.crearAcceso({
    ...usuarioEmpleado,
    rol: "employee_self",
    estudioId: recurso.estudioId,
    empresaId: recurso.empresaId,
    empleadoId: empleado.id as EmpleadoId,
    creadoPorUsuarioId: ctx.usuarioId,
  });
  await repos.auditoria.registrar(tenantParaEmpresa(ctx, recurso.estudioId, recurso.empresaId), {
    actor: ctx.usuarioId,
    empresaId: recurso.empresaId,
    entidad: "Empleado",
    entidadId: empleado.id,
    accion: "empleado_alta_inicial",
    detalle: `Alta de empleado con usuario ${usuario.email}`,
  });
  return { empleado, usuario };
}

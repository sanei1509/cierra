import type { AuditEvent, Empleado, Empresa, Novedad, Periodo, Usuario } from "../dominio/types";
import type { AuditEventId, EmpleadoId, EmpresaId, EstudioId, NovedadId, PeriodoId, TenantContext, UsuarioId } from "./contexto";

export interface Estudio {
  id: EstudioId;
  nombre: string;
  ciudad?: string;
  creado: string;
}

export interface CrearEmpresaInput extends Omit<Empresa, "id"> {
  id?: EmpresaId;
}

export interface ActualizarEmpresaInput extends Partial<Omit<Empresa, "id">> {
  resumen: string;
}

export interface CrearEmpleadoInput extends Omit<Empleado, "id"> {
  id?: EmpleadoId;
}

export interface ActualizarEmpleadoInput extends Partial<Omit<Empleado, "id" | "empresaId">> {
  resumen: string;
}

export interface CrearNovedadInput extends Omit<Novedad, "id" | "fecha"> {
  id?: NovedadId;
  fecha?: string;
}

export interface CrearAuditEventInput extends Omit<AuditEvent, "id" | "fecha" | "empresaId"> {
  id?: AuditEventId;
  fecha?: string;
  empresaId?: EmpresaId;
}

export interface EstudiosRepo {
  obtener(ctx: Pick<TenantContext, "estudioId">): Promise<Estudio | null>;
}

export interface UsuariosRepo {
  obtener(ctx: TenantContext, usuarioId: UsuarioId): Promise<Usuario | null>;
}

export interface EmpresasRepo {
  listar(ctx: TenantContext): Promise<Empresa[]>;
  obtener(ctx: TenantContext, empresaId: EmpresaId): Promise<Empresa | null>;
  crear(ctx: TenantContext, input: CrearEmpresaInput): Promise<Empresa>;
  actualizar(ctx: TenantContext, empresaId: EmpresaId, input: ActualizarEmpresaInput): Promise<Empresa>;
}

export interface EmpleadosRepo {
  listarPorEmpresa(ctx: TenantContext, empresaId: EmpresaId): Promise<Empleado[]>;
  obtener(ctx: TenantContext, empleadoId: EmpleadoId): Promise<Empleado | null>;
  crear(ctx: TenantContext, input: CrearEmpleadoInput): Promise<Empleado>;
  actualizar(ctx: TenantContext, empleadoId: EmpleadoId, input: ActualizarEmpleadoInput): Promise<Empleado>;
}

export interface PeriodosRepo {
  listarPorEmpresa(ctx: TenantContext, empresaId: EmpresaId): Promise<Periodo[]>;
  obtener(ctx: TenantContext, periodoId: PeriodoId): Promise<Periodo | null>;
  guardar(ctx: TenantContext, periodo: Periodo): Promise<Periodo>;
}

export interface NovedadesRepo {
  listarPorPeriodo(ctx: TenantContext, periodoId: PeriodoId): Promise<Novedad[]>;
  crear(ctx: TenantContext, input: CrearNovedadInput): Promise<Novedad>;
  borrar(ctx: TenantContext, novedadId: NovedadId): Promise<void>;
}

export interface AuditoriaRepo {
  listar(ctx: TenantContext, filtros?: { empresaId?: EmpresaId; limite?: number }): Promise<AuditEvent[]>;
  registrar(ctx: TenantContext, input: CrearAuditEventInput): Promise<AuditEvent>;
}

export interface DatosRepos {
  estudios: EstudiosRepo;
  usuarios: UsuariosRepo;
  empresas: EmpresasRepo;
  empleados: EmpleadosRepo;
  periodos: PeriodosRepo;
  novedades: NovedadesRepo;
  auditoria: AuditoriaRepo;
}

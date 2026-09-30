import type { AuditEvent, Empleado, Empresa, Novedad, Periodo, Usuario } from "../dominio/types";
import type { AuditEventId, EmpleadoId, EmpresaId, EstudioId, NovedadId, PeriodoId, TenantContext, UsuarioId } from "./contexto";
import type { CodigoModulo, ModuloCatalogo } from "../modulos";
import type { CrearSuscripcionEstudioInput, SuscripcionEstudio } from "../facturacion";

export interface Estudio {
  id: EstudioId;
  nombre: string;
  nombreVisible?: string;
  razonSocial?: string;
  rut?: string;
  ciudad?: string;
  telefono?: string;
  emailContacto?: string;
  logoArchivoId?: string;
  fotoArchivoId?: string;
  creado: string;
}

export type DuenoArchivoMarca = "estudio" | "empresa" | "empleado";
export type TipoArchivoMarca = "logo" | "foto";

export interface ArchivoMarca {
  id: string;
  estudioId: EstudioId;
  empresaId?: EmpresaId;
  empleadoId?: EmpleadoId;
  duenoTipo: DuenoArchivoMarca;
  tipo: TipoArchivoMarca;
  nombreOriginal: string;
  mimeType: string;
  tamanoBytes: number;
  storageKey: string;
  checksumSha256?: string;
  creadoPorUsuarioId?: UsuarioId;
  creado: string;
}

export interface CrearArchivoMarcaInput extends Omit<ArchivoMarca, "id" | "creado" | "creadoPorUsuarioId"> {
  id?: string;
  creado?: string;
  creadoPorUsuarioId?: UsuarioId;
}

export interface ActualizarPerfilEstudioInput {
  nombreVisible?: string;
  razonSocial?: string;
  rut?: string;
  ciudad?: string;
  telefono?: string;
  emailContacto?: string;
  logoArchivoId?: string;
  fotoArchivoId?: string;
  resumen: string;
}

export interface ActualizarPerfilEmpresaInput extends Pick<ActualizarEmpresaInput, "resumen"> {
  nombreVisible?: string;
  razonSocial?: string;
  rut?: string;
  contactoNombre?: string;
  contactoEmail?: string;
  contactoTelefono?: string;
  direccion?: string;
  logoArchivoId?: string;
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
  actualizarPerfil(ctx: TenantContext, input: ActualizarPerfilEstudioInput): Promise<Estudio>;
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

export interface ArchivosMarcaRepo {
  crear(ctx: TenantContext, input: CrearArchivoMarcaInput): Promise<ArchivoMarca>;
  obtener(ctx: TenantContext, archivoId: string): Promise<ArchivoMarca | null>;
}

export interface ModulosRepo {
  listarCatalogo(): Promise<ModuloCatalogo[]>;
  listarActivos(): Promise<ModuloCatalogo[]>;
  obtenerPorCodigo(codigo: CodigoModulo): Promise<ModuloCatalogo | null>;
}

export interface SuscripcionesRepo {
  obtenerVigente(estudioId: EstudioId): Promise<SuscripcionEstudio | null>;
  crearOActualizar(estudioId: EstudioId, input: CrearSuscripcionEstudioInput): Promise<SuscripcionEstudio>;
}

export interface DatosRepos {
  estudios: EstudiosRepo;
  usuarios: UsuariosRepo;
  empresas: EmpresasRepo;
  empleados: EmpleadosRepo;
  periodos: PeriodosRepo;
  novedades: NovedadesRepo;
  auditoria: AuditoriaRepo;
  archivosMarca: ArchivosMarcaRepo;
  modulos: ModulosRepo;
  suscripciones: SuscripcionesRepo;
}

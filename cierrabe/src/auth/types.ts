import type {
  AccessContext,
  EmpleadoId,
  EmpresaId,
  EstudioId,
  RolAcceso,
  UsuarioId,
} from "../datos/contexto";

export type EstadoUsuario = "invitado" | "activo" | "suspendido";
export type MetodoLogin = "password" | "magic_link" | "google" | "microsoft";
export type PreferenciaTema = "system" | "light" | "dark";

export interface UsuarioAuth {
  id: UsuarioId;
  email: string;
  nombre: string;
  estado: EstadoUsuario;
  temaPreferido: PreferenciaTema;
  mfaActivo: boolean;
}

export type EspacioAcceso =
  | { actorTipo: "sistema"; rol: Extract<RolAcceso, "system_admin" | "support_admin"> }
  | {
      actorTipo: "estudio";
      estudioId: EstudioId;
      rol: Extract<RolAcceso, "studio_owner" | "studio_admin" | "payroll_operator" | "studio_readonly">;
      empresasPermitidas: EmpresaId[] | "todas";
    }
  | {
      actorTipo: "empresa";
      estudioId: EstudioId;
      empresaId: EmpresaId;
      rol: Extract<RolAcceso, "company_owner" | "company_operator" | "company_readonly">;
    }
  | {
      actorTipo: "empleado";
      estudioId: EstudioId;
      empresaId: EmpresaId;
      empleadoId: EmpleadoId;
      rol: "employee_self";
    };

export interface SesionAutenticada {
  usuario: UsuarioAuth;
  metodo: MetodoLogin;
  expira: Date;
  espacio: EspacioAcceso;
}

export interface AuthContext {
  usuario: UsuarioAuth;
  metodo: MetodoLogin;
  expira: Date;
  acceso: AccessContext;
}

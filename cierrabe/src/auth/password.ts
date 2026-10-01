import type { UsuarioId } from "../datos/contexto";
import { noAutenticado, sinPermiso } from "../datos/errores";
import { normalizarEmail, verificarPassword } from "./seguridad";
import type { AuthPasswordRepo, EspacioAcceso, SesionAutenticada } from "./types";

export interface LoginPasswordInput {
  email: string;
  password: string;
}

export interface LoginPasswordOpciones {
  ahora?: Date;
  duracionMs?: number;
  adminSistemaUsuarioId?: UsuarioId;
}

const DURACION_SESION_MS = 8 * 60 * 60 * 1000;
const MENSAJE_CREDENCIALES_INVALIDAS = "Email o contrasena invalidos";

function espaciosDisponibles(espacios: EspacioAcceso[], usuarioId: UsuarioId, adminSistemaUsuarioId?: UsuarioId) {
  const accesos = [...espacios];
  if (adminSistemaUsuarioId && usuarioId === adminSistemaUsuarioId) {
    accesos.unshift({ actorTipo: "sistema", rol: "system_admin" });
  }
  return accesos;
}

export async function autenticarConPassword(
  repo: AuthPasswordRepo,
  input: LoginPasswordInput,
  opciones: LoginPasswordOpciones = {},
): Promise<SesionAutenticada> {
  const email = normalizarEmail(input.email);
  const password = input.password;
  if (!password) noAutenticado(MENSAJE_CREDENCIALES_INVALIDAS);

  const credenciales = await repo.obtenerPorEmail(email);
  if (!credenciales?.passwordHash || !verificarPassword(password, credenciales.passwordHash)) {
    noAutenticado(MENSAJE_CREDENCIALES_INVALIDAS);
  }

  if (credenciales.usuario.estado === "suspendido") {
    sinPermiso("El usuario esta suspendido");
  }

  const espacios = espaciosDisponibles(credenciales.espacios, credenciales.usuario.id, opciones.adminSistemaUsuarioId);
  const espacio = espacios[0];
  if (!espacio) noAutenticado("El usuario no tiene un acceso habilitado");

  const ahora = opciones.ahora ?? new Date();
  await repo.registrarUltimoAcceso(credenciales.usuario.id, ahora);

  return {
    usuario: credenciales.usuario,
    metodo: "password",
    expira: new Date(ahora.getTime() + (opciones.duracionMs ?? DURACION_SESION_MS)),
    espacio,
  };
}

import type { AccessContext } from "../datos/contexto";
import { noAutenticado, sinPermiso } from "../datos/errores";
import type { AuthContext, SesionAutenticada } from "./types";

export function resolverAccessContext(sesion: SesionAutenticada): AccessContext {
  const { usuario, espacio } = sesion;
  if (usuario.estado === "suspendido") sinPermiso("El usuario esta suspendido");
  if (sesion.expira.getTime() <= Date.now()) noAutenticado("La sesion expiro");

  if (espacio.actorTipo === "sistema") {
    return { actorTipo: "sistema", usuarioId: usuario.id, rol: espacio.rol };
  }
  if (espacio.actorTipo === "estudio") {
    return {
      actorTipo: "estudio",
      usuarioId: usuario.id,
      estudioId: espacio.estudioId,
      rol: espacio.rol,
      empresasPermitidas: espacio.empresasPermitidas,
      delegadoPor: espacio.delegadoPor,
    };
  }
  if (espacio.actorTipo === "empresa") {
    return {
      actorTipo: "empresa",
      usuarioId: usuario.id,
      estudioId: espacio.estudioId,
      empresaId: espacio.empresaId,
      rol: espacio.rol,
    };
  }
  return {
    actorTipo: "empleado",
    usuarioId: usuario.id,
    estudioId: espacio.estudioId,
    empresaId: espacio.empresaId,
    empleadoId: espacio.empleadoId,
    rol: espacio.rol,
  };
}

export function crearAuthContext(sesion: SesionAutenticada): AuthContext {
  return {
    usuario: sesion.usuario,
    metodo: sesion.metodo,
    expira: sesion.expira,
    acceso: resolverAccessContext(sesion),
  };
}

export type CodigoErrorDominio =
  | "NO_AUTENTICADO"
  | "SIN_PERMISO"
  | "NO_ENCONTRADO"
  | "CONFLICTO"
  | "VALIDACION"
  | "FUERA_DE_ALCANCE"
  | "MODULO_NO_CONTRATADO"
  | "SUSCRIPCION_INACTIVA";

export class ErrorDominio extends Error {
  constructor(
    public readonly codigo: CodigoErrorDominio,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ErrorDominio";
  }
}

export function sinPermiso(message = "No tenes permiso para realizar esta accion", details?: unknown): never {
  throw new ErrorDominio("SIN_PERMISO", message, details);
}

export function noAutenticado(message = "Tenes que iniciar sesion para continuar", details?: unknown): never {
  throw new ErrorDominio("NO_AUTENTICADO", message, details);
}

export function noEncontrado(message = "No encontramos el recurso solicitado", details?: unknown): never {
  throw new ErrorDominio("NO_ENCONTRADO", message, details);
}

export function validacion(message: string, details?: unknown): never {
  throw new ErrorDominio("VALIDACION", message, details);
}

export function moduloNoContratado(message = "Este modulo no esta incluido en tu plan", details?: unknown): never {
  throw new ErrorDominio("MODULO_NO_CONTRATADO", message, details);
}

export function suscripcionInactiva(message = "La cuenta no esta activa para usar esta funcion", details?: unknown): never {
  throw new ErrorDominio("SUSCRIPCION_INACTIVA", message, details);
}

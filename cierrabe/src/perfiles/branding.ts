import { validacion } from "../datos/errores";
import type {
  ActualizarPerfilEmpresaInput,
  ActualizarPerfilEstudioInput,
  CrearArchivoMarcaInput,
  DuenoArchivoMarca,
  TipoArchivoMarca,
} from "../datos/contratos";

export const MIME_IMAGEN_MARCA = ["image/png", "image/jpeg", "image/webp"] as const;
export const MAX_ARCHIVO_MARCA_BYTES = 2 * 1024 * 1024;

const STORAGE_KEY_SEGURA = /^[a-zA-Z0-9][a-zA-Z0-9/_\-.]*$/;

function textoOpcional(valor: string | undefined) {
  const normalizado = valor?.trim();
  return normalizado ? normalizado : undefined;
}

function textoRequerido(valor: string, campo: string) {
  const normalizado = valor.trim();
  if (!normalizado) {
    validacion(`${campo} no puede quedar vacio`);
  }
  return normalizado;
}

function emailOpcional(valor: string | undefined) {
  const normalizado = textoOpcional(valor);
  if (normalizado && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizado)) {
    validacion("El email de contacto no tiene un formato valido");
  }
  return normalizado;
}

function rutOpcional(valor: string | undefined) {
  const normalizado = textoOpcional(valor);
  if (normalizado && !/^[0-9.\-]{8,20}$/.test(normalizado)) {
    validacion("El RUT debe tener solo numeros, puntos o guiones");
  }
  return normalizado;
}

export function validarArchivoMarca(input: CrearArchivoMarcaInput): CrearArchivoMarcaInput {
  if (!MIME_IMAGEN_MARCA.includes(input.mimeType as (typeof MIME_IMAGEN_MARCA)[number])) {
    validacion("El archivo de marca debe ser PNG, JPG o WebP");
  }

  if (!Number.isInteger(input.tamanoBytes) || input.tamanoBytes <= 0 || input.tamanoBytes > MAX_ARCHIVO_MARCA_BYTES) {
    validacion("El archivo de marca supera el tamano permitido de 2 MB");
  }

  if (!STORAGE_KEY_SEGURA.test(input.storageKey) || input.storageKey.includes("..")) {
    validacion("La ubicacion del archivo de marca no es valida");
  }

  if (input.tipo === "logo" && input.duenoTipo === "empleado") {
    validacion("Los empleados pueden tener foto, no logo");
  }

  if (input.tipo === "foto" && input.duenoTipo === "empresa") {
    validacion("Las empresas pueden tener logo, no foto");
  }

  return {
    ...input,
    nombreOriginal: textoRequerido(input.nombreOriginal, "El nombre del archivo"),
    storageKey: input.storageKey.trim(),
    checksumSha256: textoOpcional(input.checksumSha256),
  };
}

export function validarTipoArchivoMarca(duenoTipo: DuenoArchivoMarca, tipo: TipoArchivoMarca) {
  validarArchivoMarca({
    estudioId: "validacion" as never,
    duenoTipo,
    tipo,
    nombreOriginal: "validacion.png",
    mimeType: "image/png",
    tamanoBytes: 1,
    storageKey: "validacion/archivo.png",
  });
}

export function normalizarPerfilEstudio(input: ActualizarPerfilEstudioInput): ActualizarPerfilEstudioInput {
  return {
    ...input,
    nombreVisible: textoOpcional(input.nombreVisible),
    razonSocial: textoOpcional(input.razonSocial),
    rut: rutOpcional(input.rut),
    ciudad: textoOpcional(input.ciudad),
    telefono: textoOpcional(input.telefono),
    emailContacto: emailOpcional(input.emailContacto),
    logoArchivoId: textoOpcional(input.logoArchivoId),
    fotoArchivoId: textoOpcional(input.fotoArchivoId),
    resumen: textoRequerido(input.resumen, "El resumen"),
  };
}

export function normalizarPerfilEmpresa(input: ActualizarPerfilEmpresaInput): ActualizarPerfilEmpresaInput {
  return {
    ...input,
    nombreVisible: textoOpcional(input.nombreVisible),
    razonSocial: textoOpcional(input.razonSocial),
    rut: rutOpcional(input.rut),
    contactoNombre: textoOpcional(input.contactoNombre),
    contactoEmail: emailOpcional(input.contactoEmail),
    contactoTelefono: textoOpcional(input.contactoTelefono),
    direccion: textoOpcional(input.direccion),
    logoArchivoId: textoOpcional(input.logoArchivoId),
    resumen: textoRequerido(input.resumen, "El resumen"),
  };
}

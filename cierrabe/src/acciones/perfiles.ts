import type { AccessContext, EmpresaId, EstudioId } from "../datos/contexto";
import type {
  ActualizarPerfilEmpresaInput,
  ActualizarPerfilEstudioInput,
  ArchivosMarcaRepo,
  AuditoriaRepo,
  CrearArchivoMarcaInput,
  EmpresasRepo,
  EstudiosRepo,
} from "../datos/contratos";
import { exigirEmpresa, exigirEstudio } from "../permisos";
import { normalizarPerfilEmpresa, normalizarPerfilEstudio, validarArchivoMarca } from "../perfiles";
import { tenantParaEmpresa, tenantParaEstudio } from "./contexto";
import { registrarAuditoria } from "./auditoria";

export async function actualizarPerfilEstudio(
  ctx: AccessContext,
  repos: { estudios: EstudiosRepo; auditoria: AuditoriaRepo },
  estudioId: EstudioId,
  input: ActualizarPerfilEstudioInput,
) {
  exigirEstudio(ctx, "configurar", { estudioId });
  const perfil = normalizarPerfilEstudio(input);
  const actualizado = await repos.estudios.actualizarPerfil(tenantParaEstudio(ctx, estudioId), perfil);

  await registrarAuditoria(ctx, repos.auditoria, estudioId, {
    actor: ctx.usuarioId,
    entidad: "Estudio",
    entidadId: estudioId,
    accion: "perfil_estudio_actualizado",
    detalle: perfil.resumen,
    despues: JSON.stringify(perfil),
  });

  return actualizado;
}

export async function actualizarPerfilEmpresa(
  ctx: AccessContext,
  repos: { empresas: EmpresasRepo; auditoria: AuditoriaRepo },
  recurso: { estudioId: EstudioId; empresaId: EmpresaId },
  input: ActualizarPerfilEmpresaInput,
) {
  exigirEmpresa(ctx, "editar", recurso);
  const perfil = normalizarPerfilEmpresa(input);
  const actualizado = await repos.empresas.actualizar(tenantParaEmpresa(ctx, recurso.estudioId, recurso.empresaId), recurso.empresaId, perfil);

  await registrarAuditoria(ctx, repos.auditoria, recurso.estudioId, {
    actor: ctx.usuarioId,
    empresaId: recurso.empresaId,
    entidad: "Empresa",
    entidadId: recurso.empresaId,
    accion: "perfil_empresa_actualizado",
    detalle: perfil.resumen,
    despues: JSON.stringify(perfil),
  });

  return actualizado;
}

export async function registrarArchivoMarcaEstudio(
  ctx: AccessContext,
  repos: { archivosMarca: ArchivosMarcaRepo; auditoria: AuditoriaRepo },
  estudioId: EstudioId,
  input: CrearArchivoMarcaInput,
) {
  exigirEstudio(ctx, "configurar", { estudioId });
  const archivo = validarArchivoMarca({ ...input, estudioId, duenoTipo: "estudio" });
  const creado = await repos.archivosMarca.crear(tenantParaEstudio(ctx, estudioId), archivo);

  await registrarAuditoria(ctx, repos.auditoria, estudioId, {
    actor: ctx.usuarioId,
    entidad: "ArchivoMarca",
    entidadId: creado.id,
    accion: "archivo_marca_estudio_registrado",
    detalle: `${creado.tipo}: ${creado.nombreOriginal}`,
    despues: JSON.stringify({ id: creado.id, tipo: creado.tipo, mimeType: creado.mimeType, tamanoBytes: creado.tamanoBytes }),
  });

  return creado;
}

export async function registrarArchivoMarcaEmpresa(
  ctx: AccessContext,
  repos: { archivosMarca: ArchivosMarcaRepo; auditoria: AuditoriaRepo },
  recurso: { estudioId: EstudioId; empresaId: EmpresaId },
  input: CrearArchivoMarcaInput,
) {
  exigirEmpresa(ctx, "editar", recurso);
  const archivo = validarArchivoMarca({ ...input, estudioId: recurso.estudioId, empresaId: recurso.empresaId, duenoTipo: "empresa", tipo: "logo" });
  const creado = await repos.archivosMarca.crear(tenantParaEmpresa(ctx, recurso.estudioId, recurso.empresaId), archivo);

  await registrarAuditoria(ctx, repos.auditoria, recurso.estudioId, {
    actor: ctx.usuarioId,
    empresaId: recurso.empresaId,
    entidad: "ArchivoMarca",
    entidadId: creado.id,
    accion: "archivo_marca_empresa_registrado",
    detalle: `${creado.tipo}: ${creado.nombreOriginal}`,
    despues: JSON.stringify({ id: creado.id, tipo: creado.tipo, mimeType: creado.mimeType, tamanoBytes: creado.tamanoBytes }),
  });

  return creado;
}

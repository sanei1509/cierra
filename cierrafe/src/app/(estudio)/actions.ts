"use server";

import { revalidatePath } from "next/cache";
import {
  actualizarEmpleado as actualizarEmpleadoBackend,
  actualizarEmpresa as actualizarEmpresaBackend,
  crearEmpleado as crearEmpleadoBackend,
  crearEmpleadoConAccesoInicial,
  crearEmpresaConAccesoInicial,
} from "cierrabe/acciones";
import { tenantContextDesdeAcceso, type EmpleadoId, type EmpresaId, type NovedadId, type PeriodoId } from "cierrabe/datos/contexto";
import { crearAuditoriaRepo, crearEmpleadosRepo, crearEmpresasRepo, crearNovedadesRepo, crearPeriodosRepo, crearReciboVistasRepo, crearUsuariosRepo } from "cierrabe/datos/repos";
import { contextoEstudioDesarrollo, uuidValido } from "@/lib/backend-dev-context";
import { contextoOperativoActual } from "@/lib/backend-operativo";
import { obtenerSesionDev } from "@/lib/dev-auth";
import { calcularEmpresa, hashDe } from "@/lib/engine";
import { MES_ACTUAL } from "@/lib/format";
import { MOTOR_VERSION, parametrosVigentes } from "@/lib/params";
import type { Adjunto, Empleado, Empresa, Modalidad, Novedad, Periodo, TipoNovedad, Tono, VersionLiquidacion } from "@/lib/types";

export interface AltaRealResult {
  ok: boolean;
  modo: "real" | "demo";
  mensaje: string;
  id?: string;
}

export interface CrearEmpresaInicialInput {
  nombre: string;
  rut: string;
  nroBps: string;
  actividad: string;
  grupo: number;
  subgrupo: string;
  contactoNombre: string;
  contactoEmail: string;
  tono: Tono;
}

export interface CrearEmpleadoInicialInput {
  empresaId: string;
  nombre: string;
  apellido: string;
  ci: string;
  email: string;
  cargo: string;
  categoria: string;
  ingreso: string;
  modalidad: Modalidad;
  sueldo: number;
  hijos: number;
  telefono?: string;
}

export interface ImportarEmpleadoRealItem {
  nombre: string;
  apellido: string;
  ci: string;
  email: string;
  cargo: string;
  categoria: string;
  ingreso: string;
  sueldo: number;
  hijos: number;
}

export interface ImportarEmpleadosRealInput {
  empresaId: string;
  empleados: ImportarEmpleadoRealItem[];
  actor: string;
  archivo?: string;
}

export interface CrearNovedadRealInput {
  empresaId: string;
  mes: string;
  empleadoId: string;
  tipo: TipoNovedad;
  cantidad?: number;
  importe?: number;
  nota?: string;
  adjunto?: Adjunto;
  datos?: Novedad["datos"];
  origen: "cliente" | "estudio";
  autor: string;
}

export interface ActualizarNovedadRealInput extends CrearNovedadRealInput {
  id: string;
  antes?: string;
  despues?: string;
}

export interface BorrarNovedadRealInput {
  id: string;
  empresaId: string;
  tipo: TipoNovedad;
  autor: string;
  antes?: string;
}

export interface EnviarNovedadesClienteRealInput {
  empresaId: string;
  mes: string;
  autor: string;
  sinNovedades: boolean;
}

export interface PeriodoRealInput {
  periodoId: string;
  empresaId: string;
  actor: string;
}

export interface ResponderAprobacionRealInput extends PeriodoRealInput {
  aprobada: boolean;
  comentario: string;
}

export interface RectificarPeriodoRealInput extends PeriodoRealInput {
  motivo: string;
}

export interface AceptarAdvertenciaRealInput extends PeriodoRealInput {
  alertaId: string;
  nota: string;
}

export interface AgregarNotaPeriodoRealInput extends PeriodoRealInput {
  texto: string;
}

export interface MarcarReciboVistoRealInput {
  empleadoId: string;
  empresaId: string;
  mes: string;
}

export interface ListarNovedadesEmpleadoRealInput {
  empleadoId: string;
  empresaId: string;
  limite?: number;
  offset?: number;
}

export interface ListarNovedadesEmpleadoRealResult extends AltaRealResult {
  novedades: Novedad[];
  total: number;
  limite: number;
  offset: number;
}

export interface ImportarEmpleadosRealResult extends AltaRealResult {
  ids?: string[];
}

export interface ActualizarEmpresaRealInput {
  empresaId: string;
  cambios: Partial<Empresa>;
  resumen: string;
  actor: string;
}

export interface ActualizarEmpleadoRealInput {
  empleadoId: string;
  empresaId: string;
  cambios: Partial<Empleado>;
  resumen: string;
  actor: string;
}

function ahoraIso() {
  return new Date().toISOString();
}

const TIPOS_ADJUNTO_PERMITIDOS = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const MAX_ADJUNTO_BYTES = 700 * 1024;
const MAX_IMPORTAR_EMPLEADOS = 250;

function ciNormalizada(ci: string) {
  return ci.replace(/\D/g, "");
}

function validarAdjunto(adjunto: Adjunto | undefined) {
  if (!adjunto) return undefined;
  if (!adjunto.nombre.trim()) throw new Error("El adjunto no tiene nombre.");
  if (!TIPOS_ADJUNTO_PERMITIDOS.has(adjunto.tipo)) throw new Error("El adjunto debe ser PDF, JPG, PNG o WEBP.");
  if (!Number.isFinite(adjunto.tamano) || adjunto.tamano <= 0 || adjunto.tamano > MAX_ADJUNTO_BYTES) {
    throw new Error("El adjunto puede pesar hasta 700 KB.");
  }
  if (adjunto.dataUrl) {
    const prefijo = `data:${adjunto.tipo};base64,`;
    if (!adjunto.dataUrl.startsWith(prefijo)) throw new Error("El contenido del adjunto no coincide con su tipo.");
    const bytesAprox = Math.ceil((adjunto.dataUrl.slice(prefijo.length).length * 3) / 4);
    if (bytesAprox > MAX_ADJUNTO_BYTES + 1024) throw new Error("El adjunto supera el tamaño permitido.");
  }
  return adjunto;
}

function periodoInicial(empresaId: EmpresaId, mes: string): Periodo {
  return {
    id: crypto.randomUUID(),
    empresaId,
    mes,
    etapa: "novedades",
    fechaObjetivo: `${mes}-28`,
    sinNovedades: false,
    versiones: [],
    advertenciasAceptadas: {},
    bps: "pendiente",
    rectificaciones: [],
    notas: [],
  };
}

async function guardarPeriodoReal(
  input: PeriodoRealInput,
  cambio: (actual: Periodo) => Promise<{ periodo: Periodo; auditoria: { accion: string; detalle?: string } }>,
  actoresPermitidos: Array<"estudio" | "empresa"> = ["estudio"],
): Promise<AltaRealResult> {
  const ctx = await contextoOperativoActual();
  if (!ctx || !actoresPermitidos.includes(ctx.actorTipo as "estudio" | "empresa") || !process.env.DATABASE_URL || !uuidValido(input.periodoId) || !uuidValido(input.empresaId)) {
    return { ok: true, modo: "demo", mensaje: "Accion simulada: falta sesion de estudio o backend real." };
  }

  const tenant = tenantContextDesdeAcceso(ctx);
  if (!tenant) return { ok: false, modo: "real", mensaje: "No pudimos resolver el contexto del estudio." };

  const empresaId = input.empresaId as EmpresaId;
  const { db } = await import("cierrabe/datos/db");
  const periodosRepo = crearPeriodosRepo(db);
  const auditoriaRepo = crearAuditoriaRepo(db);
  const periodo = await periodosRepo.obtener(tenant, input.periodoId as PeriodoId);
  if (!periodo) return { ok: false, modo: "real", mensaje: "No encontramos el periodo." };

  const { periodo: actualizado, auditoria } = await cambio(periodo as Periodo);
  const guardado = await periodosRepo.guardar(tenant, actualizado);
  await auditoriaRepo.registrar(tenant, {
    actor: input.actor,
    empresaId,
    entidad: "Periodo",
    entidadId: guardado.id as PeriodoId,
    accion: auditoria.accion,
    detalle: auditoria.detalle,
  });

  revalidatePath(`/empresas/${input.empresaId}`);
  revalidatePath(`/cliente/${input.empresaId}`);
  revalidatePath(`/recibos/${input.empresaId}/${guardado.mes}`);
  revalidatePath("/empresas");
  return { ok: true, modo: "real", mensaje: "Periodo actualizado en backend.", id: guardado.id };
}

export async function crearEmpresaInicial(input: CrearEmpresaInicialInput): Promise<AltaRealResult> {
  const ctx = contextoEstudioDesarrollo(await obtenerSesionDev());
  if (!ctx) {
    return {
      ok: true,
      modo: "demo",
      mensaje: "Alta simulada: falta DATABASE_URL, CIERRA_DEV_ESTUDIO_ID o CIERRA_DEV_USUARIO_ID con UUID real.",
    };
  }

  const { db } = await import("cierrabe/datos/db");
  const res = await crearEmpresaConAccesoInicial(
    ctx,
    {
      empresas: crearEmpresasRepo(db),
      usuarios: crearUsuariosRepo(db),
      auditoria: crearAuditoriaRepo(db),
      periodos: crearPeriodosRepo(db),
    },
    ctx.estudioId,
    {
      empresa: {
        nombre: input.nombre,
        rut: input.rut,
        nroBps: input.nroBps,
        actividad: input.actividad,
        grupo: input.grupo,
        subgrupo: input.subgrupo,
        responsableId: "",
        requiereAprobacion: true,
        contacto: { nombre: input.contactoNombre, email: input.contactoEmail },
        tono: input.tono,
      },
      usuarioEmpresa: { nombre: input.contactoNombre, email: input.contactoEmail },
      periodoInicial: periodoInicial("" as EmpresaId, MES_ACTUAL),
    },
  );

  revalidatePath("/empresas");
  return {
    ok: true,
    modo: "real",
    mensaje: res.periodo
      ? `Empresa guardada en backend con acceso inicial para ${res.usuario.email} y periodo ${res.periodo.mes}.`
      : `Empresa guardada en backend con acceso inicial para ${res.usuario.email}.`,
    id: res.empresa.id,
  };
}

export async function crearEmpleadoInicial(input: CrearEmpleadoInicialInput): Promise<AltaRealResult> {
  const ctx = contextoEstudioDesarrollo(await obtenerSesionDev());
  if (!ctx || !uuidValido(input.empresaId)) {
    return {
      ok: true,
      modo: "demo",
      mensaje: "Alta simulada: falta backend real o la empresa demo no tiene UUID real.",
    };
  }

  const empresaId = input.empresaId as EmpresaId;
  const { db } = await import("cierrabe/datos/db");
  const res = await crearEmpleadoConAccesoInicial(
    ctx,
    {
      empleados: crearEmpleadosRepo(db),
      usuarios: crearUsuariosRepo(db),
      auditoria: crearAuditoriaRepo(db),
    },
    { estudioId: ctx.estudioId, empresaId },
    {
      empleado: {
        empresaId,
        nombre: input.nombre,
        apellido: input.apellido,
        ci: input.ci,
        email: input.email,
        cargo: input.cargo,
        categoria: input.categoria,
        modalidad: input.modalidad,
        ingreso: input.ingreso,
        sueldos: input.modalidad === "mensual" ? [{ desde: input.ingreso, monto: input.sueldo }] : [],
        hijos: input.hijos,
        conyugeFonasa: false,
        telefono: input.telefono,
      },
    },
  );

  revalidatePath("/empleados");
  revalidatePath(`/empresas/${input.empresaId}`);
  return {
    ok: true,
    modo: "real",
    mensaje: `Empleado guardado en backend con acceso inicial para ${res.usuario.email}.`,
    id: res.empleado.id,
  };
}

export async function importarEmpleadosReal(input: ImportarEmpleadosRealInput): Promise<ImportarEmpleadosRealResult> {
  const ctx = await contextoOperativoActual();
  if (!ctx || ctx.actorTipo !== "estudio" || !process.env.DATABASE_URL || !uuidValido(input.empresaId)) {
    return { ok: true, modo: "demo", mensaje: "Importacion simulada: falta sesion de estudio o backend real." };
  }
  if (!input.empleados.length) {
    return { ok: false, modo: "real", mensaje: "No hay empleados validos para importar." };
  }
  if (input.empleados.length > MAX_IMPORTAR_EMPLEADOS) {
    return { ok: false, modo: "real", mensaje: `Importa hasta ${MAX_IMPORTAR_EMPLEADOS} personas por archivo.` };
  }

  const empresaId = input.empresaId as EmpresaId;
  const tenant = tenantContextDesdeAcceso(ctx);
  if (!tenant) return { ok: false, modo: "real", mensaje: "No pudimos resolver el contexto del estudio." };

  const cisArchivo = new Set<string>();
  for (const empleado of input.empleados) {
    const ci = ciNormalizada(empleado.ci);
    if (!empleado.nombre.trim() || !empleado.apellido.trim() || !empleado.cargo.trim() || !empleado.categoria.trim()) {
      return { ok: false, modo: "real", mensaje: "Hay filas con nombre, apellido, cargo o categoria incompletos." };
    }
    if (ci.length < 6) return { ok: false, modo: "real", mensaje: `Cedula invalida para ${empleado.nombre} ${empleado.apellido}.` };
    if (cisArchivo.has(ci)) return { ok: false, modo: "real", mensaje: `La cedula ${empleado.ci} esta repetida en el archivo.` };
    if (!/^\S+@\S+\.\S+$/.test(empleado.email)) return { ok: false, modo: "real", mensaje: `Email invalido para ${empleado.nombre} ${empleado.apellido}.` };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(empleado.ingreso)) return { ok: false, modo: "real", mensaje: `Fecha de ingreso invalida para ${empleado.nombre} ${empleado.apellido}.` };
    if (!Number.isFinite(empleado.sueldo) || empleado.sueldo <= 0) return { ok: false, modo: "real", mensaje: `Sueldo invalido para ${empleado.nombre} ${empleado.apellido}.` };
    cisArchivo.add(ci);
  }

  const { db } = await import("cierrabe/datos/db");
  const empleadosRepo = crearEmpleadosRepo(db);
  const existentes = await empleadosRepo.listarPorEmpresa(tenant, empresaId);
  const cisExistentes = new Set(existentes.map((empleado) => ciNormalizada(empleado.ci)).filter(Boolean));
  const repetida = input.empleados.find((empleado) => cisExistentes.has(ciNormalizada(empleado.ci)));
  if (repetida) {
    return { ok: false, modo: "real", mensaje: `Ya existe una persona con cedula ${repetida.ci}.` };
  }

  const creados = await db.transaction(async (tx) => {
    const empleadosTx = crearEmpleadosRepo(tx as unknown as typeof db);
    const auditoriaTx = crearAuditoriaRepo(tx as unknown as typeof db);
    const creadosTx = [];
    for (const empleado of input.empleados) {
      const creado = await crearEmpleadoBackend(
        ctx,
        empleadosTx,
        { estudioId: ctx.estudioId, empresaId },
        {
          empresaId,
          nombre: empleado.nombre,
          apellido: empleado.apellido,
          ci: empleado.ci,
          email: empleado.email,
          cargo: empleado.cargo,
          categoria: empleado.categoria,
          modalidad: "mensual",
          ingreso: empleado.ingreso,
          sueldos: [{ desde: empleado.ingreso, monto: empleado.sueldo }],
          hijos: empleado.hijos,
          conyugeFonasa: false,
        },
      );
      creadosTx.push(creado);
    }
    await auditoriaTx.registrar(tenant, {
      actor: input.actor,
      empresaId,
      entidad: "Empleado",
      accion: `Importo ${creadosTx.length} ${creadosTx.length === 1 ? "persona" : "personas"} desde Excel`,
      detalle: input.archivo ? `Archivo: ${input.archivo}` : creadosTx.map((empleado) => `${empleado.nombre} ${empleado.apellido}`).join(", "),
    });
    return creadosTx;
  });

  revalidatePath("/empleados");
  revalidatePath(`/empresas/${input.empresaId}`);
  revalidatePath("/empresas");
  return {
    ok: true,
    modo: "real",
    mensaje: `Importadas ${creados.length} ${creados.length === 1 ? "persona" : "personas"} en backend.`,
    ids: creados.map((empleado) => empleado.id),
  };
}

export async function actualizarEmpresaReal(input: ActualizarEmpresaRealInput): Promise<AltaRealResult> {
  const ctx = await contextoOperativoActual();
  if (!ctx || ctx.actorTipo !== "estudio" || !process.env.DATABASE_URL || !uuidValido(input.empresaId)) {
    return { ok: true, modo: "demo", mensaje: "Empresa actualizada solo en demo: falta sesion de estudio o backend real." };
  }

  const { db } = await import("cierrabe/datos/db");
  const empresaId = input.empresaId as EmpresaId;
  const empresasRepo = crearEmpresasRepo(db);
  const auditoriaRepo = crearAuditoriaRepo(db);
  const empresa = await actualizarEmpresaBackend(ctx, empresasRepo, { estudioId: ctx.estudioId, empresaId }, { ...input.cambios, resumen: input.resumen });

  await auditoriaRepo.registrar(tenantContextDesdeAcceso(ctx)!, {
    actor: input.actor,
    empresaId,
    entidad: "Empresa",
    entidadId: empresa.id as EmpresaId,
    accion: input.resumen,
  });

  revalidatePath(`/empresas/${input.empresaId}`);
  revalidatePath(`/cliente/${input.empresaId}`);
  revalidatePath("/empresas");
  return { ok: true, modo: "real", mensaje: "Empresa actualizada en backend.", id: empresa.id };
}

export async function actualizarEmpleadoReal(input: ActualizarEmpleadoRealInput): Promise<AltaRealResult> {
  const ctx = await contextoOperativoActual();
  if (!ctx || ctx.actorTipo !== "estudio" || !process.env.DATABASE_URL || !uuidValido(input.empresaId) || !uuidValido(input.empleadoId)) {
    return { ok: true, modo: "demo", mensaje: "Empleado actualizado solo en demo: falta sesion de estudio o backend real." };
  }

  const { db } = await import("cierrabe/datos/db");
  const empresaId = input.empresaId as EmpresaId;
  const empleadoId = input.empleadoId as EmpleadoId;
  const empleadosRepo = crearEmpleadosRepo(db);
  const auditoriaRepo = crearAuditoriaRepo(db);
  const empleado = await actualizarEmpleadoBackend(ctx, empleadosRepo, { estudioId: ctx.estudioId, empresaId, empleadoId }, { ...input.cambios, resumen: input.resumen });

  await auditoriaRepo.registrar(tenantContextDesdeAcceso(ctx)!, {
    actor: input.actor,
    empresaId,
    entidad: "Empleado",
    entidadId: empleado.id as EmpleadoId,
    accion: `Edito ficha de ${empleado.nombre} ${empleado.apellido}`,
    detalle: input.resumen,
  });

  revalidatePath("/empleados");
  revalidatePath(`/empresas/${input.empresaId}`);
  revalidatePath(`/portal/${input.empleadoId}`);
  revalidatePath("/empresas");
  return { ok: true, modo: "real", mensaje: "Empleado actualizado en backend.", id: empleado.id };
}

export async function crearNovedadReal(input: CrearNovedadRealInput): Promise<AltaRealResult> {
  const ctx = await contextoOperativoActual();
  if (!ctx || !process.env.DATABASE_URL || !uuidValido(input.empresaId) || !uuidValido(input.empleadoId)) {
    return {
      ok: true,
      modo: "demo",
      mensaje: "Novedad simulada: falta backend real o IDs UUID.",
    };
  }

  const tenant = tenantContextDesdeAcceso(ctx);
  if (!tenant) {
    return { ok: false, modo: "real", mensaje: "No pudimos resolver el contexto del estudio." };
  }

  const empresaId = input.empresaId as EmpresaId;
  const { db } = await import("cierrabe/datos/db");
  const periodosRepo = crearPeriodosRepo(db);
  const novedadesRepo = crearNovedadesRepo(db);
  const auditoriaRepo = crearAuditoriaRepo(db);

  const periodos = await periodosRepo.listarPorEmpresa(tenant, empresaId);
  const periodo =
    periodos.find((p) => p.mes === input.mes) ??
    (await periodosRepo.guardar(tenant, {
      ...periodoInicial(empresaId, input.mes),
      empresaId,
    }));

  const novedad = await novedadesRepo.crear(tenant, {
    empresaId,
    periodoId: periodo.id as PeriodoId,
    mes: input.mes,
    empleadoId: input.empleadoId as EmpleadoId,
    tipo: input.tipo,
    cantidad: input.cantidad,
    importe: input.importe,
    nota: input.nota,
    adjunto: validarAdjunto(input.adjunto),
    datos: input.datos,
    origen: input.origen,
    autor: input.autor,
  });

  await auditoriaRepo.registrar(tenant, {
    actor: input.autor,
    empresaId,
    entidad: "Novedad",
    entidadId: novedad.id as NovedadId,
    accion: `Agrego ${input.tipo.replace("_", " ")}`,
    detalle: input.nota,
  });

  revalidatePath(`/empresas/${input.empresaId}`);
  revalidatePath("/empresas");
  return {
    ok: true,
    modo: "real",
    mensaje: "Novedad guardada en backend.",
    id: novedad.id,
  };
}

export async function actualizarNovedadReal(input: ActualizarNovedadRealInput): Promise<AltaRealResult> {
  const ctx = await contextoOperativoActual();
  if (!ctx || !process.env.DATABASE_URL || !uuidValido(input.id) || !uuidValido(input.empresaId) || !uuidValido(input.empleadoId)) {
    return {
      ok: true,
      modo: "demo",
      mensaje: "Novedad actualizada solo en demo: falta backend real o IDs UUID.",
    };
  }

  const tenant = tenantContextDesdeAcceso(ctx);
  if (!tenant) {
    return { ok: false, modo: "real", mensaje: "No pudimos resolver el contexto del estudio." };
  }

  const { db } = await import("cierrabe/datos/db");
  const novedadesRepo = crearNovedadesRepo(db);
  const auditoriaRepo = crearAuditoriaRepo(db);
  const novedad = await novedadesRepo.actualizar(tenant, input.id as NovedadId, {
    empleadoId: input.empleadoId as EmpleadoId,
    tipo: input.tipo,
    cantidad: input.cantidad,
    importe: input.importe,
    nota: input.nota,
    adjunto: validarAdjunto(input.adjunto),
    datos: input.datos,
    origen: input.origen,
    autor: input.autor,
    resumen: `Actualizo ${input.tipo.replace("_", " ")}`,
  });

  await auditoriaRepo.registrar(tenant, {
    actor: input.autor,
    empresaId: input.empresaId as EmpresaId,
    entidad: "Novedad",
    entidadId: novedad.id as NovedadId,
    accion: `Actualizo ${input.tipo.replace("_", " ")}`,
    detalle: input.nota,
    antes: input.antes,
    despues: input.despues,
  });

  revalidatePath(`/empresas/${input.empresaId}`);
  revalidatePath(`/cliente/${input.empresaId}`);
  revalidatePath("/empresas");
  return {
    ok: true,
    modo: "real",
    mensaje: "Novedad actualizada en backend.",
    id: novedad.id,
  };
}

export async function borrarNovedadReal(input: BorrarNovedadRealInput): Promise<AltaRealResult> {
  const ctx = await contextoOperativoActual();
  if (!ctx || !process.env.DATABASE_URL || !uuidValido(input.id) || !uuidValido(input.empresaId)) {
    return {
      ok: true,
      modo: "demo",
      mensaje: "Novedad eliminada solo en demo: falta backend real o IDs UUID.",
    };
  }

  const tenant = tenantContextDesdeAcceso(ctx);
  if (!tenant) {
    return { ok: false, modo: "real", mensaje: "No pudimos resolver el contexto del estudio." };
  }

  const { db } = await import("cierrabe/datos/db");
  const novedadesRepo = crearNovedadesRepo(db);
  const auditoriaRepo = crearAuditoriaRepo(db);
  await novedadesRepo.borrar(tenant, input.id as NovedadId);
  await auditoriaRepo.registrar(tenant, {
    actor: input.autor,
    empresaId: input.empresaId as EmpresaId,
    entidad: "Novedad",
    entidadId: input.id as NovedadId,
    accion: `Elimino ${input.tipo.replace("_", " ")}`,
    antes: input.antes,
  });

  revalidatePath(`/empresas/${input.empresaId}`);
  revalidatePath(`/cliente/${input.empresaId}`);
  revalidatePath("/empresas");
  return {
    ok: true,
    modo: "real",
    mensaje: "Novedad eliminada en backend.",
    id: input.id,
  };
}

export async function listarNovedadesEmpleadoReal(input: ListarNovedadesEmpleadoRealInput): Promise<ListarNovedadesEmpleadoRealResult> {
  const vacio = (modo: "real" | "demo", mensaje: string, ok = true): ListarNovedadesEmpleadoRealResult => ({
    ok,
    modo,
    mensaje,
    novedades: [],
    total: 0,
    limite: input.limite ?? 10,
    offset: input.offset ?? 0,
  });
  const ctx = await contextoOperativoActual();
  if (!ctx || ctx.actorTipo !== "estudio" || !process.env.DATABASE_URL || !uuidValido(input.empleadoId) || !uuidValido(input.empresaId)) {
    return vacio("demo", "Historial local: falta sesion de estudio o backend real.");
  }

  const tenant = tenantContextDesdeAcceso(ctx);
  if (!tenant) return vacio("real", "No pudimos resolver el contexto del estudio.", false);

  const { db } = await import("cierrabe/datos/db");
  const empleadosRepo = crearEmpleadosRepo(db);
  const empleado = await empleadosRepo.obtener(tenant, input.empleadoId as EmpleadoId);
  if (!empleado || empleado.empresaId !== input.empresaId) return vacio("real", "No encontramos esa persona en la empresa.", false);

  const novedadesRepo = crearNovedadesRepo(db);
  const pagina = await novedadesRepo.listarPorEmpleado(tenant, input.empleadoId as EmpleadoId, {
    empresaId: input.empresaId as EmpresaId,
    limite: input.limite,
    offset: input.offset,
  });

  return {
    ok: true,
    modo: "real",
    mensaje: "Historial de novedades cargado.",
    novedades: pagina.items,
    total: pagina.total,
    limite: pagina.limite,
    offset: pagina.offset,
  };
}

export async function enviarNovedadesClienteReal(input: EnviarNovedadesClienteRealInput): Promise<AltaRealResult> {
  const ctx = await contextoOperativoActual();
  if (!ctx || !process.env.DATABASE_URL || !uuidValido(input.empresaId)) {
    return {
      ok: true,
      modo: "demo",
      mensaje: "Envio simulado: falta backend real o empresa UUID.",
    };
  }

  const tenant = tenantContextDesdeAcceso(ctx);
  if (!tenant) {
    return { ok: false, modo: "real", mensaje: "No pudimos resolver el contexto del estudio." };
  }

  const empresaId = input.empresaId as EmpresaId;
  const { db } = await import("cierrabe/datos/db");
  const periodosRepo = crearPeriodosRepo(db);
  const auditoriaRepo = crearAuditoriaRepo(db);
  const periodos = await periodosRepo.listarPorEmpresa(tenant, empresaId);
  const periodo =
    periodos.find((p) => p.mes === input.mes) ??
    (await periodosRepo.guardar(tenant, {
      ...periodoInicial(empresaId, input.mes),
      empresaId,
    }));

  await periodosRepo.guardar(tenant, {
    ...periodo,
    etapa: periodo.etapa === "novedades" ? "recibidas" : periodo.etapa,
    sinNovedades: input.sinNovedades,
    solicitud: {
      enviada: periodo.solicitud?.enviada ?? new Date().toISOString(),
      abierta: periodo.solicitud?.abierta,
      respondida: new Date().toISOString(),
    },
  });

  await auditoriaRepo.registrar(tenant, {
    actor: `${input.autor} (cliente)`,
    empresaId,
    entidad: "Novedades",
    entidadId: periodo.id as PeriodoId,
    accion: input.sinNovedades ? "Confirmo que no hay novedades" : "Envio novedades del mes",
  });

  revalidatePath(`/cliente/${input.empresaId}`);
  revalidatePath(`/empresas/${input.empresaId}`);
  revalidatePath("/empresas");
  return {
    ok: true,
    modo: "real",
    mensaje: input.sinNovedades ? "Mes confirmado sin novedades." : "Novedades enviadas al estudio.",
    id: periodo.id,
  };
}

export async function calcularLiquidacionReal(input: PeriodoRealInput): Promise<AltaRealResult> {
  return guardarPeriodoReal(input, async (periodo) => {
    const tenant = tenantContextDesdeAcceso((await contextoOperativoActual())!);
    if (!tenant) throw new Error("No pudimos resolver el contexto del estudio.");
    const { db } = await import("cierrabe/datos/db");
    const empresasRepo = crearEmpresasRepo(db);
    const empleadosRepo = crearEmpleadosRepo(db);
    const novedadesRepo = crearNovedadesRepo(db);
    const empresa = await empresasRepo.obtener(tenant, input.empresaId as EmpresaId);
    if (!empresa) throw new Error("No encontramos la empresa.");
    const empleados = await empleadosRepo.listarPorEmpresa(tenant, input.empresaId as EmpresaId);
    const novedades = (await novedadesRepo.listarPorPeriodo(tenant, periodo.id as PeriodoId)).map((n) => ({ ...n, mes: periodo.mes }));
    const resultados = calcularEmpresa(empresa, empleados, periodo.mes, novedades);
    const version: VersionLiquidacion = {
      version: periodo.versiones.length + 1,
      creada: ahoraIso(),
      por: input.actor,
      motor: MOTOR_VERSION,
      parametros: parametrosVigentes(periodo.mes).id,
      resultados,
      hash: hashDe(resultados),
    };
    return {
      periodo: { ...periodo, versiones: [...periodo.versiones, version], etapa: "borrador", aprobacion: undefined },
      auditoria: { accion: `Calculo la version ${version.version}`, detalle: `${version.motor} - parametros ${version.parametros} - hash ${version.hash.slice(0, 8)}` },
    };
  });
}

export async function solicitarNovedadesReal(input: PeriodoRealInput): Promise<AltaRealResult> {
  return guardarPeriodoReal(input, async (periodo) => ({
    periodo: { ...periodo, solicitud: { enviada: ahoraIso(), abierta: periodo.solicitud?.abierta, respondida: periodo.solicitud?.respondida } },
    auditoria: { accion: "Solicito novedades por email" },
  }));
}

export async function marcarNovedadesRecibidasReal(input: PeriodoRealInput): Promise<AltaRealResult> {
  return guardarPeriodoReal(input, async (periodo) => ({
    periodo: { ...periodo, etapa: "recibidas" },
    auditoria: { accion: "Marco novedades como completas" },
  }));
}

export async function aceptarAdvertenciaReal(input: AceptarAdvertenciaRealInput): Promise<AltaRealResult> {
  return guardarPeriodoReal(input, async (periodo) => ({
    periodo: { ...periodo, advertenciasAceptadas: { ...periodo.advertenciasAceptadas, [input.alertaId]: input.nota } },
    auditoria: { accion: "Acepto una advertencia", detalle: input.nota },
  }));
}

export async function agregarNotaPeriodoReal(input: AgregarNotaPeriodoRealInput): Promise<AltaRealResult> {
  return guardarPeriodoReal(input, async (periodo) => ({
    periodo: { ...periodo, notas: [...periodo.notas, { fecha: ahoraIso(), por: input.actor, texto: input.texto }] },
    auditoria: { accion: "Agrego nota interna", detalle: input.texto },
  }));
}

export async function enviarAprobacionReal(input: PeriodoRealInput): Promise<AltaRealResult> {
  return guardarPeriodoReal(input, async (periodo) => {
    const version = periodo.versiones.at(-1)?.version;
    if (!version) throw new Error("Primero hay que calcular una version.");
    return {
      periodo: { ...periodo, etapa: "enviada", aprobacion: { version, estado: "pendiente", enviada: ahoraIso() } },
      auditoria: { accion: `Envio la version ${version} a aprobacion` },
    };
  });
}

export async function aprobarInternoReal(input: PeriodoRealInput): Promise<AltaRealResult> {
  return guardarPeriodoReal(input, async (periodo) => {
    const version = periodo.versiones.at(-1)?.version;
    if (!version) throw new Error("Primero hay que calcular una version.");
    return {
      periodo: { ...periodo, etapa: "aprobada", aprobacion: { version, estado: "aprobada", enviada: ahoraIso(), fecha: ahoraIso(), por: input.actor } },
      auditoria: { accion: `Aprobo internamente la version ${version}`, detalle: "Empresa sin aprobacion del cliente" },
    };
  });
}

export async function cerrarPeriodoReal(input: PeriodoRealInput): Promise<AltaRealResult> {
  return guardarPeriodoReal(input, async (periodo) => {
    const version = periodo.aprobacion?.version ?? periodo.versiones.at(-1)?.version;
    if (!version) throw new Error("Primero hay que calcular una version.");
    const publicada = periodo.versiones.find((v) => v.version === version)?.resultados.filter((r) => !r.fueraDeAlcance).length ?? 0;
    return {
      periodo: { ...periodo, etapa: "cerrada", cerrado: { fecha: ahoraIso(), por: input.actor, version } },
      auditoria: { accion: `Cerro el periodo y publico ${publicada} recibos`, detalle: `Version ${version} bloqueada` },
    };
  });
}

export async function responderAprobacionReal(input: ResponderAprobacionRealInput): Promise<AltaRealResult> {
  return guardarPeriodoReal(input, async (periodo) => {
    if (!periodo.aprobacion) throw new Error("No hay una aprobacion pendiente para responder.");
    const estado = input.aprobada ? "aprobada" : "devuelta";
    return {
      periodo: {
        ...periodo,
        etapa: input.aprobada ? "aprobada" : "devuelta",
        aprobacion: {
          ...periodo.aprobacion,
          estado,
          comentario: input.comentario || undefined,
          por: input.actor,
          fecha: ahoraIso(),
        },
      },
      auditoria: {
        accion: input.aprobada ? `Aprobo la version ${periodo.aprobacion.version}` : `Devolvio la version ${periodo.aprobacion.version}`,
        detalle: input.comentario || undefined,
      },
    };
  }, ["estudio", "empresa"]);
}

export async function generarBpsReal(input: PeriodoRealInput): Promise<AltaRealResult> {
  return guardarPeriodoReal(input, async (periodo) => ({
    periodo: { ...periodo, bps: "generado" },
    auditoria: { accion: "Genero archivo de nomina" },
  }));
}

export async function marcarBpsPresentadoReal(input: PeriodoRealInput): Promise<AltaRealResult> {
  return guardarPeriodoReal(input, async (periodo) => ({
    periodo: { ...periodo, bps: "presentado" },
    auditoria: { accion: "Marco la nomina como presentada" },
  }));
}

export async function rectificarPeriodoReal(input: RectificarPeriodoRealInput): Promise<AltaRealResult> {
  return guardarPeriodoReal(input, async (periodo) => {
    if (!periodo.cerrado) throw new Error("Solo se puede rectificar un periodo cerrado.");
    return {
      periodo: {
        ...periodo,
        etapa: "borrador",
        bps: "pendiente",
        rectificaciones: [...periodo.rectificaciones, { fecha: ahoraIso(), por: input.actor, motivo: input.motivo, desdeVersion: periodo.cerrado.version }],
        aprobacion: undefined,
      },
      auditoria: { accion: `Inicio rectificacion de la version ${periodo.cerrado.version}`, detalle: input.motivo },
    };
  });
}

export async function marcarReciboVistoReal(input: MarcarReciboVistoRealInput): Promise<AltaRealResult> {
  const ctx = await contextoOperativoActual();
  if (!ctx || ctx.actorTipo !== "empleado" || !process.env.DATABASE_URL || !uuidValido(input.empleadoId) || !uuidValido(input.empresaId)) {
    return { ok: true, modo: "demo", mensaje: "Vista simulada: falta sesion de empleado o backend real." };
  }
  if (ctx.empleadoId !== input.empleadoId || ctx.empresaId !== input.empresaId) {
    return { ok: false, modo: "real", mensaje: "No podés marcar un recibo de otra persona." };
  }

  const tenant = tenantContextDesdeAcceso(ctx);
  if (!tenant) return { ok: false, modo: "real", mensaje: "No pudimos resolver el contexto del estudio." };

  const { db } = await import("cierrabe/datos/db");
  const reciboVistasRepo = crearReciboVistasRepo(db);
  const auditoriaRepo = crearAuditoriaRepo(db);
  const vista = await reciboVistasRepo.registrar(tenant, {
    empresaId: input.empresaId as EmpresaId,
    empleadoId: input.empleadoId as EmpleadoId,
    mes: input.mes,
  });
  await auditoriaRepo.registrar(tenant, {
    actor: ctx.usuarioId,
    empresaId: input.empresaId as EmpresaId,
    entidad: "Recibo",
    accion: `Vio recibo ${input.mes}`,
  });
  revalidatePath("/documentos");
  revalidatePath(`/portal/${input.empleadoId}`);
  return { ok: true, modo: "real", mensaje: "Vista de recibo registrada.", id: vista.id };
}

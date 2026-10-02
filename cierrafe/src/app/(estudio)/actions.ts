"use server";

import { revalidatePath } from "next/cache";
import { crearEmpleadoConAccesoInicial, crearEmpresaConAccesoInicial } from "cierrabe/acciones";
import { tenantContextDesdeAcceso, type EmpleadoId, type EmpresaId, type NovedadId, type PeriodoId } from "cierrabe/datos/contexto";
import { crearAuditoriaRepo, crearEmpleadosRepo, crearEmpresasRepo, crearNovedadesRepo, crearPeriodosRepo, crearReciboVistasRepo, crearUsuariosRepo } from "cierrabe/datos/repos";
import { contextoEstudioDesarrollo, uuidValido } from "@/lib/backend-dev-context";
import { contextoOperativoActual } from "@/lib/backend-operativo";
import { obtenerSesionDev } from "@/lib/dev-auth";
import { calcularEmpresa, hashDe } from "@/lib/engine";
import { MES_ACTUAL } from "@/lib/format";
import { MOTOR_VERSION, parametrosVigentes } from "@/lib/params";
import type { Adjunto, Modalidad, Periodo, TipoNovedad, Tono, VersionLiquidacion } from "@/lib/types";

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

export interface CrearNovedadRealInput {
  empresaId: string;
  mes: string;
  empleadoId: string;
  tipo: TipoNovedad;
  cantidad?: number;
  importe?: number;
  nota?: string;
  adjunto?: Adjunto;
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

export interface MarcarReciboVistoRealInput {
  empleadoId: string;
  empresaId: string;
  mes: string;
}

function ahoraIso() {
  return new Date().toISOString();
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
    adjunto: input.adjunto,
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
    adjunto: input.adjunto,
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

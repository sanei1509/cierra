"use server";

import { revalidatePath } from "next/cache";
import { crearEmpleadoConAccesoInicial, crearEmpresaConAccesoInicial } from "cierrabe/acciones";
import { tenantContextDesdeAcceso, type EmpleadoId, type EmpresaId, type NovedadId, type PeriodoId } from "cierrabe/datos/contexto";
import { crearAuditoriaRepo, crearEmpleadosRepo, crearEmpresasRepo, crearNovedadesRepo, crearPeriodosRepo, crearUsuariosRepo } from "cierrabe/datos/repos";
import { contextoEstudioDesarrollo, uuidValido } from "@/lib/backend-dev-context";
import { contextoOperativoActual } from "@/lib/backend-operativo";
import { obtenerSesionDev } from "@/lib/dev-auth";
import { MES_ACTUAL } from "@/lib/format";
import type { Adjunto, Modalidad, TipoNovedad, Tono } from "@/lib/types";

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
      periodoInicial: {
        id: crypto.randomUUID(),
        mes: MES_ACTUAL,
        etapa: "novedades",
        fechaObjetivo: `${MES_ACTUAL}-28`,
        sinNovedades: false,
        versiones: [],
        advertenciasAceptadas: {},
        bps: "pendiente",
        rectificaciones: [],
        notas: [],
      },
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
      id: crypto.randomUUID(),
      empresaId,
      mes: input.mes,
      etapa: "novedades",
      fechaObjetivo: `${input.mes}-28`,
      sinNovedades: false,
      versiones: [],
      advertenciasAceptadas: {},
      bps: "pendiente",
      rectificaciones: [],
      notas: [],
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
      id: crypto.randomUUID(),
      empresaId,
      mes: input.mes,
      etapa: "novedades",
      fechaObjetivo: `${input.mes}-28`,
      sinNovedades: false,
      versiones: [],
      advertenciasAceptadas: {},
      bps: "pendiente",
      rectificaciones: [],
      notas: [],
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

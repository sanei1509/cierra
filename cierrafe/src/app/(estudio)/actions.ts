"use server";

import { revalidatePath } from "next/cache";
import { crearEmpleadoConAccesoInicial, crearEmpresaConAccesoInicial } from "cierrabe/acciones";
import { tenantContextDesdeAcceso, type EmpleadoId, type EmpresaId, type NovedadId, type PeriodoId } from "cierrabe/datos/contexto";
import { crearAuditoriaRepo, crearEmpleadosRepo, crearEmpresasRepo, crearNovedadesRepo, crearPeriodosRepo, crearUsuariosRepo } from "cierrabe/datos/repos";
import { contextoEstudioDesarrollo, uuidValido } from "@/lib/backend-dev-context";
import { contextoEstudioActual } from "@/lib/backend-operativo";
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
  const ctx = await contextoEstudioActual();
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

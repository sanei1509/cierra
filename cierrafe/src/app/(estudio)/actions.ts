"use server";

import { revalidatePath } from "next/cache";
import { crearEmpleadoConAccesoInicial, crearEmpresaConAccesoInicial } from "cierrabe/acciones";
import type { EmpresaId } from "cierrabe/datos/contexto";
import { crearAuditoriaRepo, crearEmpleadosRepo, crearEmpresasRepo, crearPeriodosRepo, crearUsuariosRepo } from "cierrabe/datos/repos";
import { contextoEstudioDesarrollo, uuidValido } from "@/lib/backend-dev-context";
import { MES_ACTUAL } from "@/lib/format";
import type { Modalidad, Tono } from "@/lib/types";

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

export async function crearEmpresaInicial(input: CrearEmpresaInicialInput): Promise<AltaRealResult> {
  const ctx = contextoEstudioDesarrollo();
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
  const ctx = contextoEstudioDesarrollo();
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

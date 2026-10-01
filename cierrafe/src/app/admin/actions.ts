"use server";

import { revalidatePath } from "next/cache";
import { configurarSuscripcionEstudio } from "cierrabe/acciones";
import type { AccessContext, EstudioId, UsuarioId } from "cierrabe/datos/contexto";
import { crearAuditoriaRepo, crearSuscripcionesRepo } from "cierrabe/datos/repos";
import type { CrearSuscripcionEstudioInput } from "cierrabe/facturacion";
import { ADDONS_ADMIN, planPorCodigo, type CodigoModulo, type EstudioAdmin } from "@/lib/comercial-demo";

export interface GuardarConfiguracionComercialInput {
  estudio: EstudioAdmin;
}

export interface GuardarConfiguracionComercialResult {
  ok: boolean;
  mensaje: string;
  modo: "real" | "demo";
}

const adminDesarrollo: AccessContext = {
  actorTipo: "sistema",
  usuarioId: "00000000-0000-4000-8000-000000000001" as UsuarioId,
  rol: "system_admin",
};

function addonInput(codigos: CodigoModulo[], inicio: string) {
  return ADDONS_ADMIN.filter((addon) => codigos.includes(addon.moduloCodigo)).map((addon) => ({
    moduloCodigo: addon.moduloCodigo,
    precioMensualCent: addon.precioMensualCent,
    inicio,
  }));
}

function suscripcionDesdeEstudio(estudio: EstudioAdmin): CrearSuscripcionEstudioInput {
  const plan = planPorCodigo(estudio.planCodigo);
  const inicio = new Date().toISOString().slice(0, 10);

  return {
    estudioId: estudio.id as EstudioId,
    planId: plan.id,
    estado: estudio.estado,
    moneda: estudio.moneda,
    precioMensualCent: plan.precioMensualCent,
    inicio,
    notasInternas: estudio.notas,
    addons: addonInput(estudio.addons, inicio),
    overrides: [],
    resumen: `Configuracion comercial de ${estudio.nombre}: ${plan.nombre}`,
  };
}

export async function guardarConfiguracionComercial(input: GuardarConfiguracionComercialInput): Promise<GuardarConfiguracionComercialResult> {
  if (!process.env.DATABASE_URL) {
    return {
      ok: true,
      modo: "demo",
      mensaje: "Guardado simulado: falta DATABASE_URL para escribir en PostgreSQL.",
    };
  }

  const { db } = await import("cierrabe/datos/db");

  await configurarSuscripcionEstudio(
    adminDesarrollo,
    {
      suscripciones: crearSuscripcionesRepo(db),
      auditoria: crearAuditoriaRepo(db),
    },
    input.estudio.id as EstudioId,
    suscripcionDesdeEstudio(input.estudio),
  );

  revalidatePath("/admin");
  return {
    ok: true,
    modo: "real",
    mensaje: "Configuracion comercial guardada en el backend.",
  };
}

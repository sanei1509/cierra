"use server";

import { revalidatePath } from "next/cache";
import { configurarSuscripcionEstudio, generarResumenCobroAdmin } from "cierrabe/acciones";
import type { AccessContext, EstudioId, UsuarioId } from "cierrabe/datos/contexto";
import { crearAuditoriaRepo, crearPlanesRepo, crearResumenesCobroRepo, crearSuscripcionesRepo, crearUsoFacturableRepo } from "cierrabe/datos/repos";
import type { AjusteManualCobro, CrearSuscripcionEstudioInput } from "cierrabe/facturacion";
import { ADDONS_ADMIN, planPorCodigo, resumenCobroDemo, type AjusteCobroAdmin, type CodigoModulo, type EstudioAdmin, type ResumenCobroAdmin } from "@/lib/comercial-demo";

export interface GuardarConfiguracionComercialInput {
  estudio: EstudioAdmin;
}

export interface GuardarConfiguracionComercialResult {
  ok: boolean;
  mensaje: string;
  modo: "real" | "demo";
}

export interface GenerarResumenCobroInput {
  estudio: EstudioAdmin;
  mes: string;
  ajustes?: AjusteCobroAdmin[];
}

export interface GenerarResumenCobroResult {
  ok: boolean;
  mensaje: string;
  modo: "real" | "demo";
  resumen: ResumenCobroAdmin;
}

const adminDesarrollo: AccessContext = {
  actorTipo: "sistema",
  usuarioId: "00000000-0000-4000-8000-000000000001" as UsuarioId,
  rol: "system_admin",
};

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function ajustesBackend(ajustes: AjusteCobroAdmin[] | undefined): AjusteManualCobro[] {
  return (ajustes ?? []).map((ajuste) => ({
    descripcion: ajuste.descripcion,
    importeCent: ajuste.importeCent,
    nota: ajuste.nota,
  }));
}

export async function generarResumenCobroComercial(input: GenerarResumenCobroInput): Promise<GenerarResumenCobroResult> {
  const resumenDemo = resumenCobroDemo(input.estudio, input.mes, input.ajustes);
  if (!process.env.DATABASE_URL || !uuidRegex.test(input.estudio.id)) {
    return {
      ok: true,
      modo: "demo",
      mensaje: "Resumen simulado: falta DATABASE_URL o el estudio demo no tiene UUID real.",
      resumen: resumenDemo,
    };
  }

  const { db } = await import("cierrabe/datos/db");
  const resumen = await generarResumenCobroAdmin(
    adminDesarrollo,
    {
      suscripciones: crearSuscripcionesRepo(db),
      planes: crearPlanesRepo(db),
      usoFacturable: crearUsoFacturableRepo(db),
      resumenesCobro: crearResumenesCobroRepo(db),
      auditoria: crearAuditoriaRepo(db),
    },
    input.estudio.id as EstudioId,
    {
      mes: input.mes,
      ajustes: ajustesBackend(input.ajustes),
    },
  );

  revalidatePath("/admin");
  return {
    ok: true,
    modo: "real",
    mensaje: "Resumen de cobro generado y guardado en el backend.",
    resumen: {
      estudioId: resumen.estudioId,
      mes: resumen.mes,
      moneda: resumen.moneda,
      lineas: resumen.lineas.map((linea) => ({
        tipo: linea.tipo,
        concepto: linea.concepto,
        cantidad: linea.cantidad,
        totalCent: linea.totalCent,
        nota: linea.nota,
      })),
      eventosUso: resumen.eventosUso.map((evento) => ({ tipo: evento.tipo, cantidad: evento.cantidad })),
      totalCent: resumen.totalCent,
      notasInternas: resumen.notasInternas,
      generado: resumen.generado,
    },
  };
}

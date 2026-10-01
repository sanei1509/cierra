"use server";

import { revalidatePath } from "next/cache";
import { configurarSuscripcionEstudio, crearEstudioConAccesoInicial, generarResumenCobroAdmin, registrarPagoEstudioAdmin } from "cierrabe/acciones";
import type { EstudioId } from "cierrabe/datos/contexto";
import { crearAuditoriaRepo, crearEstudiosRepo, crearPagosRepo, crearPlanesRepo, crearResumenesCobroRepo, crearSuscripcionesRepo, crearUsoFacturableRepo, crearUsuariosRepo } from "cierrabe/datos/repos";
import type { AjusteManualCobro, CrearSuscripcionEstudioInput } from "cierrabe/facturacion";
import { contextoAdminDesarrollo, uuidValido } from "@/lib/backend-dev-context";
import { ADDONS_ADMIN, planPorCodigo, resumenCobroDemo, type AjusteCobroAdmin, type CodigoModulo, type EstudioAdmin, type ResumenCobroAdmin } from "@/lib/comercial-demo";

export interface GuardarConfiguracionComercialInput {
  estudio: EstudioAdmin;
}

export interface CrearEstudioInicialInput {
  nombre: string;
  duenoNombre: string;
  duenoEmail: string;
}

export interface RegistrarPagoComercialInput {
  estudio: EstudioAdmin;
  mes: string;
  importeCent: number;
  mesesCubiertos: number;
  nota?: string;
}

export interface RegistrarPagoComercialResult {
  ok: boolean;
  mensaje: string;
  modo: "real" | "demo";
  pagadoCent: number;
}

export interface GuardarConfiguracionComercialResult {
  ok: boolean;
  mensaje: string;
  modo: "real" | "demo";
}

export interface CrearEstudioInicialResult extends GuardarConfiguracionComercialResult {
  estudioId?: string;
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
  const adminDesarrollo = contextoAdminDesarrollo();
  if (!adminDesarrollo) {
    return {
      ok: true,
      modo: "demo",
      mensaje: "Guardado simulado: falta DATABASE_URL o CIERRA_DEV_ADMIN_ID con UUID real.",
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

export async function crearEstudioInicialAdmin(input: CrearEstudioInicialInput): Promise<CrearEstudioInicialResult> {
  const adminDesarrollo = contextoAdminDesarrollo();
  if (!adminDesarrollo) {
    return {
      ok: true,
      modo: "demo",
      mensaje: "Estudio creado en demo: falta DATABASE_URL o admin de desarrollo con UUID real.",
    };
  }

  const { db } = await import("cierrabe/datos/db");
  const res = await crearEstudioConAccesoInicial(
    adminDesarrollo,
    {
      estudios: crearEstudiosRepo(db),
      usuarios: crearUsuariosRepo(db),
      auditoria: crearAuditoriaRepo(db),
    },
    {
      estudio: {
        nombre: input.nombre,
        nombreVisible: input.nombre,
        emailContacto: input.duenoEmail,
      },
      dueno: {
        nombre: input.duenoNombre,
        email: input.duenoEmail,
      },
    },
  );

  revalidatePath("/admin");
  return {
    ok: true,
    modo: "real",
    mensaje: `Estudio guardado en backend con acceso inicial para ${res.usuario.email}.`,
    estudioId: res.estudio.id,
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
  const adminDesarrollo = contextoAdminDesarrollo();
  if (!adminDesarrollo || !uuidValido(input.estudio.id)) {
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

export async function registrarPagoComercial(input: RegistrarPagoComercialInput): Promise<RegistrarPagoComercialResult> {
  const adminDesarrollo = contextoAdminDesarrollo();
  if (!adminDesarrollo || !uuidValido(input.estudio.id)) {
    return {
      ok: true,
      modo: "demo",
      mensaje: input.mesesCubiertos > 1 ? `Pago adelantado simulado para ${input.mesesCubiertos} meses.` : "Pago mensual simulado.",
      pagadoCent: input.importeCent,
    };
  }

  const { db } = await import("cierrabe/datos/db");
  await registrarPagoEstudioAdmin(
    adminDesarrollo,
    {
      pagos: crearPagosRepo(db),
      resumenesCobro: crearResumenesCobroRepo(db),
      auditoria: crearAuditoriaRepo(db),
    },
    input.estudio.id as EstudioId,
    {
      moneda: input.estudio.moneda,
      importeCent: input.importeCent,
      fecha: new Date().toISOString().slice(0, 10),
      medio: "manual",
      nota: input.nota,
      desdeMes: input.mes,
      mesesCubiertos: input.mesesCubiertos,
    },
  );

  revalidatePath("/admin");
  return {
    ok: true,
    modo: "real",
    mensaje: "Pago registrado en el backend.",
    pagadoCent: input.importeCent,
  };
}

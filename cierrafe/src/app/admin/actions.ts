"use server";

import { revalidatePath } from "next/cache";
import { cancelarPagoEstudioAdmin, configurarSuscripcionEstudio, crearEstudioConAccesoInicial, generarResumenCobroAdmin, registrarPagoEstudioAdmin } from "cierrabe/acciones";
import type { EstudioId } from "cierrabe/datos/contexto";
import { crearAuditoriaRepo, crearEstudiosRepo, crearModulosRepo, crearPagosRepo, crearPlanesRepo, crearResumenesCobroRepo, crearSuscripcionesRepo, crearUsoFacturableRepo, crearUsuariosRepo } from "cierrabe/datos/repos";
import type { AjusteManualCobro, CrearSuscripcionEstudioInput } from "cierrabe/facturacion";
import { contextoAdminDesarrollo, uuidValido } from "@/lib/backend-dev-context";
import { moduloNombre, planPorCodigo, resumenCobroDemo, type AddonAdmin, type AjusteCobroAdmin, type CodigoModulo, type EstudioAdmin, type ModuloAdmin, type PlanAdmin, type ResumenCobroAdmin } from "@/lib/comercial-demo";
import { obtenerSesionDev } from "@/lib/dev-auth";

export interface GuardarConfiguracionComercialInput {
  estudio: EstudioAdmin;
  planesDisponibles: PlanAdmin[];
  addonsDisponibles: AddonAdmin[];
}

export interface DatosConsolaComercial {
  estudios: EstudioAdmin[];
  planes: PlanAdmin[];
  modulos: ModuloAdmin[];
  addonsDisponibles: AddonAdmin[];
  resumenesPorMes: Record<string, ResumenCobroAdmin>;
  pagosRegistrados: PagoRegistradoComercial[];
  modo: "real" | "sin_backend";
  mensaje?: string;
}

export interface PagoRegistradoComercial {
  id: string;
  pagoId?: string;
  estudioId: string;
  descripcion: string;
  importeCent: number;
  aplicaciones: { mes: string; importeCent: number }[];
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
  pagoId?: string;
}

export interface CancelarPagoComercialInput {
  estudio: EstudioAdmin;
  pagoId?: string;
}

export interface CancelarPagoComercialResult {
  ok: boolean;
  mensaje: string;
  modo: "real" | "demo";
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

function addonInput(codigos: CodigoModulo[], inicio: string, addonsDisponibles: AddonAdmin[]) {
  return addonsDisponibles
    .filter((addon) => codigos.includes(addon.moduloCodigo))
    .map((addon) => ({
      moduloCodigo: addon.moduloCodigo,
      precioMensualCent: addon.precioMensualCent,
      inicio,
    })) as CrearSuscripcionEstudioInput["addons"];
}

function suscripcionDesdeEstudio(estudio: EstudioAdmin, planes: PlanAdmin[], addonsDisponibles: AddonAdmin[]): CrearSuscripcionEstudioInput {
  const plan = planPorCodigo(estudio.planCodigo, planes);
  if (!plan) throw new Error("No encontramos el plan comercial seleccionado.");
  const inicio = new Date().toISOString().slice(0, 10);

  return {
    estudioId: estudio.id as EstudioId,
    planId: plan.id,
    estado: estudio.estado,
    moneda: estudio.moneda,
    precioMensualCent: plan.precioMensualCent,
    inicio,
    notasInternas: estudio.notas,
    addons: addonInput(estudio.addons, inicio, addonsDisponibles),
    overrides: [],
    resumen: `Configuracion comercial de ${estudio.nombre}: ${plan.nombre}`,
  };
}

export async function listarDatosConsolaComercial(): Promise<DatosConsolaComercial> {
  const adminDesarrollo = contextoAdminDesarrollo(await obtenerSesionDev());
  if (!adminDesarrollo) {
    return {
      estudios: [],
      planes: [],
      modulos: [],
      addonsDisponibles: [],
      resumenesPorMes: {},
      pagosRegistrados: [],
      modo: "sin_backend",
      mensaje: "No hay datos comerciales cargados para mostrar la consola.",
    };
  }

  const { db } = await import("cierrabe/datos/db");
  const estudiosRepo = crearEstudiosRepo(db);
  const planesRepo = crearPlanesRepo(db);
  const modulosRepo = crearModulosRepo(db);
  const suscripcionesRepo = crearSuscripcionesRepo(db);
  const usoFacturableRepo = crearUsoFacturableRepo(db);
  const resumenesCobroRepo = crearResumenesCobroRepo(db);
  const pagosRepo = crearPagosRepo(db);

  const [estudiosBackend, planesBackend, modulosBackend, eventosUso, resumenesBackend, pagosBackend, aplicacionesBackend] = await Promise.all([
    estudiosRepo.listar(),
    planesRepo.listar(),
    modulosRepo.listarActivos(),
    usoFacturableRepo.listar({ mes: "2026-10" }),
    resumenesCobroRepo.listar({}),
    pagosRepo.listarPagos({}),
    pagosRepo.listarAplicaciones({}),
  ]);

  const planes: PlanAdmin[] = planesBackend.map((plan) => ({
    id: plan.id,
    codigo: plan.codigo,
    nombre: plan.nombre,
    precioMensualCent: plan.precioMensualCent,
    modulos: plan.modulos,
  }));
  const modulos: ModuloAdmin[] = modulosBackend.map((modulo) => ({ codigo: modulo.codigo, nombre: modulo.nombre, estado: modulo.estado }));
  const suscripciones = await Promise.all(estudiosBackend.map((estudio) => suscripcionesRepo.obtenerVigente(estudio.id)));
  const addonsDisponibles = [
    ...new Map(
      suscripciones
        .flatMap((suscripcion) => suscripcion?.addons ?? [])
        .map((addon) => [addon.moduloCodigo, { moduloCodigo: addon.moduloCodigo, precioMensualCent: addon.precioMensualCent }] as const),
    ).values(),
  ];

  return {
    modo: "real",
    planes,
    modulos,
    addonsDisponibles,
    resumenesPorMes: Object.fromEntries(
      resumenesBackend.map((resumen) => [
        `${resumen.estudioId}:${resumen.mes}`,
        {
          estudioId: resumen.estudioId,
          mes: resumen.mes,
          moneda: resumen.moneda,
          lineas: resumen.lineas.map((linea) => ({ ...linea, concepto: linea.moduloCodigo ? moduloNombre(linea.moduloCodigo, modulos) : linea.concepto })),
          eventosUso: resumen.eventosUso.map((evento) => ({ tipo: evento.tipo, cantidad: evento.cantidad })),
          totalCent: resumen.totalCent,
          notasInternas: resumen.notasInternas,
          generado: resumen.generado,
        } satisfies ResumenCobroAdmin,
      ]),
    ),
    pagosRegistrados: pagosBackend.map((pago) => ({
      id: pago.id ?? `${pago.estudioId}:${pago.fecha}:${pago.importeCent}`,
      pagoId: pago.id,
      estudioId: pago.estudioId,
      descripcion: pago.nota ?? `Pago de ${pago.fecha.slice(0, 7)}`,
      importeCent: pago.importeCent,
      aplicaciones: aplicacionesBackend.filter((aplicacion) => aplicacion.pagoId === pago.id).map((aplicacion) => ({ mes: aplicacion.mes, importeCent: aplicacion.importeCent })),
    })),
    estudios: estudiosBackend
      .map((estudio, index): EstudioAdmin | null => {
        const suscripcion = suscripciones[index];
        const plan = suscripcion ? planesBackend.find((p) => p.id === suscripcion.planId) : null;
        if (!suscripcion || !plan) return null;
        return {
          id: estudio.id,
          nombre: estudio.nombreVisible ?? estudio.nombre,
          estado: suscripcion.estado === "cancelado" || suscripcion.estado === "vencido" ? "pausado" : suscripcion.estado,
          planCodigo: plan.codigo,
          addons: suscripcion.addons.map((addon) => addon.moduloCodigo),
          moneda: suscripcion.moneda,
          notas: suscripcion.notasInternas ?? "",
          eventosUso: eventosUso.filter((evento) => evento.estudioId === estudio.id).map((evento) => ({ tipo: evento.tipo, cantidad: evento.cantidad })),
        };
      })
      .filter((estudio): estudio is EstudioAdmin => Boolean(estudio)),
  };
}

export async function guardarConfiguracionComercial(input: GuardarConfiguracionComercialInput): Promise<GuardarConfiguracionComercialResult> {
  const adminDesarrollo = contextoAdminDesarrollo(await obtenerSesionDev());
  if (!adminDesarrollo || !uuidValido(input.estudio.id)) {
    return {
      ok: true,
      modo: "demo",
      mensaje: "Guardado en modo demo.",
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
    suscripcionDesdeEstudio(input.estudio, input.planesDisponibles, input.addonsDisponibles),
  );

  revalidatePath("/admin");
  return {
    ok: true,
    modo: "real",
    mensaje: "Cambios guardados.",
  };
}

export async function crearEstudioInicialAdmin(input: CrearEstudioInicialInput): Promise<CrearEstudioInicialResult> {
  const adminDesarrollo = contextoAdminDesarrollo(await obtenerSesionDev());
  if (!adminDesarrollo) {
    return {
      ok: true,
      modo: "demo",
      mensaje: "Estudio creado en modo demo.",
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
    mensaje: `Estudio creado con acceso inicial para ${res.usuario.email}.`,
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
  const datos = await listarDatosConsolaComercial();
  const resumenDemo = resumenCobroDemo(input.estudio, input.mes, input.ajustes, datos.planes, datos.addonsDisponibles, datos.modulos);
  const adminDesarrollo = contextoAdminDesarrollo(await obtenerSesionDev());
  if (!adminDesarrollo || !uuidValido(input.estudio.id)) {
    return {
      ok: true,
      modo: "demo",
      mensaje: "Factura preparada en modo demo.",
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
    mensaje: "Factura emitida.",
    resumen: {
      estudioId: resumen.estudioId,
      mes: resumen.mes,
      moneda: resumen.moneda,
      lineas: resumen.lineas.map((linea) => ({
        tipo: linea.tipo,
        concepto: linea.tipo === "addon" && linea.moduloCodigo ? moduloNombre(linea.moduloCodigo, datos.modulos) : linea.concepto,
        cantidad: linea.cantidad,
        totalCent: linea.totalCent,
        nota: linea.tipo === "plan" ? "Precio mensual del plan." : linea.tipo === "addon" ? "Módulo adicional contratado." : linea.nota,
      })),
      eventosUso: resumen.eventosUso.map((evento) => ({ tipo: evento.tipo, cantidad: evento.cantidad })),
      totalCent: resumen.totalCent,
      notasInternas: resumen.notasInternas,
      generado: resumen.generado,
    },
  };
}

export async function registrarPagoComercial(input: RegistrarPagoComercialInput): Promise<RegistrarPagoComercialResult> {
  const adminDesarrollo = contextoAdminDesarrollo(await obtenerSesionDev());
  if (!adminDesarrollo || !uuidValido(input.estudio.id)) {
    return {
      ok: true,
      modo: "demo",
      mensaje: input.mesesCubiertos > 1 ? `Pago adelantado simulado para ${input.mesesCubiertos} meses.` : "Pago mensual simulado.",
      pagadoCent: input.importeCent,
    };
  }

  const { db } = await import("cierrabe/datos/db");
  const guardado = await registrarPagoEstudioAdmin(
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
    mensaje: "Pago registrado.",
    pagadoCent: input.importeCent,
    pagoId: guardado.pago.id,
  };
}

export async function cancelarPagoComercial(input: CancelarPagoComercialInput): Promise<CancelarPagoComercialResult> {
  const adminDesarrollo = contextoAdminDesarrollo(await obtenerSesionDev());
  if (!adminDesarrollo || !uuidValido(input.estudio.id) || !input.pagoId) {
    return {
      ok: true,
      modo: "demo",
      mensaje: "Pago cancelado.",
    };
  }

  const { db } = await import("cierrabe/datos/db");
  await cancelarPagoEstudioAdmin(
    adminDesarrollo,
    {
      pagos: crearPagosRepo(db),
      auditoria: crearAuditoriaRepo(db),
    },
    input.estudio.id as EstudioId,
    input.pagoId,
  );

  revalidatePath("/admin");
  return {
    ok: true,
    modo: "real",
    mensaje: "Pago cancelado.",
  };
}

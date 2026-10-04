"use client";

import clsx from "clsx";
import { ArrowLeft, Building2, Calculator, CircleDollarSign, ClipboardList, CreditCard, FileClock, FileText, Layers3, Pencil, Plus, Printer, Save, Search, ShieldCheck, Undo2, UserCog, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import {
  generarResumenCobroComercial,
  guardarConfiguracionComercial,
  crearEstudioInicialAdmin,
  cancelarPagoComercial,
  registrarPagoComercial,
  type DatosConsolaComercial,
  type CrearEstudioInicialResult,
  type GenerarResumenCobroResult,
  type GuardarConfiguracionComercialResult,
  type PagoRegistradoComercial,
  type RegistrarPagoComercialResult,
} from "@/app/admin/actions";
import {
  estadoPagoDemo,
  fmtCent,
  moduloNombre,
  planPorCodigo,
  resumenCobroDemo,
  totalMensualCent,
  type AjusteCobroAdmin,
  type CodigoModulo,
  type EstudioAdmin,
  type PlanAdmin,
  type ResumenCobroAdmin,
} from "@/lib/comercial-demo";
import { Logo } from "./shell";
import { Boton, Campo, Chip, Drawer, Modal, Panel, inputCls } from "./ui";
import { fechaHora } from "@/lib/format";
import { ESTUDIO } from "@/lib/seed";
import { useStore } from "@/lib/store";

function slugId(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 32);
}

function estadoChip(estado: EstudioAdmin["estado"]) {
  if (estado === "activo") return <Chip tono="menta">Activo</Chip>;
  if (estado === "prueba") return <Chip tono="crema">En prueba</Chip>;
  return <Chip tono="rosa">Pausado</Chip>;
}

function toggleAddon(addons: CodigoModulo[], codigo: CodigoModulo) {
  return addons.includes(codigo) ? addons.filter((a) => a !== codigo) : [...addons, codigo];
}

function usoNombre(tipo: string) {
  if (tipo === "empresa_activa") return "Empresas activas";
  if (tipo === "empleado_activo") return "Empleados activos";
  if (tipo === "recibo_generado") return "Recibos generados";
  if (tipo === "recibo_enviado") return "Recibos enviados";
  return tipo;
}

function AvisoAccion({ ok, mensaje, onCerrar }: { ok: boolean; mensaje: string; onCerrar: () => void }) {
  return (
    <div className={clsx("mt-4 flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-semibold", ok ? "bg-menta text-menta-t" : "bg-rosa text-rosa-t")} role={ok ? "status" : "alert"}>
      <span>{mensaje}</span>
      <button type="button" onClick={onCerrar} className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg hover:bg-white/45" aria-label="Cerrar aviso">
        <X size={14} />
      </button>
    </div>
  );
}

function mismaConfiguracion(a: EstudioAdmin | undefined, b: EstudioAdmin | undefined) {
  if (!a || !b) return false;
  return (
    a.planCodigo === b.planCodigo &&
    a.estado === b.estado &&
    a.moneda === b.moneda &&
    a.notas === b.notas &&
    [...a.addons].sort().join("|") === [...b.addons].sort().join("|")
  );
}

function ayudaEstado(estado: EstudioAdmin["estado"]) {
  if (estado === "activo") return "Funciona todo lo contratado y guarda los cambios en la base.";
  if (estado === "prueba") return "Puede probar todos los modulos con datos de prueba; lo que cargue no deberia quedar como trabajo definitivo.";
  return "Queda solo en modo consulta: no opera modulos ni guarda cambios de trabajo.";
}

function modulosIncrementales(indice: number, planes: { modulos: CodigoModulo[] }[]) {
  if (indice === 0) return planes[0]?.modulos ?? [];
  const previos = new Set(planes.slice(0, indice).flatMap((plan) => plan.modulos));
  return planes[indice]?.modulos.filter((modulo) => !previos.has(modulo)) ?? [];
}

function pesosDesdeCent(cent: number) {
  return String(Math.round(cent / 100));
}

function nombreMesCobro(mes: string) {
  const [anio, mesNumero] = mes.split("-").map(Number);
  if (!anio || !mesNumero) return mes;
  return new Intl.DateTimeFormat("es-UY", { month: "long", year: "numeric" }).format(new Date(anio, mesNumero - 1, 1));
}

function tituloPagoVista(pago: { descripcion: string; aplicaciones: { mes: string; importeCent: number }[] }, totalMesCent?: number) {
  const meses = pago.aplicaciones.map((aplicacion) => aplicacion.mes).sort();
  if (pago.descripcion.startsWith("Pago a cuenta")) {
    if (meses.length > 1) return `Pago a cuenta desde ${nombreMesCobro(meses[0])} · ${meses.length} meses`;
    if (meses[0]) return `Pago a cuenta de ${nombreMesCobro(meses[0])}`;
    return pago.descripcion;
  }
  if (meses.length === 1) {
    const esParcial = totalMesCent !== undefined && pago.aplicaciones[0].importeCent < totalMesCent;
    return `${esParcial ? "Pago parcial de" : "Pago de"} ${nombreMesCobro(meses[0])}`;
  }
  if (meses.length > 1) return `Pago de ${meses.length} meses desde ${nombreMesCobro(meses[0])}`;

  const mesTecnico = pago.descripcion.match(/^Pago de (\d{4}-\d{2})$/);
  if (mesTecnico) return `Pago de ${nombreMesCobro(mesTecnico[1])}`;
  if (pago.descripcion.includes("consola admin")) return "Pago mensual";
  return pago.descripcion;
}

function fechaAuditoriaPago(pago: { id: string; aplicaciones: { mes: string }[] }) {
  const timestamp = pago.id.match(/^(\d{13})(?:-|$)/)?.[1];
  if (timestamp) {
    const fecha = new Date(Number(timestamp));
    if (Number.isFinite(fecha.getTime())) return fecha.toISOString();
  }
  const primerMes = pago.aplicaciones.map((aplicacion) => aplicacion.mes).sort()[0];
  if (primerMes && /^\d{4}-\d{2}$/.test(primerMes)) return `${primerMes}-01T12:00:00.000Z`;
  return new Date().toISOString();
}

function mesActualCobro() {
  return new Date().toISOString().slice(0, 7);
}

function sumarMesCobro(mes: string, cantidad: number) {
  const [anio, mesNumero] = mes.split("-").map(Number);
  if (!anio || !mesNumero) return mesActualCobro();
  const fecha = new Date(Date.UTC(anio, mesNumero - 1 + cantidad, 1));
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}`;
}

function mesesResumenDisponibles(mesBase: string) {
  return Array.from({ length: 13 }, (_, index) => sumarMesCobro(mesBase, -index));
}

function mesesFuturosDisponibles(mesBase: string) {
  return Array.from({ length: 12 }, (_, index) => sumarMesCobro(mesBase, index + 1));
}

function centDesdePesos(valor: string) {
  const numero = Number(valor.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(numero) && numero >= 0 ? Math.round(numero * 100) : 0;
}

const PRECIOS_MODULO_BASE: Record<string, number> = {
  rrhh_core: 250000,
  salary_history: 150000,
  bulk_import_excel: 180000,
  payroll_core: 420000,
  payroll_receipts: 220000,
  bps_exports: 280000,
  irpf_calculation: 240000,
  leave_management: 180000,
  accounting_entries: 260000,
  salary_disbursement: 500000,
  company_portal: 260000,
  employee_portal: 220000,
  audit_basic: 120000,
  automatic_receipt_email: 350000,
  advanced_reports: 450000,
  digital_receipt_acceptance: 300000,
  labor_document_storage: 250000,
};

type PagoRegistradoVista = PagoRegistradoComercial;
type AuditoriaVista = "inicio" | "admin" | "estudio" | "empresa";
type AuditoriaEmpresaModo = "por_estudio" | "directa" | null;
type CancelacionComercialPendiente =
  | { tipo: "factura"; mes: string }
  | { tipo: "pago"; pago: PagoRegistradoVista };
type EventoAuditoriaAdmin = {
  id: string;
  fecha: string;
  actor: string;
  estudioId?: string;
  empresaId?: string;
  entidad: string;
  accion: string;
  detalle?: string;
};

export function AdminCommercialConsole({
  datosIniciales,
  auditoriaActor,
  actuarComoEstudioAction,
}: {
  datosIniciales: DatosConsolaComercial;
  auditoriaActor?: string;
  actuarComoEstudioAction?: () => Promise<void>;
}) {
  const [estudios, setEstudios] = useState(datosIniciales.estudios);
  const [estudiosGuardados, setEstudiosGuardados] = useState(datosIniciales.estudios);
  const [planes, setPlanes] = useState(datosIniciales.planes);
  const [planesGuardados, setPlanesGuardados] = useState(datosIniciales.planes);
  const modulosCatalogo = datosIniciales.modulos;
  const [preciosModulo, setPreciosModulo] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      datosIniciales.modulos.map((modulo) => [
        modulo.codigo,
        datosIniciales.addonsDisponibles.find((addon) => addon.moduloCodigo === modulo.codigo)?.precioMensualCent ?? PRECIOS_MODULO_BASE[modulo.codigo] ?? 200000,
      ]),
    ),
  );
  const [preciosModuloGuardados, setPreciosModuloGuardados] = useState(preciosModulo);
  const [seleccionadoId, setSeleccionadoId] = useState(estudios[0]?.id ?? "");
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [modulosAbierto, setModulosAbierto] = useState(false);
  const [facturaAbierta, setFacturaAbierta] = useState(false);
  const [facturasVencidasAbierto, setFacturasVencidasAbierto] = useState(false);
  const [historicoPagosAbierto, setHistoricoPagosAbierto] = useState(false);
  const [editandoPrecioPlan, setEditandoPrecioPlan] = useState<string | null>(null);
  const [editandoPreciosModulos, setEditandoPreciosModulos] = useState(false);
  const [errorNuevo, setErrorNuevo] = useState("");
  const [resultadoNuevo, setResultadoNuevo] = useState<CrearEstudioInicialResult | null>(null);
  const [resultado, setResultado] = useState<GuardarConfiguracionComercialResult | null>(null);
  const [resultadoResumen, setResultadoResumen] = useState<GenerarResumenCobroResult | null>(null);
  const [resultadoPago, setResultadoPago] = useState<RegistrarPagoComercialResult | null>(null);
  const [mesCobro, setMesCobro] = useState(mesActualCobro());
  const [descuentoAbierto, setDescuentoAbierto] = useState(false);
  const [ajusteDescripcion, setAjusteDescripcion] = useState("");
  const [ajusteMonto, setAjusteMonto] = useState("");
  const [ajusteConfirmado, setAjusteConfirmado] = useState<AjusteCobroAdmin | null>(null);
  const [pagoACuentaAbierto, setPagoACuentaAbierto] = useState(false);
  const [pagoACuentaEnRevision, setPagoACuentaEnRevision] = useState(false);
  const [pagoACuentaImporte, setPagoACuentaImporte] = useState("");
  const [pagoACuentaDesdeMes, setPagoACuentaDesdeMes] = useState(() => sumarMesCobro(mesActualCobro(), 1));
  const [pagoACuentaMeses, setPagoACuentaMeses] = useState(1);
  const [auditoriaVista, setAuditoriaVista] = useState<AuditoriaVista>("inicio");
  const [auditoriaEstudioId, setAuditoriaEstudioId] = useState("");
  const [auditoriaEmpresaModo, setAuditoriaEmpresaModo] = useState<AuditoriaEmpresaModo>(null);
  const [auditoriaEmpresaId, setAuditoriaEmpresaId] = useState("");
  const [busquedaEmpresaAudit, setBusquedaEmpresaAudit] = useState("");
  const [auditoriaDesde, setAuditoriaDesde] = useState("");
  const [auditoriaHasta, setAuditoriaHasta] = useState("");
  const [auditoriaAccion, setAuditoriaAccion] = useState("");
  const [auditoriaUsuario, setAuditoriaUsuario] = useState("");
  const [auditoriaEntidad, setAuditoriaEntidad] = useState("todas");
  const [auditoriaPagina, setAuditoriaPagina] = useState(1);
  const [resumenesPorMes, setResumenesPorMes] = useState<Record<string, ResumenCobroAdmin>>(datosIniciales.resumenesPorMes);
  const [pagosDemo, setPagosDemo] = useState<Record<string, number>>(() => {
    const pagos: Record<string, number> = {};
    for (const pago of datosIniciales.pagosRegistrados) {
      for (const aplicacion of pago.aplicaciones) {
        const key = `${pago.estudioId}:${aplicacion.mes}`;
        pagos[key] = (pagos[key] ?? 0) + aplicacion.importeCent;
      }
    }
    return pagos;
  });
  const [pagosRegistrados, setPagosRegistrados] = useState<PagoRegistradoVista[]>(datosIniciales.pagosRegistrados);
  const [cancelacionPendiente, setCancelacionPendiente] = useState<CancelacionComercialPendiente | null>(null);
  const [confirmandoFactura, setConfirmandoFactura] = useState(false);
  const [pendiente, startTransition] = useTransition();
  const [pendienteNuevo, startNuevoTransition] = useTransition();
  const [pendientePago, startPagoTransition] = useTransition();
  const auditOperativa = useStore((s) => s.audit);
  const empresasOperativas = useStore((s) => s.empresas);
  const seleccionado = estudios.find((e) => e.id === seleccionadoId) ?? estudios[0];
  const seleccionadoGuardado = estudiosGuardados.find((e) => e.id === seleccionadoId);
  const plan = seleccionado ? planPorCodigo(seleccionado.planCodigo, planes) : undefined;
  const planPruebaInicial = planes.find((p) => p.codigo === "full") ?? planes.at(-1) ?? plan;
  const addonsDisponiblesParaPlan = (planBase: PlanAdmin | undefined) => {
    const incluidos = new Set(planBase?.modulos ?? []);
    return modulosCatalogo
      .filter((modulo) => !incluidos.has(modulo.codigo))
      .map((modulo) => ({
        moduloCodigo: modulo.codigo,
        precioMensualCent: preciosModulo[modulo.codigo] ?? 0,
      }));
  };
  const addonsCodigosParaPlan = (planBase: PlanAdmin | undefined) => addonsDisponiblesParaPlan(planBase).map((addon) => addon.moduloCodigo);
  const addonsVisibles = seleccionado?.addons ?? [];
  const modulosVisibles = useMemo(() => (seleccionado && plan ? [...new Set([...plan.modulos, ...addonsVisibles])] : []), [addonsVisibles, plan, seleccionado]);
  const modulosFueraDelPlan = useMemo(() => {
    const incluidos = new Set(plan?.modulos ?? []);
    return modulosCatalogo
      .filter((modulo) => !incluidos.has(modulo.codigo))
      .map((modulo) => ({
        moduloCodigo: modulo.codigo,
        precioMensualCent: preciosModulo[modulo.codigo] ?? 0,
      }));
  }, [modulosCatalogo, plan, preciosModulo]);
  const total = seleccionado ? totalMensualCent(seleccionado, planes, modulosFueraDelPlan) : 0;
  const hayCambiosPreciosPlanes = JSON.stringify(planes.map((p) => [p.id, p.precioMensualCent])) !== JSON.stringify(planesGuardados.map((p) => [p.id, p.precioMensualCent]));
  const hayCambiosPreciosModulos = JSON.stringify(preciosModulo) !== JSON.stringify(preciosModuloGuardados);
  const hayCambiosModulos =
    [...(seleccionado?.addons ?? [])].sort().join("|") !== [...(seleccionadoGuardado?.addons ?? [])].sort().join("|") || hayCambiosPreciosModulos;
  const hayCambiosComerciales = !mismaConfiguracion(seleccionado, seleccionadoGuardado) || hayCambiosPreciosPlanes || hayCambiosPreciosModulos;
  const ajustes = useMemo<AjusteCobroAdmin[]>(() => {
    return ajusteConfirmado ? [ajusteConfirmado] : [];
  }, [ajusteConfirmado]);
  const resumenPreview = useMemo(
    () => (seleccionado ? resumenCobroDemo(seleccionado, mesCobro, ajustes, planes, modulosFueraDelPlan, modulosCatalogo) : null),
    [ajustes, mesCobro, modulosCatalogo, modulosFueraDelPlan, planes, seleccionado],
  );
  if (!seleccionado || !plan || !resumenPreview) {
    return (
      <Panel className="p-5">
        <h2 className="text-lg font-bold tracking-tight">Comercial</h2>
        <p className="mt-2 text-sm text-apagado">{datosIniciales.mensaje ?? "No hay estudios comerciales cargados. Corré el seed de desarrollo para inicializar la consola."}</p>
      </Panel>
    );
  }
  const resumenKey = `${seleccionado.id}:${mesCobro}`;
  const resumenGuardado = resumenesPorMes[resumenKey];
  const resumenVisible = resumenGuardado ?? resumenPreview;
  const mesesConResumen = Object.keys(resumenesPorMes).filter((key) => key.startsWith(`${seleccionado.id}:`)).map((key) => key.split(":")[1]);
  const mesesSelector = [...new Set([...mesesConResumen, ...mesesResumenDisponibles(mesActualCobro())])].sort().reverse();
  const mesesPagoACuenta = [...new Set([pagoACuentaDesdeMes, ...mesesFuturosDisponibles(mesCobro)])].sort();
  const importePagoACuentaCent = centDesdePesos(pagoACuentaImporte);
  const mesesPagoACuentaSeleccionados = Array.from({ length: pagoACuentaMeses }).map((_, index) => sumarMesCobro(pagoACuentaDesdeMes, index));
  const pagoKey = `${seleccionado.id}:${mesCobro}`;
  const pagadoDemoCent = pagosDemo[pagoKey] ?? 0;
  const estadoPago = estadoPagoDemo(resumenVisible.totalCent, pagadoDemoCent);
  const estadoFactura = !resumenGuardado ? "Factura en borrador" : estadoPago.estado === "pagado" || estadoPago.estado === "saldo_a_favor" ? "Factura paga" : "Factura emitida";
  const tonoFactura = !resumenGuardado ? "gris" : estadoPago.estado === "pagado" || estadoPago.estado === "saldo_a_favor" ? "menta" : "cielo";
  const facturaActualCancelable = Boolean(resumenGuardado) && estadoPago.estado !== "pagado" && estadoPago.estado !== "saldo_a_favor";
  const facturasDelEstudio = Object.values(resumenesPorMes)
    .filter((resumen) => resumen.estudioId === seleccionado.id)
    .toSorted((a, b) => b.mes.localeCompare(a.mes));
  const facturaMesActual = facturasDelEstudio.find((factura) => factura.mes === mesActualCobro());
  const estadoFacturaMesActual = facturaMesActual ? estadoPagoDemo(facturaMesActual.totalCent, pagosDemo[`${seleccionado.id}:${facturaMesActual.mes}`] ?? 0) : null;
  const facturaMesActualImpaga = facturaMesActual && estadoFacturaMesActual && estadoFacturaMesActual.estado !== "pagado" && estadoFacturaMesActual.estado !== "saldo_a_favor" ? facturaMesActual : null;
  const facturasVencidasImpagas = facturasDelEstudio.filter((factura) => {
    if (factura.mes >= mesActualCobro()) return false;
    const estado = estadoPagoDemo(factura.totalCent, pagosDemo[`${seleccionado.id}:${factura.mes}`] ?? 0);
    return estado.estado !== "pagado" && estado.estado !== "saldo_a_favor";
  });
  const pagosDelEstudio = pagosRegistrados
    .filter((pago) => pago.estudioId === seleccionado.id)
    .toSorted((a, b) => (b.aplicaciones[0]?.mes ?? "").localeCompare(a.aplicaciones[0]?.mes ?? ""));
  const actorAuditoriaAdmin = auditoriaActor ?? "admin@cierra.local";
  const auditoriaEstudioSeleccionadoId = auditoriaEstudioId || seleccionado.id;
  const eventosAuditoriaAdmin: EventoAuditoriaAdmin[] = (() => {
    const eventosFacturas = Object.values(resumenesPorMes).map((resumen) => ({
      id: `factura:${resumen.estudioId}:${resumen.mes}`,
      fecha: resumen.generado,
      actor: actorAuditoriaAdmin,
      estudioId: resumen.estudioId,
      entidad: "Factura",
      accion: `Emitio factura de ${nombreMesCobro(resumen.mes)}`,
      detalle: `${fmtCent(resumen.totalCent, resumen.moneda)} - ${resumen.lineas.length} ${resumen.lineas.length === 1 ? "concepto" : "conceptos"}`,
    }));
    const eventosPagos = pagosRegistrados.map((pago) => ({
      id: `pago:${pago.id}`,
      fecha: fechaAuditoriaPago(pago),
      actor: actorAuditoriaAdmin,
      estudioId: pago.estudioId,
      entidad: "Pago",
      accion: tituloPagoVista(pago),
      detalle: `${fmtCent(pago.importeCent, estudios.find((estudio) => estudio.id === pago.estudioId)?.moneda ?? "UYU")} - ${pago.aplicaciones.length} ${pago.aplicaciones.length === 1 ? "mes" : "meses"}`,
    }));
    const eventosConfiguracion = estudios.map((estudio) => {
      const planEstudio = planPorCodigo(estudio.planCodigo, planes);
      return {
        id: `config:${estudio.id}`,
        fecha: new Date().toISOString(),
        actor: actorAuditoriaAdmin,
        estudioId: estudio.id,
        entidad: "Configuracion comercial",
        accion: "Configuro plan, modulos y estado comercial",
        detalle: `${planEstudio?.nombre ?? estudio.planCodigo} - ${estudio.addons.length} ${estudio.addons.length === 1 ? "modulo extra" : "modulos extra"} - ${fmtCent(totalMensualCent(estudio, planes, addonsDisponiblesParaPlan(planEstudio)), estudio.moneda)}`,
      };
    });
    return [...eventosPagos, ...eventosFacturas, ...eventosConfiguracion].toSorted((a, b) => b.fecha.localeCompare(a.fecha));
  })();
  const eventosAuditoriaEstudio = eventosAuditoriaAdmin.filter((evento) => evento.estudioId === auditoriaEstudioSeleccionadoId);
  const estudioOperativoSeleccionado = estudios.find((estudio) => estudio.id === auditoriaEstudioSeleccionadoId)?.nombre === ESTUDIO.nombre;
  const empresasBaseAuditoria = auditoriaEmpresaModo === "por_estudio" ? (estudioOperativoSeleccionado ? empresasOperativas : []) : empresasOperativas;
  const empresasAudit = empresasBaseAuditoria.filter((empresa) => empresa.nombre.toLowerCase().includes(busquedaEmpresaAudit.trim().toLowerCase()));
  const empresaAuditSeleccionada = empresasOperativas.find((empresa) => empresa.id === auditoriaEmpresaId);
  const eventosAuditoriaEmpresa = auditOperativa.filter((evento) => evento.empresaId === auditoriaEmpresaId);
  const filtrarEventosAuditoria = (eventos: EventoAuditoriaAdmin[]) => {
    const accion = auditoriaAccion.trim().toLowerCase();
    const usuario = auditoriaUsuario.trim().toLowerCase();
    return eventos.filter((evento) => {
      const dia = evento.fecha.slice(0, 10);
      if (auditoriaDesde && dia < auditoriaDesde) return false;
      if (auditoriaHasta && dia > auditoriaHasta) return false;
      if (auditoriaEntidad !== "todas" && evento.entidad !== auditoriaEntidad) return false;
      if (usuario && !evento.actor.toLowerCase().includes(usuario)) return false;
      if (accion) {
        const texto = `${evento.entidad} ${evento.accion} ${evento.detalle ?? ""}`.toLowerCase();
        if (!texto.includes(accion)) return false;
      }
      return true;
    });
  };
  const eventosAdminFiltrados = filtrarEventosAuditoria(eventosAuditoriaAdmin);
  const eventosEstudioFiltrados = filtrarEventosAuditoria(eventosAuditoriaEstudio);
  const eventosEmpresaFiltrados = filtrarEventosAuditoria(eventosAuditoriaEmpresa);
  const entidadesAuditoria = [
    ...new Set(
      (auditoriaVista === "empresa" ? eventosAuditoriaEmpresa : auditoriaVista === "estudio" ? eventosAuditoriaEstudio : eventosAuditoriaAdmin).map((evento) => evento.entidad),
    ),
  ].sort();
  const mesesPagoACuentaSinFactura = mesesPagoACuentaSeleccionados.filter((mes) => !resumenesPorMes[`${seleccionado.id}:${mes}`]);
  const importeDescuentoInput = Math.abs(Number(ajusteMonto.replace(/\./g, "").replace(",", ".")));
  const puedeConfirmarDescuento = Boolean(ajusteDescripcion.trim()) && Number.isFinite(importeDescuentoInput) && importeDescuentoInput > 0;
  const vistaComercialEstudio = (estudio: EstudioAdmin) => {
    const planBase = planPorCodigo(estudio.planCodigo, planes);
    const addonsDisponibles = addonsDisponiblesParaPlan(planBase);
    return {
      plan: planBase,
      total: totalMensualCent(estudio, planes, addonsDisponibles),
    };
  };

  const actualizar = (cambios: Partial<EstudioAdmin>) => {
    setResultado(null);
    setResultadoResumen(null);
    setResultadoPago(null);
    setEstudios((actuales) => actuales.map((e) => (e.id === seleccionado.id ? { ...e, ...cambios } : e)));
  };

  const cambiarPlan = (codigo: string) => {
    const planNuevo = planPorCodigo(codigo, planes);
    const extrasPermitidos = new Set(addonsCodigosParaPlan(planNuevo));
    actualizar({ planCodigo: codigo, addons: seleccionado.addons.filter((addon) => extrasPermitidos.has(addon)) });
  };

  const crearEstudio = (form: FormData) => {
    setErrorNuevo("");
    setResultadoNuevo(null);
    const nombre = String(form.get("nombre") ?? "").trim();
    const duenoNombre = String(form.get("duenoNombre") ?? "").trim();
    const duenoEmail = String(form.get("duenoEmail") ?? "").trim().toLowerCase();
    const planCodigoForm = String(form.get("planCodigo") ?? planes[0]?.codigo ?? "");
    const estado = String(form.get("estado") ?? "prueba") as EstudioAdmin["estado"];
    const planCodigo = estado === "prueba" && planPruebaInicial ? planPruebaInicial.codigo : planCodigoForm;
    const moneda = String(form.get("moneda") ?? "UYU") as EstudioAdmin["moneda"];
    const notas = String(form.get("notas") ?? "").trim();
    if (!nombre || !duenoNombre || !/^\S+@\S+\.\S+$/.test(duenoEmail)) {
      setErrorNuevo("Completa estudio, dueno y un email valido.");
      return;
    }
    startNuevoTransition(async () => {
      try {
        const alta = await crearEstudioInicialAdmin({ nombre, duenoNombre, duenoEmail });
        const base = slugId(nombre) || "estudio";
        const id = alta.estudioId ?? (estudios.some((e) => e.id === base) ? `${base}-${Date.now().toString(36).slice(-4)}` : base);
        const nuevo: EstudioAdmin = {
          id,
          nombre,
          estado,
          planCodigo,
          addons: estado === "prueba" ? addonsCodigosParaPlan(planPruebaInicial) : [],
          moneda,
          notas: [`Dueno inicial: ${duenoNombre} <${duenoEmail}>`, notas].filter(Boolean).join(" · "),
        };
        setEstudios((actuales) => [nuevo, ...actuales]);
        setSeleccionadoId(id);
        setResultadoNuevo(alta);
        setResultado(alta);
        setResultadoResumen(null);
        setResultadoPago(null);
        setNuevoAbierto(false);
      } catch (error) {
        setResultadoNuevo({
          ok: false,
          modo: "real",
          mensaje: error instanceof Error ? error.message : "No pudimos crear el estudio.",
        });
      }
    });
  };

  const seleccionar = (id: string) => {
    setResultado(null);
    setResultadoResumen(null);
    setResultadoPago(null);
    setSeleccionadoId(id);
  };

  const guardar = (onOk?: () => void) => {
    if (!hayCambiosComerciales) return;
    startTransition(async () => {
      try {
        const codigosExtras = new Set(modulosFueraDelPlan.map((addon) => addon.moduloCodigo));
        const estudioAGuardar = { ...seleccionado, addons: seleccionado.addons.filter((codigo) => codigosExtras.has(codigo)) };
        const guardado = await guardarConfiguracionComercial({ estudio: estudioAGuardar, planesDisponibles: planes, addonsDisponibles: modulosFueraDelPlan });
        setResultado(guardado);
        if (guardado.ok) {
          setEstudios((actuales) => actuales.map((e) => (e.id === seleccionado.id ? estudioAGuardar : e)));
          setEstudiosGuardados((actuales) => actuales.map((e) => (e.id === seleccionado.id ? { ...estudioAGuardar, addons: [...estudioAGuardar.addons] } : e)));
          setPlanesGuardados(planes);
          setPreciosModuloGuardados(preciosModulo);
          onOk?.();
        }
      } catch (error) {
        console.error(error);
        setResultado({
          ok: false,
          modo: "real",
          mensaje: "No pudimos guardar la configuracion comercial. Revisa los datos del estudio y volve a intentar.",
        });
      }
    });
  };

  const confirmarDescuento = () => {
    if (!puedeConfirmarDescuento) return;
    setAjusteConfirmado({
      descripcion: ajusteDescripcion.trim(),
      importeCent: -Math.round(importeDescuentoInput * 100),
    });
    setResultadoResumen(null);
  };

  const quitarDescuento = () => {
    setAjusteDescripcion("");
    setAjusteMonto("");
    setAjusteConfirmado(null);
    setResultadoResumen(null);
  };

  const cancelarFactura = (mes = mesCobro) => {
    const key = `${seleccionado.id}:${mes}`;
    const resumen = resumenesPorMes[key];
    if (!resumen) return;
    const pago = estadoPagoDemo(resumen.totalCent, pagosDemo[key] ?? 0);
    if (pago.estado === "pagado" || pago.estado === "saldo_a_favor") {
      setResultadoResumen({ ok: false, modo: "demo", mensaje: "No se puede cancelar una factura paga. Cancelá primero el pago asociado.", resumen });
      return;
    }
    setResumenesPorMes((actual) => {
      const siguiente = { ...actual };
      delete siguiente[key];
      return siguiente;
    });
    if (mes === mesCobro) {
      setFacturaAbierta(false);
      setResultadoResumen({ ok: true, modo: "demo", mensaje: "Factura cancelada.", resumen: resumenPreview });
    }
  };

  const emitirFacturaSiHaceFalta = async () => {
    if (resumenesPorMes[resumenKey]) return true;
    setConfirmandoFactura(true);
    try {
      const generado = await generarResumenCobroComercial({ estudio: seleccionado, mes: mesCobro, ajustes });
      setResultadoResumen(generado);
      if (!generado.ok) return false;
      setResumenesPorMes((actual) => ({ ...actual, [resumenKey]: generado.resumen }));
      return true;
    } catch (error) {
      setResultadoResumen({
        ok: false,
        modo: "real",
        mensaje: error instanceof Error ? error.message : "No pudimos emitir la factura.",
        resumen: resumenPreview,
      });
      return false;
    } finally {
      setConfirmandoFactura(false);
    }
  };

  const registrarPago = (importeCent: number, meses: number, desdeMes = mesCobro, nota?: string) => {
    if (importeCent <= 0) return;
    startPagoTransition(async () => {
      try {
        const resultadoPagoNuevo = await registrarPagoComercial({
          estudio: seleccionado,
          mes: desdeMes,
          importeCent,
          mesesCubiertos: meses,
          nota: nota ?? (meses > 1 ? `Pago a cuenta por ${meses} meses` : `Pago de ${nombreMesCobro(desdeMes)}`),
        });
        setResultadoPago(resultadoPagoNuevo);
        const esPagoACuenta = nota?.startsWith("Pago a cuenta");
        const aplicaciones = Array.from({ length: meses }).map((_, index) => ({
          mes: sumarMesCobro(desdeMes, index),
          importeCent: esPagoACuenta ? resumenVisible.totalCent : importeCent,
        }));
        setPagosDemo((actual) => {
          const siguiente = { ...actual };
          aplicaciones.forEach((aplicacion) => {
            const key = `${seleccionado.id}:${aplicacion.mes}`;
            siguiente[key] = esPagoACuenta ? Math.max(siguiente[key] ?? 0, aplicacion.importeCent) : (siguiente[key] ?? 0) + aplicacion.importeCent;
          });
          return siguiente;
        });
        setPagosRegistrados((actual) => [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            pagoId: resultadoPagoNuevo.pagoId,
            estudioId: seleccionado.id,
            descripcion: esPagoACuenta ? `Pago a cuenta desde ${nombreMesCobro(desdeMes)} · ${meses} ${meses === 1 ? "mes" : "meses"}` : `Pago de ${nombreMesCobro(desdeMes)}`,
            importeCent,
            aplicaciones,
          },
          ...actual,
        ]);
        if (esPagoACuenta) {
          setPagoACuentaImporte("");
          setPagoACuentaAbierto(false);
          setPagoACuentaEnRevision(false);
        }
      } catch (error) {
        setResultadoPago({
          ok: false,
          modo: "real",
          mensaje: error instanceof Error ? error.message : "No pudimos registrar el pago.",
          pagadoCent: pagadoDemoCent,
        });
      }
    });
  };

  const cancelarPago = (pago: PagoRegistradoVista) => {
    startPagoTransition(async () => {
      try {
        const cancelado = await cancelarPagoComercial({ estudio: seleccionado, pagoId: pago.pagoId });
        setPagosDemo((actual) => {
          const siguiente = { ...actual };
          pago.aplicaciones.forEach((aplicacion) => {
            const key = `${pago.estudioId}:${aplicacion.mes}`;
            siguiente[key] = Math.max(0, (siguiente[key] ?? 0) - aplicacion.importeCent);
            if (siguiente[key] === 0) delete siguiente[key];
          });
          return siguiente;
        });
        setPagosRegistrados((actual) => actual.filter((p) => p.id !== pago.id));
        setResultadoPago({ ok: cancelado.ok, modo: cancelado.modo, mensaje: cancelado.mensaje, pagadoCent: 0 });
      } catch (error) {
        setResultadoPago({
          ok: false,
          modo: "real",
          mensaje: error instanceof Error ? error.message : "No pudimos cancelar el pago.",
          pagadoCent: 0,
        });
      }
    });
  };

  const confirmarCancelacionPendiente = () => {
    if (!cancelacionPendiente) return;
    if (cancelacionPendiente.tipo === "factura") {
      cancelarFactura(cancelacionPendiente.mes);
    } else {
      cancelarPago(cancelacionPendiente.pago);
    }
    setCancelacionPendiente(null);
  };

  const limpiarFiltrosAuditoria = () => {
    setAuditoriaDesde("");
    setAuditoriaHasta("");
    setAuditoriaAccion("");
    setAuditoriaUsuario("");
    setAuditoriaEntidad("todas");
    setAuditoriaPagina(1);
  };

  const volverAuditoriaInicio = () => {
    setAuditoriaVista("inicio");
    setAuditoriaEmpresaModo(null);
    setAuditoriaEmpresaId("");
    setBusquedaEmpresaAudit("");
    setAuditoriaPagina(1);
    limpiarFiltrosAuditoria();
  };

  const abrirVistaAuditoria = (vista: AuditoriaVista) => {
    setAuditoriaVista(vista);
    if (vista === "estudio" && !auditoriaEstudioId) setAuditoriaEstudioId(seleccionado.id);
    if (vista === "empresa") {
      setAuditoriaEmpresaModo(null);
      setAuditoriaEmpresaId("");
    }
    setAuditoriaPagina(1);
    limpiarFiltrosAuditoria();
  };

  const cambiarFiltroAuditoria = (accion: () => void) => {
    accion();
    setAuditoriaPagina(1);
  };

  const tituloModalAuditoria =
    auditoriaVista === "admin" ? "Auditoria admin" : auditoriaVista === "estudio" ? "Auditoria estudio" : auditoriaVista === "empresa" ? "Auditoria empresa" : "Auditoria";

  const renderFiltrosAuditoria = () => (
    <div className="grid gap-2 rounded-xl border border-linea bg-hundido p-3 md:grid-cols-5">
      <label className="block">
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.06em] text-apagado">Desde</span>
        <input className={inputCls} type="date" value={auditoriaDesde} onChange={(e) => cambiarFiltroAuditoria(() => setAuditoriaDesde(e.target.value))} />
      </label>
      <label className="block">
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.06em] text-apagado">Hasta</span>
        <input className={inputCls} type="date" value={auditoriaHasta} onChange={(e) => cambiarFiltroAuditoria(() => setAuditoriaHasta(e.target.value))} />
      </label>
      <label className="block">
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.06em] text-apagado">Accion o detalle</span>
        <input className={inputCls} value={auditoriaAccion} onChange={(e) => cambiarFiltroAuditoria(() => setAuditoriaAccion(e.target.value))} placeholder="Ej. factura, pago" />
      </label>
      <label className="block">
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.06em] text-apagado">Usuario</span>
        <input className={inputCls} value={auditoriaUsuario} onChange={(e) => cambiarFiltroAuditoria(() => setAuditoriaUsuario(e.target.value))} placeholder="Ej. Lucia" />
      </label>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] md:contents">
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.06em] text-apagado">Tipo</span>
          <select className={inputCls} value={auditoriaEntidad} onChange={(e) => cambiarFiltroAuditoria(() => setAuditoriaEntidad(e.target.value))}>
            <option value="todas">Todos</option>
            {entidadesAuditoria.map((entidad) => (
              <option key={entidad} value={entidad}>
                {entidad}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <Boton type="button" variante="fantasma" tam="md" className="w-full whitespace-nowrap" onClick={limpiarFiltrosAuditoria}>
            Limpiar
          </Boton>
        </div>
      </div>
    </div>
  );

  const renderEventosAuditoria = (eventos: EventoAuditoriaAdmin[], vacio: string) => {
    const porPagina = 8;
    const totalPaginas = Math.max(1, Math.ceil(eventos.length / porPagina));
    const paginaActual = Math.min(auditoriaPagina, totalPaginas);
    const desde = (paginaActual - 1) * porPagina;
    const eventosPagina = eventos.slice(desde, desde + porPagina);
    return (
      <div className="overflow-hidden rounded-xl border border-linea bg-superficie">
        {eventos.length === 0 ? (
          <p className="px-4 py-5 text-sm text-apagado">{vacio}</p>
        ) : (
          <>
            <div className="divide-y divide-linea md:hidden">
              {eventosPagina.map((evento) => (
                <article key={evento.id} className="grid gap-3 px-4 py-3 text-sm lg:grid-cols-[150px_minmax(0,1fr)]">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-apagado">Fecha</p>
                    <p className="num mt-1 text-xs font-semibold text-tinta-2">{fechaHora(evento.fecha)}</p>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-apagado">Que se hizo</p>
                        <p className="mt-1 font-bold">{evento.accion}</p>
                      </div>
                      <span className="rounded-full bg-hundido px-2 py-0.5 text-[11px] font-semibold text-tinta-2">{evento.entidad}</span>
                    </div>
                    <div className="mt-2 grid gap-2 text-xs text-apagado sm:grid-cols-[180px_minmax(0,1fr)]">
                      <span>
                        <span className="block font-bold uppercase tracking-[0.06em]">Quien lo hizo</span>
                        <span className="mt-0.5 block text-tinta-2">{evento.actor}</span>
                      </span>
                      {evento.detalle && (
                        <span>
                          <span className="block font-bold uppercase tracking-[0.06em]">Detalle</span>
                          <span className="mt-0.5 block">{evento.detalle}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden max-h-[58vh] overflow-auto md:block">
              <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 border-b border-linea bg-superficie">
                  <tr className="text-left text-[11px] font-bold uppercase tracking-[0.06em] text-apagado">
                    <th className="w-[150px] px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Que se hizo</th>
                    <th className="w-[220px] px-4 py-3">Quien lo hizo</th>
                    <th className="w-[280px] px-4 py-3">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-linea">
                  {eventosPagina.map((evento) => (
                    <tr key={evento.id} className="align-top">
                      <td className="num px-4 py-3 text-xs font-semibold text-tinta-2">{fechaHora(evento.fecha)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold">{evento.accion}</span>
                          <span className="rounded-full bg-hundido px-2 py-0.5 text-[11px] font-semibold text-tinta-2">{evento.entidad}</span>
                        </div>
                      </td>
                      <td className="break-all px-4 py-3 text-xs font-semibold text-tinta-2">{evento.actor}</td>
                      <td className="px-4 py-3 text-xs leading-5 text-apagado">{evento.detalle ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-linea px-4 py-3 text-sm">
              <span className="text-xs font-semibold text-apagado">
                {desde + 1}-{Math.min(desde + porPagina, eventos.length)} de {eventos.length}
              </span>
              <span className="flex items-center gap-2">
                <Boton type="button" variante="secundario" tam="sm" onClick={() => setAuditoriaPagina((actual) => Math.max(1, actual - 1))} disabled={paginaActual <= 1}>
                  Anterior
                </Boton>
                <span className="text-xs font-semibold text-tinta-2">
                  {paginaActual} / {totalPaginas}
                </span>
                <Boton type="button" variante="secundario" tam="sm" onClick={() => setAuditoriaPagina((actual) => Math.min(totalPaginas, actual + 1))} disabled={paginaActual >= totalPaginas}>
                  Siguiente
                </Boton>
              </span>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
      <Panel className="min-w-0 overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-linea px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <ShieldCheck size={18} className="text-petroleo" /> Estudios
          </h2>
          <button
            type="button"
            onClick={() => setNuevoAbierto(true)}
            className="inline-flex size-9 items-center justify-center rounded-xl border border-linea bg-superficie text-petroleo hover:bg-hundido"
            aria-label="Crear estudio"
            title="Crear estudio"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="divide-y divide-linea">
          {estudios.map((estudio) => {
            const activo = estudio.id === seleccionado.id;
            const vista = vistaComercialEstudio(estudio);
            return (
              <button
                key={estudio.id}
                type="button"
                onClick={() => seleccionar(estudio.id)}
                className={clsx("block w-full px-5 py-4 text-left transition-colors hover:bg-hundido", activo && "bg-hundido")}
              >
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block text-sm font-bold">{estudio.nombre}</span>
                    <span className="mt-1 block text-xs text-apagado">{vista.plan?.nombre} · {fmtCent(vista.total, estudio.moneda)}</span>
                  </span>
                  {estadoChip(estudio.estado)}
                </span>
              </button>
            );
          })}
        </div>
      </Panel>

      <Drawer abierto={nuevoAbierto} onCerrar={() => setNuevoAbierto(false)} titulo="Nuevo estudio" subtitulo="Alta inicial con usuario dueño">
        <form action={crearEstudio} className="space-y-4">
          <Campo label="Nombre del estudio"><input name="nombre" className={inputCls} required /></Campo>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Dueño / contador"><input name="duenoNombre" className={inputCls} required /></Campo>
            <Campo label="Email de acceso"><input name="duenoEmail" type="email" className={inputCls} required /></Campo>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Plan inicial">
              <select name="planCodigo" className={inputCls} defaultValue={planPruebaInicial?.codigo ?? "full"}>
                {planes.map((p) => <option key={p.codigo} value={p.codigo}>{p.nombre} · {fmtCent(p.precioMensualCent)}</option>)}
              </select>
            </Campo>
            <Campo label="Estado">
              <select name="estado" className={inputCls} defaultValue="prueba">
                <option value="prueba">En prueba</option>
                <option value="activo">Activo</option>
                <option value="pausado">Pausado</option>
              </select>
            </Campo>
          </div>
          <Campo label="Moneda">
            <select name="moneda" className={inputCls} defaultValue="UYU">
              <option value="UYU">UYU</option>
              <option value="USD">USD</option>
            </select>
          </Campo>
          <Campo label="Notas internas"><textarea name="notas" className={clsx(inputCls, "min-h-24 py-3")} /></Campo>
          {errorNuevo && <p className="rounded-xl bg-rosa px-3 py-2 text-sm font-semibold text-rosa-t">{errorNuevo}</p>}
          {resultadoNuevo && !resultadoNuevo.ok && <p className="rounded-xl bg-rosa px-3 py-2 text-sm font-semibold text-rosa-t">{resultadoNuevo.mensaje}</p>}
          <Boton type="submit" tam="lg" className="w-full" disabled={pendienteNuevo}><Plus size={16} /> {pendienteNuevo ? "Creando..." : "Crear estudio"}</Boton>
        </form>
      </Drawer>

      <div className="space-y-3">
        <Panel className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.08em] text-petroleo">
                <CircleDollarSign size={16} /> Comercial
              </p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight">{seleccionado.nombre}</h2>
              <p className="mt-1 text-sm text-apagado">{modulosVisibles.length} modulos habilitados · {fmtCent(total, seleccionado.moneda)} mensuales</p>
            </div>
            {actuarComoEstudioAction && (
              <form action={actuarComoEstudioAction}>
                <Boton type="submit" variante="secundario" tam="md" className="w-full sm:w-auto">
                  <ShieldCheck size={15} /> Funcionar como estudio
                </Boton>
              </form>
            )}
          </div>
        </Panel>

        <div className="grid gap-3 lg:grid-cols-3">
          <Panel className="p-5 lg:col-span-2">
            <h3 className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <Layers3 size={18} className="text-petroleo" /> Plan y módulos
            </h3>
            <div className="mt-4 grid items-stretch gap-3 md:grid-cols-3">
              {planes.map((p, indice) => {
                const extras = modulosIncrementales(indice, planes);
                return (
                <div
                  key={p.codigo}
                  className={clsx("relative flex overflow-hidden rounded-2xl border text-left transition-colors", p.codigo === plan.codigo ? "border-petroleo bg-menta text-menta-t" : "border-linea bg-superficie hover:bg-hundido")}
                >
                  {editandoPrecioPlan === p.id ? (
                    <>
                      <label className="block px-4 py-3 pr-12">
                        <span className="block font-bold">{p.nombre}</span>
                        <input
                          className="mt-1 h-8 w-full rounded-lg border border-linea bg-superficie px-2.5 text-sm font-semibold text-tinta outline-none focus:border-petroleo-3 focus:ring-2 focus:ring-petroleo-3/15"
                          inputMode="numeric"
                          value={pesosDesdeCent(p.precioMensualCent)}
                          onChange={(e) =>
                            setPlanes((actuales) =>
                              actuales.map((planActual) => (planActual.id === p.id ? { ...planActual, precioMensualCent: centDesdePesos(e.target.value) } : planActual)),
                            )
                          }
                          onBlur={() => setEditandoPrecioPlan(null)}
                          onKeyDown={(e) => e.key === "Enter" && setEditandoPrecioPlan(null)}
                          aria-label={`Precio mensual de ${p.nombre}`}
                          autoFocus
                        />
                      </label>
                      <button type="button" onClick={() => cambiarPlan(p.codigo)} className="block w-full px-4 pb-3 pr-12 text-left">
                        <span className="mt-2 block text-xs text-apagado">{p.modulos.length} modulos incluidos</span>
                        <span className="mt-3 block text-[11px] font-bold uppercase tracking-[0.06em] text-apagado">
                          {indice === 0 ? "Incluye" : indice === 1 ? "Basico mas" : "Profesional mas"}
                        </span>
                        <span className="mt-1.5 flex flex-wrap gap-1.5">
                          {extras.slice(0, 6).map((modulo) => (
                            <span key={modulo} className="rounded-full bg-superficie/80 px-2 py-0.5 text-[11px] font-semibold text-tinta-2 ring-1 ring-linea/70">
                              {moduloNombre(modulo, modulosCatalogo)}
                            </span>
                          ))}
                          {extras.length > 6 && (
                            <span className="rounded-full bg-superficie/80 px-2 py-0.5 text-[11px] font-semibold text-apagado ring-1 ring-linea/70">
                              +{extras.length - 6}
                            </span>
                          )}
                        </span>
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => cambiarPlan(p.codigo)} className="flex h-full w-full flex-col items-start justify-start px-4 py-3 pr-12 text-left">
                      <span className="block font-bold">{p.nombre}</span>
                      <span className="mt-1 block text-xs">{fmtCent(p.precioMensualCent)}</span>
                      <span className="mt-2 block text-xs text-apagado">{p.modulos.length} modulos incluidos</span>
                      <span className="mt-3 block text-[11px] font-bold uppercase tracking-[0.06em] text-apagado">
                        {indice === 0 ? "Incluye" : indice === 1 ? "Basico mas" : "Profesional mas"}
                      </span>
                      <span className="mt-1.5 flex flex-wrap gap-1.5">
                        {extras.slice(0, 6).map((modulo) => (
                          <span key={modulo} className="rounded-full bg-superficie/80 px-2 py-0.5 text-[11px] font-semibold text-tinta-2 ring-1 ring-linea/70">
                            {moduloNombre(modulo, modulosCatalogo)}
                          </span>
                        ))}
                        {extras.length > 6 && (
                          <span className="rounded-full bg-superficie/80 px-2 py-0.5 text-[11px] font-semibold text-apagado ring-1 ring-linea/70">
                            +{extras.length - 6}
                          </span>
                        )}
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditandoPrecioPlan(editandoPrecioPlan === p.id ? null : p.id)}
                    className="absolute right-3 top-5 inline-flex size-8 items-center justify-center rounded-lg text-apagado hover:bg-superficie/70 hover:text-tinta"
                    aria-label={editandoPrecioPlan === p.id ? `Cerrar edición de precio de ${p.nombre}` : `Editar precio mensual de ${p.nombre}`}
                    title={editandoPrecioPlan === p.id ? "Cerrar edición" : "Editar precio"}
                  >
                    <Pencil size={13} />
                  </button>
                </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setModulosAbierto(true)}
              className="mt-5 flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-linea bg-superficie px-4 py-3 text-left transition-colors hover:bg-hundido"
            >
              <span>
                <span className="block text-sm font-bold">Agregar módulos fuera del paquete</span>
                <span className="block text-xs text-apagado">
                  {addonsVisibles.length}
                  {addonsVisibles.length === 1 ? " módulo seleccionado" : " módulos seleccionados"} · elegí módulos individuales y editá su precio mensual
                </span>
              </span>
              <span className="inline-flex h-8 items-center rounded-lg border border-linea bg-superficie px-3 text-xs font-semibold text-tinta-2">Editar</span>
            </button>
          </Panel>

          <Modal
            abierto={modulosAbierto}
            onCerrar={() => {
              setModulosAbierto(false);
              setEditandoPreciosModulos(false);
            }}
            titulo={
              <span className="flex items-center justify-between gap-3">
                <span>Módulos adicionales</span>
                <span className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditandoPreciosModulos((actual) => !actual)}
                    className={clsx("inline-flex size-8 items-center justify-center rounded-lg border border-linea text-apagado hover:bg-hundido hover:text-tinta", editandoPreciosModulos && "bg-petroleo text-white hover:bg-petroleo-2 hover:text-white")}
                    aria-label={editandoPreciosModulos ? "Bloquear edición de precios" : "Editar precios de módulos"}
                    title={editandoPreciosModulos ? "Bloquear precios" : "Editar precios"}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => guardar(() => setModulosAbierto(false))}
                    disabled={pendiente || !hayCambiosModulos}
                    className={clsx(
                      "inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed",
                      hayCambiosModulos ? "border-petroleo bg-petroleo text-white hover:bg-petroleo-2" : "border-linea bg-hundido text-apagado",
                    )}
                  >
                    <Save size={13} /> {pendiente ? "Guardando..." : "Guardar"}
                  </button>
                </span>
              </span>
            }
          >
            <div className="grid max-h-[60vh] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {[...modulosFueraDelPlan]
                .sort((a, b) => Number(addonsVisibles.includes(b.moduloCodigo)) - Number(addonsVisibles.includes(a.moduloCodigo)))
                .map((addon) => {
                  const activo = addonsVisibles.includes(addon.moduloCodigo);
                  return (
                <div
                  key={addon.moduloCodigo}
                  className={clsx(
                    "rounded-xl border px-3 py-2.5 transition-colors",
                    activo ? "border-petroleo bg-menta text-menta-t" : "border-linea bg-superficie hover:bg-hundido/60",
                  )}
                >
                  <label className="flex cursor-pointer items-start justify-between gap-3">
                    <span>
                      <span className="block text-sm font-bold">{moduloNombre(addon.moduloCodigo, modulosCatalogo)}</span>
                      {editandoPreciosModulos ? (
                        <input
                          className="mt-1 h-8 w-36 rounded-lg border border-linea bg-superficie px-2.5 text-sm font-semibold text-tinta outline-none focus:border-petroleo-3 focus:ring-2 focus:ring-petroleo-3/15"
                          inputMode="numeric"
                          value={pesosDesdeCent(addon.precioMensualCent)}
                          onChange={(e) => setPreciosModulo((actual) => ({ ...actual, [addon.moduloCodigo]: centDesdePesos(e.target.value) }))}
                          aria-label={`Precio mensual de ${moduloNombre(addon.moduloCodigo, modulosCatalogo)}`}
                        />
                      ) : (
                        <span className={clsx("mt-0.5 block text-xs font-semibold", activo ? "text-menta-t" : "text-apagado")}>{fmtCent(addon.precioMensualCent)} mensual</span>
                      )}
                    </span>
                    <input
                      type="checkbox"
                      checked={activo}
                      onChange={() => {
                        actualizar({ addons: toggleAddon(seleccionado.addons, addon.moduloCodigo) });
                      }}
                      className={clsx("mt-0.5 size-4", activo ? "accent-menta-t" : "accent-petroleo")}
                    />
                  </label>
                </div>
                  );
                })}
            </div>
          </Modal>

          <Panel className="p-5">
            <h3 className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <FileClock size={18} className="text-petroleo" /> Contrato
            </h3>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-semibold text-tinta-2">Estado</span>
                <select
                  className={inputCls}
                  value={seleccionado.estado}
                  onChange={(e) => {
                    const estado = e.target.value as EstudioAdmin["estado"];
                    if (estado === "prueba" && planPruebaInicial) {
                      actualizar({ estado, planCodigo: planPruebaInicial.codigo, addons: addonsCodigosParaPlan(planPruebaInicial) });
                      return;
                    }
                    actualizar({ estado });
                  }}
                >
                  <option value="prueba">En prueba</option>
                  <option value="activo">Activo</option>
                  <option value="pausado">Pausado</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-semibold text-tinta-2">Notas internas</span>
                <textarea
                  className={clsx(inputCls, "min-h-28 py-3 placeholder:text-tinta")}
                  value={seleccionado.notas}
                  onChange={(e) => actualizar({ notas: e.target.value })}
                  placeholder={ayudaEstado(seleccionado.estado)}
                />
              </label>
              {resultado && (
                <p className={clsx("rounded-xl px-3 py-2 text-sm font-semibold", resultado.ok ? "bg-menta text-menta-t" : "bg-rosa text-rosa-t")} role="status">
                  {resultado.mensaje}
                </p>
              )}
              <div className="flex justify-end">
                <Boton type="button" onClick={() => guardar()} disabled={pendiente || !hayCambiosComerciales} variante={hayCambiosComerciales ? "primario" : "secundario"}>
                  <Save size={15} /> {pendiente ? "Guardando..." : hayCambiosComerciales ? "Guardar configuracion" : "Sin cambios"}
                </Boton>
              </div>
            </div>
          </Panel>
        </div>

        <Panel className="min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-linea px-5 py-3">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                <Calculator size={18} className="text-petroleo" /> Factura mensual
              </h3>
              <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-2">
                <span className="text-xl font-extrabold text-tinta">{fmtCent(resumenVisible.totalCent, resumenVisible.moneda)}</span>
                <span className="inline-flex rounded-full bg-hundido px-2.5 py-1 text-xs font-semibold text-tinta-2">
                  {resumenVisible.lineas.length} {resumenVisible.lineas.length === 1 ? "concepto" : "conceptos"}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <Chip tono={tonoFactura}>{estadoFactura}</Chip>
              <select
                aria-label="Mes a facturar"
                className="h-8 rounded-full border border-linea bg-hundido px-3 text-xs font-semibold text-tinta-2 outline-none transition-colors hover:border-petroleo/35 focus:border-petroleo-3 focus:ring-2 focus:ring-petroleo-3/20"
                value={mesCobro}
                onChange={(e) => {
                  const mes = e.target.value;
                  setMesCobro(mes);
                  setPagoACuentaDesdeMes(sumarMesCobro(mes, 1));
                  quitarDescuento();
                  setResultadoResumen(null);
                  setResultadoPago(null);
                }}
              >
                <option value={mesCobro} hidden>
                  {nombreMesCobro(mesCobro)}
                </option>
                {mesesSelector.map((mes) => (
                  <option key={mes} value={mes}>
                    {nombreMesCobro(mes)}
                    {resumenesPorMes[`${seleccionado.id}:${mes}`] ? " · factura emitida" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid min-w-0 items-start gap-4 px-5 py-3 2xl:grid-cols-[minmax(240px,1fr)_344px]">
            <div className="grid gap-2">
              <Boton type="button" variante="secundario" tam="md" className="w-full" onClick={() => setDescuentoAbierto(true)}>
                <CircleDollarSign size={15} /> {ajusteConfirmado ? "Editar descuento" : "Descuento"}
              </Boton>
              <button
                type="button"
                onClick={() => setFacturasVencidasAbierto(true)}
                disabled={facturasVencidasImpagas.length === 0}
                className="w-full rounded-[14px] border border-linea bg-superficie px-4 py-3 text-left transition-colors hover:border-petroleo/45 hover:bg-hundido disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-linea disabled:hover:bg-superficie"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">Facturas impagas vencidas</span>
                    <span className="mt-0.5 block text-xs text-apagado">Facturas anteriores pendientes.</span>
                  </span>
                  <span className="inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-[14px] border border-linea bg-superficie px-3.5 text-[13px] font-semibold text-tinta">
                    <FileText size={14} /> Ver {facturasVencidasImpagas.length}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setHistoricoPagosAbierto(true)}
                disabled={pagosDelEstudio.length === 0}
                className="w-full rounded-[14px] border border-linea bg-superficie px-4 py-3 text-left transition-colors hover:border-petroleo/45 hover:bg-hundido disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-linea disabled:hover:bg-superficie"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">Histórico de pagos</span>
                    <span className="mt-0.5 block text-xs text-apagado">Pagos registrados y meses cubiertos.</span>
                  </span>
                  <span className="inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-[14px] border border-linea bg-superficie px-3.5 text-[13px] font-semibold text-tinta">
                    <CreditCard size={14} /> Ver {pagosDelEstudio.length}
                  </span>
                </span>
              </button>
              {facturaMesActualImpaga && estadoFacturaMesActual && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-linea bg-superficie px-3 py-2 text-sm">
                  <span>
                    <span className="block font-semibold">Factura actual: {nombreMesCobro(facturaMesActualImpaga.mes)}</span>
                    <span className="mt-0.5 block text-xs text-apagado">Pendiente {fmtCent(estadoFacturaMesActual.saldoPendienteCent, facturaMesActualImpaga.moneda)}</span>
                  </span>
                  <Boton type="button" variante="primario" tam="sm" onClick={() => registrarPago(estadoFacturaMesActual.saldoPendienteCent, 1, facturaMesActualImpaga.mes)} disabled={pendientePago || estadoFacturaMesActual.saldoPendienteCent <= 0}>
                    <CreditCard size={14} /> Acreditar pago
                  </Boton>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-linea bg-hundido px-3 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.06em] text-apagado">Estado de pago</p>
                  <p className="mt-0.5 text-lg font-extrabold capitalize">{estadoPago.estado.replaceAll("_", " ")}</p>
                </div>
                <Boton type="button" variante="secundario" tam="sm" onClick={() => setFacturaAbierta(true)} disabled={!resumenVisible.lineas.length}>
                  <FileText size={14} /> Ver factura
                </Boton>
              </div>
              <div className="mt-2">
                {!resumenGuardado ? (
                  <Boton type="button" variante="primario" tam="sm" className="w-full" onClick={() => void emitirFacturaSiHaceFalta()} disabled={confirmandoFactura}>
                    <Save size={14} /> {confirmandoFactura ? "Confirmando..." : "Confirmar factura"}
                  </Boton>
                ) : estadoPago.saldoPendienteCent > 0 ? (
                  <Boton
                    type="button"
                    variante="primario"
                    tam="sm"
                    className="w-full"
                    onClick={() => registrarPago(estadoPago.saldoPendienteCent, 1, mesCobro)}
                    disabled={pendientePago || confirmandoFactura}
                  >
                    <CreditCard size={14} /> {pendientePago ? "Registrando..." : "Marcar pagado"}
                  </Boton>
                ) : null}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-superficie px-3 py-2">
                  <p className="text-xs text-apagado">Pagado</p>
                  <p className="font-bold">{fmtCent(estadoPago.pagadoCent, resumenVisible.moneda)}</p>
                </div>
                <div className="rounded-lg bg-superficie px-3 py-2">
                  <p className="text-xs text-apagado">Pendiente</p>
                  <p className="font-bold">{fmtCent(estadoPago.saldoPendienteCent, resumenVisible.moneda)}</p>
                </div>
              </div>
              {estadoPago.saldoAFavorCent > 0 && <p className="mt-2 text-xs font-semibold text-menta-t">A favor {fmtCent(estadoPago.saldoAFavorCent, resumenVisible.moneda)}</p>}
              <div className="mt-2 grid gap-2">
                {facturaActualCancelable && (
                  <Boton type="button" variante="secundario" tam="sm" className="w-full justify-start" onClick={() => setCancelacionPendiente({ tipo: "factura", mes: mesCobro })} disabled={confirmandoFactura}>
                    <X size={14} /> Cancelar factura
                  </Boton>
                )}
                <Boton
                  type="button"
                  variante="secundario"
                  tam="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setPagoACuentaEnRevision(false);
                    setPagoACuentaAbierto(true);
                  }}
                >
                  <Plus size={14} /> Pago a cuenta
                </Boton>
              </div>
            </div>
          </div>

          <Modal abierto={descuentoAbierto} onCerrar={() => setDescuentoAbierto(false)} className="max-w-2xl" titulo="Descuento de factura">
            <div className="space-y-4">
              <div className="grid min-w-0 items-end gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-semibold text-tinta-2">Importe a descontar</span>
                  <input
                    className={inputCls}
                    value={ajusteMonto}
                    onChange={(e) => {
                      const valor = e.target.value;
                      const importe = Math.abs(Number(valor.replace(/\./g, "").replace(",", ".")));
                      setAjusteMonto(valor);
                      if (!Number.isFinite(importe) || importe <= 0) {
                        setAjusteConfirmado(null);
                        setResultadoResumen(null);
                      }
                    }}
                    placeholder="1500"
                    inputMode="decimal"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-[13px] font-semibold text-tinta-2">Motivo del ajuste</span>
                  <input
                    className={inputCls}
                    value={ajusteDescripcion}
                    onChange={(e) => {
                      const valor = e.target.value;
                      setAjusteDescripcion(valor);
                      if (!valor.trim()) {
                        setAjusteConfirmado(null);
                        setResultadoResumen(null);
                      }
                    }}
                    placeholder="Ej. Cortesia"
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2 border-t border-linea pt-4">
                <Boton type="button" variante="fantasma" onClick={() => setDescuentoAbierto(false)}>
                  Cancelar
                </Boton>
                <Boton
                  type="button"
                  variante={ajusteConfirmado || puedeConfirmarDescuento ? "primario" : "secundario"}
                  onClick={() => {
                    if (ajusteConfirmado) {
                      quitarDescuento();
                    } else {
                      confirmarDescuento();
                    }
                    setDescuentoAbierto(false);
                  }}
                  disabled={!ajusteConfirmado && !puedeConfirmarDescuento}
                >
                  {ajusteConfirmado ? <X size={14} /> : <Save size={14} />}
                  {ajusteConfirmado ? "Eliminar descuento" : "Confirmar descuento"}
                </Boton>
              </div>
            </div>
          </Modal>

          <Modal
            abierto={pagoACuentaAbierto}
            onCerrar={() => {
              setPagoACuentaAbierto(false);
              setPagoACuentaEnRevision(false);
            }}
            className="max-w-xl"
            titulo="Pago a cuenta"
          >
            <div className="space-y-4">
              <p className="text-sm leading-6 text-apagado">
                El importe recibido es el total del pago a cuenta, no un valor mensual. Se va a acreditar desde el mes seleccionado y por la cantidad de meses cubiertos que indiques.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-[13px] font-semibold text-tinta-2">Importe recibido</span>
                  <input
                    className={inputCls}
                    value={pagoACuentaImporte}
                    onChange={(e) => {
                      setPagoACuentaImporte(e.target.value);
                      setPagoACuentaEnRevision(false);
                    }}
                    placeholder="UYU 35.000"
                    inputMode="decimal"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-semibold text-tinta-2">Primer mes</span>
                  <select
                    className={inputCls}
                    value={pagoACuentaDesdeMes}
                    onChange={(e) => {
                      setPagoACuentaDesdeMes(e.target.value);
                      setPagoACuentaEnRevision(false);
                    }}
                  >
                    {mesesPagoACuenta.map((mes) => (
                      <option key={mes} value={mes}>
                        {nombreMesCobro(mes)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-semibold text-tinta-2">Meses cubiertos</span>
                  <input
                    className={inputCls}
                    type="number"
                    min={1}
                    max={24}
                    value={pagoACuentaMeses}
                    onChange={(e) => {
                      setPagoACuentaMeses(Math.max(1, Number(e.target.value) || 1));
                      setPagoACuentaEnRevision(false);
                    }}
                  />
                </label>
              </div>
              {pagoACuentaEnRevision && (
                <div className="rounded-xl border border-linea bg-hundido px-4 py-3">
                  <p className="text-sm font-bold">Confirmá este pago</p>
                  <p className="mt-1 text-sm text-apagado">
                    Se registrará {fmtCent(importePagoACuentaCent, resumenVisible.moneda)} y quedarán marcados como pagos estos meses:
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {mesesPagoACuentaSeleccionados.map((mes) => (
                      <span key={mes} className="rounded-full bg-superficie px-3 py-1 text-xs font-semibold text-tinta-2">
                        {nombreMesCobro(mes)}
                      </span>
                    ))}
                  </div>
                  {mesesPagoACuentaSinFactura.length > 0 && (
                    <p className="mt-3 rounded-lg bg-crema px-3 py-2 text-xs font-semibold text-crema-t">
                      Falta emitir factura para: {mesesPagoACuentaSinFactura.map(nombreMesCobro).join(", ")}.
                    </p>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-2 border-t border-linea pt-4">
                <Boton
                  type="button"
                  variante="fantasma"
                  onClick={() => {
                    setPagoACuentaAbierto(false);
                    setPagoACuentaEnRevision(false);
                  }}
                >
                  Cancelar
                </Boton>
                <Boton
                  type="button"
                  variante="primario"
                  onClick={() => {
                    if (!pagoACuentaEnRevision) {
                      setPagoACuentaEnRevision(true);
                      return;
                    }
                    registrarPago(importePagoACuentaCent, pagoACuentaMeses, pagoACuentaDesdeMes, `Pago a cuenta desde ${nombreMesCobro(pagoACuentaDesdeMes)}`);
                  }}
                  disabled={pendientePago || confirmandoFactura || importePagoACuentaCent <= 0 || (pagoACuentaEnRevision && mesesPagoACuentaSinFactura.length > 0)}
                >
                  <CreditCard size={15} /> {pendientePago ? "Aplicando..." : pagoACuentaEnRevision && mesesPagoACuentaSinFactura.length > 0 ? "Faltan facturas" : pagoACuentaEnRevision ? "Confirmar pago" : "Revisar pago"}
                </Boton>
              </div>
            </div>
          </Modal>

          <Modal abierto={facturasVencidasAbierto} onCerrar={() => setFacturasVencidasAbierto(false)} className="[--modal-max:860px]" titulo="Facturas impagas vencidas">
            {facturasVencidasImpagas.length === 0 ? (
              <p className="text-sm text-apagado">No hay facturas vencidas pendientes.</p>
            ) : (
              <div className="divide-y divide-linea overflow-hidden rounded-xl border border-linea">
                {facturasVencidasImpagas.map((factura) => {
                  const estado = estadoPagoDemo(factura.totalCent, pagosDemo[`${seleccionado.id}:${factura.mes}`] ?? 0);
                  return (
                    <div key={factura.mes} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 text-sm">
                      <span className="min-w-0">
                        <span className="block font-semibold">Factura de {nombreMesCobro(factura.mes)}</span>
                        <span className="mt-0.5 block text-xs text-apagado">Pendiente {fmtCent(estado.saldoPendienteCent, factura.moneda)} de {fmtCent(factura.totalCent, factura.moneda)}</span>
                      </span>
                      <div className="flex shrink-0 gap-2">
                        <Boton
                          type="button"
                          variante="secundario"
                          tam="sm"
                          className="whitespace-nowrap"
                          onClick={() => {
                            setMesCobro(factura.mes);
                            setPagoACuentaDesdeMes(sumarMesCobro(factura.mes, 1));
                            quitarDescuento();
                            setFacturaAbierta(true);
                          }}
                        >
                          <FileText size={14} /> Ver factura
                        </Boton>
                        <Boton type="button" variante="primario" tam="sm" className="whitespace-nowrap" onClick={() => registrarPago(estado.saldoPendienteCent, 1, factura.mes)} disabled={pendientePago || estado.saldoPendienteCent <= 0}>
                          <CreditCard size={14} /> Acreditar pago
                        </Boton>
                        <Boton type="button" variante="secundario" tam="sm" className="whitespace-nowrap" onClick={() => setCancelacionPendiente({ tipo: "factura", mes: factura.mes })}>
                          <X size={14} /> Cancelar
                        </Boton>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Modal>

          <Modal abierto={historicoPagosAbierto} onCerrar={() => setHistoricoPagosAbierto(false)} className="[--modal-max:56rem]" titulo="Histórico de pagos">
            {pagosDelEstudio.length === 0 ? (
              <p className="text-sm text-apagado">Todavía no hay pagos registrados para este estudio.</p>
            ) : (
              <div className="divide-y divide-linea overflow-hidden rounded-xl border border-linea">
                {pagosDelEstudio.map((pago) => {
                  const esPagoDeUnMes = pago.aplicaciones.length === 1;
                  const aplicacionUnMes = esPagoDeUnMes ? pago.aplicaciones[0] : null;
                  const pagoDeMesActual = aplicacionUnMes?.mes === mesActualCobro();
                  const totalMesPago = aplicacionUnMes ? resumenesPorMes[`${seleccionado.id}:${aplicacionUnMes.mes}`]?.totalCent : undefined;
                  const esPagoParcial = aplicacionUnMes && totalMesPago !== undefined && aplicacionUnMes.importeCent < totalMesPago;
                  return (
                    <div key={pago.id} className={clsx("flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm", pagoDeMesActual && "bg-menta/55")}>
                      <div className="min-w-0">
                        <span className="block font-semibold">{tituloPagoVista(pago, totalMesPago)}</span>
                        <span className="mt-0.5 block text-xs text-apagado">
                          {esPagoParcial ? `${fmtCent(aplicacionUnMes.importeCent, resumenVisible.moneda)} recibidos de ${fmtCent(totalMesPago, resumenVisible.moneda)}` : `${fmtCent(pago.importeCent, resumenVisible.moneda)} recibidos`}
                        </span>
                        {!esPagoDeUnMes && (
                          <span className="mt-1.5 flex flex-wrap gap-1.5">
                            {pago.aplicaciones.map((aplicacion) => (
                              <span key={aplicacion.mes} className="rounded-full bg-hundido px-2.5 py-1 text-xs font-semibold text-tinta-2">
                                {nombreMesCobro(aplicacion.mes)}
                              </span>
                            ))}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setCancelacionPendiente({ tipo: "pago", pago })}
                        disabled={pendientePago}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-linea bg-superficie px-3 text-xs font-semibold text-tinta-2 hover:bg-hundido hover:text-tinta"
                      >
                        <Undo2 size={13} /> {pendientePago ? "Cancelando..." : "Cancelar"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </Modal>

          <Modal
            abierto={!!cancelacionPendiente}
            onCerrar={() => setCancelacionPendiente(null)}
            className="max-w-lg"
            titulo={cancelacionPendiente?.tipo === "pago" ? "Cancelar pago" : "Cancelar factura"}
          >
            {cancelacionPendiente?.tipo === "factura" ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-linea bg-hundido px-4 py-3 text-sm">
                  <p className="font-bold">Factura de {nombreMesCobro(cancelacionPendiente.mes)}</p>
                  <p className="mt-1 text-apagado">
                    Se va a quitar la factura emitida para este mes. Si necesitás cobrarla después, tendrás que emitirla nuevamente.
                  </p>
                </div>
                <p className="text-sm text-apagado">
                  No se puede cancelar una factura que ya tenga pago aplicado; en ese caso primero hay que cancelar el pago asociado.
                </p>
              </div>
            ) : cancelacionPendiente?.tipo === "pago" ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-linea bg-hundido px-4 py-3 text-sm">
                  <p className="font-bold">{tituloPagoVista(cancelacionPendiente.pago)}</p>
                  <p className="mt-1 text-apagado">
                    Se va a quitar el pago registrado por {fmtCent(cancelacionPendiente.pago.importeCent, resumenVisible.moneda)} y se descontará de los meses aplicados.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {cancelacionPendiente.pago.aplicaciones.map((aplicacion) => (
                      <span key={aplicacion.mes} className="rounded-full bg-superficie px-3 py-1 text-xs font-semibold text-tinta-2">
                        {nombreMesCobro(aplicacion.mes)}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-apagado">
                  Las facturas quedarán con saldo pendiente si este pago las cubría total o parcialmente.
                </p>
              </div>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <Boton type="button" variante="fantasma" onClick={() => setCancelacionPendiente(null)}>
                Volver
              </Boton>
              <Boton type="button" variante="secundario" onClick={confirmarCancelacionPendiente} disabled={pendientePago || confirmandoFactura}>
                <Undo2 size={14} /> {pendientePago ? "Cancelando..." : "Sí, cancelar"}
              </Boton>
            </div>
          </Modal>

          {resultadoPago && (
            <AvisoAccion ok={resultadoPago.ok} mensaje={resultadoPago.mensaje} onCerrar={() => setResultadoPago(null)} />
          )}

          {resultadoResumen && (
            <AvisoAccion ok={resultadoResumen.ok} mensaje={resultadoResumen.mensaje} onCerrar={() => setResultadoResumen(null)} />
          )}

          <Modal
            abierto={facturaAbierta}
            onCerrar={() => setFacturaAbierta(false)}
            className="max-w-4xl p-0 print:fixed print:inset-0 print:m-0 print:max-h-none print:max-w-none print:overflow-visible print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none"
            titulo={
              <span className="no-print flex items-center justify-between gap-3 px-6 pt-6">
                <span>Factura</span>
                <span className="flex items-center gap-2">
                  {!resumenGuardado && (
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await emitirFacturaSiHaceFalta();
                        if (ok) setFacturaAbierta(false);
                      }}
                      disabled={confirmandoFactura}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-petroleo px-3 text-xs font-semibold text-white transition-colors hover:bg-petroleo-2 disabled:bg-hundido disabled:text-apagado"
                    >
                      <Save size={13} /> {confirmandoFactura ? "Confirmando..." : "Confirmar factura"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-linea bg-superficie px-3 text-xs font-semibold text-tinta hover:bg-hundido"
                  >
                    <Printer size={13} /> Imprimir / PDF
                  </button>
                </span>
              </span>
            }
          >
            <article className="print-document-active document-surface mx-auto max-h-[72vh] overflow-y-auto rounded-2xl border border-linea bg-white p-8 text-sm text-tinta shadow-[0_8px_24px_rgb(16_34_71/0.08)] print:max-h-none print:max-w-none print:overflow-visible print:rounded-none print:border-0 print:p-10 print:shadow-none">
              <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-tinta pb-5">
                <div>
                  <Logo variant="full" className="w-[132px] print:w-[120px]" />
                  <p className="mt-3 text-sm text-tinta-2">Resumen de servicios Cierra</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold tracking-tight">Factura</p>
                  <p className="mt-1 text-sm text-apagado">Periodo {nombreMesCobro(resumenVisible.mes)}</p>
                  <p className="mt-1 text-xs text-apagado">Ref. {seleccionado.id}-{resumenVisible.mes}</p>
                </div>
              </header>

              <section className="grid gap-4 border-b border-linea py-5 sm:grid-cols-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-apagado">Cliente</p>
                  <p className="mt-1 font-bold">{seleccionado.nombre}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-apagado">Plan</p>
                  <p className="mt-1 font-bold">{plan.nombre}</p>
                </div>
                <div className="sm:text-right">
                  <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-apagado">Estado de pago</p>
                  <p className="mt-1 font-bold capitalize">{estadoPago.estado.replaceAll("_", " ")}</p>
                </div>
              </section>

              <table className="mt-5 w-full border-collapse">
                <thead>
                  <tr className="border-b border-linea text-[11px] font-bold uppercase tracking-[0.06em] text-apagado">
                    <th className="py-2 text-left">Concepto</th>
                    <th className="w-36 py-2 text-right">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenVisible.lineas.map((linea, index) => (
                    <tr key={`${linea.tipo}-${linea.concepto}-${index}`} className="border-b border-linea align-top">
                      <td className="py-3 pr-4">
                        <p className="font-semibold">{linea.concepto}</p>
                        {linea.nota && <p className="mt-0.5 text-xs text-apagado">{linea.nota}</p>}
                      </td>
                      <td className={clsx("py-3 text-right font-bold", linea.totalCent < 0 && "text-rosa-t")}>{fmtCent(linea.totalCent, resumenVisible.moneda)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="ml-auto mt-6 w-full max-w-sm rounded-2xl bg-petroleo px-5 py-4 text-white print:border-2 print:border-tinta print:bg-white print:text-tinta">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold">Total a cobrar</span>
                  <span className="text-2xl font-extrabold">{fmtCent(resumenVisible.totalCent, resumenVisible.moneda)}</span>
                </div>
                <p className="mt-1 text-xs text-white/80 print:text-apagado">
                  Pagado {fmtCent(estadoPago.pagadoCent, resumenVisible.moneda)} · Pendiente {fmtCent(estadoPago.saldoPendienteCent, resumenVisible.moneda)}
                </p>
              </div>

              {resumenVisible.eventosUso.length > 0 && (
                <section className="mt-6 rounded-2xl border border-linea bg-hundido/50 px-4 py-3 print:bg-white">
                  <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-apagado">Uso del mes</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {resumenVisible.eventosUso.map((evento) => (
                      <div key={evento.tipo} className="rounded-xl bg-superficie px-3 py-2 print:border print:border-linea">
                        <p className="text-xs text-apagado">{usoNombre(evento.tipo)}</p>
                        <p className="text-base font-extrabold">{evento.cantidad}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <footer className="mt-8 border-t border-linea pt-4 text-xs text-apagado">
                <p>Documento generado desde Cierra para control administrativo del servicio mensual.</p>
              </footer>
            </article>
          </Modal>
        </Panel>

        <Panel className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                <ClipboardList size={18} className="text-petroleo" /> Auditoria
              </h3>
              <p className="mt-1 text-sm text-apagado">Movimientos por rol, estudio o empresa, con filtros para investigar rapido.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <button
              type="button"
              onClick={() => abrirVistaAuditoria("admin")}
              className="rounded-xl border border-linea bg-superficie px-4 py-4 text-left transition-colors hover:border-petroleo/45 hover:bg-hundido"
            >
              <span className="flex items-center gap-2 text-sm font-bold">
                <ShieldCheck size={16} className="text-petroleo" /> Auditoria admin
              </span>
              <span className="mt-2 block text-xs leading-5 text-apagado">Cambios comerciales, facturas, pagos y acciones realizadas desde el dashboard admin.</span>
              <span className="mt-3 inline-flex rounded-full bg-hundido px-2.5 py-1 text-xs font-semibold text-tinta-2">{eventosAuditoriaAdmin.length} movimientos</span>
            </button>
            <button
              type="button"
              onClick={() => abrirVistaAuditoria("estudio")}
              className="rounded-xl border border-linea bg-superficie px-4 py-4 text-left transition-colors hover:border-petroleo/45 hover:bg-hundido"
            >
              <span className="flex items-center gap-2 text-sm font-bold">
                <UserCog size={16} className="text-petroleo" /> Auditoria estudio
              </span>
              <span className="mt-2 block text-xs leading-5 text-apagado">Primero elegis el estudio y despues ves todos los movimientos asociados a ese estudio.</span>
              <span className="mt-3 inline-flex rounded-full bg-hundido px-2.5 py-1 text-xs font-semibold text-tinta-2">{estudios.length} estudios</span>
            </button>
            <button
              type="button"
              onClick={() => abrirVistaAuditoria("empresa")}
              className="rounded-xl border border-linea bg-superficie px-4 py-4 text-left transition-colors hover:border-petroleo/45 hover:bg-hundido"
            >
              <span className="flex items-center gap-2 text-sm font-bold">
                <Building2 size={16} className="text-petroleo" /> Auditoria empresa
              </span>
              <span className="mt-2 block text-xs leading-5 text-apagado">Elegis empresa por estudio o la buscas directo para revisar actividad operativa.</span>
              <span className="mt-3 inline-flex rounded-full bg-hundido px-2.5 py-1 text-xs font-semibold text-tinta-2">{empresasOperativas.length} empresas operativas</span>
            </button>
          </div>
        </Panel>

        <Modal abierto={auditoriaVista !== "inicio"} onCerrar={volverAuditoriaInicio} className="[--modal-max:72rem]" titulo={tituloModalAuditoria}>
          {auditoriaVista === "admin" && (
            <div className="space-y-3">
              {renderFiltrosAuditoria()}
              {renderEventosAuditoria(eventosAdminFiltrados, "No hay movimientos admin con esos filtros.")}
            </div>
          )}

          {auditoriaVista === "estudio" && (
            <div className="space-y-3">
              <label className="block max-w-md">
                <span className="mb-1.5 block text-[13px] font-semibold text-tinta-2">Estudio</span>
                <select className={inputCls} value={auditoriaEstudioSeleccionadoId} onChange={(e) => cambiarFiltroAuditoria(() => setAuditoriaEstudioId(e.target.value))}>
                  {estudios.map((estudio) => (
                    <option key={estudio.id} value={estudio.id}>
                      {estudio.nombre}
                    </option>
                  ))}
                </select>
              </label>
              {renderFiltrosAuditoria()}
              {renderEventosAuditoria(eventosEstudioFiltrados, "No hay movimientos para ese estudio con esos filtros.")}
            </div>
          )}

          {auditoriaVista === "empresa" && (
            <div className="space-y-3">
              {!auditoriaEmpresaModo ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuditoriaEmpresaModo("por_estudio");
                      setAuditoriaPagina(1);
                    }}
                    className="rounded-xl border border-linea bg-superficie px-4 py-4 text-left transition-colors hover:border-petroleo/45 hover:bg-hundido"
                  >
                    <span className="text-sm font-bold">Elegir por estudio</span>
                    <span className="mt-1 block text-xs leading-5 text-apagado">Primero seleccionas el estudio y despues una empresa asociada.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuditoriaEmpresaModo("directa");
                      setAuditoriaPagina(1);
                    }}
                    className="rounded-xl border border-linea bg-superficie px-4 py-4 text-left transition-colors hover:border-petroleo/45 hover:bg-hundido"
                  >
                    <span className="text-sm font-bold">Buscar empresa directo</span>
                    <span className="mt-1 block text-xs leading-5 text-apagado">Filtras por nombre y abris la auditoria de esa empresa.</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Boton
                      type="button"
                      variante="secundario"
                      tam="sm"
                      onClick={() => {
                        setAuditoriaEmpresaModo(null);
                        setAuditoriaEmpresaId("");
                        setBusquedaEmpresaAudit("");
                        setAuditoriaPagina(1);
                      }}
                    >
                      <ArrowLeft size={14} /> Cambiar modo
                    </Boton>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
                    {auditoriaEmpresaModo === "por_estudio" ? (
                      <label className="block">
                        <span className="mb-1.5 block text-[13px] font-semibold text-tinta-2">Estudio</span>
                        <select className={inputCls} value={auditoriaEstudioSeleccionadoId} onChange={(e) => cambiarFiltroAuditoria(() => setAuditoriaEstudioId(e.target.value))}>
                          {estudios.map((estudio) => (
                            <option key={estudio.id} value={estudio.id}>
                              {estudio.nombre}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <label className="block">
                        <span className="mb-1.5 block text-[13px] font-semibold text-tinta-2">Buscar empresa</span>
                        <span className="relative block">
                          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-apagado" />
                          <input className={clsx(inputCls, "pl-9")} value={busquedaEmpresaAudit} onChange={(e) => cambiarFiltroAuditoria(() => setBusquedaEmpresaAudit(e.target.value))} placeholder="Nombre de empresa" />
                        </span>
                      </label>
                    )}
                    <div className="grid max-h-52 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
                      {empresasAudit.map((empresa) => (
                        <button
                          key={empresa.id}
                          type="button"
                          onClick={() => cambiarFiltroAuditoria(() => setAuditoriaEmpresaId(empresa.id))}
                          className={clsx("rounded-xl border px-3 py-2 text-left text-sm transition-colors", auditoriaEmpresaId === empresa.id ? "border-petroleo bg-cielo text-cielo-t" : "border-linea bg-superficie hover:bg-hundido")}
                        >
                          <span className="block font-bold">{empresa.nombre}</span>
                          <span className="mt-0.5 block text-xs opacity-75">{empresa.rut}</span>
                        </button>
                      ))}
                      {empresasAudit.length === 0 && (
                        <p className="rounded-xl bg-hundido px-3 py-3 text-sm text-apagado sm:col-span-2 xl:col-span-3">
                          No hay empresas operativas cargadas para ese estudio.
                        </p>
                      )}
                    </div>
                  </div>
                  {empresaAuditSeleccionada ? (
                    <>
                      <div className="rounded-xl bg-hundido px-4 py-3 text-sm">
                        <p className="font-bold">{empresaAuditSeleccionada.nombre}</p>
                        <p className="mt-0.5 text-xs text-apagado">RUT {empresaAuditSeleccionada.rut} - {empresaAuditSeleccionada.actividad}</p>
                      </div>
                      {renderFiltrosAuditoria()}
                      {renderEventosAuditoria(eventosEmpresaFiltrados, "No hay movimientos para esa empresa con esos filtros.")}
                    </>
                  ) : (
                    <p className="rounded-xl bg-hundido px-4 py-3 text-sm text-apagado">Elegí una empresa para ver su auditoria.</p>
                  )}
                </>
              )}
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}

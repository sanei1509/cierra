"use client";

import clsx from "clsx";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type MouseEvent } from "react";
import {
  aceptarAdvertenciaReal,
  agregarNotaPeriodoReal,
  actualizarEmpleadoReal,
  actualizarEmpresaReal,
  aprobarInternoReal,
  borrarNovedadReal,
  calcularLiquidacionReal,
  cancelarLiquidacionReal,
  cerrarPeriodoReal,
  enviarAprobacionReal,
  generarBpsReal,
  listarNovedadesEmpleadoReal,
  marcarNovedadesRecibidasReal,
  marcarBpsPresentadoReal,
  rectificarPeriodoReal,
  solicitarNovedadesReal,
} from "@/app/(estudio)/actions";
import {
  AlertOctagon, AlertTriangle, Info, Check, ChevronRight, Plus, X, Send, Calculator, FileDown, Lock, RefreshCw,
  ExternalLink, UserRound, Mail, Undo2, MessageSquare, Eye, Paperclip, ImagePlus, FileSpreadsheet, Files, Pencil,
} from "lucide-react";
import { useStore, usePeriodoVista, useUsuario, type Vista } from "@/lib/store";
import { PASOS, pasoActual } from "@/lib/status";
import { TIPOS, valorNovedad, estadoNovedades } from "@/lib/labels";
import { USUARIOS, usuarioPorResponsableId } from "@/lib/seed";
import { MES_ACTUAL, fecha, fechaHora, fmt, fmt2, mesAnterior, nombreMes, pct } from "@/lib/format";
import { activoEn, calcularEmpresa, totales } from "@/lib/engine";
import { DIAS_LABORALES, horarioDefault, normalizarHorario, resumenHorario } from "@/lib/horarios";
import { categoriasDe, laudoDe } from "@/lib/params";
import { archivoNomina, descargar } from "@/lib/bps";
import type { Alerta, AuditEvent, CondicionPresentismo, Empleado, Empresa, Novedad, Periodo } from "@/lib/types";
import { Avatar, Boton, Campo, Chip, Drawer, EstadoChip, MarcaEmpresa, Modal, Panel, Vacio, imagenADataUrl, inputCls } from "@/components/ui";
import { CalcDetalle } from "@/components/calc-detalle";
import { NovedadForm } from "@/components/novedad-form";
import { ImportarEmpleados } from "@/components/importar-empleados";

type Tab = "resumen" | "novedades" | "liquidacion" | "empleados" | "reglas" | "actividad";
const LIMITE_HISTORIAL_NOVEDADES = 10;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ORDEN_ETAPA: Record<Periodo["etapa"], number> = {
  novedades: 0,
  recibidas: 1,
  borrador: 2,
  enviada: 3,
  devuelta: 4,
  aprobada: 5,
  cerrada: 6,
};

function periodoMasNuevo(real: Periodo, local?: Periodo) {
  if (!local) return real;
  if (local.versiones.length > real.versiones.length) return local;
  if (local.versiones.length === real.versiones.length && ORDEN_ETAPA[local.etapa] > ORDEN_ETAPA[real.etapa]) return local;
  return real;
}

function sincronizarDatosOperativos(datos: {
  modo: "real" | "demo";
  empresas: Empresa[];
  empleados: Empleado[];
  periodos: Periodo[];
  novedades: Novedad[];
  audit: AuditEvent[];
  vistas: Record<string, string>;
}) {
  if (datos.modo !== "real") return;
  useStore.setState((actual) => {
    const empresasReales = new Set(datos.empresas.map((empresa) => empresa.id));
    const empleadosReales = new Set(datos.empleados.map((empleado) => empleado.id));
    const periodosReales = new Map(datos.periodos.map((periodo) => [periodo.id, periodo]));
    const novedadesReales = new Set(datos.novedades.map((novedad) => novedad.id));
    const auditReal = new Set(datos.audit.map((evento) => evento.id));

    return {
      ...actual,
      empresas: datos.empresas,
      empleados: [
        ...datos.empleados,
        ...actual.empleados.filter((empleado) => empresasReales.has(empleado.empresaId) && !empleadosReales.has(empleado.id)),
      ],
      periodos: [
        ...datos.periodos.map((periodo) => periodoMasNuevo(periodo, actual.periodos.find((local) => local.id === periodo.id))),
        ...actual.periodos.filter((periodo) => empresasReales.has(periodo.empresaId) && !periodosReales.has(periodo.id)),
      ],
      novedades: [
        ...datos.novedades,
        ...actual.novedades.filter((novedad) => empresasReales.has(novedad.empresaId) && !novedadesReales.has(novedad.id)),
      ],
      audit: [
        ...datos.audit,
        ...actual.audit.filter((evento) => !!evento.empresaId && empresasReales.has(evento.empresaId) && !auditReal.has(evento.id)),
      ],
      vistas: { ...datos.vistas, ...actual.vistas },
    };
  });
}

function Stepper({ v }: { v: Vista }) {
  const actual = pasoActual(v.periodo, v.pend.total);
  return (
    <div className="rounded-2xl border border-linea bg-hundido px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-apagado">Progreso del cierre</p>
        <p className="text-xs font-semibold text-tinta-2">Paso {Math.min(actual + 1, PASOS.length)} de {PASOS.length}</p>
      </div>
      <ol className="mt-3 grid gap-2 md:grid-cols-6">
        {PASOS.map((p, i) => {
          const hecho = i < actual;
          const activo = i === actual;
          return (
            <li key={p}>
              <span
                className={clsx(
                  "flex h-full min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-semibold",
                  hecho && "border-petroleo/15 bg-menta text-menta-t",
                  activo && "border-petroleo bg-superficie text-tinta shadow-sm",
                  !hecho && !activo && "border-linea bg-superficie/70 text-apagado",
                )}
                aria-current={activo ? "step" : undefined}
              >
                <span className={clsx("flex size-5 shrink-0 items-center justify-center rounded-full text-[11px]", hecho ? "bg-petroleo text-white" : activo ? "bg-petroleo text-white" : "bg-hundido text-tinta-2")}>
                  {hecho ? <Check size={12} strokeWidth={3} /> : i + 1}
                </span>
                <span className="truncate">{p}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const ICONO_ALERTA = { bloqueante: AlertOctagon, advertencia: AlertTriangle, info: Info };
const TONO_ALERTA = { bloqueante: "bg-rosa text-rosa-t", advertencia: "bg-crema text-crema-t", info: "bg-cielo text-cielo-t" };

function AlertaItem({ a, v, onVer }: { a: Alerta; v: Vista; onVer: (id: string) => void }) {
  const aceptar = useStore((s) => s.aceptarAdvertencia);
  const puede = useStore((s) => s.puede);
  const router = useRouter();
  const usuario = useUsuario();
  const [nota, setNota] = useState("");
  const [abierta, setAbierta] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const Icon = ICONO_ALERTA[a.nivel];
  const aceptada = v.periodo.advertenciasAceptadas[a.id];
  const guardar = async () => {
    if (!nota.trim()) return;
    setError("");
    setProcesando(true);
    try {
      const res = await aceptarAdvertenciaReal({ periodoId: v.periodo.id, empresaId: v.empresa.id, actor: usuario.nombre, alertaId: a.id, nota: nota.trim() });
      if (!res.ok) {
        setError(res.mensaje);
        return;
      }
      aceptar(v.periodo.id, a.id, nota.trim());
      setAbierta(false);
      if (res.modo === "real") router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos aceptar la advertencia.");
    } finally {
      setProcesando(false);
    }
  };
  return (
    <li className={clsx("rounded-3xl border border-linea p-4", aceptada && "bg-hundido/55")}>
      <div className="flex gap-3">
        <span className={clsx("flex size-9 shrink-0 items-center justify-center rounded-full", TONO_ALERTA[a.nivel])}>
          <Icon size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            {a.titulo}
            <span className="text-xs font-medium text-apagado">{a.nivel === "bloqueante" ? "Bloquea el cierre" : a.nivel === "advertencia" ? "Advertencia" : "Aviso"}</span>
          </p>
          <p className="mt-0.5 text-[13px] text-tinta-2">{a.detalle}</p>
          {aceptada && <p className="mt-1.5 text-xs text-apagado">Aceptada: “{aceptada}”</p>}
          <div className="mt-2.5 flex flex-wrap gap-2">
            {a.empleadoId && (
              <Boton tam="sm" variante="secundario" onClick={() => onVer(a.empleadoId!)}>
                <UserRound size={13} /> Ver ficha
              </Boton>
            )}
            {a.nivel === "advertencia" && !aceptada && puede("editar") && !abierta && (
              <Boton tam="sm" variante="fantasma" onClick={() => setAbierta(true)}>Aceptar con nota</Boton>
            )}
          </div>
          {abierta && (
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void guardar();
              }}
            >
              <input autoFocus className={clsx(inputCls, "h-9")} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Por qué está bien, ej.: comisión confirmada por el cliente" />
              <Boton tam="sm" type="submit" disabled={!nota.trim() || procesando}>{procesando ? "Guardando..." : "Aceptar"}</Boton>
            </form>
          )}
          {error && <p className="mt-2 rounded-xl bg-rosa px-3 py-2 text-xs text-rosa-t">{error}</p>}
        </div>
      </div>
    </li>
  );
}

function ProximaAccion({ v, irA }: { v: Vista; irA: (t: Tab) => void }) {
  const s = useStore();
  const router = useRouter();
  const puede = s.puede("editar");
  const [confirmar, setConfirmar] = useState<null | "cerrar" | "rectificar" | "cancelar-liquidacion">(null);
  const [motivo, setMotivo] = useState("");
  const [motivoCancelacion, setMotivoCancelacion] = useState("");
  const [procesando, setProcesando] = useState("");
  const [error, setError] = useState("");
  const { periodo: p, empresa } = v;
  const ultima = p.versiones.at(-1);
  const empleados = s.empleados;
  const periodoInput = { periodoId: p.id, empresaId: empresa.id, actor: useUsuario().nombre };
  const ejecutar = async (clave: string, accionReal: () => Promise<{ ok: boolean; modo: "real" | "demo"; mensaje: string }>, accionLocal: () => void) => {
    setError("");
    setProcesando(clave);
    try {
      const res = await accionReal();
      if (!res.ok) {
        setError(res.mensaje);
        return;
      }
      if (res.modo === "real") router.refresh();
      else accionLocal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos actualizar el periodo.");
    } finally {
      setProcesando("");
    }
  };

  let titulo = "";
  let texto: React.ReactNode = "";
  let acciones: React.ReactNode = null;

  const recalc = (
    <Boton
      variante={v.desactualizada ? "primario" : "secundario"}
      disabled={!puede || v.pend.bloq.length > 0 || procesando === "calcular"}
      onClick={() => void ejecutar("calcular", () => calcularLiquidacionReal(periodoInput), () => s.calcular(p.id))}
    >
      <RefreshCw size={15} /> Recalcular (crea v{(ultima?.version ?? 0) + 1})
    </Boton>
  );
  const puedeCancelarLiquidacion = p.versiones.length > 0 || ["enviada", "aprobada", "cerrada", "devuelta"].includes(p.etapa);
  const cancelarLiquidacionBtn = puedeCancelarLiquidacion ? (
    <Boton
      variante="fantasma"
      disabled={!s.puede("reabrir") || !!procesando}
      onClick={() => setConfirmar("cancelar-liquidacion")}
      title={!s.puede("reabrir") ? "Solo administradores" : undefined}
    >
      <Undo2 size={15} /> Cancelar liquidación
    </Boton>
  ) : null;

  switch (v.estado) {
    case "pendiente":
      titulo = p.solicitud ? "Esperando las novedades del cliente" : "Pedí las novedades del mes";
      texto = p.solicitud
        ? `${empresa.contacto.nombre} recibió el pedido el ${fecha(p.solicitud.enviada)}${p.solicitud.abierta ? ` y lo abrió el ${fecha(p.solicitud.abierta)}` : ", todavía no lo abrió"}. Si te las mandó por otro medio, cargalas vos.`
        : `Le enviamos a ${empresa.contacto.nombre} un enlace seguro para cargar horas extra, faltas, bonos y licencias antes del ${fecha(p.fechaObjetivo)}.`;
      acciones = (
        <>
          <Boton disabled={!puede || procesando === "solicitar"} onClick={() => void ejecutar("solicitar", () => solicitarNovedadesReal(periodoInput), () => s.solicitarNovedades(p.id))}><Send size={15} /> {p.solicitud ? "Reenviar pedido" : "Pedir novedades"}</Boton>
          <Boton variante="secundario" onClick={() => irA("novedades")}><Plus size={15} /> Cargarlas yo</Boton>
          <Boton variante="secundario" disabled={!puede || procesando === "recibidas"} onClick={() => void ejecutar("recibidas", () => marcarNovedadesRecibidasReal(periodoInput), () => s.marcarRecibidas(p.id))}>
            <Check size={15} /> Marcar como completas
          </Boton>
        </>
      );
      break;
    case "alertas":
      titulo = v.pend.bloq.length ? `Resolvé ${v.pend.bloq.length} ${v.pend.bloq.length === 1 ? "bloqueo" : "bloqueos"}` : `Revisá ${v.pend.adv.length} ${v.pend.adv.length === 1 ? "advertencia" : "advertencias"}`;
      texto = v.pend.bloq.length
        ? "Hasta corregirlos no se puede calcular ni cerrar. Cada alerta te lleva al dato a corregir."
        : "Aceptalas con una nota si están bien, o corregí el dato y recalculá.";
      acciones = (
        <>
          {ultima ? recalc : null}
          {cancelarLiquidacionBtn}
        </>
      );
      break;
    case "lista":
      titulo = "Todo listo para calcular";
      texto = `Validación automática completada: ${v.novedadesMes.length} novedades cargadas y sin bloqueos. El cálculo crea la versión 1 con los parámetros vigentes de ${nombreMes(p.mes).toLowerCase()}.`;
      acciones = (
        <Boton
          disabled={!s.puede("calcular") || procesando === "calcular"}
          onClick={() => void ejecutar("calcular", () => calcularLiquidacionReal(periodoInput), () => { s.calcular(p.id); irA("liquidacion"); })}
        >
          <Calculator size={15} /> Calcular borrador
        </Boton>
      );
      break;
    case "borrador":
    case "rectificacion":
      titulo = v.desactualizada ? "Hubo cambios después del último cálculo" : `Revisá el borrador v${ultima?.version}`;
      texto = v.desactualizada
        ? "Se modificaron novedades o fichas. Recalculá para generar una versión nueva antes de enviarla."
        : empresa.requiereAprobacion
          ? `Si está bien, envialo a ${empresa.contacto.nombre} para que lo apruebe. Solo verá totales y variaciones.`
          : "Esta empresa no requiere aprobación del cliente: podés aprobarlo internamente.";
      acciones = v.desactualizada ? (
        recalc
      ) : (
        <>
          {empresa.requiereAprobacion ? (
            <Boton disabled={!puede || procesando === "enviar"} onClick={() => void ejecutar("enviar", () => enviarAprobacionReal(periodoInput), () => s.enviarAprobacion(p.id))}><Send size={15} /> Enviar a aprobación</Boton>
          ) : (
            <Boton disabled={!puede || procesando === "aprobar"} onClick={() => void ejecutar("aprobar", () => aprobarInternoReal(periodoInput), () => s.aprobarInterno(p.id))}><Check size={15} /> Aprobar internamente</Boton>
          )}
          <Boton variante="secundario" onClick={() => irA("liquidacion")}>Ver liquidación</Boton>
          {cancelarLiquidacionBtn}
        </>
      );
      break;
    case "esperando":
      titulo = `Esperando a ${empresa.contacto.nombre}`;
      texto = `La versión ${p.aprobacion?.version} se envió el ${fecha(p.aprobacion!.enviada)}. Si recalculás, la aprobación pendiente se anula.`;
      acciones = (
        <>
          <Boton variante="secundario" href={`/cliente/${empresa.id}`}><Eye size={15} /> Ver lo que ve el cliente</Boton>
          <Boton variante="fantasma" disabled={!puede || procesando === "solicitar"} onClick={() => void ejecutar("solicitar", () => solicitarNovedadesReal(periodoInput), () => s.solicitarNovedades(p.id))}><Mail size={15} /> Recordar por email</Boton>
          {cancelarLiquidacionBtn}
        </>
      );
      break;
    case "devuelta":
      titulo = "El cliente devolvió la liquidación";
      texto = (
        <>
          <span className="mt-1 block rounded-2xl bg-superficie/80 px-4 py-3 text-tinta">
            <MessageSquare size={14} className="mr-1.5 inline text-rosa-t" />“{p.aprobacion?.comentario}”
            <span className="mt-1 block text-xs text-apagado">{p.aprobacion?.por} · {p.aprobacion?.fecha && fechaHora(p.aprobacion.fecha)}</span>
          </span>
          <span className="mt-2 block">Corregí las novedades y recalculá: la nueva versión vuelve a pedir aprobación.</span>
        </>
      );
      acciones = (
        <>
          <Boton onClick={() => irA("novedades")}>Corregir novedades</Boton>
          {recalc}
          {cancelarLiquidacionBtn}
        </>
      );
      break;
    case "aprobada":
      titulo = "Aprobada: podés cerrar el mes";
      texto = `Al cerrar se bloquea la versión ${p.aprobacion?.version}, se publican los recibos en el portal de cada empleado y queda lista la nómina para BPS.`;
      acciones = (
        <>
          <Boton disabled={!s.puede("cerrar")} onClick={() => setConfirmar("cerrar")}><Lock size={15} /> Cerrar y publicar recibos</Boton>
          {cancelarLiquidacionBtn}
        </>
      );
      break;
    case "cerrada": {
      const res = v.resultados ?? [];
      titulo = p.bps === "presentado" ? "Mes terminado" : "Cerrado. Falta presentar la nómina en BPS";
      texto = `Versión ${p.cerrado?.version ?? 1} cerrada${p.cerrado ? ` el ${fecha(p.cerrado.fecha)} por ${p.cerrado.por}` : ""}. ${res.filter((r) => !r.fueraDeAlcance).length} recibos publicados.`;
      acciones = (
        <>
          <Boton
            variante={p.bps === "pendiente" ? "primario" : "secundario"}
            onClick={() => {
              descargar(`nomina-${empresa.nroBps}-${p.mes}.txt`, archivoNomina(empresa, p.mes, empleados, res));
              if (p.bps === "pendiente") void ejecutar("bps", () => generarBpsReal(periodoInput), () => s.generarBps(p.id));
            }}
          >
            <FileDown size={15} /> Descargar archivo BPS
          </Boton>
          {p.bps === "generado" && <Boton variante="secundario" disabled={!puede || procesando === "bps-presentado"} onClick={() => void ejecutar("bps-presentado", () => marcarBpsPresentadoReal(periodoInput), () => s.marcarBpsPresentado(p.id))}><Check size={15} /> Marcar como presentada</Boton>}
          <Boton variante="fantasma" href={`/recibos/${empresa.id}/${p.mes}`}><Files size={15} /> Todos los recibos en PDF</Boton>
          <Boton variante="fantasma" disabled={!s.puede("reabrir")} onClick={() => setConfirmar("rectificar")} title={!s.puede("reabrir") ? "Solo administradores" : undefined}>
            <Undo2 size={15} /> Rectificar
          </Boton>
          {cancelarLiquidacionBtn}
        </>
      );
      break;
    }
  }

  const tono = v.estado === "alertas" || v.estado === "devuelta" ? "bg-rosa/60" : v.estado === "cerrada" ? "bg-menta/70" : "bg-sol-suave";

  return (
    <Panel className={clsx("p-6", tono)}>
      <p className="text-xs font-semibold text-tinta-2">Próximo paso</p>
      <h2 className="mt-1 text-2xl font-extrabold tracking-tight">{titulo}</h2>
      <div className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-tinta-2">{texto}</div>
      {acciones && <div className="mt-5 flex flex-wrap gap-2">{acciones}</div>}

      <Modal abierto={confirmar === "cerrar"} onCerrar={() => setConfirmar(null)} titulo={`Cerrar ${nombreMes(p.mes).toLowerCase()} de ${empresa.nombre}`}>
        <p className="text-sm text-tinta-2">
          Se bloquea la versión {p.aprobacion?.version} y se publican {v.resultados?.filter((r) => !r.fueraDeAlcance).length} recibos. Para cambiar algo después vas a tener que iniciar una rectificación.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Boton variante="fantasma" onClick={() => setConfirmar(null)}>Cancelar</Boton>
          <Boton
            disabled={procesando === "cerrar"}
            onClick={() => void ejecutar("cerrar", () => cerrarPeriodoReal(periodoInput), () => { s.cerrar(p.id); setConfirmar(null); })}
          >
            <Lock size={15} /> Cerrar y publicar
          </Boton>
        </div>
      </Modal>
      <Modal abierto={confirmar === "rectificar"} onCerrar={() => setConfirmar(null)} titulo="Iniciar rectificación">
        <p className="text-sm text-tinta-2">La versión cerrada se conserva. Se crea una corrección vinculada y vas a ver qué cambió. El motivo queda en auditoría.</p>
        <textarea className={clsx(inputCls, "mt-3 h-24 py-3")} placeholder="Motivo, ej.: faltó una comisión de Natalia Píriz" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        <div className="mt-4 flex justify-end gap-2">
          <Boton variante="fantasma" onClick={() => setConfirmar(null)}>Cancelar</Boton>
          <Boton
            disabled={motivo.trim().length < 5 || procesando === "rectificar"}
            onClick={() => void ejecutar("rectificar", () => rectificarPeriodoReal({ ...periodoInput, motivo: motivo.trim() }), () => { s.rectificar(p.id, motivo.trim()); setConfirmar(null); setMotivo(""); })}
          >
            Rectificar
          </Boton>
        </div>
      </Modal>
      <Modal abierto={confirmar === "cancelar-liquidacion"} onCerrar={() => setConfirmar(null)} titulo={`Cancelar liquidación de ${nombreMes(p.mes).toLowerCase()}`}>
        <div className="space-y-3 text-sm text-tinta-2">
          <p>
            Vas a eliminar el borrador y todas las versiones calculadas de este período. También se borra la aprobación pendiente o aprobada, el cierre, la marca de BPS y los recibos publicados si ya se habían generado.
          </p>
          <p>
            Se conservan la empresa, las personas y las novedades cargadas. Después vas a poder revisar datos y calcular un borrador nuevo desde cero.
          </p>
          <label className="block pt-1">
            <span className="mb-1.5 block text-[13px] font-semibold text-tinta">Motivo de la cancelación</span>
            <textarea
              className={clsx(inputCls, "h-24 py-3")}
              placeholder="Ej.: prueba de flujo, necesito volver a calcular desde cero"
              value={motivoCancelacion}
              onChange={(e) => setMotivoCancelacion(e.target.value)}
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Boton variante="fantasma" onClick={() => setConfirmar(null)}>Volver</Boton>
          <Boton
            variante="secundario"
            disabled={motivoCancelacion.trim().length < 5 || procesando === "cancelar-liquidacion"}
            onClick={() => void ejecutar(
              "cancelar-liquidacion",
              () => cancelarLiquidacionReal({ ...periodoInput, motivo: motivoCancelacion.trim() }),
              () => {
                s.cancelarLiquidacion(p.id, motivoCancelacion.trim());
                setMotivoCancelacion("");
                setConfirmar(null);
                irA("resumen");
              },
            )}
          >
            <Undo2 size={15} /> {procesando === "cancelar-liquidacion" ? "Cancelando..." : "Sí, cancelar liquidación"}
          </Boton>
        </div>
      </Modal>
      {error && <p className="mt-4 rounded-2xl bg-rosa px-4 py-3 text-sm text-rosa-t">{error}</p>}
    </Panel>
  );
}

function Checklist({ v }: { v: Vista }) {
  const p = v.periodo;
  const items = [
    { ok: p.etapa !== "novedades", t: "Novedades recibidas o confirmadas" },
    { ok: v.pend.bloq.length === 0, t: "Sin bloqueos" },
    { ok: v.pend.adv.length === 0, t: "Advertencias revisadas" },
    { ok: p.versiones.length > 0 && !v.desactualizada, t: "Liquidación calculada y al día" },
    { ok: ["aprobada", "cerrada"].includes(p.etapa), t: v.empresa.requiereAprobacion ? "Aprobada por el cliente" : "Aprobada internamente" },
    { ok: p.etapa === "cerrada", t: "Recibos publicados" },
    { ok: p.bps === "presentado", t: "Nómina BPS presentada" },
  ];
  return (
    <Panel className="p-5">
      <h3 className="font-bold">Checklist de cierre</h3>
      <ul className="mt-3 space-y-2">
        {items.map((i) => (
          <li key={i.t} className="flex items-center gap-2.5 text-sm">
            <span className={clsx("flex size-5 items-center justify-center rounded-full", i.ok ? "bg-petroleo text-white" : "rayado bg-hundido")}>
              {i.ok && <Check size={12} strokeWidth={3} />}
            </span>
            <span className={i.ok ? "text-tinta" : "text-apagado"}>{i.t}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Notas({ v }: { v: Vista }) {
  const agregar = useStore((s) => s.agregarNota);
  const router = useRouter();
  const usuario = useUsuario();
  const [t, setT] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const guardar = async () => {
    const texto = t.trim();
    if (!texto) return;
    setError("");
    setGuardando(true);
    try {
      const res = await agregarNotaPeriodoReal({ periodoId: v.periodo.id, empresaId: v.empresa.id, actor: usuario.nombre, texto });
      if (!res.ok) {
        setError(res.mensaje);
        return;
      }
      agregar(v.periodo.id, texto);
      setT("");
      if (res.modo === "real") router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos guardar la nota.");
    } finally {
      setGuardando(false);
    }
  };
  return (
    <Panel className="p-5">
      <h3 className="font-bold">Notas internas</h3>
      <p className="text-xs text-apagado">No las ve el cliente ni los empleados.</p>
      <ul className="mt-3 space-y-2">
        {v.periodo.notas.map((n, i) => (
          <li key={i} className="rounded-2xl bg-hundido px-3 py-2 text-sm">
            {n.texto}
            <span className="block text-xs text-apagado">{n.por} · {fechaHora(n.fecha)}</span>
          </li>
        ))}
      </ul>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); void guardar(); }}>
        <input className={clsx(inputCls, "h-9")} value={t} onChange={(e) => setT(e.target.value)} placeholder="Escribí una nota" />
        <Boton tam="sm" type="submit" variante="secundario" disabled={!t.trim() || guardando}>{guardando ? "Guardando..." : "Guardar"}</Boton>
      </form>
      {error && <p className="mt-2 rounded-xl bg-rosa px-3 py-2 text-xs text-rosa-t">{error}</p>}
    </Panel>
  );
}

function TabResumen({ v, irA, verEmpleado }: { v: Vista; irA: (t: Tab) => void; verEmpleado: (id: string) => void }) {
  const orden = { bloqueante: 0, advertencia: 1, info: 2 };
  const alertas = [...v.alertas].sort((a, b) => orden[a.nivel] - orden[b.nivel]);
  return (
    <div className="grid gap-3 xl:grid-cols-[1fr_340px]">
      <div className="space-y-3">
        <ProximaAccion v={v} irA={irA} />
        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Alertas</h3>
            <span className="text-xs text-apagado">{v.pend.bloq.length} bloqueos · {v.pend.adv.length} advertencias sin revisar</span>
          </div>
          {alertas.length ? (
            <ul className="mt-3 space-y-2">{alertas.map((a) => <AlertaItem key={a.id} a={a} v={v} onVer={verEmpleado} />)}</ul>
          ) : (
            <p className="mt-3 rounded-2xl bg-menta px-4 py-3 text-sm text-menta-t">{v.periodo.etapa === "cerrada" ? "El período está cerrado." : "Sin alertas. Todo coincide con lo esperado."}</p>
          )}
        </Panel>
      </div>
      <div className="space-y-3">
        <Checklist v={v} />
        <Notas v={v} />
      </div>
    </div>
  );
}

function TabNovedades({ v, empleados }: { v: Vista; empleados: Empleado[] }) {
  const u = useUsuario();
  const puede = useStore((s) => s.puede)("editar");
  const borrar = useStore((s) => s.borrarNovedad);
  const [form, setForm] = useState<{ emp?: string; novedad?: Novedad } | null>(null);
  const [eliminando, setEliminando] = useState("");
  const [error, setError] = useState("");
  const bloqueado = v.periodo.etapa === "cerrada";
  const est = estadoNovedades(v.periodo);
  const eliminar = async (n: Novedad) => {
    setError("");
    setEliminando(n.id);
    const antes = `${TIPOS[n.tipo].corto} ${valorNovedad(n)}`;
    try {
      const res = await borrarNovedadReal({ id: n.id, empresaId: n.empresaId, tipo: n.tipo, autor: u.nombre, antes });
      if (!res.ok) {
        setError(res.mensaje);
        return;
      }
      borrar(n.id, u.nombre);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos eliminar la novedad.");
    } finally {
      setEliminando("");
    }
  };
  return (
    <Panel className="p-3">
      <div className="flex flex-wrap items-center gap-3 px-3 pt-2 pb-4">
        <div className="mr-auto">
          <h2 className="text-lg font-bold tracking-tight">Novedades de {nombreMes(v.periodo.mes).toLowerCase()}</h2>
          <p className="text-sm text-apagado">{v.novedadesMes.length} cargadas · <Chip tono={est.tono}>{est.texto}</Chip></p>
        </div>
        {!bloqueado && puede && <Boton onClick={() => setForm({})}><Plus size={15} /> Agregar novedad</Boton>}
      </div>
      {bloqueado && <p className="mx-3 mb-3 rounded-2xl bg-hundido px-4 py-3 text-sm text-tinta-2"><Lock size={14} className="mr-1 inline" /> Período cerrado. Para cambiar novedades iniciá una rectificación.</p>}
      {error && <p className="mx-3 mb-3 rounded-2xl bg-rosa px-4 py-3 text-sm text-rosa-t">{error}</p>}
      <ul>
        {empleados.map((e) => {
          const ns = v.novedadesMes.filter((n) => n.empleadoId === e.id);
          return (
            <li key={e.id} className="flex flex-wrap items-center gap-3 border-t border-linea px-3 py-3">
              <Avatar nombre={`${e.nombre} ${e.apellido}`} tono={v.empresa.tono} size={34} />
              <span className="w-52">
                <span className="block text-sm font-semibold">{e.nombre} {e.apellido}</span>
                <span className="block text-xs text-apagado">{e.cargo}</span>
              </span>
              <span className="flex flex-1 flex-wrap gap-1.5">
                {ns.length === 0 && <span className="text-sm text-apagado">Sin novedades</span>}
                {ns.map((n) => (
                  <span key={n.id} className="inline-flex items-center gap-1.5 rounded-full border border-linea bg-hundido py-1 pl-3 pr-1.5 text-[13px]" title={`${n.nota ?? ""}${n.adjunto ? ` · adjunto ${n.adjunto.nombre}` : ""} · cargado por ${n.autor} (${n.origen})`}>
                    <span className="font-semibold">{TIPOS[n.tipo].corto}</span>
                    <span className="num">{valorNovedad(n)}</span>
                    {n.adjunto && <Paperclip size={12} className="text-petroleo" aria-label={`Adjunto: ${n.adjunto.nombre}`} />}
                    {n.origen === "cliente" && <span className="rounded-full bg-lila px-1.5 text-[10px] font-semibold text-lila-t">cliente</span>}
                    {!bloqueado && puede && (
                      <>
                        <button onClick={() => setForm({ emp: e.id, novedad: n })} className="rounded-full p-0.5 text-apagado hover:bg-hundido hover:text-petroleo" aria-label={`Editar ${TIPOS[n.tipo].corto}`}>
                          <Pencil size={13} />
                        </button>
                        <button disabled={eliminando === n.id} onClick={() => void eliminar(n)} className="rounded-full p-0.5 text-apagado hover:bg-rosa hover:text-rosa-t disabled:opacity-50" aria-label={`Quitar ${TIPOS[n.tipo].corto}`}>
                          <X size={13} />
                        </button>
                      </>
                    )}
                  </span>
                ))}
              </span>
              {!bloqueado && puede && (
                <Boton tam="sm" variante="fantasma" onClick={() => setForm({ emp: e.id })}><Plus size={13} /> Agregar</Boton>
              )}
            </li>
          );
        })}
      </ul>
      <Drawer abierto={!!form} onCerrar={() => setForm(null)} titulo={form?.novedad ? "Editar novedad" : "Agregar novedad"} subtitulo={`${v.empresa.nombre} · ${nombreMes(v.periodo.mes)}`}>
        {form && (
          <NovedadForm empresaId={v.empresa.id} mes={v.periodo.mes} empleados={empleados} origen="estudio" autor={u.nombre} empleadoInicial={form.emp} novedadInicial={form.novedad} onListo={() => setForm(null)} />
        )}
      </Drawer>
    </Panel>
  );
}

function Delta({ actual, previo }: { actual: number; previo?: number }) {
  if (!previo) return <span className="text-xs text-apagado">nuevo</span>;
  const d = (actual - previo) / previo;
  if (Math.abs(d) < 0.005) return <span className="text-xs text-apagado">sin cambio</span>;
  return (
    <span className={clsx("num rounded-full px-2 py-0.5 text-xs font-semibold", Math.abs(d) > 0.15 ? "bg-crema text-crema-t" : "bg-hundido text-tinta-2")}>
      {d > 0 ? "▲" : "▼"} {pct(Math.abs(d), 0)}
    </span>
  );
}

function TabLiquidacion({ v, empleados, verCalc }: { v: Vista; empleados: Empleado[]; verCalc: (id: string) => void }) {
  const s = useStore();
  const router = useRouter();
  const usuario = useUsuario();
  const [ver, setVer] = useState<number | null>(null);
  const [procesando, setProcesando] = useState("");
  const [error, setError] = useState("");
  const version = v.periodo.versiones.find((x) => x.version === ver) ?? v.vigente;
  const res = version?.resultados ?? v.resultados;
  const allEmpleados = s.empleados;
  const prev = useMemo(() => calcularEmpresa(v.empresa, allEmpleados, mesAnterior(v.periodo.mes), s.novedades), [v.empresa, allEmpleados, v.periodo.mes, s.novedades]);
  const puedeAvanzar = s.puede("editar");
  const periodoInput = { periodoId: v.periodo.id, empresaId: v.empresa.id, actor: usuario.nombre };
  const ejecutar = async (clave: string, accionReal: () => Promise<{ ok: boolean; modo: "real" | "demo"; mensaje: string }>, accionLocal: () => void) => {
    setError("");
    setProcesando(clave);
    try {
      const res = await accionReal();
      if (!res.ok) {
        setError(res.mensaje);
        return;
      }
      if (res.modo === "real") router.refresh();
      else accionLocal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos avanzar la liquidación.");
    } finally {
      setProcesando("");
    }
  };

  if (!res || (!version && v.periodo.etapa !== "cerrada"))
    return (
      <Panel className="p-8">
        <Vacio titulo="Todavía no hay una liquidación calculada">
          {v.pend.bloq.length ? "Primero resolvé los bloqueos del resumen." : "Cuando las novedades estén completas, calculá el borrador."}
          <div className="mt-4">
            <Boton disabled={!s.puede("calcular") || v.pend.bloq.length > 0 || v.periodo.etapa === "novedades"} onClick={() => s.calcular(v.periodo.id)}>
              <Calculator size={15} /> Calcular borrador
            </Boton>
          </div>
        </Vacio>
      </Panel>
    );

  const t = totales(res);
  const tp = totales(prev);
  const rect = v.periodo.rectificaciones.at(-1);
  const original = rect ? v.periodo.versiones.find((x) => x.version === rect.desdeVersion) : undefined;

  return (
    <div className="space-y-3">
      {v.desactualizada && (
        <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-panel)] bg-crema px-6 py-4 text-sm text-crema-t">
          <AlertTriangle size={18} />
          <span className="flex-1 font-semibold">Hubo cambios después de la versión {v.periodo.versiones.at(-1)?.version}. Estos importes no los reflejan.</span>
          <Boton tam="sm" disabled={!s.puede("calcular") || v.pend.bloq.length > 0} onClick={() => s.calcular(v.periodo.id)}><RefreshCw size={13} /> Recalcular</Boton>
        </div>
      )}
      {!v.desactualizada && v.pend.total === 0 && (v.estado === "borrador" || v.estado === "rectificacion") && (
        <Panel className="flex flex-wrap items-center gap-3 p-5">
          <div className="mr-auto">
            <h3 className="text-base font-bold tracking-tight">Borrador listo para avanzar</h3>
            <p className="mt-1 text-sm text-apagado">
              Ya revisaste la liquidación. El siguiente paso es {v.empresa.requiereAprobacion ? `enviarla a ${v.empresa.contacto.nombre}` : "aprobarla internamente"}.
            </p>
          </div>
          {v.empresa.requiereAprobacion ? (
            <Boton disabled={!puedeAvanzar || procesando === "enviar"} onClick={() => void ejecutar("enviar", () => enviarAprobacionReal(periodoInput), () => s.enviarAprobacion(v.periodo.id))}>
              <Send size={15} /> Enviar a aprobación
            </Boton>
          ) : (
            <Boton disabled={!puedeAvanzar || procesando === "aprobar"} onClick={() => void ejecutar("aprobar", () => aprobarInternoReal(periodoInput), () => s.aprobarInterno(v.periodo.id))}>
              <Check size={15} /> Aprobar internamente
            </Boton>
          )}
          {error && <p className="basis-full rounded-2xl bg-rosa px-4 py-3 text-sm text-rosa-t">{error}</p>}
        </Panel>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { k: "Nominal", v: t.nominal, p: tp.nominal },
          { k: "Descuentos", v: t.descuentos, p: tp.descuentos },
          { k: "Líquido a pagar", v: t.liquido, p: tp.liquido, destacado: true },
          { k: "Aportes patronales", v: t.patronal, p: tp.patronal },
          { k: "Costo empresa", v: t.costo, p: tp.costo },
        ].map((x) => (
          <Panel key={x.k} className={clsx("p-5", x.destacado && "!bg-petroleo text-white")}>
            <p className={clsx("text-sm font-semibold", x.destacado ? "text-[#DCE9FF]" : "text-tinta-2")}>{x.k}</p>
            <p className="num mt-2 text-[28px] font-extrabold leading-none tracking-tight">{fmt(x.v)}</p>
            <p className={clsx("mt-2 text-xs", x.destacado ? "text-[#CFE4FF]" : "text-apagado")}>
              {x.p ? `${x.v >= x.p ? "+" : ""}${pct((x.v - x.p) / x.p, 1)} vs. ${nombreMes(mesAnterior(v.periodo.mes)).split(" ")[0].toLowerCase()}` : ""}
            </p>
          </Panel>
        ))}
      </div>
      <Panel className="p-3">
        <div className="flex flex-wrap items-center gap-3 px-3 pt-2 pb-3">
          <div className="mr-auto">
            <h2 className="text-lg font-bold tracking-tight">Por persona</h2>
          </div>
          {v.periodo.versiones.length > 1 && (
            <div className="flex gap-1 rounded-full bg-hundido p-1">
              {v.periodo.versiones.map((x) => (
                <button key={x.version} onClick={() => setVer(x.version)} className={clsx("rounded-full px-3 py-1 text-[13px] font-semibold", version?.version === x.version ? "bg-superficie shadow-sm" : "text-apagado")}>
                  v{x.version}
                </button>
              ))}
            </div>
          )}
          {version && (
            <span className="text-xs text-apagado">
              Borrador versión {version.version}, calculado por {version.por} el {fechaHora(version.creada)} con parámetros {version.parametros}
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-xs text-apagado">
                <th className="px-3 pb-2 font-semibold">Persona</th>
                <th className="px-3 pb-2 text-center font-semibold" title="Total bruto liquidado antes de descuentos.">Nominal</th>
                <th className="px-3 pb-2 text-center font-semibold" title="Aportes personales, retenciones y otros descuentos.">Descuentos</th>
                <th className="px-3 pb-2 text-center font-semibold" title="Importe final a pagar a la persona.">Líquido</th>
                <th className="px-3 pb-2 text-center font-semibold" title="Variación del nominal frente al mes anterior.">vs. mes anterior</th>
                {original && <th className="px-3 pb-2 text-center font-semibold" title="Diferencia contra la versión cerrada que se está rectificando.">vs. versión cerrada</th>}
                <th className="px-3 pb-2 text-center font-semibold" title="Bloqueos o advertencias pendientes de revisar.">Alertas</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {res.map((r) => {
                const e = empleados.find((x) => x.id === r.empleadoId) ?? allEmpleados.find((x) => x.id === r.empleadoId)!;
                const al = v.alertas.filter((a) => a.empleadoId === r.empleadoId && a.nivel !== "info" && !v.periodo.advertenciasAceptadas[a.id]);
                const pr = prev.find((x) => x.empleadoId === r.empleadoId);
                const orig = original?.resultados.find((x) => x.empleadoId === r.empleadoId);
                return (
                  <tr key={r.empleadoId} className="cursor-pointer border-t border-linea hover:bg-hundido/60" onClick={() => verCalc(r.empleadoId)}>
                    <td className="px-3 py-3">
                      <span className="block font-semibold">{e.nombre} {e.apellido}</span>
                      <span className="block text-xs text-apagado">{e.categoria}</span>
                    </td>
                    {r.fueraDeAlcance ? (
                      <td colSpan={3} className="px-3 py-3 text-right text-xs text-rosa-t">Fuera de alcance · no calculado</td>
                    ) : (
                      <>
                        <td className="num px-3 py-3 text-center">{fmt2(r.totalHaberes)}</td>
                        <td className="num px-3 py-3 text-center text-tinta-2">{fmt2(r.descuentos)}</td>
                        <td className="num px-3 py-3 text-center font-bold">{fmt2(r.liquido)}</td>
                      </>
                    )}
                    <td className="px-3 py-3 text-center"><Delta actual={r.totalHaberes} previo={pr?.totalHaberes} /></td>
                    {original && (
                      <td className="px-3 py-3 text-center text-xs">
                        {orig && Math.abs(orig.liquido - r.liquido) > 0.5 ? <Chip tono="crema">{fmt(orig.liquido)} → {fmt(r.liquido)}</Chip> : <span className="text-apagado">igual</span>}
                      </td>
                    )}
                    <td className="px-3 py-3 text-center">
                      {al.length ? <Chip tono={al.some((a) => a.nivel === "bloqueante") ? "rosa" : "crema"}>{al.length}</Chip> : <span className="text-xs text-apagado">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-petroleo">¿Cómo se calculó? <ChevronRight size={14} /></span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function FichaEmpleado({ e, v, onCerrar }: { e: Empleado; v: Vista; onCerrar: () => void }) {
  const s = useStore();
  const router = useRouter();
  const usuario = useUsuario();
  const puede = s.puede("editar");
  const actual = [...e.sueldos].sort((a, b) => b.desde.localeCompare(a.desde))[0];
  const novedadesMemoria = useMemo(
    () => s.novedades.filter((n) => n.empleadoId === e.id).sort((a, b) => `${b.mes}-${b.fecha}`.localeCompare(`${a.mes}-${a.fecha}`)),
    [s.novedades, e.id],
  );
  const usaHistorialReal = UUID_RE.test(e.id) && UUID_RE.test(e.empresaId);
  const [novedadesHistoricas, setNovedadesHistoricas] = useState<Novedad[]>(() => novedadesMemoria.slice(0, LIMITE_HISTORIAL_NOVEDADES));
  const [totalHistorial, setTotalHistorial] = useState(novedadesMemoria.length);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [errorHistorial, setErrorHistorial] = useState("");
  const novedadesPorMes = useMemo(() => {
    const grupos = new Map<string, Novedad[]>();
    novedadesHistoricas.forEach((n) => grupos.set(n.mes, [...(grupos.get(n.mes) ?? []), n]));
    return [...grupos.entries()];
  }, [novedadesHistoricas]);
  const [f, setF] = useState({
    ci: e.ci,
    email: e.email,
    categoria: e.categoria,
    sueldo: String(actual?.monto ?? ""),
    hijos: String(e.hijos),
    conyuge: e.conyugeFonasa,
    horario: e.horario ?? horarioDefault(e.ingreso),
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const cats = categoriasDe(v.empresa.grupo, v.empresa.subgrupo);
  const laudo = laudoDe(v.empresa.grupo, v.empresa.subgrupo, f.categoria);

  useEffect(() => {
    if (!usaHistorialReal) return;
    let cancelado = false;
    listarNovedadesEmpleadoReal({ empleadoId: e.id, empresaId: e.empresaId, limite: LIMITE_HISTORIAL_NOVEDADES, offset: 0 })
      .then((res) => {
        if (cancelado) return;
        if (!res.ok) {
          setErrorHistorial(res.mensaje);
          return;
        }
        if (res.modo === "real") {
          setNovedadesHistoricas(res.novedades);
          setTotalHistorial(res.total);
        }
      })
      .catch((err) => {
        if (!cancelado) setErrorHistorial(err instanceof Error ? err.message : "No pudimos cargar el historial.");
      });
    return () => {
      cancelado = true;
    };
  }, [e.id, e.empresaId, usaHistorialReal]);

  const cargarMasHistorial = async () => {
    if (!usaHistorialReal) {
      const siguiente = novedadesMemoria.slice(0, novedadesHistoricas.length + LIMITE_HISTORIAL_NOVEDADES);
      setNovedadesHistoricas(siguiente);
      setTotalHistorial(novedadesMemoria.length);
      return;
    }
    setErrorHistorial("");
    setCargandoHistorial(true);
    try {
      const res = await listarNovedadesEmpleadoReal({
        empleadoId: e.id,
        empresaId: e.empresaId,
        limite: LIMITE_HISTORIAL_NOVEDADES,
        offset: novedadesHistoricas.length,
      });
      if (!res.ok) {
        setErrorHistorial(res.mensaje);
        return;
      }
      setNovedadesHistoricas((actual) => {
        const existentes = new Set(actual.map((n) => n.id));
        return [...actual, ...res.novedades.filter((n) => !existentes.has(n.id))];
      });
      setTotalHistorial(res.total);
    } catch (err) {
      setErrorHistorial(err instanceof Error ? err.message : "No pudimos cargar más novedades.");
    } finally {
      setCargandoHistorial(false);
    }
  };

  const guardar = async () => {
    const monto = Number(f.sueldo);
    const horario = normalizarHorario(f.horario, e.ingreso);
    const cambios: Partial<Empleado> = { ci: f.ci, email: f.email, categoria: f.categoria, hijos: Number(f.hijos), conyugeFonasa: f.conyuge, horario };
    const res: string[] = [];
    if (f.ci !== e.ci) res.push(`CI ${e.ci || "vacía"} → ${f.ci}`);
    if (f.categoria !== e.categoria) res.push(`categoría ${e.categoria} → ${f.categoria}`);
    if (monto && monto !== actual?.monto) {
      const desde = `${MES_ACTUAL}-01`;
      cambios.sueldos = [...e.sueldos.filter((x) => x.desde !== desde), { desde, monto }];
      res.push(`sueldo ${fmt(actual?.monto ?? 0)} → ${fmt(monto)} desde ${desde}`);
    }
    if (Number(f.hijos) !== e.hijos) res.push(`hijos ${e.hijos} → ${f.hijos}`);
    if (JSON.stringify(horario) !== JSON.stringify(e.horario)) res.push(`horario ${resumenHorario(e.horario)} → ${resumenHorario(horario)}`);
    const resumen = res.join("; ") || "sin cambios de cálculo";
    setError("");
    setGuardando(true);
    try {
      const resultado = await actualizarEmpleadoReal({ empleadoId: e.id, empresaId: e.empresaId, cambios, resumen, actor: usuario.nombre });
      if (!resultado.ok) {
        setError(resultado.mensaje);
        return;
      }
      s.actualizarEmpleado(e.id, cambios, resumen);
      if (resultado.modo === "real") router.refresh();
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos guardar la ficha.");
    } finally {
      setGuardando(false);
    }
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Cédula"><input className={inputCls} value={f.ci} onChange={(x) => setF({ ...f, ci: x.target.value })} placeholder="1.234.567-8" disabled={!puede} /></Campo>
        <Campo label="Email"><input className={inputCls} value={f.email} onChange={(x) => setF({ ...f, email: x.target.value })} disabled={!puede} /></Campo>
        <Campo label="Categoría" ayuda={laudo ? `Mínimo ${fmt(laudo.minimo)} (grupo ${laudo.grupo}.${laudo.subgrupo})` : undefined}>
          <select className={inputCls} value={f.categoria} onChange={(x) => setF({ ...f, categoria: x.target.value })} disabled={!puede}>
            {!cats.some((c) => c.categoria === f.categoria) && <option>{f.categoria}</option>}
            {cats.map((c) => <option key={c.categoria}>{c.categoria}</option>)}
          </select>
        </Campo>
        <Campo label="Sueldo base mensual" ayuda={`Si lo cambiás, rige desde ${nombreMes(MES_ACTUAL).toLowerCase()}`}>
          <input className={inputCls} inputMode="numeric" value={f.sueldo} onChange={(x) => setF({ ...f, sueldo: x.target.value.replace(/\D/g, "") })} disabled={!puede} />
        </Campo>
        <Campo label="Hijos a cargo"><input className={inputCls} inputMode="numeric" value={f.hijos} onChange={(x) => setF({ ...f, hijos: x.target.value.replace(/\D/g, "") })} disabled={!puede} /></Campo>
        <label className="mt-7 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.conyuge} onChange={(x) => setF({ ...f, conyuge: x.target.checked })} disabled={!puede} className="size-4 accent-petroleo" /> Cónyuge a cargo en FONASA</label>
      </div>
      <section className="rounded-3xl bg-hundido px-4 py-3">
        <div className="flex flex-wrap items-start gap-3">
          <div className="mr-auto">
            <h3 className="text-sm font-bold">Horario laboral</h3>
            <p className="mt-1 text-xs text-apagado">{resumenHorario(f.horario)}</p>
          </div>
          <Campo label="Horas semanales">
            <input
              className={inputCls}
              inputMode="decimal"
              value={String(f.horario.horasSemanales)}
              onChange={(x) => setF({ ...f, horario: { ...f.horario, horasSemanales: Number(x.target.value.replace(",", ".")) || 0 } })}
              disabled={!puede}
            />
          </Campo>
        </div>
        <Campo label="Descripción">
          <input
            className={inputCls}
            value={f.horario.descripcion ?? ""}
            onChange={(x) => setF({ ...f, horario: { ...f.horario, descripcion: x.target.value } })}
            disabled={!puede}
            placeholder="Ej.: lunes a viernes 9 a 18"
          />
        </Campo>
        <div className="mt-3 grid gap-2">
          {DIAS_LABORALES.map((dia) => {
            const valor = f.horario.dias.find((d) => d.dia === dia.id) ?? { dia: dia.id, trabaja: false };
            const actualizarDia = (cambios: Partial<typeof valor>) =>
              setF({
                ...f,
                horario: {
                  ...f.horario,
                  dias: DIAS_LABORALES.map(({ id }) => (id === dia.id ? { ...valor, ...cambios } : f.horario.dias.find((d) => d.dia === id) ?? { dia: id, trabaja: false })),
                },
              });
            return (
              <div key={dia.id} className="grid items-center gap-2 rounded-xl border border-linea bg-superficie p-2 text-sm sm:grid-cols-[110px_1fr_1fr_90px]">
                <label className="flex items-center gap-2 font-semibold">
                  <input type="checkbox" checked={valor.trabaja} onChange={(x) => actualizarDia({ trabaja: x.target.checked })} disabled={!puede} className="size-4 accent-petroleo" />
                  {dia.label}
                </label>
                <input type="time" className={inputCls} value={valor.entrada ?? ""} onChange={(x) => actualizarDia({ entrada: x.target.value })} disabled={!puede || !valor.trabaja} aria-label={`Entrada ${dia.label}`} />
                <input type="time" className={inputCls} value={valor.salida ?? ""} onChange={(x) => actualizarDia({ salida: x.target.value })} disabled={!puede || !valor.trabaja} aria-label={`Salida ${dia.label}`} />
                <label className="flex items-center gap-2 text-xs text-apagado">
                  <input type="checkbox" checked={Boolean(valor.medioDia)} onChange={(x) => actualizarDia({ medioDia: x.target.checked })} disabled={!puede || !valor.trabaja} className="size-4 accent-petroleo" />
                  Medio día
                </label>
              </div>
            );
          })}
        </div>
      </section>
      <section className="rounded-3xl bg-hundido px-4 py-3">
        <h3 className="text-sm font-bold">Historia de sueldo</h3>
        <ul className="mt-2 space-y-1 text-sm">
          {[...e.sueldos].sort((a, b) => b.desde.localeCompare(a.desde)).map((x) => (
            <li key={x.desde} className="flex justify-between"><span className="text-apagado">Desde {x.desde}</span><span className="num font-semibold">{fmt(x.monto)}</span></li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-apagado">Ingreso {e.ingreso}{e.egreso ? ` · egreso ${e.egreso}` : ""} · {e.cuenta} · {resumenHorario(e.horario)}</p>
      </section>
      {(e.area || e.tipoContrato || e.telefono || e.direccion || e.licenciaDisponible !== undefined || e.licenciaTomada !== undefined) && (
        <section className="rounded-3xl bg-hundido px-4 py-3">
          <h3 className="text-sm font-bold">Datos de la ficha madre</h3>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {[
              ["Área", e.area],
              ["Contrato", e.tipoContrato],
              ["Teléfono", e.telefono],
              ["Dirección", e.direccion],
              ["Licencia disponible", e.licenciaDisponible !== undefined ? `${e.licenciaDisponible} días` : undefined],
              ["Licencia tomada", e.licenciaTomada !== undefined ? `${e.licenciaTomada} días` : undefined],
            ].filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-apagado">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      <section className="rounded-3xl bg-hundido px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold">Historial de novedades</h3>
          <Chip tono={totalHistorial ? "cielo" : "gris"}>{novedadesHistoricas.length} de {totalHistorial}</Chip>
        </div>
        {cargandoHistorial && novedadesHistoricas.length === 0 ? (
          <p className="mt-2 text-sm text-apagado">Cargando historial...</p>
        ) : novedadesHistoricas.length === 0 ? (
          <p className="mt-2 text-sm text-apagado">Todavía no hay novedades registradas para esta persona.</p>
        ) : (
          <div className="mt-3 space-y-4">
            {novedadesPorMes.map(([mes, novedades]) => (
              <div key={mes}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-apagado">{nombreMes(mes)}</p>
                <ul className="divide-y divide-linea overflow-hidden rounded-2xl border border-linea bg-superficie">
                  {novedades.map((n) => (
                    <li key={n.id} className="px-3.5 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Chip tono={TIPOS[n.tipo].tono}>{TIPOS[n.tipo].corto}</Chip>
                        <span className="num text-sm font-bold">{valorNovedad(n)}</span>
                        <span className="text-xs text-apagado">{n.origen === "cliente" ? "Cliente" : "Estudio"} · {n.autor} · {fechaHora(n.fecha)}</span>
                        {n.adjunto && <span className="inline-flex items-center gap-1 text-xs font-semibold text-petroleo"><Paperclip size={12} /> Comprobante</span>}
                      </div>
                      {n.nota && <p className="mt-1 text-sm text-tinta-2">{n.nota}</p>}
                      {n.datos?.ausenciaDescuenta !== undefined && (
                        <p className="mt-1 text-xs text-apagado">{n.datos.ausenciaDescuenta ? "Descuenta jornal" : "No descuenta jornal"}</p>
                      )}
                      {(n.datos?.categoriaNueva || n.datos?.nuevaCategoria || n.datos?.sueldoNuevo || n.datos?.nuevoSueldo) && (
                        <p className="mt-1 text-xs text-apagado">
                          Cambio de categoría
                          {n.datos.categoriaAnterior ? ` · anterior: ${n.datos.categoriaAnterior}` : ""}
                          {n.datos.categoriaNueva || n.datos.nuevaCategoria ? ` · nueva: ${n.datos.categoriaNueva ?? n.datos.nuevaCategoria}` : ""}
                          {n.datos.sueldoAnterior ? ` · sueldo anterior ${fmt(n.datos.sueldoAnterior)}` : ""}
                          {n.datos.sueldoNuevo || n.datos.nuevoSueldo ? ` · sueldo nuevo ${fmt(n.datos.sueldoNuevo ?? n.datos.nuevoSueldo ?? 0)}` : ""}
                          {n.datos.categoriaAplicaDesde || n.datos.aplicaDesde ? ` · desde ${n.datos.categoriaAplicaDesde ?? n.datos.aplicaDesde}` : ""}
                        </p>
                      )}
                      {n.datos?.egresoFecha && (
                        <p className="mt-1 text-xs text-apagado">
                          Fecha de egreso: {n.datos.egresoFecha}
                          {n.datos.egresoCausal ? ` · causal: ${n.datos.egresoCausal}` : ""}
                          {n.datos.egresoLicenciaNoGozadaDias ? ` · licencia no gozada: ${n.datos.egresoLicenciaNoGozadaDias} día(s)` : ""}
                        </p>
                      )}
                      {n.datos?.ingresoFecha && (
                        <p className="mt-1 text-xs text-apagado">
                          Fecha de ingreso: {n.datos.ingresoFecha}
                          {n.datos.ingresoCategoria ? ` · categoría: ${n.datos.ingresoCategoria}` : ""}
                          {n.datos.ingresoSueldoInicial ? ` · sueldo inicial ${fmt(n.datos.ingresoSueldoInicial)}` : ""}
                          {n.datos.ingresoModalidad ? ` · ${n.datos.ingresoModalidad}` : ""}
                          {n.datos.ingresoHorario ? ` · horario: ${n.datos.ingresoHorario}` : ""}
                        </p>
                      )}
                      {n.datos?.seguroParoDesde && n.datos?.seguroParoHasta && (
                        <p className="mt-1 text-xs text-apagado">
                          Seguro de paro: {n.datos.seguroParoDesde} a {n.datos.seguroParoHasta}
                          {n.datos.seguroParoTipo ? ` · ${n.datos.seguroParoTipo}` : ""}
                          {n.datos.seguroParoReduccionPorcentaje ? ` · reducción ${n.datos.seguroParoReduccionPorcentaje}%` : ""}
                          {n.datos.seguroParoReduccionHoraria ? ` · ${n.datos.seguroParoReduccionHoraria}` : ""}
                          {n.datos.seguroParoPagaBps === false ? " · no descuenta pago empresa" : " · paga BPS"}
                          {n.datos.seguroParoAfectaPresentismo === false ? " · no afecta presentismo" : ""}
                        </p>
                      )}
                      {n.datos?.cambioHorarioAplicaDesde && (
                        <p className="mt-1 text-xs text-apagado">
                          Cambio de horario desde {n.datos.cambioHorarioAplicaDesde}
                          {n.datos.horarioAnterior ? ` - anterior: ${n.datos.horarioAnterior}` : ""}
                          {n.datos.horarioNuevo ? ` - nuevo: ${n.datos.horarioNuevo}` : ""}
                          {n.datos.horasSemanalesNuevas ? ` - ${n.datos.horasSemanalesNuevas} h semanales` : ""}
                          {n.datos.cambioHorarioNuevoSueldo ? ` - sueldo base ${fmt(n.datos.cambioHorarioNuevoSueldo)}` : ""}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        {errorHistorial && <p className="mt-3 rounded-2xl bg-rosa px-3 py-2 text-xs text-rosa-t">{errorHistorial}</p>}
        {novedadesHistoricas.length < totalHistorial && (
          <Boton className="mt-3 w-full" variante="secundario" tam="sm" onClick={() => void cargarMasHistorial()} disabled={cargandoHistorial}>
            {cargandoHistorial ? "Cargando..." : "Cargar más novedades"}
          </Boton>
        )}
      </section>
      {error && <p className="rounded-2xl bg-rosa px-4 py-3 text-sm text-rosa-t">{error}</p>}
      {puede && <Boton className="w-full" tam="lg" onClick={() => void guardar()} disabled={guardando}>{guardando ? "Guardando..." : "Guardar cambios"}</Boton>}
    </div>
  );
}

function TabEmpleados({ v, empleados, ver }: { v: Vista; empleados: Empleado[]; ver: (id: string) => void }) {
  const puede = useStore((s) => s.puede)("editar");
  const [importar, setImportar] = useState(false);
  return (
    <Panel className="p-3">
      <div className="flex items-center px-3 pt-2 pb-3">
        <h2 className="mr-auto text-lg font-bold tracking-tight">{empleados.length} personas activas</h2>
        <Boton variante="secundario" tam="sm" disabled={!puede} onClick={() => setImportar(true)}>
          <FileSpreadsheet size={13} /> Importar desde Excel
        </Boton>
      </div>
      <Drawer abierto={importar} onCerrar={() => setImportar(false)} titulo="Importar personas desde Excel" subtitulo={v.empresa.nombre} ancho={600}>
        {importar && <ImportarEmpleados empresa={v.empresa} onListo={() => setImportar(false)} />}
      </Drawer>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="text-left text-xs text-apagado">
              <th className="px-3 pb-2 font-semibold">Persona</th>
              <th className="px-3 pb-2 font-semibold">Cédula</th>
              <th className="px-3 pb-2 font-semibold">Categoría</th>
              <th className="px-3 pb-2 text-right font-semibold">Sueldo base</th>
              <th className="px-3 pb-2 font-semibold">Ingreso</th>
              <th className="px-3 pb-2 font-semibold">Portal</th>
            </tr>
          </thead>
          <tbody>
            {empleados.map((e) => {
              const s = [...e.sueldos].sort((a, b) => b.desde.localeCompare(a.desde))[0];
              const al = v.alertas.some((a) => a.empleadoId === e.id && a.nivel === "bloqueante");
              return (
                <tr key={e.id} className="cursor-pointer border-t border-linea hover:bg-hundido/60" onClick={() => ver(e.id)}>
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-3">
                      <Avatar nombre={`${e.nombre} ${e.apellido}`} tono={v.empresa.tono} size={32} />
                      <span>
                        <span className="block font-semibold">{e.nombre} {e.apellido} {al && <AlertOctagon size={13} className="ml-1 inline text-rosa-t" aria-label="Tiene un bloqueo" />}</span>
                        <span className="block text-xs text-apagado">{e.cargo}</span>
                      </span>
                    </span>
                  </td>
                  <td className="num px-3 py-3">{e.ci || <Chip tono="rosa">Falta</Chip>}</td>
                  <td className="px-3 py-3">{e.categoria}</td>
                  <td className="num px-3 py-3 text-right">{s ? fmt(s.monto) : "—"}</td>
                  <td className="px-3 py-3 text-tinta-2">{fecha(e.ingreso)} {e.ingreso.slice(0, 4)}</td>
                  <td className="px-3 py-3">
                    <Link href={`/portal/${e.id}`} onClick={(x: MouseEvent<HTMLAnchorElement>) => x.stopPropagation()} className="inline-flex items-center gap-1 text-xs font-semibold text-petroleo hover:underline">
                      Ver portal <ExternalLink size={12} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function TabActividad({ v }: { v: Vista }) {
  const audit = useStore((s) => s.audit).filter((a) => a.empresaId === v.empresa.id);
  return (
    <Panel className="p-6">
      <h2 className="text-lg font-bold tracking-tight">Actividad de {v.empresa.nombre}</h2>
      <ol className="relative mt-5 space-y-5 border-l-2 border-linea pl-6">
        {audit.map((a) => (
          <li key={a.id} className="relative">
            <span className="absolute -left-[31px] top-1 size-3 rounded-full border-2 border-superficie bg-petroleo" />
            <p className="text-sm font-semibold">{a.accion}</p>
            <p className="text-xs text-apagado">{a.actor} · {fechaHora(a.fecha)} · {a.entidad}</p>
            {a.detalle && <p className="mt-1 text-[13px] text-tinta-2">{a.detalle}</p>}
            {(a.antes || a.despues) && (
              <p className="mt-1 text-xs"><span className="rounded bg-rosa px-1.5 py-0.5 line-through">{a.antes ?? "—"}</span> → <span className="rounded bg-menta px-1.5 py-0.5">{a.despues ?? "—"}</span></p>
            )}
          </li>
        ))}
        {audit.length === 0 && <li className="text-sm text-apagado">Sin actividad registrada.</li>}
      </ol>
    </Panel>
  );
}

const NOVEDADES_PRESENTISMO_DEFAULT: CondicionPresentismo[] = [
  { tipo: "falta", desdeCantidad: 1, accion: "no_paga" },
  { tipo: "certificacion", desdeCantidad: 3, accion: "no_paga" },
  { tipo: "suspension", desdeCantidad: 1, accion: "no_paga" },
  { tipo: "seguro_paro", desdeCantidad: 1, accion: "no_paga" },
  { tipo: "accidente_laboral", desdeCantidad: 1, accion: "no_paga" },
  { tipo: "maternidad", desdeCantidad: 1, accion: "no_paga" },
  { tipo: "llegada_tarde", desdeCantidad: 30, accion: "paga_mitad" },
  { tipo: "ausencia_justificada", desdeCantidad: 1, accion: "paga_mitad" },
];

const PRESENTISMO_CALCULOS: Array<{ valor: NonNullable<NonNullable<Empresa["reglasLiquidacion"]>["presentismo"]>["tipoCalculo"]; label: string; ayuda: string }> = [
  { valor: "monto_fijo", label: "Monto fijo", ayuda: "Se paga el mismo importe todos los meses" },
  { valor: "porcentaje_sueldo_base", label: "% del sueldo base", ayuda: "Calcula sobre el sueldo nominal vigente" },
  { valor: "porcentaje_liquido_estimado", label: "% del líquido estimado", ayuda: "Calcula sobre una estimación antes del propio presentismo" },
];

const PRESENTISMO_ACCIONES: Array<{ valor: CondicionPresentismo["accion"]; label: string }> = [
  { valor: "no_paga", label: "No paga" },
  { valor: "paga_mitad", label: "Paga mitad" },
  { valor: "paga_porcentaje", label: "Paga %" },
];

type PresentismoRegla = NonNullable<NonNullable<Empresa["reglasLiquidacion"]>["presentismo"]>;

function condicionesPresentismoIniciales(presentismo?: PresentismoRegla) {
  if (presentismo?.condiciones?.length) return presentismo.condiciones;
  const legacy = presentismo?.descontarConNovedades;
  if (legacy?.length) return legacy.map((tipo) => ({ tipo, desdeCantidad: 1, accion: "no_paga" as const }));
  return NOVEDADES_PRESENTISMO_DEFAULT;
}

function TabReglasLiquidacion({ v }: { v: Vista }) {
  const s = useStore();
  const router = useRouter();
  const usuario = useUsuario();
  const puede = s.puede("configurar");
  const reglas = v.empresa.reglasLiquidacion;
  const presentismo = reglas?.presentismo;
  const responsables = USUARIOS.filter((u) => u.rol !== "lectura");
  const responsableActual = usuarioPorResponsableId(v.empresa.responsableId);
  const [responsableId, setResponsableId] = useState(responsableActual?.id ?? responsables[0]?.id ?? "");
  const [mensajeResponsable, setMensajeResponsable] = useState<{ tipo: "info" | "error"; texto: string } | null>(null);
  const [guardandoResponsable, setGuardandoResponsable] = useState(false);
  const [horasExtraFactor, setHorasExtraFactor] = useState(String(reglas?.horasExtraFactor ?? 2));
  const [feriadoFactor, setFeriadoFactor] = useState(String(reglas?.feriadoFactor ?? 2));
  const [calculoMesParcial, setCalculoMesParcial] = useState<NonNullable<Empresa["reglasLiquidacion"]>["calculoMesParcial"]>(reglas?.calculoMesParcial ?? "treinta_dias");
  const [considerarFeriadosNoLaborables, setConsiderarFeriadosNoLaborables] = useState(reglas?.feriadosUruguay?.considerarNoLaborables ?? true);
  const [presentismoActivo, setPresentismoActivo] = useState(Boolean(presentismo?.habilitado));
  const [presentismoTipo, setPresentismoTipo] = useState<PresentismoRegla["tipoCalculo"]>(presentismo?.tipoCalculo ?? "monto_fijo");
  const [presentismoValor, setPresentismoValor] = useState(String(presentismo?.valor ?? presentismo?.monto ?? ""));
  const [condiciones, setCondiciones] = useState<CondicionPresentismo[]>(() => condicionesPresentismoIniciales(presentismo));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const toggleCondicion = (plantilla: CondicionPresentismo) => {
    setCondiciones((actual) => (actual.some((c) => c.tipo === plantilla.tipo) ? actual.filter((c) => c.tipo !== plantilla.tipo) : [...actual, plantilla]));
  };

  const actualizarCondicion = (tipo: Novedad["tipo"], cambios: Partial<CondicionPresentismo>) => {
    setCondiciones((actual) => actual.map((c) => (c.tipo === tipo ? { ...c, ...cambios } : c)));
  };

  const guardarResponsable = async () => {
    const elegido = responsables.find((u) => u.id === responsableId);
    if (!elegido) {
      setMensajeResponsable({ tipo: "error", texto: "Elegí un integrante del estudio." });
      return;
    }
    setMensajeResponsable(null);
    setGuardandoResponsable(true);
    try {
      const resumen = `Asignó ${elegido.nombre} como responsable de la empresa`;
      const cambios: Partial<Empresa> = { responsableId };
      const res = await actualizarEmpresaReal({ empresaId: v.empresa.id, cambios, resumen, actor: usuario.nombre });
      if (!res.ok) {
        setMensajeResponsable({ tipo: "error", texto: res.mensaje });
        return;
      }
      s.actualizarEmpresa(v.empresa.id, cambios, resumen);
      setMensajeResponsable({ tipo: "info", texto: res.modo === "real" ? "Responsable actualizado." : "En producción se guardará este responsable y quedará auditado." });
      if (res.modo === "real") router.refresh();
    } catch (err) {
      setMensajeResponsable({ tipo: "error", texto: err instanceof Error ? err.message : "No pudimos actualizar el responsable." });
    } finally {
      setGuardandoResponsable(false);
    }
  };

  const guardar = async () => {
    const he = Number(horasExtraFactor.replace(",", "."));
    const fer = Number(feriadoFactor.replace(",", "."));
    const valorPresentismo = Number(presentismoValor.replace(/\./g, "").replace(",", "."));
    const condicionesNormalizadas = condiciones.map((c) => ({
      ...c,
      desdeCantidad: c.desdeCantidad && c.desdeCantidad > 0 ? c.desdeCantidad : undefined,
      porcentajePago: c.accion === "paga_porcentaje" ? c.porcentajePago ?? 0 : undefined,
    }));
    if (!Number.isFinite(he) || he < 1 || he > 4) {
      setError("El factor de hora extra debe estar entre 1 y 4.");
      return;
    }
    if (!Number.isFinite(fer) || fer < 1 || fer > 4) {
      setError("El factor de feriado debe estar entre 1 y 4.");
      return;
    }
    if (presentismoActivo && (!Number.isFinite(valorPresentismo) || valorPresentismo <= 0)) {
      setError("Cargá un valor de presentismo mayor a cero.");
      return;
    }
    if (presentismoActivo && presentismoTipo !== "monto_fijo" && valorPresentismo > 100) {
      setError("El porcentaje de presentismo no puede ser mayor a 100.");
      return;
    }
    if (presentismoActivo && condicionesNormalizadas.some((c) => c.accion === "paga_porcentaje" && ((c.porcentajePago ?? 0) < 0 || (c.porcentajePago ?? 0) > 100))) {
      setError("Los porcentajes de pago de presentismo deben estar entre 0 y 100.");
      return;
    }
    const cambios: Partial<Empresa> = {
      reglasLiquidacion: {
        horasExtraFactor: he,
        feriadoFactor: fer,
        calculoMesParcial,
        feriadosUruguay: { considerarNoLaborables: considerarFeriadosNoLaborables },
        presentismo: {
          habilitado: presentismoActivo,
          tipoCalculo: presentismoTipo,
          valor: presentismoActivo ? valorPresentismo : 0,
          monto: presentismoActivo && presentismoTipo === "monto_fijo" ? valorPresentismo : 0,
          condiciones: condicionesNormalizadas,
          descontarConNovedades: condicionesNormalizadas.filter((c) => c.accion === "no_paga").map((c) => c.tipo),
        },
      },
    };
    const presentismoResumen =
      presentismoActivo
        ? `, presentismo ${presentismoTipo === "monto_fijo" ? fmt(valorPresentismo) : `${valorPresentismo}%`} con ${condicionesNormalizadas.length} regla(s)`
        : ", sin presentismo automático";
    const resumen = `Reglas de liquidación: HE x${he}, feriado x${fer}${presentismoResumen}`;
    setError("");
    setGuardando(true);
    try {
      const res = await actualizarEmpresaReal({ empresaId: v.empresa.id, cambios, resumen, actor: usuario.nombre });
      if (!res.ok) {
        setError(res.mensaje);
        return;
      }
      s.actualizarEmpresa(v.empresa.id, cambios, resumen);
      if (res.modo === "real") router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos guardar las reglas.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-3">
      <Panel className="p-6">
        <div className="flex flex-wrap items-start gap-3">
          <div className="mr-auto">
            <h2 className="text-lg font-bold tracking-tight">Responsable del estudio</h2>
            <p className="mt-1 text-sm text-apagado">Define quién lleva esta empresa en el tablero del mes y en los filtros por responsable.</p>
          </div>
          <Boton disabled={!puede || guardandoResponsable || responsableId === (responsableActual?.id ?? "")} onClick={() => void guardarResponsable()}>
            {guardandoResponsable ? "Guardando..." : "Guardar responsable"}
          </Boton>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <Campo label="Quién la lleva">
            <select className={inputCls} value={responsableId} onChange={(e) => setResponsableId(e.target.value)} disabled={!puede}>
              {responsables.map((u) => <option key={u.id} value={u.id}>{u.nombre} · {u.rol === "admin" ? "Administración" : "Liquidación"}</option>)}
            </select>
          </Campo>
          <div className="rounded-2xl bg-hundido px-4 py-3 text-sm">
            <span className="block text-xs font-semibold uppercase tracking-wide text-apagado">Actual</span>
            <span className="font-semibold">{responsableActual?.nombre ?? "Sin asignar"}</span>
          </div>
        </div>
        {mensajeResponsable && <p className={clsx("mt-3 rounded-2xl px-4 py-3 text-sm font-semibold", mensajeResponsable.tipo === "error" ? "bg-rosa text-rosa-t" : "bg-menta text-menta-t")}>{mensajeResponsable.texto}</p>}
      </Panel>

      <Panel className="p-6">
      <div className="flex flex-wrap items-start gap-3">
        <div className="mr-auto">
          <h2 className="text-lg font-bold tracking-tight">Reglas de pago</h2>
          <p className="mt-1 text-sm text-apagado">Se aplican al calcular la liquidación y quedan explicadas en el recibo.</p>
        </div>
        <Boton disabled={!puede || guardando} onClick={() => void guardar()}>{guardando ? "Guardando..." : "Guardar reglas"}</Boton>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Campo label="Horas extra" ayuda="2 = doble, 1.5 = tiempo y medio">
          <input className={inputCls} inputMode="decimal" value={horasExtraFactor} onChange={(e) => setHorasExtraFactor(e.target.value)} disabled={!puede} />
        </Campo>
        <Campo label="Feriado trabajado" ayuda="Factor aplicado sobre jornal">
          <input className={inputCls} inputMode="decimal" value={feriadoFactor} onChange={(e) => setFeriadoFactor(e.target.value)} disabled={!puede} />
        </Campo>
        <Campo label="Ingreso/egreso parcial" ayuda="Regla para pagar meses incompletos">
          <select className={inputCls} value={calculoMesParcial} onChange={(e) => setCalculoMesParcial(e.target.value as typeof calculoMesParcial)} disabled={!puede}>
            <option value="treinta_dias">Sueldo / 30 días</option>
            <option value="jornada_laboral">Según jornada laboral</option>
          </select>
        </Campo>
        <label className="mt-7 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={considerarFeriadosNoLaborables}
            onChange={(e) => setConsiderarFeriadosNoLaborables(e.target.checked)}
            disabled={!puede || calculoMesParcial !== "jornada_laboral"}
            className="size-4 accent-petroleo"
          />
          Excluir feriados no laborables de Uruguay
        </label>
      </div>
      <section className="mt-5 rounded-2xl bg-hundido p-4">
        <div className="flex flex-wrap items-start gap-3">
          <label className="flex h-11 items-center gap-2 rounded-xl border border-linea bg-superficie px-3 text-sm">
            <input type="checkbox" checked={presentismoActivo} onChange={(e) => setPresentismoActivo(e.target.checked)} disabled={!puede} className="size-4 accent-petroleo" />
            Pago presentismo
          </label>
          <div className="grid min-w-[260px] flex-1 gap-3 md:grid-cols-[minmax(180px,1fr)_minmax(150px,0.8fr)]">
            <Campo label="Cálculo">
              <select
                className={inputCls}
                value={presentismoTipo}
                onChange={(e) => setPresentismoTipo(e.target.value as typeof presentismoTipo)}
                disabled={!puede || !presentismoActivo}
              >
                {PRESENTISMO_CALCULOS.map((opcion) => (
                  <option key={opcion.valor} value={opcion.valor}>{opcion.label}</option>
                ))}
              </select>
            </Campo>
            <Campo label={presentismoTipo === "monto_fijo" ? "Monto" : "Porcentaje"}>
              <input
                className={inputCls}
                inputMode="decimal"
                value={presentismoValor}
                onChange={(e) => setPresentismoValor(e.target.value.replace(/[^\d,.]/g, ""))}
                disabled={!puede || !presentismoActivo}
                placeholder={presentismoTipo === "monto_fijo" ? "0" : "0%"}
              />
            </Campo>
          </div>
        </div>
        <p className="mt-1 text-xs text-apagado">{PRESENTISMO_CALCULOS.find((opcion) => opcion.valor === presentismoTipo)?.ayuda}</p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-apagado">
              <tr>
                <th className="px-2 py-2">Aplica</th>
                <th className="px-2 py-2">Novedad</th>
                <th className="px-2 py-2">Desde</th>
                <th className="px-2 py-2">Efecto</th>
                <th className="px-2 py-2">% pago</th>
              </tr>
            </thead>
            <tbody>
              {NOVEDADES_PRESENTISMO_DEFAULT.map((plantilla) => {
                const condicion = condiciones.find((c) => c.tipo === plantilla.tipo);
                const activa = Boolean(condicion);
                return (
                  <tr key={plantilla.tipo} className="border-t border-linea">
                    <td className="px-2 py-2">
                      <input type="checkbox" checked={activa} onChange={() => toggleCondicion(plantilla)} disabled={!puede || !presentismoActivo} className="size-4 accent-petroleo" />
                    </td>
                    <td className="px-2 py-2 font-semibold">{TIPOS[plantilla.tipo].label}</td>
                    <td className="px-2 py-2">
                      <input
                        className={clsx(inputCls, "h-9 w-24")}
                        inputMode="numeric"
                        value={condicion?.desdeCantidad ?? ""}
                        onChange={(e) => actualizarCondicion(plantilla.tipo, { desdeCantidad: Number(e.target.value.replace(/\D/g, "")) || undefined })}
                        disabled={!puede || !presentismoActivo || !activa}
                        placeholder="1"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <select
                        className={clsx(inputCls, "h-9")}
                        value={condicion?.accion ?? plantilla.accion}
                        onChange={(e) => actualizarCondicion(plantilla.tipo, { accion: e.target.value as CondicionPresentismo["accion"] })}
                        disabled={!puede || !presentismoActivo || !activa}
                      >
                        {PRESENTISMO_ACCIONES.map((opcion) => (
                          <option key={opcion.valor} value={opcion.valor}>{opcion.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={clsx(inputCls, "h-9 w-24")}
                        inputMode="numeric"
                        value={condicion?.porcentajePago ?? ""}
                        onChange={(e) => actualizarCondicion(plantilla.tipo, { porcentajePago: Number(e.target.value.replace(/\D/g, "")) || undefined })}
                        disabled={!puede || !presentismoActivo || !activa || condicion?.accion !== "paga_porcentaje"}
                        placeholder="50"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      {error && <p className="mt-4 rounded-2xl bg-rosa px-4 py-3 text-sm text-rosa-t">{error}</p>}
      </Panel>
    </div>
  );
}

function LogoEditable({ v }: { v: Vista }) {
  const s = useStore();
  const router = useRouter();
  const usuario = useUsuario();
  const puede = s.puede("editar");
  return (
    <label className={clsx("group relative", puede && "cursor-pointer")} title={puede ? "Cambiar logo (aparece en recibos y portales)" : undefined}>
      <MarcaEmpresa empresa={v.empresa} size={52} />
      {puede && (
        <>
          <span className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full bg-petroleo text-white ring-2 ring-superficie transition-transform group-hover:scale-110">
            <ImagePlus size={12} />
          </span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Subir logo de la empresa"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const logo = await imagenADataUrl(f);
              const res = await actualizarEmpresaReal({
                empresaId: v.empresa.id,
                cambios: { logo },
                resumen: "Actualizó el logo de la empresa",
                actor: usuario.nombre,
              });
              if (!res.ok) return;
              s.actualizarEmpresa(v.empresa.id, { logo }, "Actualizó el logo de la empresa");
              if (res.modo === "real") router.refresh();
            }}
          />
        </>
      )}
    </label>
  );
}

function Contenido({
  datosIniciales,
}: {
  datosIniciales: {
    modo: "real" | "demo";
    empresas: Empresa[];
    empleados: Empleado[];
    periodos: Periodo[];
    novedades: Novedad[];
    audit: AuditEvent[];
    vistas: Record<string, string>;
  };
}) {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const router = useRouter();
  if (datosIniciales.modo === "real" && !useStore.getState().empresas.some((empresa) => empresa.id === id)) {
    sincronizarDatosOperativos(datosIniciales);
  }
  const tab = (sp.get("tab") as Tab) ?? "resumen";
  const empleadoSel = sp.get("emp");
  const calcSel = sp.get("calc");
  const existe = useStore((s) => s.empresas.some((e) => e.id === id));
  const todos = useStore((s) => s.empleados);
  const v = usePeriodoVista(id);
  const empleados = useMemo(() => todos.filter((e) => e.empresaId === id && activoEn(e, MES_ACTUAL)), [todos, id]);

  useEffect(() => {
    sincronizarDatosOperativos(datosIniciales);
  }, [datosIniciales]);

  const setQ = (q: Record<string, string | null>) => {
    const n = new URLSearchParams(sp.toString());
    Object.entries(q).forEach(([k, val]) => (val === null ? n.delete(k) : n.set(k, val)));
    router.replace(`/empresas/${id}?${n.toString()}`, { scroll: false });
  };
  const irA = (t: Tab) => setQ({ tab: t });

  if (!existe) return <Panel className="p-10"><Vacio titulo="No encontramos esa empresa"><Link href="/empresas" className="text-petroleo underline">Volver a empresas</Link></Vacio></Panel>;

  const r = v.resultados?.find((x) => x.empleadoId === calcSel);
  const eCalc = todos.find((e) => e.id === calcSel);
  const eSel = todos.find((e) => e.id === empleadoSel);
  const TABS: { k: Tab; l: string; n?: number }[] = [
    { k: "resumen", l: "Resumen", n: v.pend.total || undefined },
    { k: "novedades", l: "Novedades", n: v.novedadesMes.length },
    { k: "liquidacion", l: "Liquidación" },
    { k: "empleados", l: "Empleados", n: empleados.length },
    { k: "reglas", l: "Reglas" },
    { k: "actividad", l: "Actividad" },
  ];

  return (
    <div className="space-y-3">
      <Panel className="px-7 pt-5 pb-5">
        <nav className="text-xs text-apagado"><Link href="/empresas" className="hover:underline">Empresas</Link><span className="mx-1">/</span>{v.empresa.nombre}</nav>
        <div className="mt-3 grid gap-4 xl:grid-cols-[1fr_auto] xl:items-start">
          <div className="flex min-w-0 items-start gap-4">
            <LogoEditable v={v} />
            <div className="min-w-0">
              <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">{v.empresa.nombre}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-apagado">
                <EstadoChip estado={v.estado} />
                <span>{nombreMes(v.periodo.mes)}</span>
                {v.periodo.versiones.length > 0 && <span>Versión {v.periodo.versiones.at(-1)!.version}</span>}
                <span>Grupo {v.empresa.grupo}.{v.empresa.subgrupo}</span>
                <span>RUT {v.empresa.rut}</span>
              </div>
            </div>
          </div>
          <section className="rounded-2xl border border-linea bg-hundido p-3">
            <div className="flex items-center gap-3">
              <Avatar nombre={v.empresa.contacto.nombre} tono="lila" size={36} />
              <div className="min-w-0 text-sm leading-tight">
                <span className="block font-semibold">{v.empresa.contacto.nombre}</span>
                <span className="mt-1 flex items-center gap-1 text-xs text-apagado"><Mail size={12} /> {v.empresa.contacto.email}</span>
              </div>
              <Boton tam="sm" variante="secundario" href={`/cliente/${v.empresa.id}`}>Portal cliente</Boton>
            </div>
          </section>
        </div>
        <div className="mt-5"><Stepper v={v} /></div>
        <div className="mt-4 flex gap-1 overflow-x-auto rounded-2xl bg-hundido p-1" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.k}
              role="tab"
              aria-selected={tab === t.k}
              onClick={() => irA(t.k)}
              className={clsx("flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold", tab === t.k ? "bg-superficie text-tinta shadow-sm" : "text-apagado hover:text-tinta")}
            >
              {t.l}
              {t.n !== undefined && <span className={clsx("num rounded-full px-1.5 text-xs", tab === t.k ? "bg-hundido" : "bg-superficie")}>{t.n}</span>}
            </button>
          ))}
        </div>
      </Panel>

      {tab === "resumen" && <TabResumen v={v} irA={irA} verEmpleado={(e) => setQ({ emp: e })} />}
      {tab === "novedades" && <TabNovedades v={v} empleados={empleados} />}
      {tab === "liquidacion" && <TabLiquidacion v={v} empleados={empleados} verCalc={(e) => setQ({ calc: e })} />}
      {tab === "empleados" && <TabEmpleados v={v} empleados={empleados} ver={(e) => setQ({ emp: e })} />}
      {tab === "reglas" && <TabReglasLiquidacion v={v} />}
      {tab === "actividad" && <TabActividad v={v} />}

      <Drawer
        abierto={!!r && !!eCalc}
        onCerrar={() => setQ({ calc: null })}
        titulo={eCalc ? `${eCalc.nombre} ${eCalc.apellido}` : ""}
        subtitulo={eCalc && `${eCalc.cargo} · ${eCalc.categoria} · ${nombreMes(v.periodo.mes)}`}
        ancho={560}
      >
        {r && <CalcDetalle r={r} version={v.vigente} />}
      </Drawer>
      <Drawer abierto={!!eSel} onCerrar={() => setQ({ emp: null })} titulo={eSel ? `${eSel.nombre} ${eSel.apellido}` : ""} subtitulo={eSel && `${eSel.cargo} · ${v.empresa.nombre}`}>
        {eSel && <FichaEmpleado key={eSel.id} e={eSel} v={v} onCerrar={() => setQ({ emp: null })} />}
      </Drawer>
    </div>
  );
}

export default function EmpresaClient({
  datosIniciales,
}: {
  datosIniciales: {
    modo: "real" | "demo";
    empresas: Empresa[];
    empleados: Empleado[];
    periodos: Periodo[];
    novedades: Novedad[];
    audit: AuditEvent[];
    vistas: Record<string, string>;
  };
}) {
  return (
    <Suspense>
      <Contenido datosIniciales={datosIniciales} />
    </Suspense>
  );
}

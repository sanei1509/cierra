"use client";

import clsx from "clsx";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import {
  AlertOctagon, AlertTriangle, Info, Check, ChevronRight, Plus, X, Send, Calculator, FileDown, Lock, RefreshCw,
  ExternalLink, UserRound, Mail, Undo2, MessageSquare, Eye, Paperclip, ImagePlus, FileSpreadsheet, Files,
} from "lucide-react";
import { useStore, usePeriodoVista, useUsuario, type Vista } from "@/lib/store";
import { PASOS, pasoActual } from "@/lib/status";
import { TIPOS, valorNovedad, estadoNovedades } from "@/lib/labels";
import { MES_ACTUAL, fecha, fechaHora, fmt, fmt2, mesAnterior, nombreMes, pct } from "@/lib/format";
import { activoEn, calcularEmpresa, totales } from "@/lib/engine";
import { categoriasDe, laudoDe } from "@/lib/params";
import { archivoNomina, descargar } from "@/lib/bps";
import type { Alerta, Empleado } from "@/lib/types";
import { Avatar, Boton, Campo, Chip, Drawer, EstadoChip, MarcaEmpresa, Modal, Panel, Vacio, imagenADataUrl, inputCls } from "@/components/ui";
import { CalcDetalle } from "@/components/calc-detalle";
import { NovedadForm } from "@/components/novedad-form";
import { ImportarEmpleados } from "@/components/importar-empleados";

type Tab = "resumen" | "novedades" | "liquidacion" | "empleados" | "actividad";

function Stepper({ v }: { v: Vista }) {
  const actual = pasoActual(v.periodo, v.pend.total);
  return (
    <ol className="flex items-center gap-1 overflow-x-auto pb-1">
      {PASOS.map((p, i) => {
        const hecho = i < actual;
        const activo = i === actual;
        return (
          <li key={p} className="flex min-w-fit flex-1 items-center gap-1">
            <span
              className={clsx(
                "flex h-10 flex-1 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold",
                hecho && "bg-petroleo text-white",
                activo && "bg-sol text-tinta",
                !hecho && !activo && "rayado bg-hundido text-apagado",
              )}
              aria-current={activo ? "step" : undefined}
            >
              <span className={clsx("flex size-5 shrink-0 items-center justify-center rounded-full text-[11px]", hecho ? "bg-white/20" : activo ? "bg-tinta text-sol" : "bg-white")}>
                {hecho ? <Check size={12} strokeWidth={3} /> : i + 1}
              </span>
              {p}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

const ICONO_ALERTA = { bloqueante: AlertOctagon, advertencia: AlertTriangle, info: Info };
const TONO_ALERTA = { bloqueante: "bg-rosa text-rosa-t", advertencia: "bg-crema text-crema-t", info: "bg-cielo text-cielo-t" };

function AlertaItem({ a, v, onVer }: { a: Alerta; v: Vista; onVer: (id: string) => void }) {
  const aceptar = useStore((s) => s.aceptarAdvertencia);
  const puede = useStore((s) => s.puede);
  const [nota, setNota] = useState("");
  const [abierta, setAbierta] = useState(false);
  const Icon = ICONO_ALERTA[a.nivel];
  const aceptada = v.periodo.advertenciasAceptadas[a.id];
  return (
    <li className={clsx("rounded-3xl border border-linea p-4", aceptada && "opacity-60")}>
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
                if (nota.trim()) aceptar(v.periodo.id, a.id, nota.trim());
              }}
            >
              <input autoFocus className={clsx(inputCls, "h-9")} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Por qué está bien, ej.: comisión confirmada por el cliente" />
              <Boton tam="sm" type="submit" disabled={!nota.trim()}>Aceptar</Boton>
            </form>
          )}
        </div>
      </div>
    </li>
  );
}

function ProximaAccion({ v, irA }: { v: Vista; irA: (t: Tab) => void }) {
  const s = useStore();
  const puede = s.puede("editar");
  const [confirmar, setConfirmar] = useState<null | "cerrar" | "rectificar">(null);
  const [motivo, setMotivo] = useState("");
  const { periodo: p, empresa } = v;
  const ultima = p.versiones.at(-1);
  const empleados = s.empleados;

  let titulo = "";
  let texto: React.ReactNode = "";
  let acciones: React.ReactNode = null;

  const recalc = (
    <Boton variante={v.desactualizada ? "primario" : "secundario"} disabled={!puede || v.pend.bloq.length > 0} onClick={() => s.calcular(p.id)}>
      <RefreshCw size={15} /> Recalcular (crea v{(ultima?.version ?? 0) + 1})
    </Boton>
  );

  switch (v.estado) {
    case "pendiente":
      titulo = p.solicitud ? "Esperando las novedades del cliente" : "Pedí las novedades del mes";
      texto = p.solicitud
        ? `${empresa.contacto.nombre} recibió el pedido el ${fecha(p.solicitud.enviada)}${p.solicitud.abierta ? ` y lo abrió el ${fecha(p.solicitud.abierta)}` : ", todavía no lo abrió"}. Si te las mandó por otro medio, cargalas vos.`
        : `Le enviamos a ${empresa.contacto.nombre} un enlace seguro para cargar horas extra, faltas, bonos y licencias antes del ${fecha(p.fechaObjetivo)}.`;
      acciones = (
        <>
          <Boton disabled={!puede} onClick={() => s.solicitarNovedades(p.id)}><Send size={15} /> {p.solicitud ? "Reenviar pedido" : "Pedir novedades"}</Boton>
          <Boton variante="secundario" onClick={() => irA("novedades")}><Plus size={15} /> Cargarlas yo</Boton>
          <Boton variante="fantasma" disabled={!puede} onClick={() => s.marcarRecibidas(p.id)}>Marcar como completas</Boton>
        </>
      );
      break;
    case "alertas":
      titulo = v.pend.bloq.length ? `Resolvé ${v.pend.bloq.length} ${v.pend.bloq.length === 1 ? "bloqueo" : "bloqueos"}` : `Revisá ${v.pend.adv.length} ${v.pend.adv.length === 1 ? "advertencia" : "advertencias"}`;
      texto = v.pend.bloq.length
        ? "Hasta corregirlos no se puede calcular ni cerrar. Cada alerta te lleva al dato a corregir."
        : "Aceptalas con una nota si están bien, o corregí el dato y recalculá.";
      acciones = ultima ? recalc : null;
      break;
    case "lista":
      titulo = "Todo listo para calcular";
      texto = `${v.novedadesMes.length} novedades cargadas y sin bloqueos. El cálculo crea la versión 1 con los parámetros vigentes de ${nombreMes(p.mes).toLowerCase()}.`;
      acciones = <Boton disabled={!s.puede("calcular")} onClick={() => { s.calcular(p.id); irA("liquidacion"); }}><Calculator size={15} /> Calcular borrador</Boton>;
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
            <Boton disabled={!puede} onClick={() => s.enviarAprobacion(p.id)}><Send size={15} /> Enviar a aprobación</Boton>
          ) : (
            <Boton disabled={!puede} onClick={() => s.aprobarInterno(p.id)}><Check size={15} /> Aprobar internamente</Boton>
          )}
          <Boton variante="secundario" onClick={() => irA("liquidacion")}>Ver liquidación</Boton>
        </>
      );
      break;
    case "esperando":
      titulo = `Esperando a ${empresa.contacto.nombre}`;
      texto = `La versión ${p.aprobacion?.version} se envió el ${fecha(p.aprobacion!.enviada)}. Si recalculás, la aprobación pendiente se anula.`;
      acciones = (
        <>
          <Boton variante="secundario" href={`/cliente/${empresa.id}`}><Eye size={15} /> Ver lo que ve el cliente</Boton>
          <Boton variante="fantasma" disabled={!puede} onClick={() => s.solicitarNovedades(p.id)}><Mail size={15} /> Recordar por email</Boton>
        </>
      );
      break;
    case "devuelta":
      titulo = "El cliente devolvió la liquidación";
      texto = (
        <>
          <span className="mt-1 block rounded-2xl bg-white/70 px-4 py-3 text-tinta">
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
        </>
      );
      break;
    case "aprobada":
      titulo = "Aprobada: podés cerrar el mes";
      texto = `Al cerrar se bloquea la versión ${p.aprobacion?.version}, se publican los recibos en el portal de cada empleado y queda lista la nómina para BPS.`;
      acciones = <Boton disabled={!s.puede("cerrar")} onClick={() => setConfirmar("cerrar")}><Lock size={15} /> Cerrar y publicar recibos</Boton>;
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
              if (p.bps === "pendiente") s.generarBps(p.id);
            }}
          >
            <FileDown size={15} /> Descargar archivo BPS
          </Boton>
          {p.bps === "generado" && <Boton variante="secundario" disabled={!puede} onClick={() => s.marcarBpsPresentado(p.id)}><Check size={15} /> Marcar como presentada</Boton>}
          <Boton variante="fantasma" href={`/recibos/${empresa.id}/${p.mes}`}><Files size={15} /> Todos los recibos en PDF</Boton>
          <Boton variante="fantasma" disabled={!s.puede("reabrir")} onClick={() => setConfirmar("rectificar")} title={!s.puede("reabrir") ? "Solo administradores" : undefined}>
            <Undo2 size={15} /> Rectificar
          </Boton>
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
          <Boton onClick={() => { s.cerrar(p.id); setConfirmar(null); }}><Lock size={15} /> Cerrar y publicar</Boton>
        </div>
      </Modal>
      <Modal abierto={confirmar === "rectificar"} onCerrar={() => setConfirmar(null)} titulo="Iniciar rectificación">
        <p className="text-sm text-tinta-2">La versión cerrada se conserva. Se crea una corrección vinculada y vas a ver qué cambió. El motivo queda en auditoría.</p>
        <textarea className={clsx(inputCls, "mt-3 h-24 py-3")} placeholder="Motivo, ej.: faltó una comisión de Natalia Píriz" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        <div className="mt-4 flex justify-end gap-2">
          <Boton variante="fantasma" onClick={() => setConfirmar(null)}>Cancelar</Boton>
          <Boton disabled={motivo.trim().length < 5} onClick={() => { s.rectificar(p.id, motivo.trim()); setConfirmar(null); setMotivo(""); }}>Rectificar</Boton>
        </div>
      </Modal>
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
  const [t, setT] = useState("");
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
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (t.trim()) { agregar(v.periodo.id, t.trim()); setT(""); } }}>
        <input className={clsx(inputCls, "h-9")} value={t} onChange={(e) => setT(e.target.value)} placeholder="Escribí una nota" />
        <Boton tam="sm" type="submit" variante="secundario" disabled={!t.trim()}>Guardar</Boton>
      </form>
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
  const [form, setForm] = useState<{ emp?: string } | null>(null);
  const bloqueado = v.periodo.etapa === "cerrada";
  const est = estadoNovedades(v.periodo);
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
                      <button onClick={() => borrar(n.id)} className="rounded-full p-0.5 text-apagado hover:bg-rosa hover:text-rosa-t" aria-label={`Quitar ${TIPOS[n.tipo].corto}`}>
                        <X size={13} />
                      </button>
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
      <Drawer abierto={!!form} onCerrar={() => setForm(null)} titulo="Agregar novedad" subtitulo={`${v.empresa.nombre} · ${nombreMes(v.periodo.mes)}`}>
        {form && (
          <NovedadForm empresaId={v.empresa.id} mes={v.periodo.mes} empleados={empleados} origen="estudio" autor={u.nombre} empleadoInicial={form.emp} onListo={() => setForm(null)} />
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
  const [ver, setVer] = useState<number | null>(null);
  const version = v.periodo.versiones.find((x) => x.version === ver) ?? v.vigente;
  const res = version?.resultados ?? v.resultados;
  const allEmpleados = s.empleados;
  const prev = useMemo(() => calcularEmpresa(v.empresa, allEmpleados, mesAnterior(v.periodo.mes), s.novedades), [v.empresa, allEmpleados, v.periodo.mes, s.novedades]);

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
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { k: "Nominal", v: t.nominal, p: tp.nominal },
          { k: "Descuentos", v: t.descuentos, p: tp.descuentos },
          { k: "Líquido a pagar", v: t.liquido, p: tp.liquido, destacado: true },
          { k: "Aportes patronales", v: t.patronal, p: tp.patronal },
          { k: "Costo empresa", v: t.costo, p: tp.costo },
        ].map((x) => (
          <Panel key={x.k} className={clsx("p-5", x.destacado && "!bg-petroleo text-white")}>
            <p className={clsx("text-sm font-semibold", x.destacado ? "text-white/75" : "text-tinta-2")}>{x.k}</p>
            <p className="num mt-2 text-[28px] font-extrabold leading-none tracking-tight">{fmt(x.v)}</p>
            <p className={clsx("mt-2 text-xs", x.destacado ? "text-white/60" : "text-apagado")}>
              {x.p ? `${x.v >= x.p ? "+" : ""}${pct((x.v - x.p) / x.p, 1)} vs. ${nombreMes(mesAnterior(v.periodo.mes)).split(" ")[0].toLowerCase()}` : ""}
            </p>
          </Panel>
        ))}
      </div>
      <Panel className="p-3">
        <div className="flex flex-wrap items-center gap-3 px-3 pt-2 pb-3">
          <h2 className="mr-auto text-lg font-bold tracking-tight">Por persona</h2>
          {v.periodo.versiones.length > 1 && (
            <div className="flex gap-1 rounded-full bg-hundido p-1">
              {v.periodo.versiones.map((x) => (
                <button key={x.version} onClick={() => setVer(x.version)} className={clsx("rounded-full px-3 py-1 text-[13px] font-semibold", version?.version === x.version ? "bg-superficie shadow-sm" : "text-apagado")}>
                  v{x.version}
                </button>
              ))}
            </div>
          )}
          {version && <span className="text-xs text-apagado">v{version.version} · {version.por} · {fechaHora(version.creada)} · {version.parametros}</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-xs text-apagado">
                <th className="px-3 pb-2 font-semibold">Persona</th>
                <th className="px-3 pb-2 text-right font-semibold">Nominal</th>
                <th className="px-3 pb-2 text-right font-semibold">Descuentos</th>
                <th className="px-3 pb-2 text-right font-semibold">Líquido</th>
                <th className="px-3 pb-2 font-semibold">vs. mes anterior</th>
                {original && <th className="px-3 pb-2 font-semibold">vs. versión cerrada</th>}
                <th className="px-3 pb-2 font-semibold">Alertas</th>
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
                        <td className="num px-3 py-3 text-right">{fmt2(r.totalHaberes)}</td>
                        <td className="num px-3 py-3 text-right text-tinta-2">{fmt2(r.descuentos)}</td>
                        <td className="num px-3 py-3 text-right font-bold">{fmt2(r.liquido)}</td>
                      </>
                    )}
                    <td className="px-3 py-3"><Delta actual={r.totalHaberes} previo={pr?.totalHaberes} /></td>
                    {original && (
                      <td className="px-3 py-3 text-xs">
                        {orig && Math.abs(orig.liquido - r.liquido) > 0.5 ? <Chip tono="crema">{fmt(orig.liquido)} → {fmt(r.liquido)}</Chip> : <span className="text-apagado">igual</span>}
                      </td>
                    )}
                    <td className="px-3 py-3">
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
  const puede = s.puede("editar");
  const actual = [...e.sueldos].sort((a, b) => b.desde.localeCompare(a.desde))[0];
  const [f, setF] = useState({ ci: e.ci, email: e.email, categoria: e.categoria, sueldo: String(actual?.monto ?? ""), hijos: String(e.hijos), conyuge: e.conyugeFonasa });
  const cats = categoriasDe(v.empresa.grupo, v.empresa.subgrupo);
  const laudo = laudoDe(v.empresa.grupo, v.empresa.subgrupo, f.categoria);
  const guardar = () => {
    const monto = Number(f.sueldo);
    const cambios: Partial<Empleado> = { ci: f.ci, email: f.email, categoria: f.categoria, hijos: Number(f.hijos), conyugeFonasa: f.conyuge };
    const res: string[] = [];
    if (f.ci !== e.ci) res.push(`CI ${e.ci || "vacía"} → ${f.ci}`);
    if (f.categoria !== e.categoria) res.push(`categoría ${e.categoria} → ${f.categoria}`);
    if (monto && monto !== actual?.monto) {
      const desde = `${MES_ACTUAL}-01`;
      cambios.sueldos = [...e.sueldos.filter((x) => x.desde !== desde), { desde, monto }];
      res.push(`sueldo ${fmt(actual?.monto ?? 0)} → ${fmt(monto)} desde ${desde}`);
    }
    if (Number(f.hijos) !== e.hijos) res.push(`hijos ${e.hijos} → ${f.hijos}`);
    s.actualizarEmpleado(e.id, cambios, res.join("; ") || "sin cambios de cálculo");
    onCerrar();
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
        <h3 className="text-sm font-bold">Historia de sueldo</h3>
        <ul className="mt-2 space-y-1 text-sm">
          {[...e.sueldos].sort((a, b) => b.desde.localeCompare(a.desde)).map((x) => (
            <li key={x.desde} className="flex justify-between"><span className="text-apagado">Desde {x.desde}</span><span className="num font-semibold">{fmt(x.monto)}</span></li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-apagado">Ingreso {e.ingreso}{e.egreso ? ` · egreso ${e.egreso}` : ""} · {e.cuenta}</p>
      </section>
      {puede && <Boton className="w-full" tam="lg" onClick={guardar}>Guardar cambios</Boton>}
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
                    <Link href={`/portal/${e.id}`} onClick={(x) => x.stopPropagation()} className="inline-flex items-center gap-1 text-xs font-semibold text-petroleo hover:underline">
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

function LogoEditable({ v }: { v: Vista }) {
  const s = useStore();
  const puede = s.puede("editar");
  return (
    <label className={clsx("group relative", puede && "cursor-pointer")} title={puede ? "Cambiar logo (aparece en recibos y portales)" : undefined}>
      <MarcaEmpresa empresa={v.empresa} size={52} />
      {puede && (
        <>
          <span className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full bg-tinta text-white ring-2 ring-superficie transition-transform group-hover:scale-110">
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
              s.actualizarEmpresa(v.empresa.id, { logo }, "Actualizó el logo de la empresa");
            }}
          />
        </>
      )}
    </label>
  );
}

function Contenido() {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const router = useRouter();
  const tab = (sp.get("tab") as Tab) ?? "resumen";
  const empleadoSel = sp.get("emp");
  const calcSel = sp.get("calc");
  const existe = useStore((s) => s.empresas.some((e) => e.id === id));
  const todos = useStore((s) => s.empleados);
  const v = usePeriodoVista(id);
  const empleados = useMemo(() => todos.filter((e) => e.empresaId === id && activoEn(e, MES_ACTUAL)), [todos, id]);

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
    { k: "actividad", l: "Actividad" },
  ];

  return (
    <div className="space-y-3">
      <Panel className="px-7 pt-5 pb-5">
        <nav className="text-xs text-apagado"><Link href="/empresas" className="hover:underline">Empresas</Link> / {v.empresa.nombre}</nav>
        <div className="mt-2 flex flex-wrap items-start gap-4">
          <LogoEditable v={v} />
          <div className="mr-auto">
            <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">{v.empresa.nombre}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-apagado">
              <EstadoChip estado={v.estado} />
              <span>{nombreMes(v.periodo.mes)}</span>
              {v.periodo.versiones.length > 0 && <span>· versión {v.periodo.versiones.at(-1)!.version}</span>}
              <span>· Grupo {v.empresa.grupo}.{v.empresa.subgrupo} · RUT {v.empresa.rut}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-full bg-hundido py-1.5 pl-1.5 pr-2">
            <Avatar nombre={v.empresa.contacto.nombre} tono="lila" size={34} />
            <span className="text-sm leading-tight">
              <span className="block font-semibold">{v.empresa.contacto.nombre}</span>
              <span className="block text-xs text-apagado">Contacto del cliente</span>
            </span>
            <Boton tam="sm" variante="secundario" href={`/cliente/${v.empresa.id}`}>Portal cliente</Boton>
          </div>
        </div>
        <div className="mt-5"><Stepper v={v} /></div>
        <div className="mt-4 flex gap-1 overflow-x-auto" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.k}
              role="tab"
              aria-selected={tab === t.k}
              onClick={() => irA(t.k)}
              className={clsx("flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold", tab === t.k ? "bg-tinta text-white" : "text-apagado hover:bg-hundido hover:text-tinta")}
            >
              {t.l}
              {t.n !== undefined && <span className={clsx("num rounded-full px-1.5 text-xs", tab === t.k ? "bg-white/20" : "bg-hundido")}>{t.n}</span>}
            </button>
          ))}
        </div>
      </Panel>

      {tab === "resumen" && <TabResumen v={v} irA={irA} verEmpleado={(e) => setQ({ emp: e })} />}
      {tab === "novedades" && <TabNovedades v={v} empleados={empleados} />}
      {tab === "liquidacion" && <TabLiquidacion v={v} empleados={empleados} verCalc={(e) => setQ({ calc: e })} />}
      {tab === "empleados" && <TabEmpleados v={v} empleados={empleados} ver={(e) => setQ({ emp: e })} />}
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

export default function EmpresaPage() {
  return (
    <Suspense>
      <Contenido />
    </Suspense>
  );
}


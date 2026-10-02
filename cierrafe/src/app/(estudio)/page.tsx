"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Send, CalendarClock } from "lucide-react";
import { useMemo, useState } from "react";
import { solicitarNovedadesReal } from "@/app/(estudio)/actions";
import { useStore, useUsuario, useVistas, type Vista } from "@/lib/store";
import { ESTADOS, type EstadoVisible } from "@/lib/status";
import { USUARIOS } from "@/lib/seed";
import { estadoNovedades } from "@/lib/labels";
import { MES_ACTUAL, fechaHora, nombreMes } from "@/lib/format";
import { activoEn } from "@/lib/engine";
import { Avatar, Boton, Chip, EstadoChip, Panel } from "@/components/ui";

type Filtro = "todas" | "cliente" | "alertas" | "avanzar" | "cerradas";
const GRUPOS: Record<Exclude<Filtro, "todas">, { label: string; estados: EstadoVisible[]; detalle: string }> = {
  cliente: { label: "Esperan al cliente", estados: ["pendiente", "esperando"], detalle: "Novedades o aprobación pendientes" },
  alertas: { label: "Con alertas", estados: ["alertas", "devuelta"], detalle: "Necesitan tu revisión" },
  avanzar: { label: "Listas para avanzar", estados: ["lista", "borrador", "aprobada", "rectificacion"], detalle: "Podés calcular, revisar o cerrar" },
  cerradas: { label: "Cerradas", estados: ["cerrada"], detalle: "Recibos publicados" },
};

function ColorSegmento(e: EstadoVisible) {
  if (e === "cerrada") return "bg-sol";
  if (e === "aprobada") return "bg-sol/55";
  if (e === "pendiente") return "rayado-claro bg-white/5 ring-1 ring-inset ring-white/25";
  if (e === "alertas" || e === "devuelta") return "bg-rosa-t";
  return "bg-white/45";
}

function Hero({ vistas }: { vistas: Vista[] }) {
  const orden = [...vistas].sort((a, b) => ESTADOS[b.estado].orden - ESTADOS[a.estado].orden);
  const cerradas = vistas.filter((v) => v.estado === "cerrada").length;
  const recibos = vistas.filter((v) => v.estado === "cerrada").reduce((s, v) => s + (v.resultados?.filter((r) => !r.fueraDeAlcance).length ?? 0), 0);
  const bps = vistas.filter((v) => v.periodo.bps === "presentado").length;
  return (
    <Panel className="relative flex flex-col overflow-hidden !border-petroleo/10 bg-petroleo p-6 text-white md:col-span-2 xl:col-span-2">
      <div className="flex items-start justify-between">
        <p className="text-[15px] font-semibold text-[#EAF2FF]">Cierre de {nombreMes(MES_ACTUAL).toLowerCase()}</p>
        <Chip tono="tinta" className="!bg-white/12">Objetivo 2 oct</Chip>
      </div>
      <p className="mt-3 flex items-baseline gap-2">
        <span className="num text-5xl font-extrabold tracking-tight sm:text-6xl">{cerradas}</span>
        <span className="text-lg font-semibold text-[#DCE9FF]">de {vistas.length} empresas cerradas</span>
      </p>
      <div className="mt-5 flex h-9 gap-1" role="img" aria-label="Avance por empresa">
        {orden.map((v, i) => (
          <Link
            key={v.empresa.id}
            href={`/empresas/${v.empresa.id}`}
            title={`${v.empresa.nombre}: ${ESTADOS[v.estado].label}`}
            className={clsx("crece flex-1 rounded-md transition-transform hover:-translate-y-0.5", ColorSegmento(v.estado))}
            style={{ animationDelay: `${i * 40}ms` }}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#DCE9FF]">
        <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-sol" /> Cerrada</li>
        <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-white/45" /> En curso</li>
        <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-rosa-t" /> Con alertas</li>
        <li className="flex items-center gap-1.5"><span className="rayado-claro size-2.5 rounded-full ring-1 ring-white/40" /> Falta información</li>
      </ul>
      <div className="mt-auto grid grid-cols-2 gap-3 pt-6 text-sm">
        <div className="rounded-xl border border-white/10 bg-white/8 px-4 py-3">
          <p className="text-[#CFE4FF]">Recibos publicados</p>
          <p className="num mt-0.5 text-xl font-bold">{recibos}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/8 px-4 py-3">
          <p className="text-[#CFE4FF]">Nóminas BPS presentadas</p>
          <p className="num mt-0.5 text-xl font-bold">{bps} <span className="text-sm font-medium text-[#CFE4FF]">/ {vistas.length}</span></p>
        </div>
      </div>
    </Panel>
  );
}

function Tarjeta({ k, vistas, activo, onClick }: { k: Exclude<Filtro, "todas">; vistas: Vista[]; activo: boolean; onClick: () => void }) {
  const g = GRUPOS[k];
  const lista = vistas.filter((v) => g.estados.includes(v.estado));
  return (
    <button
      onClick={onClick}
      aria-pressed={activo}
      className={clsx(
        "group flex flex-col rounded-[var(--radius-panel)] border border-linea p-5 text-left shadow-[0_1px_2px_rgb(17_26_23/0.04)] transition-colors",
        activo ? "border-petroleo bg-petroleo text-white" : "bg-superficie hover:border-petroleo/30 hover:bg-hundido",
      )}
    >
      <span className="flex w-full items-start justify-between">
        <span className="text-[15px] font-semibold">{g.label}</span>
        <span className={clsx("flex size-8 items-center justify-center rounded-xl border transition-transform group-hover:rotate-45", activo ? "border-white/30" : "border-linea")}>
          <ArrowUpRight size={16} />
        </span>
      </span>
      <span className="num mt-3 text-5xl font-extrabold tracking-tighter">{lista.length}</span>
      <span className="mt-auto flex flex-col gap-1.5 pt-4">
        {lista.slice(0, 3).map((v) => (
          <span key={v.empresa.id} className={clsx("flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-xs", activo ? "bg-white/10" : "bg-hundido")}>
            <span className="truncate font-semibold">{v.empresa.nombre}</span>
            <span className={clsx("shrink-0", activo ? "text-[#DCE9FF]" : "text-apagado")}>{ESTADOS[v.estado].corto}</span>
          </span>
        ))}
        {lista.length > 3 && <span className={clsx("px-1 text-xs", activo ? "text-[#DCE9FF]" : "text-apagado")}>y {lista.length - 3} más</span>}
        {lista.length === 0 && <span className={clsx("text-xs", activo ? "text-[#DCE9FF]" : "text-apagado")}>{g.detalle}</span>}
      </span>
    </button>
  );
}

function Accion({ v }: { v: Vista }) {
  const solicitar = useStore((s) => s.solicitarNovedades);
  const puede = useStore((s) => s.puede);
  const router = useRouter();
  const usuario = useUsuario();
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const e = ESTADOS[v.estado];
  const pedirNovedades = async () => {
    setError("");
    setProcesando(true);
    try {
      const res = await solicitarNovedadesReal({ periodoId: v.periodo.id, empresaId: v.empresa.id, actor: usuario.nombre });
      if (!res.ok) {
        setError(res.mensaje);
        return;
      }
      solicitar(v.periodo.id);
      if (res.modo === "real") router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos pedir novedades.");
    } finally {
      setProcesando(false);
    }
  };
  if (v.estado === "pendiente") {
    const yaPedida = !!v.periodo.solicitud;
    return (
      <span className="inline-flex flex-col items-end gap-1">
        <Boton tam="sm" variante={yaPedida ? "secundario" : "primario"} disabled={!puede("editar") || procesando} onClick={() => void pedirNovedades()}>
          <Send size={13} /> {procesando ? "Enviando..." : yaPedida ? "Reenviar pedido" : "Pedir novedades"}
        </Boton>
        {error && <span className="max-w-56 text-right text-xs font-semibold text-rosa-t">{error}</span>}
      </span>
    );
  }
  const tab = v.estado === "alertas" ? "resumen" : ["lista", "borrador", "devuelta", "rectificacion"].includes(v.estado) ? "liquidacion" : "resumen";
  const label = v.estado === "alertas" ? `Resolver ${v.pend.total} ${v.pend.total === 1 ? "alerta" : "alertas"}` : e.cta;
  return (
    <Boton tam="sm" variante={["cerrada", "esperando"].includes(v.estado) ? "fantasma" : "primario"} href={`/empresas/${v.empresa.id}?tab=${tab}`}>
      {label}
    </Boton>
  );
}

export default function Inicio() {
  const vistas = useVistas();
  const u = useUsuario();
  const router = useRouter();
  const empleados = useStore((s) => s.empleados);
  const audit = useStore((s) => s.audit);
  const empresas = useStore((s) => s.empresas);
  const solicitar = useStore((s) => s.solicitarNovedades);
  const puede = useStore((s) => s.puede);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [resp, setResp] = useState("todos");
  const [pidiendo, setPidiendo] = useState(false);
  const [errorPedido, setErrorPedido] = useState("");

  const filas = useMemo(
    () =>
      vistas
        .filter((v) => filtro === "todas" || GRUPOS[filtro].estados.includes(v.estado))
        .filter((v) => resp === "todos" || v.empresa.responsableId === resp)
        .sort((a, b) => ESTADOS[a.estado].orden - ESTADOS[b.estado].orden),
    [vistas, filtro, resp],
  );
  const sinPedir = vistas.filter((v) => v.estado === "pendiente" && !v.periodo.solicitud);
  const hora = new Date().getHours();
  const saludo = hora < 13 ? "Buen día" : hora < 20 ? "Buenas tardes" : "Buenas noches";
  const pedirTodas = async () => {
    setErrorPedido("");
    setPidiendo(true);
    try {
      let refrescar = false;
      for (const v of sinPedir) {
        const res = await solicitarNovedadesReal({ periodoId: v.periodo.id, empresaId: v.empresa.id, actor: u.nombre });
        if (!res.ok) {
          setErrorPedido(res.mensaje);
          return;
        }
        solicitar(v.periodo.id);
        refrescar ||= res.modo === "real";
      }
      if (refrescar) router.refresh();
    } catch (err) {
      setErrorPedido(err instanceof Error ? err.message : "No pudimos pedir las novedades.");
    } finally {
      setPidiendo(false);
    }
  };

  return (
    <div className="space-y-3">
      <Panel className="flex flex-wrap items-end justify-between gap-4 px-7 py-6">
        <div>
          <h1 className="text-[34px] font-extrabold leading-tight tracking-tight">
            {saludo}, {u.nombre.split(" ")[0]}
          </h1>
          <p className="mt-1 text-[15px] text-apagado">
            Te quedan {vistas.filter((v) => v.estado !== "cerrada").length} empresas por cerrar en {nombreMes(MES_ACTUAL).toLowerCase()}. Empezá por las que tienen alertas.
          </p>
        </div>
        {sinPedir.length > 0 && (
          <div className="flex flex-col items-end gap-1">
            <Boton disabled={!puede("editar") || pidiendo} onClick={() => void pedirTodas()}>
              <Send size={15} /> {pidiendo ? "Enviando..." : <>Pedir novedades a {sinPedir.length} {sinPedir.length === 1 ? "empresa" : "empresas"}</>}
            </Boton>
            {errorPedido && <p className="max-w-sm text-right text-xs font-semibold text-rosa-t">{errorPedido}</p>}
          </div>
        )}
      </Panel>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Hero vistas={vistas} />
        {(["cliente", "alertas", "avanzar"] as const).map((k) => (
          <Tarjeta key={k} k={k} vistas={vistas} activo={filtro === k} onClick={() => setFiltro(filtro === k ? "todas" : k)} />
        ))}
      </div>

      <div className="grid gap-3 2xl:grid-cols-[1fr_320px]">
        <Panel className="min-w-0 p-3">
          <div className="flex flex-wrap items-center gap-2 px-3 pt-2 pb-4">
            <h2 className="mr-auto text-lg font-bold tracking-tight">Cartera del mes</h2>
            <div className="flex flex-wrap gap-1 rounded-xl bg-hundido p-1" role="tablist">
              {(["todas", "cliente", "alertas", "avanzar", "cerradas"] as Filtro[]).map((f) => (
                <button
                  key={f}
                  role="tab"
                  aria-selected={filtro === f}
                  onClick={() => setFiltro(f)}
                  className={clsx("rounded-lg px-3.5 py-1.5 text-[13px] font-semibold", filtro === f ? "bg-superficie shadow-sm" : "text-apagado hover:text-tinta")}
                >
                  {f === "todas" ? "Todas" : GRUPOS[f].label}
                </button>
              ))}
            </div>
            <select value={resp} onChange={(e) => setResp(e.target.value)} className="h-9 rounded-xl border border-linea bg-superficie px-3 text-[13px] font-semibold" aria-label="Filtrar por responsable">
              <option value="todos">Todos los responsables</option>
              {USUARIOS.filter((x) => x.rol !== "lectura").map((x) => (
                <option key={x.id} value={x.id}>{x.nombre}</option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="text-left text-xs text-apagado">
                  <th className="px-3 pb-2 font-semibold">Empresa</th>
                  <th className="px-3 pb-2 font-semibold">Novedades</th>
                  <th className="px-3 pb-2 font-semibold">Estado</th>
                  <th className="px-3 pb-2 font-semibold">Aprobación</th>
                  <th className="px-3 pb-2 font-semibold">BPS</th>
                  <th className="px-3 pb-2 font-semibold">Resp.</th>
                  <th className="px-3 pb-2 text-right font-semibold">Siguiente paso</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((v) => {
                  const nov = estadoNovedades(v.periodo);
                  const n = empleados.filter((e) => e.empresaId === v.empresa.id && activoEn(e, MES_ACTUAL)).length;
                  const r = USUARIOS.find((x) => x.id === v.empresa.responsableId) ?? { nombre: v.empresa.contacto.nombre };
                  const ap = v.periodo.aprobacion;
                  return (
                    <tr key={v.empresa.id} className="group border-t border-linea">
                      <td className="px-3 py-3">
                        <Link href={`/empresas/${v.empresa.id}`} className="flex items-center gap-3">
                          <Avatar nombre={v.empresa.nombre} tono={v.empresa.tono} size={38} />
                          <span>
                            <span className="block whitespace-nowrap font-semibold group-hover:underline">{v.empresa.nombre}</span>
                            <span className="block whitespace-nowrap text-xs text-apagado">Grupo {v.empresa.grupo} · {n} {n === 1 ? "persona" : "personas"}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-3"><Chip tono={nov.tono}>{nov.texto}</Chip></td>
                      <td className="px-3 py-3"><EstadoChip estado={v.estado} /></td>
                      <td className="whitespace-nowrap px-3 py-3 text-[13px] text-tinta-2">
                        {!v.empresa.requiereAprobacion ? <span className="whitespace-nowrap text-apagado">No requiere</span> : ap ? `v${ap.version} ${ap.estado === "pendiente" ? "enviada" : ap.estado}` : <span className="text-apagado">—</span>}
                      </td>
                      <td className="px-3 py-3 text-[13px]">
                        {v.periodo.bps === "presentado" ? <Chip tono="menta">Presentada</Chip> : v.periodo.bps === "generado" ? <Chip tono="cielo">Archivo listo</Chip> : v.estado === "cerrada" ? <Chip tono="crema">Pendiente</Chip> : <span className="text-apagado">—</span>}
                      </td>
                      <td className="px-3 py-3" title={r.nombre}><Avatar nombre={r.nombre} tono="crema" size={28} /></td>
                      <td className="px-3 py-3 text-right"><Accion v={v} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filas.length === 0 && <p className="px-3 py-10 text-center text-sm text-apagado">No hay empresas en este filtro.</p>}
          </div>
        </Panel>

        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-1 2xl:content-start">
          <Panel className="p-5">
            <h2 className="flex items-center gap-2 font-bold"><CalendarClock size={17} className="text-petroleo" /> Próximas fechas</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {[
                { d: "2", m: "oct", t: "Límite de novedades de clientes", s: `${vistas.filter((v) => v.estado === "pendiente").length} empresas sin enviar` },
                { d: "6", m: "oct", t: "Pago de sueldos (5° día hábil)", s: "Recibos deben estar publicados" },
                { d: "19", m: "oct", t: "Vencimiento nómina BPS", s: `${vistas.filter((v) => v.periodo.bps !== "presentado").length} sin presentar` },
              ].map((x) => (
                <li key={x.t} className="flex gap-3">
                  <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-sol-suave leading-none">
                    <span className="num text-lg font-extrabold">{x.d}</span>
                    <span className="text-[10px] font-semibold text-crema-t">{x.m}</span>
                  </span>
                  <span>
                    <span className="block font-semibold">{x.t}</span>
                    <span className="block text-xs text-apagado">{x.s}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Actividad reciente</h2>
              <Link href="/auditoria" className="text-xs font-semibold text-petroleo hover:underline">Ver todo</Link>
            </div>
            <ul className="mt-4 space-y-3.5">
              {audit.slice(0, 6).map((a) => {
                const emp = empresas.find((e) => e.id === a.empresaId);
                return (
                  <li key={a.id} className="text-sm">
                    <Link href={emp ? `/empresas/${emp.id}?tab=actividad` : "/auditoria"} className="block rounded-xl hover:bg-hundido">
                      <span className="block font-medium leading-snug">{a.accion}</span>
                      <span className="block text-xs text-apagado">
                        {emp?.nombre} · {a.actor} · {fechaHora(a.fecha)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

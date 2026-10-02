"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Paperclip, Plus, Undo2, X } from "lucide-react";
import { borrarNovedadReal, enviarNovedadesClienteReal, responderAprobacionReal } from "@/app/(estudio)/actions";
import { NovedadForm } from "@/components/novedad-form";
import { Logo } from "@/components/shell";
import { Avatar, Boton, Drawer, MarcaEmpresa, Panel, inputCls } from "@/components/ui";
import { activoEn, calcularEmpresa, totales } from "@/lib/engine";
import { fecha, fmt, mesAnterior, MES_ACTUAL, nombreMes, pct } from "@/lib/format";
import { TIPOS, valorNovedad } from "@/lib/labels";
import { ESTUDIO } from "@/lib/seed";
import { useStore, vistaPeriodo } from "@/lib/store";
import type { DatosOperativosIniciales } from "@/lib/backend-operativo";
import type { Novedad, TipoNovedad } from "@/lib/types";

const RAPIDOS: TipoNovedad[] = [
  "hora_extra",
  "falta",
  "certificacion",
  "suspension",
  "seguro_paro",
  "accidente_laboral",
  "licencia",
  "licencia_especial",
  "llegada_tarde",
  "feriado",
  "bono",
  "presentismo",
  "viatico",
  "adelanto",
];

export default function ClienteClient({ id, datosIniciales }: { id: string; datosIniciales: DatosOperativosIniciales }) {
  const router = useRouter();
  const store = useStore();
  const datos = datosIniciales.modo === "real" ? datosIniciales : store;
  const empresaExiste = datos.empresas.some((e) => e.id === id);
  const v = useMemo(() => empresaExiste ? vistaPeriodo(id, MES_ACTUAL, datos) : null, [datos, empresaExiste, id]);
  const empleados = useMemo(() => datos.empleados.filter((e) => e.empresaId === id && activoEn(e, MES_ACTUAL)), [datos.empleados, id]);
  const [form, setForm] = useState<{ emp: string; tipo: TipoNovedad } | null>(null);
  const [comentario, setComentario] = useState("");
  const [devolviendo, setDevolviendo] = useState(false);
  const [eliminando, setEliminando] = useState("");
  const [error, setError] = useState("");
  const esReal = datosIniciales.modo === "real";

  useEffect(() => {
    if (v && !esReal) store.abrirSolicitud(v.periodo.id, `${v.empresa.contacto.nombre} (cliente)`);
  }, [esReal, store, v]);

  if (!v) return <p className="p-10 text-center">Este enlace no es válido.</p>;

  const autor = v.empresa.contacto.nombre;
  const p = v.periodo;
  const mesNombre = nombreMes(p.mes).split(" ")[0].toLowerCase();
  const prev = calcularEmpresa(v.empresa, datos.empleados, mesAnterior(p.mes), datos.novedades);

  const quitar = async (n: Novedad) => {
    setError("");
    setEliminando(n.id);
    try {
      const res = await borrarNovedadReal({ id: n.id, empresaId: n.empresaId, tipo: n.tipo, autor, antes: `${TIPOS[n.tipo].corto} ${valorNovedad(n)}` });
      if (!res.ok) {
        setError(res.mensaje);
        return;
      }
      if (esReal) router.refresh();
      else store.borrarNovedad(n.id, `${autor} (cliente)`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos quitar la novedad.");
    } finally {
      setEliminando("");
    }
  };
  const enviar = async (sinNovedades: boolean) => {
    setError("");
    try {
      if (esReal) {
        const res = await enviarNovedadesClienteReal({ empresaId: id, mes: p.mes, autor, sinNovedades });
        if (!res.ok) {
          setError(res.mensaje);
          return;
        }
        router.refresh();
        return;
      }
      store.enviarNovedadesCliente(p.id, autor, sinNovedades);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos enviar las novedades.");
    }
  };
  const responderAprobacion = async (aprobada: boolean, comentarioAprobacion = "") => {
    setError("");
    try {
      if (esReal) {
        const res = await responderAprobacionReal({ periodoId: p.id, empresaId: id, actor: autor, aprobada, comentario: comentarioAprobacion });
        if (!res.ok) {
          setError(res.mensaje);
          return;
        }
        router.refresh();
        return;
      }
      store.responderAprobacion(p.id, aprobada, comentarioAprobacion, autor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos responder la aprobación.");
    }
  };

  let cuerpo: React.ReactNode;
  if (p.etapa === "novedades") {
    cuerpo = (
      <>
        <Panel className="bg-sol-suave p-6">
          <p className="text-sm font-semibold text-crema-t">Pedido de {ESTUDIO.nombre}</p>
          <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight">Necesitamos las novedades de {mesNombre} antes del {fecha(p.fechaObjetivo)}</h1>
          <p className="mt-2 text-[15px] text-tinta-2">Contanos qué pasó este mes con tu equipo: horas extra, faltas, suspensiones, certificaciones, seguros, bonos, licencias, viáticos o adelantos. Podés adjuntar comprobantes. Si no hubo nada, avisanos con un toque.</p>
        </Panel>
        {error && <p className="rounded-2xl bg-rosa px-4 py-3 text-sm text-rosa-t">{error}</p>}
        <ul className="space-y-2">
          {empleados.map((e) => {
            const ns = v.novedadesMes.filter((n) => n.empleadoId === e.id);
            return (
              <li key={e.id}>
                <Panel className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar nombre={`${e.nombre} ${e.apellido}`} tono={v.empresa.tono} size={38} />
                    <span className="flex-1">
                      <span className="block font-semibold">{e.nombre} {e.apellido}</span>
                      <span className="block text-xs text-apagado">{e.cargo}</span>
                    </span>
                  </div>
                  {ns.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {ns.map((n) => (
                        <li key={n.id} className="inline-flex items-center gap-1.5 rounded-full bg-hundido py-1 pl-3 pr-1 text-[13px]">
                          <b>{TIPOS[n.tipo].corto}</b> {valorNovedad(n)}
                          {n.adjunto && <Paperclip size={12} className="text-petroleo" aria-label="Con adjunto" />}
                          <button disabled={eliminando === n.id} onClick={() => void quitar(n)} className="rounded-full p-1 text-apagado hover:bg-rosa hover:text-rosa-t disabled:opacity-50" aria-label="Quitar"><X size={12} /></button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {RAPIDOS.map((t) => (
                      <button key={t} onClick={() => setForm({ emp: e.id, tipo: t })} className="inline-flex items-center gap-1 rounded-full border border-linea px-3 py-1.5 text-[13px] font-semibold text-tinta-2 hover:border-petroleo hover:text-petroleo">
                        <Plus size={13} /> {TIPOS[t].corto}
                      </button>
                    ))}
                  </div>
                </Panel>
              </li>
            );
          })}
        </ul>
        <div className="sticky bottom-3 flex flex-col gap-2 rounded-[var(--radius-panel)] bg-[var(--cierra-navy)] p-3 sm:flex-row">
          <Boton tam="lg" className="flex-1 !bg-sol !text-[#102247] hover:!bg-[#FFE9AD]" disabled={!v.novedadesMes.length} onClick={() => void enviar(false)}>
            <Check size={17} /> Enviar {v.novedadesMes.length || ""} {v.novedadesMes.length === 1 ? "novedad" : "novedades"}
          </Boton>
          <Boton tam="lg" variante="claro" className="!bg-white/10 !text-white hover:!bg-white/20" onClick={() => void enviar(true)} disabled={v.novedadesMes.length > 0}>
            No hubo novedades este mes
          </Boton>
        </div>
      </>
    );
  } else if (p.etapa === "enviada" && v.resultados) {
    const t = totales(v.resultados);
    const tp = totales(prev);
    const variacion = tp.liquido ? (t.liquido - tp.liquido) / tp.liquido : 0;
    cuerpo = (
      <>
        <Panel className="p-6">
          <p className="text-sm font-semibold text-lila-t">Para revisar</p>
          <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight">Los sueldos de {mesNombre} están listos</h1>
          <p className="mt-2 text-[15px] text-tinta-2">Revisá los montos. Si está todo bien, aprobalos y emitimos los recibos. Si algo no coincide, devolvelo con un comentario.</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl bg-petroleo p-5 text-white">
              <p className="text-sm text-[#DCE9FF]">Total a pagar a tu equipo</p>
              <p className="num mt-1 text-4xl font-extrabold tracking-tight">{fmt(t.liquido)}</p>
              <p className="mt-1 text-xs text-[#CFE4FF]">{variacion >= 0 ? "+" : ""}{pct(variacion)} que el mes pasado</p>
            </div>
            <div className="rounded-2xl bg-hundido p-5">
              <p className="text-sm text-apagado">Costo total con aportes</p>
              <p className="num mt-1 text-4xl font-extrabold tracking-tight">{fmt(t.costo)}</p>
              <p className="mt-1 text-xs text-apagado">Incluye aportes a BPS a cargo de la empresa</p>
            </div>
          </div>
        </Panel>
        {devolviendo ? (
          <Panel className="p-5">
            <label className="block text-sm font-semibold" htmlFor="obs">¿Qué hay que corregir?</label>
            <textarea id="obs" autoFocus className={clsx(inputCls, "mt-2 h-28 py-3")} value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Ej.: a Florencia le corresponden 4 horas extra más" />
            <div className="mt-3 flex gap-2">
              <Boton variante="fantasma" onClick={() => setDevolviendo(false)}>Cancelar</Boton>
              <Boton disabled={comentario.trim().length < 5} onClick={() => void responderAprobacion(false, comentario.trim())}><Undo2 size={15} /> Devolver al estudio</Boton>
            </div>
          </Panel>
        ) : (
          <div className="sticky bottom-3 flex flex-col gap-2 rounded-[var(--radius-panel)] bg-[var(--cierra-navy)] p-3 sm:flex-row">
            <Boton tam="lg" className="flex-1 !bg-sol !text-[#102247] hover:!bg-[#FFE9AD]" onClick={() => void responderAprobacion(true)}><Check size={17} /> Aprobar sueldos</Boton>
            <Boton tam="lg" variante="claro" className="!bg-white/10 !text-white hover:!bg-white/20" onClick={() => setDevolviendo(true)}>Devolver con un comentario</Boton>
          </div>
        )}
      </>
    );
  } else {
    cuerpo = (
      <Panel className="p-8 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-menta text-menta-t"><Check size={26} /></span>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Recibimos tu información</h1>
        <p className="mx-auto mt-2 max-w-md text-[15px] text-tinta-2">{ESTUDIO.nombre} está trabajando el período de {mesNombre}.</p>
        {v.novedadesMes.length > 0 && <p className="mt-4 text-sm text-apagado">{v.novedadesMes.length} novedades informadas este mes.</p>}
      </Panel>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-3 pb-8">
      <div className="flex items-center gap-3 px-2 py-3">
        <MarcaEmpresa empresa={v.empresa} size={40} />
        <div className="flex-1 leading-tight">
          <p className="font-bold">{v.empresa.nombre}</p>
          <p className="text-xs text-apagado">Hola, {autor.split(" ").slice(-2, -1)[0] ?? autor} · {nombreMes(p.mes)}</p>
        </div>
        <Logo />
      </div>
      {cuerpo}
      <Drawer abierto={!!form} onCerrar={() => setForm(null)} titulo="Agregar novedad" subtitulo={nombreMes(p.mes)}>
        {form && (
          <NovedadForm key={form.emp + form.tipo} empresaId={id} mes={p.mes} empleados={empleados} origen="cliente" autor={autor} empleadoInicial={form.emp} tipoInicial={form.tipo} tipos={RAPIDOS} onListo={() => { setForm(null); if (esReal) router.refresh(); }} />
        )}
      </Drawer>
      <p className="no-print pt-4 text-center text-xs text-apagado">
        <Link href={`/empresas/${id}`} className="inline-flex items-center gap-1 hover:underline"><ArrowLeft size={12} /> Volver a la vista del estudio</Link>
      </p>
    </div>
  );
}

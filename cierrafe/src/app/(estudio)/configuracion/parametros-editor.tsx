"use client";

import { useMemo, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { Chip, Panel } from "@/components/ui";
import { fmt, pct } from "@/lib/format";
import { UMBRAL_VARIACION } from "@/lib/validations";
import { clonarParametrosIniciales, MOTOR_VERSION, type Parametros } from "@/lib/params";
import { useStore } from "@/lib/store";

const inputCls =
  "h-10 w-full rounded-xl border border-linea bg-superficie px-3 text-sm text-tinta outline-none transition-colors placeholder:text-apagado hover:border-petroleo/35 focus:border-petroleo focus:ring-2 focus:ring-petroleo/20";
const labelCls = "mb-1 block text-xs font-semibold text-apagado";

function clonarParametro(p: Parametros): Parametros {
  return {
    ...p,
    personal: { ...p.personal },
    fonasa: { ...p.fonasa },
    patronal: { ...p.patronal },
    irpf: { ...p.irpf, franjasBpc: p.irpf.franjasBpc.map((f) => ({ ...f })) },
    horas: { ...p.horas },
    topesAfap: p.topesAfap?.map((t) => ({ ...t })),
  };
}

function CampoTexto({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function CampoNumero({ label, value, onChange, step = "0.01" }: { label: string; value?: number; onChange: (value: number) => void; step?: string }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <input className={`${inputCls} num`} type="number" step={step} value={value ?? ""} onChange={(e) => e.target.value !== "" && onChange(Number(e.target.value))} />
    </label>
  );
}

function CampoPorcentaje({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <div className="relative">
        <input className={`${inputCls} num pr-8`} type="number" step="0.001" value={Number((value * 100).toFixed(4))} onChange={(e) => e.target.value !== "" && onChange(Number(e.target.value) / 100)} />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-apagado">%</span>
      </div>
    </label>
  );
}

export function ParametrosNormativosPanel() {
  const parametros = useStore((s) => s.parametrosNormativos);
  const actualizar = useStore((s) => s.actualizarParametroNormativo);
  const restaurar = useStore((s) => s.restaurarParametrosNormativos);
  const lista = parametros.length ? parametros : clonarParametrosIniciales();
  const [tab, setTab] = useState<"resumen" | "editar">("resumen");
  const [seleccionado, setSeleccionado] = useState(lista.at(-1)!.id);
  const vigente = useMemo(() => lista.find((p) => p.id === seleccionado) ?? lista.at(-1)!, [lista, seleccionado]);
  const [draft, setDraft] = useState<Parametros>(() => clonarParametro(vigente));
  const [mensaje, setMensaje] = useState<string | null>(null);

  const set = (patch: Partial<Parametros>) => setDraft((actual) => ({ ...actual, ...patch }));
  const guardar = () => {
    actualizar(draft, `Editó parámetros normativos ${draft.id}`);
    setMensaje("Cambios guardados. Las próximas liquidaciones usan esta versión.");
  };

  return (
    <Panel className="min-w-0 p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Parámetros normativos</h2>
          <p className="text-sm text-apagado">Valores de BPC, BFC, topes, aportes, FONASA e IRPF con vigencia.</p>
        </div>
        <Chip tono="crema">Valores editables</Chip>
      </div>

      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Parámetros normativos">
        {[
          ["resumen", "Resumen"],
          ["editar", "Editar valores"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${tab === id ? "bg-petroleo text-white" : "bg-hundido text-tinta-2 hover:bg-lila"}`}
            onClick={() => setTab(id as typeof tab)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "resumen" ? (
        <>
          <ul className="space-y-2">
            {[...lista].reverse().map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-hundido px-4 py-3 text-sm">
                <span className="font-bold">{p.id}</span>
                <span className="text-apagado">desde {p.vigenciaDesde}{p.vigenciaHasta ? ` hasta ${p.vigenciaHasta}` : ""}</span>
                <span className="ml-auto">{p.vigenciaHasta ? <Chip tono="gris">Histórica</Chip> : <Chip tono="menta">Vigente</Chip>}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
            {[
              ["BFC", vigente.bfc ? fmt(vigente.bfc) : "-"],
              ["BPC", fmt(vigente.bpc)],
              ["Salario mínimo nacional", vigente.salarioMinimoNacional ? fmt(vigente.salarioMinimoNacional) : "-"],
              ["Cuota mutual", vigente.cuotaMutual ? fmt(vigente.cuotaMutual) : "-"],
              ["Costo promedio equivalente", vigente.costoPromedioEquivalente ? fmt(vigente.costoPromedioEquivalente) : "-"],
              ["Tope aporte jubilatorio", fmt(vigente.topeJubilatorio)],
              ["Jubilatorio personal / patronal", `${pct(vigente.personal.jubilatorio)} / ${pct(vigente.patronal.jubilatorio)}`],
              ["FONASA personal", `${pct(vigente.fonasa.tasaBaja)} · ${pct(vigente.fonasa.tasaSinHijos)} · ${pct(vigente.fonasa.tasaConHijos)} (+${pct(vigente.fonasa.adicionalConyuge)} cónyuge)`],
              ["FONASA patronal", pct(vigente.patronal.fonasa)],
              ["FRL personal / patronal", `${pct(vigente.personal.frl, 2)} / ${pct(vigente.patronal.frl, 2)}`],
              ["FGCL", pct(vigente.patronal.fgcl, 3)],
              ["IRPF deducción", `${pct(vigente.irpf.tasaDeduccionBaja)} hasta ${vigente.irpf.umbralTasaDeduccionBpc} BPC, luego ${pct(vigente.irpf.tasaDeduccionAlta)}`],
              ["Deducción por hijo", `${vigente.irpf.deduccionHijoBpcAnual} BPC anuales`],
              ["Valor hora", `sueldo / ${vigente.horas.divisor}, recargo ${pct(vigente.horas.recargoExtra)}`],
              ["Umbral de variación", `${pct(UMBRAL_VARIACION, 0)} vs. mes anterior`],
              ["Motor", MOTOR_VERSION],
            ].map(([k, v]) => (
              <div key={k} className="border-t border-linea pt-2.5">
                <dt className="text-xs text-apagado">{k}</dt>
                <dd className="num font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          {vigente.topesAfap && (
            <div className="mt-5">
              <p className="text-xs font-semibold text-apagado">Topes AFAP Ley 16.713</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {vigente.topesAfap.map((t) => (
                  <span key={t.tramo} className="rounded-full bg-hundido px-2.5 py-1 text-xs">Tramo {t.tramo} <b>{fmt(t.monto)}</b></span>
                ))}
              </div>
            </div>
          )}
          <div className="mt-5">
            <p className="text-xs font-semibold text-apagado">Franjas IRPF mensuales</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {vigente.irpf.franjasBpc.map((f) => (
                <span key={f.desde} className="rounded-full bg-hundido px-2.5 py-1 text-xs">{f.desde}-{f.hasta ?? "∞"} BPC <b>{pct(f.tasa, 0)}</b></span>
              ))}
            </div>
          </div>
          <p className="mt-5 rounded-2xl bg-crema px-4 py-3 text-xs text-crema-t">{vigente.fuente}. Antes del piloto deben validarse con un contador asesor y cargarse con su resolución de origen.</p>
        </>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-[220px_1fr]">
            <label className="block">
              <span className={labelCls}>Versión a editar</span>
              <select
                className={inputCls}
                value={seleccionado}
                onChange={(e) => {
                  const id = e.target.value;
                  const siguiente = lista.find((p) => p.id === id) ?? lista.at(-1)!;
                  setSeleccionado(id);
                  setDraft(clonarParametro(siguiente));
                  setMensaje(null);
                }}
              >
                {[...lista].reverse().map((p) => <option key={p.id} value={p.id}>{p.id}</option>)}
              </select>
            </label>
            <CampoTexto label="Fuente / respaldo" value={draft.fuente} onChange={(fuente) => set({ fuente })} />
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <CampoTexto label="Código" value={draft.id} onChange={(id) => set({ id })} />
            <CampoTexto label="Vigencia desde" value={draft.vigenciaDesde} onChange={(vigenciaDesde) => set({ vigenciaDesde })} />
            <CampoTexto label="Vigencia hasta" value={draft.vigenciaHasta ?? ""} onChange={(v) => set({ vigenciaHasta: v || null })} />
            <CampoNumero label="BPC" value={draft.bpc} onChange={(bpc) => set({ bpc })} />
            <CampoNumero label="BFC" value={draft.bfc} onChange={(bfc) => set({ bfc })} />
            <CampoNumero label="Salario mínimo nacional" value={draft.salarioMinimoNacional} onChange={(salarioMinimoNacional) => set({ salarioMinimoNacional })} />
            <CampoNumero label="Cuota mutual" value={draft.cuotaMutual} onChange={(cuotaMutual) => set({ cuotaMutual })} />
            <CampoNumero label="Costo promedio equivalente" value={draft.costoPromedioEquivalente} onChange={(costoPromedioEquivalente) => set({ costoPromedioEquivalente })} />
            <CampoNumero label="Tope jubilatorio" value={draft.topeJubilatorio} onChange={(topeJubilatorio) => set({ topeJubilatorio })} />
            <CampoNumero label="Divisor valor hora" value={draft.horas.divisor} onChange={(divisor) => set({ horas: { ...draft.horas, divisor } })} step="1" />
            <CampoPorcentaje label="Recargo hora extra" value={draft.horas.recargoExtra} onChange={(recargoExtra) => set({ horas: { ...draft.horas, recargoExtra } })} />
            <CampoNumero label="Factor feriado trabajado" value={draft.feriadoFactor} onChange={(feriadoFactor) => set({ feriadoFactor })} />
          </div>

          <section>
            <h3 className="text-sm font-bold">Aportes</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <CampoPorcentaje label="Jubilatorio personal" value={draft.personal.jubilatorio} onChange={(jubilatorio) => set({ personal: { ...draft.personal, jubilatorio } })} />
              <CampoPorcentaje label="FRL personal" value={draft.personal.frl} onChange={(frl) => set({ personal: { ...draft.personal, frl } })} />
              <CampoPorcentaje label="Jubilatorio patronal" value={draft.patronal.jubilatorio} onChange={(jubilatorio) => set({ patronal: { ...draft.patronal, jubilatorio } })} />
              <CampoPorcentaje label="FONASA patronal" value={draft.patronal.fonasa} onChange={(fonasa) => set({ patronal: { ...draft.patronal, fonasa } })} />
              <CampoPorcentaje label="FRL patronal" value={draft.patronal.frl} onChange={(frl) => set({ patronal: { ...draft.patronal, frl } })} />
              <CampoPorcentaje label="FGCL" value={draft.patronal.fgcl} onChange={(fgcl) => set({ patronal: { ...draft.patronal, fgcl } })} />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold">FONASA personal</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-5">
              <CampoNumero label="Umbral BPC" value={draft.fonasa.umbralBpc} onChange={(umbralBpc) => set({ fonasa: { ...draft.fonasa, umbralBpc } })} />
              <CampoPorcentaje label="Tasa baja" value={draft.fonasa.tasaBaja} onChange={(tasaBaja) => set({ fonasa: { ...draft.fonasa, tasaBaja } })} />
              <CampoPorcentaje label="Sin hijos" value={draft.fonasa.tasaSinHijos} onChange={(tasaSinHijos) => set({ fonasa: { ...draft.fonasa, tasaSinHijos } })} />
              <CampoPorcentaje label="Con hijos" value={draft.fonasa.tasaConHijos} onChange={(tasaConHijos) => set({ fonasa: { ...draft.fonasa, tasaConHijos } })} />
              <CampoPorcentaje label="Adicional cónyuge" value={draft.fonasa.adicionalConyuge} onChange={(adicionalConyuge) => set({ fonasa: { ...draft.fonasa, adicionalConyuge } })} />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold">IRPF</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-5">
              <CampoNumero label="Incremento 6% desde BPC" value={draft.irpf.incremento6DesdeBpc} onChange={(incremento6DesdeBpc) => set({ irpf: { ...draft.irpf, incremento6DesdeBpc } })} />
              <CampoNumero label="Deducción hijo BPC anual" value={draft.irpf.deduccionHijoBpcAnual} onChange={(deduccionHijoBpcAnual) => set({ irpf: { ...draft.irpf, deduccionHijoBpcAnual } })} />
              <CampoNumero label="Umbral tasa deducción BPC" value={draft.irpf.umbralTasaDeduccionBpc} onChange={(umbralTasaDeduccionBpc) => set({ irpf: { ...draft.irpf, umbralTasaDeduccionBpc } })} />
              <CampoPorcentaje label="Tasa deducción baja" value={draft.irpf.tasaDeduccionBaja} onChange={(tasaDeduccionBaja) => set({ irpf: { ...draft.irpf, tasaDeduccionBaja } })} />
              <CampoPorcentaje label="Tasa deducción alta" value={draft.irpf.tasaDeduccionAlta} onChange={(tasaDeduccionAlta) => set({ irpf: { ...draft.irpf, tasaDeduccionAlta } })} />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold">Topes AFAP</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {(draft.topesAfap ?? []).map((tope, index) => (
                <CampoNumero
                  key={tope.tramo}
                  label={`Tramo ${tope.tramo}`}
                  value={tope.monto}
                  onChange={(monto) => set({ topesAfap: draft.topesAfap?.map((t, i) => (i === index ? { ...t, monto } : t)) })}
                />
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold">Franjas IRPF mensuales</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-full text-sm md:min-w-[560px]">
                <thead>
                  <tr className="text-left text-xs text-apagado">
                    <th className="py-2 font-semibold">Desde BPC</th>
                    <th className="py-2 font-semibold">Hasta BPC</th>
                    <th className="py-2 font-semibold">Tasa</th>
                  </tr>
                </thead>
                <tbody>
                  {draft.irpf.franjasBpc.map((franja, index) => (
                    <tr key={index} className="border-t border-linea">
                      <td className="py-2 pr-3">
                        <input className={`${inputCls} num`} type="number" value={franja.desde} onChange={(e) => set({ irpf: { ...draft.irpf, franjasBpc: draft.irpf.franjasBpc.map((f, i) => (i === index ? { ...f, desde: Number(e.target.value) } : f)) } })} />
                      </td>
                      <td className="py-2 pr-3">
                        <input className={`${inputCls} num`} type="number" placeholder="Sin tope" value={franja.hasta ?? ""} onChange={(e) => set({ irpf: { ...draft.irpf, franjasBpc: draft.irpf.franjasBpc.map((f, i) => (i === index ? { ...f, hasta: e.target.value === "" ? null : Number(e.target.value) } : f)) } })} />
                      </td>
                      <td className="py-2">
                        <input className={`${inputCls} num`} type="number" step="0.001" value={Number((franja.tasa * 100).toFixed(4))} onChange={(e) => set({ irpf: { ...draft.irpf, franjasBpc: draft.irpf.franjasBpc.map((f, i) => (i === index ? { ...f, tasa: Number(e.target.value) / 100 } : f)) } })} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {mensaje && <p role="status" className="rounded-2xl bg-menta px-4 py-3 text-sm font-semibold text-menta-t">{mensaje}</p>}

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-[14px] border border-linea bg-superficie px-4 text-sm font-semibold text-tinta hover:bg-hundido"
              onClick={() => {
                const iniciales = clonarParametrosIniciales();
                const siguiente = iniciales.find((p) => p.id === seleccionado) ?? iniciales.at(-1)!;
                restaurar();
                setSeleccionado(siguiente.id);
                setDraft(clonarParametro(siguiente));
                setMensaje("Valores referenciales restaurados.");
              }}
            >
              <RotateCcw size={16} /> Restaurar valores iniciales
            </button>
            <button type="button" className="inline-flex h-10 items-center gap-2 rounded-[14px] bg-petroleo px-4 text-sm font-semibold text-white hover:bg-petroleo-2" onClick={guardar}>
              <Save size={16} /> Guardar parámetros
            </button>
          </div>
        </div>
      )}
    </Panel>
  );
}

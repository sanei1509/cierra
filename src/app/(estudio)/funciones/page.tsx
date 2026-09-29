"use client";

import clsx from "clsx";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { FUNCIONES, RECORRIDO, type Cobertura, type Funcion } from "@/lib/funciones";
import { Boton, Panel } from "@/components/ui";

const COB: Record<Cobertura, { label: string; chip: string; barra: string }> = {
  si: { label: "Cubierta", chip: "bg-menta text-menta-t", barra: "bg-petroleo" },
  parcial: { label: "Parcial", chip: "bg-crema text-crema-t", barra: "bg-sol" },
  no: { label: "No incluida", chip: "bg-hundido text-apagado", barra: "rayado bg-hundido" },
};

type Filtro = "todas" | Cobertura;

function Item({ f }: { f: Funcion }) {
  const tieneGuia = !!(f.pasos?.length || f.probar);
  const [abierta, setAbierta] = useState(false);
  return (
    <li className="border-t border-linea first:border-t-0">
      <button
        className={clsx("flex w-full items-start gap-3 px-2 py-3 text-left", tieneGuia && "hover:bg-hundido/60 rounded-2xl")}
        onClick={() => tieneGuia && setAbierta(!abierta)}
        aria-expanded={tieneGuia ? abierta : undefined}
        disabled={!tieneGuia}
      >
        <span className={clsx("mt-0.5 w-[92px] shrink-0 rounded-full px-2 py-0.5 text-center text-[11px] font-semibold", COB[f.estado].chip)}>{COB[f.estado].label}</span>
        <span className="flex-1">
          <span className={clsx("block text-sm font-semibold", f.estado === "no" && "text-apagado")}>
            {f.nombre}
            {f.nueva && <span className="ml-2 rounded-full bg-sol px-1.5 py-0.5 text-[10px] font-bold text-tinta">Nuevo</span>}
          </span>
          {f.nota && <span className="mt-0.5 block text-[13px] text-apagado">{f.nota}</span>}
        </span>
        {tieneGuia && (
          <span className="flex shrink-0 items-center gap-1 pt-0.5 text-xs font-semibold text-petroleo">
            Cómo usarla <ChevronDown size={14} className={clsx("transition-transform", abierta && "rotate-180")} />
          </span>
        )}
      </button>
      {abierta && (
        <div className="mb-3 ml-2 rounded-2xl bg-hundido px-5 py-4 sm:ml-[106px]">
          {f.pasos && (
            <ol className="space-y-2 text-sm">
              {f.pasos.map((p, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-petroleo text-[11px] font-bold text-white">{i + 1}</span>
                  <span>{p}</span>
                </li>
              ))}
            </ol>
          )}
          {f.probar && (
            <Boton tam="sm" href={f.probar.href} className={f.pasos ? "mt-4" : ""}>
              {f.probar.label}
            </Boton>
          )}
        </div>
      )}
    </li>
  );
}

export default function Funciones() {
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [q, setQ] = useState("");
  const todas = FUNCIONES.flatMap((g) => g.funciones);
  const cuenta = { si: 0, parcial: 0, no: 0 } as Record<Cobertura, number>;
  todas.forEach((f) => cuenta[f.estado]++);
  const grupos = useMemo(() => {
    const t = q.trim().toLowerCase();
    return FUNCIONES.map((g) => ({
      ...g,
      funciones: g.funciones.filter((f) => (filtro === "todas" || f.estado === filtro) && (!t || `${f.nombre} ${f.nota ?? ""}`.toLowerCase().includes(t))),
    })).filter((g) => g.funciones.length);
  }, [filtro, q]);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 xl:grid-cols-[1fr_380px]">
        <Panel className="px-7 py-6">
          <h1 className="text-[34px] font-extrabold leading-tight tracking-tight">Qué hace hoy el prototipo</h1>
          <p className="mt-1 max-w-2xl text-[15px] text-apagado">
            Cada función de la lista para contadores, con su estado actual. Tocá las que tienen guía para ver cómo usarlas y abrirlas directo.
          </p>
          <div className="mt-6 flex h-4 gap-1 overflow-hidden rounded-full" role="img" aria-label={`${cuenta.si} cubiertas, ${cuenta.parcial} parciales, ${cuenta.no} no incluidas`}>
            {(["si", "parcial", "no"] as Cobertura[]).map((c) => (
              <span key={c} className={clsx("crece rounded-full", COB[c].barra)} style={{ flex: cuenta[c] }} />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["todas", "si", "parcial", "no"] as Filtro[]).map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                aria-pressed={filtro === f}
                className={clsx("rounded-full px-3.5 py-1.5 text-[13px] font-semibold", filtro === f ? "bg-tinta text-white" : "bg-hundido text-tinta-2 hover:bg-linea")}
              >
                {f === "todas" ? `Todas · ${todas.length}` : `${COB[f].label} · ${cuenta[f]}`}
              </button>
            ))}
            <label className="relative ml-auto min-w-[220px]">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-apagado" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar función" className="h-9 w-full rounded-full bg-hundido pl-9 pr-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-petroleo-3/40" />
            </label>
          </div>
        </Panel>

        <Panel className="bg-petroleo p-6 text-white">
          <h2 className="font-bold">Recorrido para una entrevista</h2>
          <p className="mt-1 text-xs text-white/70">Pedile al contador cada tarea sin explicarle cómo. Antes, tocá “Reiniciar datos de ejemplo”.</p>
          <ol className="mt-4 space-y-2">
            {RECORRIDO.map((r, i) => (
              <li key={r.t}>
                <Link href={r.href} className="flex gap-3 rounded-xl px-2 py-1.5 text-[13px] hover:bg-white/10">
                  <span className="num w-4 shrink-0 font-bold text-sol">{i + 1}</span>
                  {r.t}
                </Link>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <div className="grid items-start gap-3 xl:grid-cols-2">
        {grupos.map((g) => {
          const orig = FUNCIONES.find((x) => x.id === g.id)!.funciones;
          const hechas = orig.filter((f) => f.estado === "si").length;
          return (
            <Panel key={g.id} className="p-4">
              <div className="flex items-baseline justify-between px-2 pb-2">
                <h2 className="text-lg font-bold tracking-tight">{g.titulo}</h2>
                <span className="text-xs text-apagado">{hechas} de {orig.length} cubiertas</span>
              </div>
              <ul>{g.funciones.map((f) => <Item key={f.nombre} f={f} />)}</ul>
            </Panel>
          );
        })}
        {grupos.length === 0 && <Panel className="p-8 text-center text-sm text-apagado xl:col-span-2">Ninguna función coincide con la búsqueda.</Panel>}
      </div>
    </div>
  );
}

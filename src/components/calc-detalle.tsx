"use client";

import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { Linea, ResultadoEmpleado, VersionLiquidacion } from "@/lib/types";
import { fmt, fmt2, pct } from "@/lib/format";

function FilaLinea({ l }: { l: Linea }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <li className="border-t border-linea first:border-t-0">
      <button onClick={() => setAbierta(!abierta)} className="flex w-full items-center gap-3 py-2.5 text-left text-sm" aria-expanded={abierta}>
        <span className="w-9 text-xs text-apagado num">{l.codigo}</span>
        <span className="flex-1">
          {l.concepto}
          {l.cantidad !== undefined && l.codigo !== "001" && <span className="ml-1.5 text-xs text-apagado">× {l.cantidad}</span>}
          {!l.gravadoBps && l.tipo === "haber" && <span className="ml-1.5 rounded-full bg-cielo px-1.5 py-0.5 text-[10px] font-semibold text-cielo-t">no gravado BPS</span>}
        </span>
        <span className={clsx("num font-semibold", l.importe < 0 && "text-rosa-t")}>{fmt2(l.importe)}</span>
        <ChevronDown size={15} className={clsx("text-apagado transition-transform", abierta && "rotate-180")} />
      </button>
      {abierta && (
        <div className="mb-3 ml-12 rounded-2xl bg-hundido px-4 py-3 text-[13px] leading-relaxed">
          <p>{l.formula}</p>
          {(l.base !== undefined || l.tasa !== undefined) && (
            <p className="mt-1.5 text-xs text-apagado">
              {l.base !== undefined && <>Base {fmt2(l.base)} </>}
              {l.tasa !== undefined && <>· Tasa {pct(l.tasa, 3)}</>}
            </p>
          )}
          {l.parametros && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {l.parametros.map((p) => (
                <span key={p} className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-tinta-2">{p}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function Bloque({ titulo, lineas, total, nota }: { titulo: string; lineas: Linea[]; total: number; nota?: string }) {
  if (!lineas.length) return null;
  return (
    <section className="rounded-3xl border border-linea px-4 pt-3 pb-2">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-bold">{titulo}</h3>
        <span className="num text-sm font-bold">{fmt2(total)}</span>
      </div>
      {nota && <p className="text-xs text-apagado">{nota}</p>}
      <ul className="mt-1">{lineas.map((l) => <FilaLinea key={l.codigo + l.concepto} l={l} />)}</ul>
    </section>
  );
}

export function CalcDetalle({ r, version }: { r: ResultadoEmpleado; version?: VersionLiquidacion }) {
  if (r.fueraDeAlcance)
    return (
      <div className="rounded-3xl bg-rosa px-5 py-4 text-sm text-rosa-t">
        <p className="font-bold">No calculado</p>
        <p className="mt-1">{r.fueraDeAlcance}</p>
      </div>
    );
  const h = r.lineas.filter((l) => l.tipo === "haber");
  const d = r.lineas.filter((l) => l.tipo === "descuento");
  const p = r.lineas.filter((l) => l.tipo === "patronal");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          ["Nominal", r.totalHaberes],
          ["Descuentos", r.descuentos],
          ["Líquido", r.liquido],
        ].map(([k, v], i) => (
          <div key={k as string} className={clsx("rounded-2xl px-3.5 py-3", i === 2 ? "bg-petroleo text-white" : "bg-hundido")}>
            <p className={clsx("text-xs", i === 2 ? "text-white/70" : "text-apagado")}>{k}</p>
            <p className="num mt-0.5 text-lg font-extrabold tracking-tight">{fmt(v as number)}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-apagado">Tocá cualquier línea para ver cómo se calculó y qué parámetros usó.</p>
      <Bloque titulo="Haberes" lineas={h} total={r.totalHaberes} />
      <Bloque titulo="Descuentos" lineas={d} total={r.descuentos} />
      {r.irpf && r.irpf.impuestoBruto > 0 && (
        <section className="rounded-3xl bg-hundido px-4 py-3 text-[13px]">
          <h3 className="font-bold">IRPF por franjas</h3>
          <p className="text-xs text-apagado">
            Ingreso {fmt2(r.irpf.ingreso)}{r.irpf.incremento6 ? " (incluye incremento 6%)" : ""} · deducción al {pct(r.irpf.tasaDeduccion)}
          </p>
          <table className="mt-2 w-full num">
            <tbody>
              {r.irpf.franjas.filter((f) => f.impuesto > 0).map((f) => (
                <tr key={f.desde}>
                  <td className="py-0.5 text-apagado">{fmt(f.desde)} – {f.hasta ? fmt(f.hasta) : "más"}</td>
                  <td className="py-0.5">{pct(f.tasa)}</td>
                  <td className="py-0.5 text-right">{fmt2(f.impuesto)}</td>
                </tr>
              ))}
              <tr className="border-t border-linea">
                <td className="pt-1" colSpan={2}>− Deducciones</td>
                <td className="pt-1 text-right">{fmt2(-r.irpf.deducciones)}</td>
              </tr>
            </tbody>
          </table>
        </section>
      )}
      <Bloque titulo="Aportes patronales" lineas={p} total={r.aportesPatronales} nota={`Costo total para la empresa: ${fmt(r.costoEmpresa)}`} />
      {version && (
        <p className="pt-1 text-xs text-apagado">
          Versión {version.version} · {version.motor} · parámetros {version.parametros} · huella {version.hash.slice(0, 12)}
        </p>
      )}
    </div>
  );
}

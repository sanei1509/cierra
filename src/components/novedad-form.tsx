"use client";

import clsx from "clsx";
import { useState } from "react";
import type { Adjunto, Empleado, TipoNovedad } from "@/lib/types";
import { Paperclip, X } from "lucide-react";
import { TIPOS } from "@/lib/labels";
import { useStore } from "@/lib/store";
import { Boton, Campo, inputCls } from "./ui";

export function NovedadForm({
  empresaId,
  mes,
  empleados,
  origen,
  autor,
  empleadoInicial,
  tipoInicial = "hora_extra",
  tipos = Object.keys(TIPOS) as TipoNovedad[],
  onListo,
}: {
  empresaId: string;
  mes: string;
  empleados: Empleado[];
  origen: "cliente" | "estudio";
  autor: string;
  empleadoInicial?: string;
  tipoInicial?: TipoNovedad;
  tipos?: TipoNovedad[];
  onListo: () => void;
}) {
  const agregar = useStore((s) => s.agregarNovedad);
  const [empleadoId, setEmpleadoId] = useState(empleadoInicial ?? empleados[0]?.id);
  const [tipo, setTipo] = useState<TipoNovedad>(tipoInicial);
  const [valor, setValor] = useState("");
  const [nota, setNota] = useState("");
  const [adjunto, setAdjunto] = useState<Adjunto | undefined>();
  const t = TIPOS[tipo];
  const v = Number(valor.replace(/\./g, "").replace(",", "."));
  const valido = empleadoId && v > 0;

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valido) return;
        agregar({
          empresaId,
          mes,
          empleadoId: empleadoId!,
          tipo,
          ...(t.unidad === "$" ? { importe: v } : { cantidad: v }),
          nota: nota || undefined,
          adjunto,
          origen,
          autor,
        });
        onListo();
      }}
    >
      <Campo label="Persona">
        <select className={inputCls} value={empleadoId} onChange={(e) => setEmpleadoId(e.target.value)}>
          {empleados.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre} {e.apellido} · {e.cargo}
            </option>
          ))}
        </select>
      </Campo>
      <fieldset>
        <legend className="mb-1.5 text-[13px] font-semibold text-tinta-2">Qué pasó</legend>
        <div className="flex flex-wrap gap-2">
          {tipos.map((k) => (
            <button
              type="button"
              key={k}
              onClick={() => setTipo(k)}
              aria-pressed={tipo === k}
              className={clsx("rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors", tipo === k ? "bg-petroleo text-white" : "bg-hundido text-tinta-2 hover:bg-linea")}
            >
              {TIPOS[k].label}
            </button>
          ))}
        </div>
      </fieldset>
      <Campo label={t.unidad === "$" ? "Importe en pesos" : `Cantidad de ${t.unidad}`} ayuda={t.ayuda}>
        <div className="relative">
          {t.unidad === "$" && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-apagado">$</span>}
          <input autoFocus inputMode="decimal" className={clsx(inputCls, t.unidad === "$" && "pl-8")} value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0" />
        </div>
      </Campo>
      <Campo label="Comentario (opcional)">
        <input className={inputCls} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej.: comisión por ventas de septiembre" />
      </Campo>
      <div>
        <span className="mb-1.5 block text-[13px] font-semibold text-tinta-2">
          Comprobante {tipo === "certificacion" ? "(recomendado)" : "(opcional)"}
        </span>
        {adjunto ? (
          <span className="flex items-center gap-2 rounded-2xl bg-hundido px-3.5 py-2.5 text-sm">
            <Paperclip size={15} className="text-petroleo" />
            <span className="flex-1 truncate">{adjunto.nombre}</span>
            <span className="text-xs text-apagado">{Math.round(adjunto.tamano / 1024)} KB</span>
            <button type="button" onClick={() => setAdjunto(undefined)} className="rounded-full p-1 hover:bg-rosa" aria-label="Quitar adjunto"><X size={13} /></button>
          </span>
        ) : (
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-linea px-3.5 py-3 text-sm text-apagado hover:border-petroleo hover:text-petroleo">
            <Paperclip size={15} /> Adjuntar certificado, foto o PDF
            <input
              type="file"
              accept="image/*,application/pdf"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setAdjunto({ nombre: f.name, tipo: f.type, tamano: f.size });
              }}
            />
          </label>
        )}
      </div>
      <Boton type="submit" disabled={!valido} className="w-full" tam="lg">
        Agregar {t.corto.toLowerCase()}
      </Boton>
    </form>
  );
}

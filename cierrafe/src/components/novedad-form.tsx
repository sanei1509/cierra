"use client";

import clsx from "clsx";
import { useState } from "react";
import type { Adjunto, Empleado, Novedad, TipoNovedad } from "@/lib/types";
import { Paperclip, X } from "lucide-react";
import { actualizarNovedadReal, crearNovedadReal } from "@/app/(estudio)/actions";
import { TIPOS, valorNovedad } from "@/lib/labels";
import { useStore } from "@/lib/store";
import { Boton, Campo, inputCls } from "./ui";

const TIPOS_ADJUNTO_PERMITIDOS = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const MAX_ADJUNTO_BYTES = 700 * 1024;

function archivoADataUrl(archivo: File) {
  return new Promise<string>((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result));
    lector.onerror = () => reject(new Error("No pudimos leer el archivo."));
    lector.readAsDataURL(archivo);
  });
}

export function NovedadForm({
  empresaId,
  mes,
  empleados,
  origen,
  autor,
  empleadoInicial,
  tipoInicial = "hora_extra",
  tipos = Object.keys(TIPOS) as TipoNovedad[],
  novedadInicial,
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
  novedadInicial?: Novedad;
  onListo: () => void;
}) {
  const agregar = useStore((s) => s.agregarNovedad);
  const editar = useStore((s) => s.editarNovedad);
  const [empleadoId, setEmpleadoId] = useState(novedadInicial?.empleadoId ?? empleadoInicial ?? empleados[0]?.id);
  const [tipo, setTipo] = useState<TipoNovedad>(novedadInicial?.tipo ?? tipoInicial);
  const [valor, setValor] = useState(String(novedadInicial?.importe ?? novedadInicial?.cantidad ?? ""));
  const [nota, setNota] = useState(novedadInicial?.nota ?? "");
  const [adjunto, setAdjunto] = useState<Adjunto | undefined>(novedadInicial?.adjunto);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const t = TIPOS[tipo];
  const v = Number(valor.replace(/\./g, "").replace(",", "."));
  const valido = empleadoId && v > 0;
  const editando = !!novedadInicial;

  if (empleados.length === 0) {
    return (
      <div className="rounded-3xl bg-hundido px-4 py-5 text-sm text-tinta-2">
        <p className="font-semibold text-tinta">No hay personas cargadas para esta empresa.</p>
        <p className="mt-1">Primero agregá empleados en la pestaña Empleados y después vas a poder cargar novedades.</p>
      </div>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valido) return;
        setError("");
        setGuardando(true);
        const novedad = {
          empresaId,
          mes,
          empleadoId: empleadoId!,
          tipo,
          ...(t.unidad === "$" ? { importe: v } : { cantidad: v }),
          nota: nota || undefined,
          adjunto,
          origen,
          autor,
        };
        try {
          const antes = novedadInicial ? `${TIPOS[novedadInicial.tipo].corto} ${valorNovedad(novedadInicial)}` : undefined;
          const despues = `${TIPOS[tipo].corto} ${t.unidad === "$" ? `$ ${v}` : v}`;
          const res = editando
            ? await actualizarNovedadReal({ ...novedad, id: novedadInicial.id, antes, despues })
            : await crearNovedadReal(novedad);
          if (!res.ok) {
            setError(res.mensaje);
            return;
          }
          if (editando) {
            editar(novedadInicial.id, novedad, autor);
          } else {
            agregar({ ...novedad, id: res.id });
          }
          onListo();
        } catch (error) {
          setError(error instanceof Error ? error.message : "No pudimos guardar la novedad.");
        } finally {
          setGuardando(false);
        }
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
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setError("");
                if (!TIPOS_ADJUNTO_PERMITIDOS.has(f.type)) {
                  setError("Adjuntá PDF, JPG, PNG o WEBP.");
                  e.target.value = "";
                  return;
                }
                if (f.size > MAX_ADJUNTO_BYTES) {
                  setError("El comprobante puede pesar hasta 700 KB en esta versión.");
                  e.target.value = "";
                  return;
                }
                try {
                  setAdjunto({ nombre: f.name, tipo: f.type, tamano: f.size, dataUrl: await archivoADataUrl(f) });
                } catch (error) {
                  setError(error instanceof Error ? error.message : "No pudimos adjuntar el archivo.");
                }
              }}
            />
          </label>
        )}
      </div>
      {error && <p className="rounded-2xl bg-rosa px-3 py-2 text-sm text-rosa-t">{error}</p>}
      <Boton type="submit" disabled={!valido || guardando} className="w-full" tam="lg">
        {guardando ? "Guardando..." : editando ? "Guardar cambios" : `Agregar ${t.corto.toLowerCase()}`}
      </Boton>
    </form>
  );
}

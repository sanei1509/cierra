"use client";

import clsx from "clsx";
import { useState } from "react";
import type { Adjunto, Empleado, Modalidad, Novedad, TipoNovedad } from "@/lib/types";
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

function numeroDecimal(valor: string) {
  return Number(valor.replace(/\./g, "").replace(",", "."));
}

const SIN_VALOR_GENERICO = new Set<TipoNovedad>(["egreso", "ingreso_mes"]);

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
  const actualizarEmpleado = useStore((s) => s.actualizarEmpleado);
  const [empleadoId, setEmpleadoId] = useState(novedadInicial?.empleadoId ?? empleadoInicial ?? empleados[0]?.id);
  const [tipo, setTipo] = useState<TipoNovedad>(novedadInicial?.tipo ?? tipoInicial);
  const [valor, setValor] = useState(String(novedadInicial?.importe ?? novedadInicial?.cantidad ?? ""));
  const [nota, setNota] = useState(novedadInicial?.nota ?? "");
  const [adjunto, setAdjunto] = useState<Adjunto | undefined>(novedadInicial?.adjunto);
  const [ausenciaDescuenta, setAusenciaDescuenta] = useState(Boolean(novedadInicial?.datos?.ausenciaDescuenta));
  const [nuevaCategoria, setNuevaCategoria] = useState(novedadInicial?.datos?.nuevaCategoria ?? "");
  const [egresoFecha, setEgresoFecha] = useState(novedadInicial?.datos?.egresoFecha ?? "");
  const [egresoCausal, setEgresoCausal] = useState(novedadInicial?.datos?.egresoCausal ?? "");
  const [egresoLicenciaDias, setEgresoLicenciaDias] = useState(String(novedadInicial?.datos?.egresoLicenciaNoGozadaDias ?? ""));
  const [egresoPagaSalarioVacacional, setEgresoPagaSalarioVacacional] = useState(Boolean(novedadInicial?.datos?.egresoPagaSalarioVacacional));
  const [egresoPagaAguinaldo, setEgresoPagaAguinaldo] = useState(Boolean(novedadInicial?.datos?.egresoPagaAguinaldo));
  const [egresoObservaciones, setEgresoObservaciones] = useState(novedadInicial?.datos?.egresoObservaciones ?? "");
  const empleadoActual = empleados.find((e) => e.id === empleadoId);
  const [ingresoFecha, setIngresoFecha] = useState(novedadInicial?.datos?.ingresoFecha ?? empleadoActual?.ingreso ?? `${mes}-01`);
  const [ingresoSueldo, setIngresoSueldo] = useState(String(novedadInicial?.datos?.ingresoSueldoInicial ?? empleadoActual?.sueldos.at(-1)?.monto ?? ""));
  const [ingresoCategoria, setIngresoCategoria] = useState(novedadInicial?.datos?.ingresoCategoria ?? empleadoActual?.categoria ?? "");
  const [ingresoModalidad, setIngresoModalidad] = useState<Modalidad>(novedadInicial?.datos?.ingresoModalidad ?? empleadoActual?.modalidad ?? "mensual");
  const [ingresoHorario, setIngresoHorario] = useState(novedadInicial?.datos?.ingresoHorario ?? "");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const t = TIPOS[tipo];
  const v = numeroDecimal(valor);
  const ingresoSueldoValor = numeroDecimal(ingresoSueldo);
  const requiereValor = !SIN_VALOR_GENERICO.has(tipo);
  const egresoValido = tipo !== "egreso" || /^\d{4}-\d{2}-\d{2}$/.test(egresoFecha);
  const ingresoValido =
    tipo !== "ingreso_mes" ||
    (/^\d{4}-\d{2}-\d{2}$/.test(ingresoFecha) && ingresoCategoria.trim().length > 0 && ingresoSueldoValor > 0 && ["mensual", "jornalero"].includes(ingresoModalidad));
  const valido = Boolean(empleadoId && egresoValido && ingresoValido && (!requiereValor || v > 0));
  const editando = !!novedadInicial;
  const seleccionarEmpleado = (id: string) => {
    setEmpleadoId(id);
    if (editando) return;
    const empleado = empleados.find((e) => e.id === id);
    setIngresoFecha(empleado?.ingreso ?? `${mes}-01`);
    setIngresoSueldo(String(empleado?.sueldos.at(-1)?.monto ?? ""));
    setIngresoCategoria(empleado?.categoria ?? "");
    setIngresoModalidad(empleado?.modalidad ?? "mensual");
  };

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
        const licenciaDias = Number(egresoLicenciaDias.replace(/\D/g, ""));
        const datos = {
          ...(tipo === "ausencia_justificada" ? { ausenciaDescuenta } : {}),
          ...(tipo === "cambio_categoria" ? { nuevaCategoria: nuevaCategoria.trim() || undefined, nuevoSueldo: v, aplicaDesde: `${mes}-01` } : {}),
          ...(tipo === "ingreso_mes"
            ? {
                ingresoFecha,
                ingresoSueldoInicial: ingresoSueldoValor,
                ingresoCategoria: ingresoCategoria.trim(),
                ingresoModalidad,
                ingresoHorario: ingresoHorario.trim() || undefined,
              }
            : {}),
          ...(tipo === "egreso"
            ? {
                egresoFecha,
                egresoCausal: egresoCausal.trim() || undefined,
                egresoLicenciaNoGozadaDias: licenciaDias > 0 ? licenciaDias : undefined,
                egresoPagaSalarioVacacional,
                egresoPagaAguinaldo,
                egresoObservaciones: egresoObservaciones.trim() || undefined,
              }
            : {}),
        };
        const novedad = {
          empresaId,
          mes,
          empleadoId: empleadoId!,
          tipo,
          ...(SIN_VALOR_GENERICO.has(tipo) ? {} : t.unidad === "$" ? { importe: v } : { cantidad: v }),
          nota: nota || undefined,
          adjunto,
          datos: Object.keys(datos).length ? datos : undefined,
          origen,
          autor,
        };
        try {
          const antes = novedadInicial ? `${TIPOS[novedadInicial.tipo].corto} ${valorNovedad(novedadInicial)}` : undefined;
          const despues = tipo === "egreso" ? `${TIPOS[tipo].corto} ${egresoFecha}` : `${TIPOS[tipo].corto} ${t.unidad === "$" ? `$ ${v}` : v}`;
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
          if (tipo === "egreso" && origen === "estudio") {
            const empleado = empleados.find((e) => e.id === empleadoId);
            actualizarEmpleado(empleadoId!, { egreso: egresoFecha }, `egreso ${empleado?.egreso ?? "sin fecha"} → ${egresoFecha}`);
          }
          if (tipo === "ingreso_mes" && origen === "estudio") {
            const empleado = empleados.find((e) => e.id === empleadoId);
            const sueldos = [...(empleado?.sueldos ?? []).filter((sueldo) => sueldo.desde !== ingresoFecha), { desde: ingresoFecha, monto: ingresoSueldoValor }].sort((a, b) => a.desde.localeCompare(b.desde));
            actualizarEmpleado(
              empleadoId!,
              { ingreso: ingresoFecha, categoria: ingresoCategoria.trim(), modalidad: ingresoModalidad, sueldos },
              `ingreso ${empleado?.ingreso ?? "sin fecha"} → ${ingresoFecha}`,
            );
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
        <select className={inputCls} value={empleadoId} onChange={(e) => seleccionarEmpleado(e.target.value)}>
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
      {!SIN_VALOR_GENERICO.has(tipo) && (
        <Campo label={t.unidad === "$" ? "Importe en pesos" : `Cantidad de ${t.unidad}`} ayuda={t.ayuda}>
          <div className="relative">
            {t.unidad === "$" && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-apagado">$</span>}
            <input autoFocus inputMode="decimal" className={clsx(inputCls, t.unidad === "$" && "pl-8")} value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0" />
          </div>
        </Campo>
      )}
      {tipo === "ausencia_justificada" && (
        <label className="flex items-center gap-2 rounded-2xl bg-hundido px-3.5 py-3 text-sm">
          <input type="checkbox" checked={ausenciaDescuenta} onChange={(e) => setAusenciaDescuenta(e.target.checked)} className="size-4 accent-petroleo" />
          Descuenta jornal aunque esté justificada
        </label>
      )}
      {tipo === "cambio_categoria" && (
        <Campo label="Nueva categoría (opcional)" ayuda="El importe de arriba se toma como nuevo sueldo base desde este mes">
          <input className={inputCls} value={nuevaCategoria} onChange={(e) => setNuevaCategoria(e.target.value)} placeholder="Ej.: Encargado" />
        </Campo>
      )}
      {tipo === "egreso" && (
        <section className="space-y-3 rounded-2xl bg-hundido px-3.5 py-3">
          <Campo label="Fecha exacta de egreso">
            <input type="date" className={inputCls} value={egresoFecha} onChange={(e) => setEgresoFecha(e.target.value)} />
          </Campo>
          <Campo label="Causal">
            <select className={inputCls} value={egresoCausal} onChange={(e) => setEgresoCausal(e.target.value)}>
              <option value="">Seleccionar causal</option>
              <option value="renuncia">Renuncia</option>
              <option value="despido">Despido</option>
              <option value="fin_contrato">Fin de contrato</option>
              <option value="mutuo_acuerdo">Mutuo acuerdo</option>
              <option value="jubilacion">Jubilación</option>
              <option value="otro">Otro</option>
            </select>
          </Campo>
          <Campo label="Licencia no gozada" ayuda="Días a liquidar si corresponde">
            <input className={inputCls} inputMode="numeric" value={egresoLicenciaDias} onChange={(e) => setEgresoLicenciaDias(e.target.value.replace(/\D/g, ""))} placeholder="0" />
          </Campo>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={egresoPagaSalarioVacacional} onChange={(e) => setEgresoPagaSalarioVacacional(e.target.checked)} className="size-4 accent-petroleo" />
            Corresponde salario vacacional
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={egresoPagaAguinaldo} onChange={(e) => setEgresoPagaAguinaldo(e.target.checked)} className="size-4 accent-petroleo" />
            Corresponde aguinaldo de egreso
          </label>
          <Campo label="Observaciones de egreso">
            <textarea className={clsx(inputCls, "min-h-20 resize-y py-3")} value={egresoObservaciones} onChange={(e) => setEgresoObservaciones(e.target.value)} placeholder="Ej.: baja confirmada por la empresa, revisar liquidación final" />
          </Campo>
        </section>
      )}
      {tipo === "ingreso_mes" && (
        <section className="space-y-3 rounded-2xl bg-hundido px-3.5 py-3">
          <Campo label="Fecha real de ingreso">
            <input type="date" className={inputCls} value={ingresoFecha} onChange={(e) => setIngresoFecha(e.target.value)} />
          </Campo>
          <Campo label="Sueldo inicial">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-apagado">$</span>
              <input className={clsx(inputCls, "pl-8")} inputMode="decimal" value={ingresoSueldo} onChange={(e) => setIngresoSueldo(e.target.value.replace(/[^\d,.]/g, ""))} placeholder="0" />
            </div>
          </Campo>
          <Campo label="Categoría">
            <input className={inputCls} value={ingresoCategoria} onChange={(e) => setIngresoCategoria(e.target.value)} placeholder="Ej.: Mecánico" />
          </Campo>
          <Campo label="Modalidad">
            <select className={inputCls} value={ingresoModalidad} onChange={(e) => setIngresoModalidad(e.target.value as Modalidad)}>
              <option value="mensual">Mensual</option>
              <option value="jornalero">Jornalero</option>
            </select>
          </Campo>
          <Campo label="Horario">
            <input className={inputCls} value={ingresoHorario} onChange={(e) => setIngresoHorario(e.target.value)} placeholder="Ej.: lunes a viernes 9 a 18" />
          </Campo>
        </section>
      )}
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

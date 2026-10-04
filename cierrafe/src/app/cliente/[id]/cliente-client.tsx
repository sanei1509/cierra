"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { AlertOctagon, AlertTriangle, ArrowLeft, Check, CheckCircle2, ImagePlus, Paperclip, Plus, Search, Undo2, UserPlus, X } from "lucide-react";
import { actualizarLogoEmpresaClienteReal, borrarNovedadReal, crearEmpleadoClienteReal, enviarNovedadesClienteReal, responderAprobacionReal } from "@/app/(estudio)/actions";
import { NovedadForm } from "@/components/novedad-form";
import { Logo } from "@/components/shell";
import { Avatar, Boton, Campo, Drawer, MarcaEmpresa, Panel, ResultadoAccion, imagenADataUrl, inputCls } from "@/components/ui";
import { activoEn, calcularEmpresa, totales } from "@/lib/engine";
import { fecha, fmt, mesAnterior, MES_ACTUAL, nombreMes, pct } from "@/lib/format";
import { horarioDefault } from "@/lib/horarios";
import { TIPOS, valorNovedad } from "@/lib/labels";
import { ESTUDIO } from "@/lib/seed";
import { useStore, vistaPeriodo } from "@/lib/store";
import { controlarFichaEmpleado, type ControlFichaEmpleado } from "@/lib/validations";
import type { DatosOperativosIniciales } from "@/lib/backend-operativo";
import type { AuditEvent, Empleado, Empresa, Novedad, Periodo, TipoNovedad } from "@/lib/types";

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

const ORDEN_ETAPA: Record<Periodo["etapa"], number> = {
  novedades: 0,
  recibidas: 1,
  borrador: 2,
  enviada: 3,
  devuelta: 4,
  aprobada: 5,
  cerrada: 6,
};

type FiltroPersonasNovedades = "todos" | "con" | "sin";

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function periodoMasNuevo(real: Periodo, local?: Periodo) {
  if (!local) return real;
  if (local.versiones.length > real.versiones.length) return local;
  if (local.versiones.length === real.versiones.length && ORDEN_ETAPA[local.etapa] > ORDEN_ETAPA[real.etapa]) return local;
  return real;
}

function combinarDatosCliente(real: DatosOperativosIniciales, local: {
  empresas: Empresa[];
  empleados: Empleado[];
  periodos: Periodo[];
  novedades: Novedad[];
  audit: AuditEvent[];
  vistas: Record<string, string>;
}): DatosOperativosIniciales {
  if (real.modo !== "real") return real;
  const empresasReales = new Set(real.empresas.map((empresa) => empresa.id));
  const empleadosReales = new Set(real.empleados.map((empleado) => empleado.id));
  const periodosReales = new Map(real.periodos.map((periodo) => [periodo.id, periodo]));
  const novedadesReales = new Set(real.novedades.map((novedad) => novedad.id));
  const auditReal = new Set(real.audit.map((evento) => evento.id));

  return {
    ...real,
    empleados: [
      ...real.empleados,
      ...local.empleados.filter((empleado) => empresasReales.has(empleado.empresaId) && !empleadosReales.has(empleado.id)),
    ],
    periodos: [
      ...real.periodos.map((periodo) => periodoMasNuevo(periodo, local.periodos.find((p) => p.id === periodo.id))),
      ...local.periodos.filter((periodo) => empresasReales.has(periodo.empresaId) && !periodosReales.has(periodo.id)),
    ],
    novedades: [
      ...real.novedades,
      ...local.novedades.filter((novedad) => empresasReales.has(novedad.empresaId) && !novedadesReales.has(novedad.id)),
    ],
    audit: [
      ...real.audit,
      ...local.audit.filter((evento) => !!evento.empresaId && empresasReales.has(evento.empresaId) && !auditReal.has(evento.id)),
    ],
    vistas: { ...real.vistas, ...local.vistas },
  };
}

function auditId() {
  return `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function datosEmpleadoDesdeForm(formData: FormData) {
  return {
    nombre: String(formData.get("nombre") ?? "").trim(),
    apellido: String(formData.get("apellido") ?? "").trim(),
    ci: String(formData.get("ci") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    cargo: String(formData.get("cargo") ?? "").trim(),
    categoria: String(formData.get("categoria") ?? "").trim(),
    area: String(formData.get("area") ?? "").trim(),
    tipoContrato: String(formData.get("tipoContrato") ?? "").trim(),
    ingreso: String(formData.get("ingreso") ?? "").trim(),
    sueldo: Number(formData.get("sueldo") ?? 0),
    hijos: Number(formData.get("hijos") ?? 0) || 0,
    telefono: String(formData.get("telefono") ?? "").trim(),
    cuenta: String(formData.get("cuenta") ?? "").trim(),
    direccion: String(formData.get("direccion") ?? "").trim(),
  };
}

export default function ClienteClient({ id, datosIniciales }: { id: string; datosIniciales: DatosOperativosIniciales }) {
  const router = useRouter();
  const store = useStore();
  const datos = datosIniciales.modo === "real" ? combinarDatosCliente(datosIniciales, store) : store;
  const empresaExiste = datos.empresas.some((e) => e.id === id);
  const v = useMemo(() => empresaExiste ? vistaPeriodo(id, MES_ACTUAL, datos) : null, [datos, empresaExiste, id]);
  const empleados = useMemo(() => datos.empleados.filter((e) => e.empresaId === id && activoEn(e, MES_ACTUAL)), [datos.empleados, id]);
  const [form, setForm] = useState<{ emp: string; tipo: TipoNovedad } | null>(null);
  const [comentario, setComentario] = useState("");
  const [devolviendo, setDevolviendo] = useState(false);
  const [eliminando, setEliminando] = useState("");
  const [respondiendo, setRespondiendo] = useState<"aprobar" | "devolver" | "">("");
  const [error, setError] = useState("");
  const [busquedaPersona, setBusquedaPersona] = useState("");
  const [filtroPersonas, setFiltroPersonas] = useState<FiltroPersonasNovedades>("todos");
  const [tipoRapidoPorEmpleado, setTipoRapidoPorEmpleado] = useState<Record<string, TipoNovedad>>({});
  const [nuevoEmpleado, setNuevoEmpleado] = useState(false);
  const [errorEmpleado, setErrorEmpleado] = useState("");
  const [controlEmpleado, setControlEmpleado] = useState<ControlFichaEmpleado>({ bloqueos: [], advertencias: [] });
  const [creandoEmpleado, startCrearEmpleado] = useTransition();
  const esReal = datosIniciales.modo === "real";

  useEffect(() => {
    if (v && !esReal) store.abrirSolicitud(v.periodo.id, `${v.empresa.contacto.nombre} (cliente)`);
  }, [esReal, store, v]);

  if (!v) return <p className="p-10 text-center">Este enlace no es válido.</p>;

  const autor = v.empresa.contacto.nombre;
  const p = v.periodo;
  const mesNombre = nombreMes(p.mes).split(" ")[0].toLowerCase();
  const prev = calcularEmpresa(v.empresa, datos.empleados, mesAnterior(p.mes), datos.novedades);
  const novedadesPorEmpleado = (() => {
    const mapa = new Map<string, Novedad[]>();
    for (const n of v.novedadesMes) {
      const lista = mapa.get(n.empleadoId) ?? [];
      lista.push(n);
      mapa.set(n.empleadoId, lista);
    }
    return mapa;
  })();
  const empleadosFiltrados = (() => {
    const q = normalizar(busquedaPersona);
    return empleados.filter((empleado) => {
      const ns = novedadesPorEmpleado.get(empleado.id) ?? [];
      const texto = normalizar(`${empleado.nombre} ${empleado.apellido} ${empleado.cargo}`);
      const coincideTexto = !q || texto.includes(q);
      const coincideFiltro = filtroPersonas === "todos" || (filtroPersonas === "con" ? ns.length > 0 : ns.length === 0);
      return coincideTexto && coincideFiltro;
    });
  })();

  const aplicarAprobacionLocal = (aprobada: boolean, comentarioAprobacion: string) => {
    const ahora = new Date().toISOString();
    const version = p.aprobacion?.version ?? p.versiones.at(-1)?.version ?? 1;
    const periodoActualizado: Periodo = {
      ...p,
      etapa: aprobada ? "aprobada" : "devuelta",
      aprobacion: {
        version,
        estado: aprobada ? "aprobada" : "devuelta",
        enviada: p.aprobacion?.enviada ?? ahora,
        comentario: comentarioAprobacion || undefined,
        por: autor,
        fecha: ahora,
      },
    };

    useStore.setState((actual) => ({
      periodos: actual.periodos.some((periodo) => periodo.id === p.id)
        ? actual.periodos.map((periodo) => (periodo.id === p.id ? periodoActualizado : periodo))
        : [...actual.periodos, periodoActualizado],
      empresas: actual.empresas.some((empresa) => empresa.id === v.empresa.id) ? actual.empresas : [...actual.empresas, v.empresa],
      empleados: [
        ...actual.empleados,
        ...empleados.filter((empleado) => !actual.empleados.some((existente) => existente.id === empleado.id)),
      ],
      audit: [
        {
          id: auditId(),
          fecha: ahora,
          actor: `${autor} (cliente)`,
          empresaId: p.empresaId,
          entidad: "Aprobación",
          accion: aprobada ? `Aprobó la versión ${version}` : `Devolvió la versión ${version}`,
          detalle: comentarioAprobacion || undefined,
        },
        ...actual.audit,
      ],
    }));
  };

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
    setRespondiendo(aprobada ? "aprobar" : "devolver");
    try {
      if (esReal) {
        const res = await responderAprobacionReal({ periodoId: p.id, empresaId: id, actor: autor, aprobada, comentario: comentarioAprobacion });
        if (!res.ok) {
          setError(res.mensaje);
          return;
        }
        if (res.modo === "real") router.refresh();
        else aplicarAprobacionLocal(aprobada, comentarioAprobacion);
        return;
      }
      aplicarAprobacionLocal(aprobada, comentarioAprobacion);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos responder la aprobación.");
    } finally {
      setRespondiendo("");
    }
  };
  const cambiarLogo = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    try {
      const logo = await imagenADataUrl(file);
      if (esReal) {
        const res = await actualizarLogoEmpresaClienteReal({ empresaId: id, logo, actor: autor });
        if (!res.ok) {
          setError(res.mensaje);
          return;
        }
        router.refresh();
        return;
      }
      store.actualizarEmpresa(id, { logo }, "Actualizó el logo desde el portal del cliente");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos actualizar el logo.");
    }
  };

  const crearEmpleado = (formData: FormData) => {
    setErrorEmpleado("");
    const datosEmpleado = datosEmpleadoDesdeForm(formData);
    const control = controlarFichaEmpleado(datosEmpleado);
    setControlEmpleado(control);
    if (control.bloqueos.length) {
      setErrorEmpleado("Hay datos obligatorios para corregir antes de crear el trabajador.");
      return;
    }

    const empleado: Empleado = {
      id: `${id}-manual-${Date.now().toString(36)}`,
      empresaId: id,
      nombre: datosEmpleado.nombre,
      apellido: datosEmpleado.apellido,
      ci: datosEmpleado.ci,
      email: datosEmpleado.email,
      cargo: datosEmpleado.cargo,
      categoria: datosEmpleado.categoria,
      area: datosEmpleado.area || undefined,
      tipoContrato: datosEmpleado.tipoContrato || undefined,
      modalidad: "mensual",
      ingreso: datosEmpleado.ingreso,
      telefono: datosEmpleado.telefono || undefined,
      cuenta: datosEmpleado.cuenta || undefined,
      direccion: datosEmpleado.direccion || undefined,
      horario: horarioDefault(datosEmpleado.ingreso),
      sueldos: [{ desde: datosEmpleado.ingreso, monto: datosEmpleado.sueldo, categoria: datosEmpleado.categoria }],
      hijos: datosEmpleado.hijos,
      conyugeFonasa: false,
    };
    const registrarAltaParaRevision = (empleadoCreado: Empleado) => {
      const ahora = new Date().toISOString();
      useStore.setState((actual) => ({
        audit: [
          {
            id: auditId(),
            fecha: ahora,
            actor: `${autor} (cliente)`,
            empresaId: id,
            entidad: "Empleado",
            entidadId: empleadoCreado.id,
            accion: `Empleado nuevo para revisar: ${empleadoCreado.nombre} ${empleadoCreado.apellido}`,
            detalle: control.advertencias.length
              ? `Alta cargada por la empresa. Advertencias: ${control.advertencias.join(" ")}`
              : "Alta cargada por la empresa. Revisar ficha, contrato, categoría, sueldo, cuenta y acceso.",
          },
          ...actual.audit,
        ],
      }));
    };

    startCrearEmpleado(async () => {
      try {
        if (esReal) {
          const res = await crearEmpleadoClienteReal({
            empresaId: id,
            nombre: datosEmpleado.nombre,
            apellido: datosEmpleado.apellido,
            ci: datosEmpleado.ci,
            email: datosEmpleado.email,
            cargo: datosEmpleado.cargo,
            categoria: datosEmpleado.categoria,
            ingreso: datosEmpleado.ingreso,
            modalidad: "mensual",
            sueldo: datosEmpleado.sueldo,
            hijos: datosEmpleado.hijos,
            telefono: datosEmpleado.telefono || undefined,
            area: datosEmpleado.area || undefined,
            tipoContrato: datosEmpleado.tipoContrato || undefined,
            direccion: datosEmpleado.direccion || undefined,
            cuenta: datosEmpleado.cuenta || undefined,
            horario: empleado.horario,
            actor: autor,
          });
          if (!res.ok) {
            setErrorEmpleado(res.mensaje);
            return;
          }
          if (res.modo === "real") {
            setNuevoEmpleado(false);
            router.refresh();
            return;
          }
          const empleadoCreado = { ...empleado, id: res.id ?? empleado.id };
          store.agregarEmpleado(empleadoCreado, { nombre: `${datosEmpleado.nombre} ${datosEmpleado.apellido}`, email: datosEmpleado.email });
          registrarAltaParaRevision(empleadoCreado);
        } else {
          store.agregarEmpleado(empleado, { nombre: `${datosEmpleado.nombre} ${datosEmpleado.apellido}`, email: datosEmpleado.email });
          registrarAltaParaRevision(empleado);
        }
        setNuevoEmpleado(false);
        setControlEmpleado({ bloqueos: [], advertencias: [] });
        setBusquedaPersona("");
        setFiltroPersonas("todos");
      } catch (err) {
        setErrorEmpleado(err instanceof Error ? err.message : "No pudimos crear el trabajador.");
      }
    });
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
        <Panel className="p-4">
          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
            <label className="relative block">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-apagado" />
              <input
                className={clsx(inputCls, "pl-9")}
                value={busquedaPersona}
                onChange={(e) => setBusquedaPersona(e.target.value)}
                placeholder="Buscar persona o cargo"
              />
            </label>
            <select className={clsx(inputCls, "sm:w-52")} value={filtroPersonas} onChange={(e) => setFiltroPersonas(e.target.value as FiltroPersonasNovedades)} aria-label="Filtrar personas">
              <option value="todos">Todas ({empleados.length})</option>
              <option value="con">Con novedades ({v.novedadesMes.length ? new Set(v.novedadesMes.map((n) => n.empleadoId)).size : 0})</option>
              <option value="sin">Sin novedades ({empleados.length - new Set(v.novedadesMes.map((n) => n.empleadoId)).size})</option>
            </select>
            <Boton variante="secundario" className="whitespace-nowrap" onClick={() => { setErrorEmpleado(""); setControlEmpleado({ bloqueos: [], advertencias: [] }); setNuevoEmpleado(true); }}>
              <UserPlus size={16} /> Agregar trabajador
            </Boton>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-apagado">
            <span>{empleadosFiltrados.length} de {empleados.length} personas</span>
            <span>·</span>
            <span>{v.novedadesMes.length} novedades cargadas</span>
            <span>·</span>
            <span>El alta crea acceso al portal de recibos.</span>
          </div>
        </Panel>
        <ul className="divide-y divide-linea overflow-hidden rounded-[var(--radius-panel)] border border-linea bg-superficie">
          {empleadosFiltrados.map((e) => {
            const ns = novedadesPorEmpleado.get(e.id) ?? [];
            const tipoSeleccionado = tipoRapidoPorEmpleado[e.id] ?? "hora_extra";
            return (
              <li key={e.id} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_minmax(18rem,auto)] md:items-center">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar nombre={`${e.nombre} ${e.apellido}`} tono={v.empresa.tono} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{e.nombre} {e.apellido}</span>
                      <span className="block text-xs text-apagado">{e.cargo}</span>
                    </span>
                    {ns.length > 0 && <span className="rounded-full bg-menta px-2.5 py-1 text-xs font-semibold text-menta-t">{ns.length}</span>}
                  </div>
                  {ns.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {ns.map((n) => (
                        <li key={n.id} className="inline-flex items-center gap-1.5 rounded-full bg-hundido py-1 pl-3 pr-1 text-[13px]">
                          <b>{TIPOS[n.tipo].corto}</b> {valorNovedad(n)}
                          {n.adjunto && <Paperclip size={12} className="text-petroleo" aria-label="Con adjunto" />}
                          <button disabled={eliminando === n.id} onClick={() => void quitar(n)} className="rounded-full p-1 text-apagado hover:bg-rosa hover:text-rosa-t disabled:opacity-50" aria-label="Quitar"><X size={12} /></button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <select
                    className={clsx(inputCls, "h-10")}
                    value={tipoSeleccionado}
                    onChange={(event) => setTipoRapidoPorEmpleado((actual) => ({ ...actual, [e.id]: event.target.value as TipoNovedad }))}
                    aria-label={`Tipo de novedad para ${e.nombre} ${e.apellido}`}
                  >
                    {RAPIDOS.map((t) => (
                      <option key={t} value={t}>{TIPOS[t].corto}</option>
                    ))}
                  </select>
                  <Boton tam="sm" variante="secundario" className="justify-center" onClick={() => setForm({ emp: e.id, tipo: tipoSeleccionado })}>
                    <Plus size={14} /> Agregar
                  </Boton>
                </div>
              </li>
            );
          })}
          {empleadosFiltrados.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-apagado">No hay personas con esos filtros.</li>
          )}
        </ul>
        <div className="sticky bottom-4 z-20 flex flex-col gap-2 rounded-[var(--radius-panel)] bg-[var(--cierra-navy)] p-3 shadow-xl sm:flex-row">
          <Boton tam="lg" className="min-w-0 flex-1 !bg-sol !text-[#102247] hover:!bg-[#FFE9AD]" disabled={!v.novedadesMes.length} onClick={() => void enviar(false)}>
            <Check size={17} /> Enviar {v.novedadesMes.length || ""} {v.novedadesMes.length === 1 ? "novedad" : "novedades"}
          </Boton>
          <Boton tam="lg" variante="claro" className="min-w-0 flex-1 !bg-white/10 !text-white hover:!bg-white/20" onClick={() => void enviar(true)} disabled={v.novedadesMes.length > 0}>
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
        <Panel className="p-5">
          <h2 className="text-lg font-bold tracking-tight">Detalle por persona</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="text-left text-xs text-apagado">
                  <th className="pb-2 font-semibold">Persona</th>
                  <th className="px-3 pb-2 text-center font-semibold">Nominal</th>
                  <th className="px-3 pb-2 text-center font-semibold">Descuentos</th>
                  <th className="px-3 pb-2 text-center font-semibold">Líquido</th>
                  <th className="px-3 pb-2 text-center font-semibold">vs. mes anterior</th>
                </tr>
              </thead>
              <tbody>
                {v.resultados.map((r) => {
                  const empleado = empleados.find((e) => e.id === r.empleadoId) ?? datos.empleados.find((e) => e.id === r.empleadoId);
                  const anterior = prev.find((x) => x.empleadoId === r.empleadoId);
                  const delta = anterior?.liquido ? (r.liquido - anterior.liquido) / anterior.liquido : null;
                  return (
                    <tr key={r.empleadoId} className="border-t border-linea">
                      <td className="py-3 pr-3">
                        <span className="block font-semibold">{empleado ? `${empleado.nombre} ${empleado.apellido}` : "Persona"}</span>
                        {empleado && <span className="block text-xs text-apagado">{empleado.cargo}</span>}
                      </td>
                      {r.fueraDeAlcance ? (
                        <td colSpan={4} className="px-3 py-3 text-center text-xs text-rosa-t">Fuera de alcance · no calculado</td>
                      ) : (
                        <>
                          <td className="num px-3 py-3 text-center">{fmt(r.totalHaberes)}</td>
                          <td className="num px-3 py-3 text-center text-tinta-2">{fmt(r.descuentos)}</td>
                          <td className="num px-3 py-3 text-center font-bold">{fmt(r.liquido)}</td>
                          <td className="px-3 py-3 text-center text-xs text-apagado">
                            {delta === null || Math.abs(delta) < 0.005 ? "sin cambio" : `${delta > 0 ? "+" : ""}${pct(delta)}`}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
        {devolviendo ? (
          <Panel className="p-5">
            <label className="block text-sm font-semibold" htmlFor="obs">¿Qué hay que corregir?</label>
            <textarea id="obs" autoFocus className={clsx(inputCls, "mt-2 h-28 py-3")} value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Ej.: a Florencia le corresponden 4 horas extra más" />
            {error && <p className="mt-3 rounded-2xl bg-rosa px-4 py-3 text-sm text-rosa-t">{error}</p>}
            <div className="mt-3 flex gap-2">
              <Boton variante="fantasma" disabled={!!respondiendo} onClick={() => setDevolviendo(false)}>Cancelar</Boton>
              <Boton disabled={comentario.trim().length < 5 || respondiendo === "devolver"} onClick={() => void responderAprobacion(false, comentario.trim())}>
                <Undo2 size={15} /> {respondiendo === "devolver" ? "Devolviendo..." : "Devolver al estudio"}
              </Boton>
            </div>
          </Panel>
        ) : (
          <div className="sticky bottom-4 z-20 flex flex-col gap-2 rounded-[var(--radius-panel)] bg-[var(--cierra-navy)] p-3 shadow-xl sm:flex-row">
            {error && <p className="rounded-2xl bg-rosa px-4 py-3 text-sm text-rosa-t sm:basis-full">{error}</p>}
            <Boton tam="lg" className="min-w-0 flex-1 !bg-sol !text-[#102247] hover:!bg-[#FFE9AD]" disabled={respondiendo === "aprobar"} onClick={() => void responderAprobacion(true)}>
              <Check size={17} /> {respondiendo === "aprobar" ? "Aprobando..." : "Aprobar sueldos"}
            </Boton>
            <Boton tam="lg" variante="claro" className="min-w-0 flex-1 !bg-white/10 !text-white hover:!bg-white/20" disabled={!!respondiendo} onClick={() => setDevolviendo(true)}>
              Devolver con un comentario
            </Boton>
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
    <div className="mx-auto max-w-2xl space-y-3 px-3 pb-32 pt-6 sm:pt-8">
      <div className="flex items-center gap-3 px-2 py-3">
        <label className="group relative cursor-pointer" title="Cambiar logo de la empresa">
          <MarcaEmpresa empresa={v.empresa} size={40} />
          <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-petroleo text-white ring-2 ring-superficie transition-transform group-hover:scale-110">
            <ImagePlus size={11} />
          </span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Subir logo de la empresa"
            onChange={(e) => void cambiarLogo(e.target.files?.[0])}
          />
        </label>
        <div className="flex-1 leading-tight">
          <p className="font-bold">{v.empresa.nombre}</p>
          <p className="text-xs text-apagado">Hola, {autor.split(" ").slice(-2, -1)[0] ?? autor} · {nombreMes(p.mes)}</p>
        </div>
        <Logo />
      </div>
      {cuerpo}
      <Drawer abierto={nuevoEmpleado} onCerrar={() => setNuevoEmpleado(false)} titulo="Agregar trabajador" subtitulo="Crea la ficha y el acceso a recibos">
        <form
          action={crearEmpleado}
          className="space-y-4"
          onChange={(event) => setControlEmpleado(controlarFichaEmpleado(datosEmpleadoDesdeForm(new FormData(event.currentTarget))))}
        >
          <p className="rounded-2xl bg-hundido px-4 py-3 text-sm text-tinta-2">
            Usá esta alta cuando falta alguien en la lista. Carga la ficha base de la planilla madre y el email será su acceso al portal de recibos.
          </p>
          {(controlEmpleado.bloqueos.length > 0 || controlEmpleado.advertencias.length > 0) ? (
            <div className="space-y-2 rounded-2xl border border-linea bg-hundido px-4 py-3 text-sm" role={controlEmpleado.bloqueos.length ? "alert" : "status"}>
              <p className="flex items-center gap-2 font-bold">
                {controlEmpleado.bloqueos.length ? <AlertOctagon size={16} className="text-rosa-t" /> : <AlertTriangle size={16} className="text-crema-t" />}
                Control de datos
              </p>
              {controlEmpleado.bloqueos.map((mensaje) => (
                <p key={mensaje} className="pl-6 text-xs font-semibold text-rosa-t">{mensaje}</p>
              ))}
              {controlEmpleado.advertencias.map((mensaje) => (
                <p key={mensaje} className="pl-6 text-xs text-crema-t">{mensaje}</p>
              ))}
              {controlEmpleado.advertencias.length > 0 && (
                <p className="pl-6 text-xs text-apagado">El estudio también verá estas advertencias para revisar la ficha.</p>
              )}
            </div>
          ) : (
            <p className="flex items-center gap-2 rounded-2xl bg-menta px-4 py-3 text-sm font-semibold text-menta-t">
              <CheckCircle2 size={16} /> El control se actualiza mientras completás la ficha.
            </p>
          )}
          <h3 className="text-sm font-bold text-tinta">Datos personales</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Nombre">
              <input name="nombre" className={inputCls} autoComplete="given-name" required />
            </Campo>
            <Campo label="Apellido">
              <input name="apellido" className={inputCls} autoComplete="family-name" required />
            </Campo>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Cédula">
              <input name="ci" className={inputCls} inputMode="numeric" required />
            </Campo>
            <Campo label="Email de acceso">
              <input name="email" type="email" className={inputCls} autoComplete="email" required />
            </Campo>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Teléfono">
              <input name="telefono" className={inputCls} autoComplete="tel" />
            </Campo>
            <Campo label="Personas a cargo / hijos">
              <input name="hijos" type="number" min="0" step="1" className={inputCls} defaultValue={0} inputMode="numeric" />
            </Campo>
          </div>
          <Campo label="Dirección">
            <input name="direccion" className={inputCls} autoComplete="street-address" />
          </Campo>
          <h3 className="pt-2 text-sm font-bold text-tinta">Datos laborales</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Cargo">
              <input name="cargo" className={inputCls} placeholder="Ej.: Mecánico" required />
            </Campo>
            <Campo label="Área">
              <input name="area" className={inputCls} placeholder="Ej.: Taller" />
            </Campo>
          </div>
          <Campo label="Categoría / grupo Consejo de Salario">
            <input name="categoria" className={inputCls} placeholder="Ej.: 14.2 - Adm. crédito" />
          </Campo>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Ingreso">
              <input name="ingreso" type="date" className={inputCls} defaultValue={`${p.mes}-01`} required />
            </Campo>
            <Campo label="Tipo de contrato">
              <input name="tipoContrato" className={inputCls} placeholder="Ej.: Indefinido" />
            </Campo>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Sueldo mensual nominal">
              <input name="sueldo" type="number" min="1" step="1" className={inputCls} inputMode="numeric" required />
            </Campo>
            <Campo label="Banco / cuenta bancaria">
              <input name="cuenta" className={inputCls} placeholder="Ej.: BROU 12345" />
            </Campo>
          </div>
          <ResultadoAccion resultado={errorEmpleado ? { ok: false, mensaje: errorEmpleado } : null} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Boton type="button" variante="fantasma" disabled={creandoEmpleado} onClick={() => setNuevoEmpleado(false)}>
              Cancelar
            </Boton>
            <Boton type="submit" disabled={creandoEmpleado}>
              <UserPlus size={16} /> {creandoEmpleado ? "Creando..." : "Crear trabajador y acceso"}
            </Boton>
          </div>
        </form>
      </Drawer>
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

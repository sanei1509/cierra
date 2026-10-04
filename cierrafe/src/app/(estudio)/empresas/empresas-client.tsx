"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { crearEmpresaInicial, type AltaRealResult } from "../actions";
import { useStore, useVistas, vistaPeriodo } from "@/lib/store";
import { USUARIOS, usuarioPorResponsableId } from "@/lib/seed";
import { activoEn, totales } from "@/lib/engine";
import { MES_ACTUAL, fmt } from "@/lib/format";
import { ESTADOS } from "@/lib/status";
import { Boton, Campo, Drawer, EstadoChip, MarcaEmpresa, Panel, ResultadoAccion, inputCls } from "@/components/ui";
import type { Empleado, Empresa, Periodo, Tono } from "@/lib/types";

const TONOS_EMPRESA: Tono[] = ["menta", "cielo", "crema", "lila", "rosa"];

function slugId(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 28);
}

function NuevaEmpresaDrawer({
  abierto,
  onCerrar,
  onResultado,
  onEmpresaCreada,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onResultado: (resultado: AltaRealResult | null) => void;
  onEmpresaCreada?: (empresa: Empresa) => void;
}) {
  const agregarEmpresa = useStore((s) => s.agregarEmpresa);
  const usuarioId = useStore((s) => s.usuarioId);
  const existentes = useStore((s) => s.empresas);
  const responsables = USUARIOS.filter((u) => u.rol !== "lectura");
  const responsableDefault = responsables.some((u) => u.id === usuarioId) ? usuarioId : (responsables[0]?.id ?? usuarioId);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState<AltaRealResult | null>(null);
  const [pendiente, startTransition] = useTransition();

  const crear = (form: FormData) => {
    setError("");
    setResultado(null);
    onResultado(null);
    const nombre = String(form.get("nombre") ?? "").trim();
    const rut = String(form.get("rut") ?? "").trim();
    const contactoNombre = String(form.get("contactoNombre") ?? "").trim();
    const contactoEmail = String(form.get("contactoEmail") ?? "").trim().toLowerCase();
    const actividad = String(form.get("actividad") ?? "").trim() || "Servicios";
    const grupo = Number(form.get("grupo") ?? 10);
    const subgrupo = String(form.get("subgrupo") ?? "01").trim() || "01";
    const responsableId = String(form.get("responsableId") ?? responsableDefault).trim();
    const tono = String(form.get("tono") ?? "menta") as Tono;
    if (!nombre || !rut || !contactoNombre || !/^\S+@\S+\.\S+$/.test(contactoEmail)) {
      setError("Completá nombre, RUT, contacto del cliente y un email válido.");
      return;
    }
    if (!responsables.some((u) => u.id === responsableId)) {
      setError("Elegí quién del estudio lleva esta empresa.");
      return;
    }
    const base = slugId(nombre) || "empresa";
    const repetidos = existentes.filter((e) => e.id === base || e.id.startsWith(`${base}-`)).length;
    const id = repetidos > 0 ? `${base}-${repetidos + 1}` : base;
    const empresa: Empresa = {
      id,
      nombre,
      nombreVisible: nombre,
      razonSocial: nombre,
      rut,
      nroBps: String(form.get("bps") ?? "").trim() || "pendiente",
      actividad,
      grupo: Number.isFinite(grupo) ? grupo : 10,
      subgrupo,
      responsableId,
      requiereAprobacion: true,
      contacto: { nombre: contactoNombre, email: contactoEmail },
      tono,
    };
    startTransition(async () => {
      try {
        const alta = await crearEmpresaInicial({
          nombre,
          rut,
          nroBps: empresa.nroBps,
          actividad,
          grupo: empresa.grupo,
          subgrupo,
          responsableId,
          contactoNombre,
          contactoEmail,
          tono,
        });
        const empresaCreada = { ...empresa, id: alta.id ?? empresa.id };
        agregarEmpresa(empresaCreada, { nombre: contactoNombre, email: contactoEmail });
        onEmpresaCreada?.(empresaCreada);
        setResultado(alta);
        onResultado(alta);
        onCerrar();
      } catch (error) {
        const fallo = {
          ok: false,
          modo: "real",
          mensaje: error instanceof Error ? error.message : "No pudimos crear la empresa.",
        } satisfies AltaRealResult;
        setResultado(fallo);
        onResultado(fallo);
      }
    });
  };

  return (
    <Drawer abierto={abierto} onCerrar={onCerrar} titulo="Nueva empresa" subtitulo="Alta inicial con contacto del cliente y responsable interno">
      <form action={crear} className="space-y-4">
        <Campo label="Nombre de empresa"><input name="nombre" className={inputCls} required /></Campo>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="RUT"><input name="rut" className={inputCls} required /></Campo>
          <Campo label="Nro. BPS"><input name="bps" className={inputCls} placeholder="pendiente" /></Campo>
        </div>
        <Campo label="Actividad"><input name="actividad" className={inputCls} placeholder="Servicios" /></Campo>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Grupo"><input name="grupo" type="number" min="1" className={inputCls} defaultValue={10} /></Campo>
          <Campo label="Subgrupo"><input name="subgrupo" className={inputCls} defaultValue="01" /></Campo>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Contacto del cliente"><input name="contactoNombre" className={inputCls} required /></Campo>
          <Campo label="Email de acceso del cliente"><input name="contactoEmail" type="email" className={inputCls} required /></Campo>
        </div>
        <Campo label="Responsable del estudio">
          <select name="responsableId" className={inputCls} defaultValue={responsableDefault}>
            {responsables.map((u) => <option key={u.id} value={u.id}>{u.nombre} · {u.rol === "admin" ? "Administración" : "Liquidación"}</option>)}
          </select>
        </Campo>
        <Campo label="Color">
          <select name="tono" className={inputCls} defaultValue="menta">
            {TONOS_EMPRESA.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Campo>
        {error && <ResultadoAccion resultado={{ ok: false, mensaje: error }} />}
        <ResultadoAccion resultado={resultado && !resultado.ok ? resultado : null} />
        <Boton type="submit" tam="lg" className="w-full" disabled={pendiente}><Plus size={16} /> {pendiente ? "Creando..." : "Crear empresa"}</Boton>
      </form>
    </Drawer>
  );
}

export default function EmpresasClient({ datosIniciales }: { datosIniciales: { modo: "real" | "demo"; empresas: Empresa[]; empleados: Empleado[]; periodos: Periodo[] } }) {
  const router = useRouter();
  const vistasDemo = useVistas();
  const empleadosDemo = useStore((s) => s.empleados);
  const [empresasReales, setEmpresasReales] = useState(datosIniciales.empresas);
  const [empleadosReales] = useState(datosIniciales.empleados);
  const [periodosReales, setPeriodosReales] = useState(datosIniciales.periodos);
  const [q, setQ] = useState("");
  const [nuevo, setNuevo] = useState(false);
  const [resultado, setResultado] = useState<AltaRealResult | null>(null);
  const esReal = datosIniciales.modo === "real";
  const empleados = esReal ? empleadosReales : empleadosDemo;
  const vistas = esReal
    ? empresasReales.map((empresa) => vistaPeriodo(empresa.id, MES_ACTUAL, { empresas: empresasReales, empleados: empleadosReales, novedades: [], periodos: periodosReales }))
    : vistasDemo;
  const lista = vistas
    .filter((v) => v.empresa.nombre.toLowerCase().includes(q.toLowerCase()) || v.empresa.rut.includes(q))
    .sort((a, b) => ESTADOS[a.estado].orden - ESTADOS[b.estado].orden);
  return (
    <div className="space-y-3">
      <Panel className="flex flex-wrap items-end gap-4 px-7 py-6">
        <div className="mr-auto">
          <h1 className="text-[34px] font-extrabold leading-tight tracking-tight">Empresas</h1>
          <p className="mt-1 text-[15px] text-apagado">{vistas.length} clientes · {empleados.filter((e) => activoEn(e, MES_ACTUAL)).length} personas en nómina</p>
        </div>
        <input className={clsx(inputCls, "max-w-xs")} placeholder="Filtrar por nombre o RUT" value={q} onChange={(e) => setQ(e.target.value)} />
        <Boton
          onClick={() => {
            setResultado(null);
            setNuevo(true);
          }}
        >
          <Plus size={15} /> Nueva empresa
        </Boton>
      </Panel>
      <ResultadoAccion resultado={resultado} />
      <NuevaEmpresaDrawer
        abierto={nuevo}
        onCerrar={() => setNuevo(false)}
        onResultado={(alta) => {
          setResultado(alta);
        }}
        onEmpresaCreada={(empresa) => {
          if (!esReal || empresasReales.some((actual) => actual.id === empresa.id)) return;
          setEmpresasReales((actual) => [...actual, empresa]);
          setPeriodosReales((actual) => [
            ...actual,
            {
              id: `${empresa.id}-${MES_ACTUAL}`,
              empresaId: empresa.id,
              mes: MES_ACTUAL,
              etapa: "novedades",
              fechaObjetivo: `${MES_ACTUAL}-28`,
              sinNovedades: false,
              versiones: [],
              advertenciasAceptadas: {},
              bps: "pendiente",
              rectificaciones: [],
              notas: [],
            },
          ]);
        }}
      />
      <Panel className="min-w-0 p-3">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="text-left text-xs text-apagado">
                <th className="px-3 pb-2 font-semibold">Empresa</th>
                <th className="px-3 pb-2 text-center font-semibold">Estado del mes</th>
                <th className="px-3 pb-2 text-center font-semibold">Personas</th>
                <th className="px-3 pb-2 text-center font-semibold">Líquido del mes</th>
                <th className="px-3 pb-2 text-center font-semibold">Grupo</th>
                <th className="px-3 pb-2 text-center font-semibold">La lleva</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((v) => {
                const n = empleados.filter((e) => e.empresaId === v.empresa.id && activoEn(e, MES_ACTUAL)).length;
                const t = v.resultados ? totales(v.resultados) : null;
                const r = usuarioPorResponsableId(v.empresa.responsableId);
                return (
                  <tr
                    key={v.empresa.id}
                    className="group cursor-pointer border-t border-linea transition-colors hover:bg-hundido/70 focus-within:bg-hundido/70"
                    onClick={() => {
                      router.push(`/empresas/${v.empresa.id}`);
                    }}
                  >
                    <td className="px-3 py-3">
                      <Link href={`/empresas/${v.empresa.id}`} className="flex items-center gap-3" aria-label={`Abrir ${v.empresa.nombre}`}>
                        <MarcaEmpresa empresa={v.empresa} size={38} />
                        <span>
                          <span className="block whitespace-nowrap font-semibold group-hover:underline">{v.empresa.nombre}</span>
                          <span className="block whitespace-nowrap text-xs text-apagado">{v.empresa.actividad}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-center"><EstadoChip estado={v.estado} /></td>
                    <td className="num px-3 py-3 text-center font-semibold">{n}</td>
                    <td className="num px-3 py-3 text-center font-semibold">{t && t.liquido ? fmt(t.liquido) : "—"}</td>
                    <td className="px-3 py-3 text-center text-[13px] font-semibold text-tinta-2">{v.empresa.grupo}.{v.empresa.subgrupo}</td>
                    <td className="px-3 py-3 text-center text-[13px] font-semibold text-tinta-2">{r ? r.nombre.split(" ")[0] : "Sin asignar"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {lista.length === 0 && <p className="px-3 py-10 text-center text-sm text-apagado">No hay empresas con ese filtro.</p>}
        </div>
      </Panel>
    </div>
  );
}

"use client";

import Link from "next/link";
import { ExternalLink, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useStore, vistaPeriodo } from "@/lib/store";
import type { DatosOperativosIniciales } from "@/lib/backend-operativo";
import { MES_ACTUAL } from "@/lib/format";
import { Avatar, EstadoChip, Panel, inputCls } from "@/components/ui";

type FiltroEstadoCliente = "todos" | "accion" | "esperando" | "cerrados";

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function PortalesClient({ datosIniciales }: { datosIniciales: DatosOperativosIniciales }) {
  const store = useStore();
  const datos = datosIniciales.modo === "real" ? datosIniciales : store;
  const vistas = datos.empresas.map((empresa) => vistaPeriodo(empresa.id, MES_ACTUAL, datos));
  const empleadosMensuales = datos.empleados.filter((e) => e.modalidad === "mensual");
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [estadoCliente, setEstadoCliente] = useState<FiltroEstadoCliente>("todos");
  const [busquedaEmpleado, setBusquedaEmpleado] = useState("");
  const [empresaEmpleado, setEmpresaEmpleado] = useState("todas");
  const empresasPorId = useMemo(() => new Map(datos.empresas.map((empresa) => [empresa.id, empresa])), [datos.empresas]);
  const clientesFiltrados = useMemo(() => {
    const q = normalizar(busquedaCliente);
    return vistas.filter((v) => {
      const texto = normalizar(`${v.empresa.nombre} ${v.empresa.contacto.nombre} ${v.empresa.contacto.email} ${v.estado}`);
      const coincideTexto = !q || texto.includes(q);
      const coincideEstado =
        estadoCliente === "todos" ||
        (estadoCliente === "accion" && ["pendiente", "lista", "alertas", "devuelta", "aprobada"].includes(v.estado)) ||
        (estadoCliente === "esperando" && v.estado === "esperando") ||
        (estadoCliente === "cerrados" && v.estado === "cerrada");
      return coincideTexto && coincideEstado;
    });
  }, [busquedaCliente, estadoCliente, vistas]);
  const empleadosFiltrados = useMemo(() => {
    const q = normalizar(busquedaEmpleado);
    return empleadosMensuales.filter((empleado) => {
      const empresa = empresasPorId.get(empleado.empresaId);
      const texto = normalizar(`${empleado.nombre} ${empleado.apellido} ${empleado.cargo} ${empresa?.nombre ?? ""}`);
      const coincideTexto = !q || texto.includes(q);
      const coincideEmpresa = empresaEmpleado === "todas" || empleado.empresaId === empresaEmpleado;
      return coincideTexto && coincideEmpresa;
    });
  }, [busquedaEmpleado, empleadosMensuales, empresaEmpleado, empresasPorId]);
  const filtrosCliente = [
    { id: "todos", label: "Todos", total: vistas.length },
    { id: "accion", label: "Requieren acción", total: vistas.filter((v) => ["pendiente", "lista", "alertas", "devuelta", "aprobada"].includes(v.estado)).length },
    { id: "esperando", label: "Esperando cliente", total: vistas.filter((v) => v.estado === "esperando").length },
    { id: "cerrados", label: "Cerrados", total: vistas.filter((v) => v.estado === "cerrada").length },
  ] satisfies Array<{ id: FiltroEstadoCliente; label: string; total: number }>;

  return (
    <div className="space-y-3">
      <Panel className="px-7 py-6">
        <h1 className="text-[34px] font-extrabold leading-tight tracking-tight">Portales de acceso</h1>
        <p className="mt-1 max-w-2xl text-[15px] text-apagado">
          Accesos para que los clientes carguen novedades o aprueben liquidaciones, y para que los empleados consulten sus recibos publicados.
        </p>
      </Panel>
      <div className="grid gap-3 xl:grid-cols-2">
        <Panel className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight">Portal del cliente</h2>
              <p className="mt-1 text-sm text-apagado">Enlaces por empresa para cargar novedades, revisar sueldos y aprobar.</p>
            </div>
            <span className="rounded-full bg-hundido px-3 py-1 text-xs font-semibold text-tinta-2">{clientesFiltrados.length} de {vistas.length}</span>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
            <label className="relative block">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-apagado" />
              <input
                className={`${inputCls} pl-9`}
                value={busquedaCliente}
                onChange={(e) => setBusquedaCliente(e.target.value)}
                placeholder="Buscar empresa, contacto o email"
              />
            </label>
            <select className={`${inputCls} md:w-56`} value={estadoCliente} onChange={(e) => setEstadoCliente(e.target.value as FiltroEstadoCliente)} aria-label="Filtrar empresas por estado">
              {filtrosCliente.map((filtro) => (
                <option key={filtro.id} value={filtro.id}>{filtro.label} ({filtro.total})</option>
              ))}
            </select>
          </div>
          <ul className="mt-4 max-h-[27rem] space-y-1.5 overflow-y-auto pr-1">
            {clientesFiltrados.map((v) => (
              <li key={v.empresa.id}>
                <Link href={`/cliente/${v.empresa.id}`} target="_blank" className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-2xl px-3 py-2 hover:bg-hundido">
                  <Avatar nombre={v.empresa.nombre} tono={v.empresa.tono} size={34} />
                  <span className="min-w-0 text-sm">
                    <span className="block font-semibold">{v.empresa.nombre}</span>
                    <span className="block truncate text-xs text-apagado">{v.empresa.contacto.nombre} · {v.empresa.contacto.email}</span>
                  </span>
                  <EstadoChip estado={v.estado} />
                  <ExternalLink size={14} className="text-apagado" />
                </Link>
              </li>
            ))}
            {clientesFiltrados.length === 0 && (
              <li className="rounded-2xl border border-dashed border-linea px-4 py-6 text-center text-sm text-apagado">No hay empresas con esos filtros.</li>
            )}
          </ul>
        </Panel>
        <Panel className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight">Portal del empleado</h2>
              <p className="mt-1 text-sm text-apagado">Accesos individuales para consultar recibos por mes y descargar PDF.</p>
            </div>
            <span className="rounded-full bg-hundido px-3 py-1 text-xs font-semibold text-tinta-2">{empleadosFiltrados.length} de {empleadosMensuales.length}</span>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
            <label className="relative block">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-apagado" />
              <input
                className={`${inputCls} pl-9`}
                value={busquedaEmpleado}
                onChange={(e) => setBusquedaEmpleado(e.target.value)}
                placeholder="Buscar persona, cargo o empresa"
              />
            </label>
            <select className={`${inputCls} md:w-56`} value={empresaEmpleado} onChange={(e) => setEmpresaEmpleado(e.target.value)} aria-label="Filtrar empleados por empresa">
              <option value="todas">Todas las empresas</option>
              {datos.empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>{empresa.nombre}</option>
              ))}
            </select>
          </div>
          <ul className="mt-4 grid max-h-[27rem] gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
            {empleadosFiltrados.map((e) => (
              <li key={e.id}>
                <Link href={`/portal/${e.id}`} target="_blank" className="flex items-center gap-3 rounded-2xl px-3 py-2 hover:bg-hundido">
                  <Avatar nombre={`${e.nombre} ${e.apellido}`} tono="menta" size={30} />
                  <span className="min-w-0 text-sm">
                    <span className="block font-semibold">{e.nombre} {e.apellido}</span>
                    <span className="block truncate text-xs text-apagado">{empresasPorId.get(e.empresaId)?.nombre} · {e.cargo}</span>
                  </span>
                  <ExternalLink size={14} className="ml-auto shrink-0 text-apagado" />
                </Link>
              </li>
            ))}
            {empleadosFiltrados.length === 0 && (
              <li className="rounded-2xl border border-dashed border-linea px-4 py-6 text-center text-sm text-apagado sm:col-span-2">No hay empleados con esos filtros.</li>
            )}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

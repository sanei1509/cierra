"use client";

import clsx from "clsx";
import { Check, CircleDollarSign, ClipboardList, FileClock, Layers3, Save, Settings2, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { ADDONS_ADMIN, ESTUDIOS_ADMIN, fmtCent, modulosHabilitados, moduloNombre, PLANES_ADMIN, planPorCodigo, totalMensualCent, type CodigoModulo, type EstudioAdmin } from "@/lib/comercial-demo";
import { Boton, Chip, Panel, inputCls } from "./ui";

function estadoChip(estado: EstudioAdmin["estado"]) {
  if (estado === "activo") return <Chip tono="menta">Activo</Chip>;
  if (estado === "prueba") return <Chip tono="crema">Prueba</Chip>;
  return <Chip tono="rosa">Pausado</Chip>;
}

function toggleAddon(addons: CodigoModulo[], codigo: CodigoModulo) {
  return addons.includes(codigo) ? addons.filter((a) => a !== codigo) : [...addons, codigo];
}

export function AdminCommercialConsole() {
  const [estudios, setEstudios] = useState(ESTUDIOS_ADMIN);
  const [seleccionadoId, setSeleccionadoId] = useState(estudios[0].id);
  const seleccionado = estudios.find((e) => e.id === seleccionadoId) ?? estudios[0];
  const plan = planPorCodigo(seleccionado.planCodigo);
  const modulos = useMemo(() => modulosHabilitados(seleccionado), [seleccionado]);
  const total = totalMensualCent(seleccionado);

  const actualizar = (cambios: Partial<EstudioAdmin>) => {
    setEstudios((actuales) => actuales.map((e) => (e.id === seleccionado.id ? { ...e, ...cambios } : e)));
  };

  return (
    <div className="grid gap-3 xl:grid-cols-[360px_1fr]">
      <Panel className="overflow-hidden">
        <div className="border-b border-linea px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <ShieldCheck size={18} className="text-petroleo" /> Estudios
          </h2>
        </div>
        <div className="divide-y divide-linea">
          {estudios.map((estudio) => {
            const activo = estudio.id === seleccionado.id;
            return (
              <button
                key={estudio.id}
                type="button"
                onClick={() => setSeleccionadoId(estudio.id)}
                className={clsx("block w-full px-5 py-4 text-left transition-colors hover:bg-hundido", activo && "bg-hundido")}
              >
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block text-sm font-bold">{estudio.nombre}</span>
                    <span className="mt-1 block text-xs text-apagado">{planPorCodigo(estudio.planCodigo).nombre} · {fmtCent(totalMensualCent(estudio), estudio.moneda)}</span>
                  </span>
                  {estadoChip(estudio.estado)}
                </span>
              </button>
            );
          })}
        </div>
      </Panel>

      <div className="space-y-3">
        <Panel className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.08em] text-petroleo">
                <CircleDollarSign size={16} /> Comercial
              </p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight">{seleccionado.nombre}</h2>
              <p className="mt-1 text-sm text-apagado">{modulos.length} modulos habilitados · {fmtCent(total, seleccionado.moneda)} mensuales</p>
            </div>
            <Boton>
              <Save size={15} /> Guardar configuracion
            </Boton>
          </div>
        </Panel>

        <div className="grid gap-3 lg:grid-cols-3">
          <Panel className="p-5 lg:col-span-2">
            <h3 className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <Layers3 size={18} className="text-petroleo" /> Paquete y add-ons
            </h3>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {PLANES_ADMIN.map((p) => (
                <button
                  key={p.codigo}
                  type="button"
                  onClick={() => actualizar({ planCodigo: p.codigo })}
                  className={clsx("rounded-2xl border px-4 py-3 text-left transition-colors", p.codigo === plan.codigo ? "border-petroleo bg-menta text-menta-t" : "border-linea bg-superficie hover:bg-hundido")}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-bold">{p.nombre}</span>
                    {p.codigo === plan.codigo && <Check size={16} />}
                  </span>
                  <span className="mt-1 block text-xs">{fmtCent(p.precioMensualCent)}</span>
                  <span className="mt-2 block text-xs text-apagado">{p.modulos.length} modulos incluidos</span>
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {ADDONS_ADMIN.map((addon) => (
                <label key={addon.moduloCodigo} className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-linea bg-superficie px-4 py-3 hover:bg-hundido">
                  <span>
                    <span className="block text-sm font-bold">{moduloNombre(addon.moduloCodigo)}</span>
                    <span className="block text-xs text-apagado">{fmtCent(addon.precioMensualCent)} mensual</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={seleccionado.addons.includes(addon.moduloCodigo)}
                    onChange={() => actualizar({ addons: toggleAddon(seleccionado.addons, addon.moduloCodigo) })}
                    className="size-4 accent-petroleo"
                  />
                </label>
              ))}
            </div>
          </Panel>

          <Panel className="p-5">
            <h3 className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <FileClock size={18} className="text-petroleo" /> Contrato
            </h3>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-semibold text-tinta-2">Estado</span>
                <select className={inputCls} value={seleccionado.estado} onChange={(e) => actualizar({ estado: e.target.value as EstudioAdmin["estado"] })}>
                  <option value="prueba">Prueba</option>
                  <option value="activo">Activo</option>
                  <option value="pausado">Pausado</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-semibold text-tinta-2">Notas internas</span>
                <textarea className={clsx(inputCls, "min-h-28 py-3")} value={seleccionado.notas} onChange={(e) => actualizar({ notas: e.target.value })} />
              </label>
            </div>
          </Panel>
        </div>

        <Panel className="p-5">
          <h3 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Settings2 size={18} className="text-petroleo" /> Modulos habilitados
          </h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {modulos.map((m) => (
              <Chip key={m} tono={seleccionado.addons.includes(m) ? "lila" : "gris"}>
                {moduloNombre(m)}
              </Chip>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <h3 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <ClipboardList size={18} className="text-petroleo" /> Auditoria comercial
          </h3>
          <div className="mt-4 rounded-2xl bg-hundido px-4 py-3 text-sm">
            <p className="font-semibold">Cambio pendiente de guardar</p>
            <p className="mt-1 text-apagado">
              {seleccionado.nombre}: {plan.nombre}, {seleccionado.addons.length} add-ons, total {fmtCent(total, seleccionado.moneda)}.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

"use client";

import clsx from "clsx";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { fechaHora } from "@/lib/format";
import { Panel, inputCls } from "@/components/ui";

export default function Auditoria() {
  const audit = useStore((s) => s.audit);
  const empresas = useStore((s) => s.empresas);
  const [emp, setEmp] = useState("todas");
  const [ent, setEnt] = useState("todas");
  const entidades = [...new Set(audit.map((a) => a.entidad))];
  const lista = audit.filter((a) => (emp === "todas" || a.empresaId === emp) && (ent === "todas" || a.entidad === ent));
  return (
    <div className="space-y-3">
      <Panel className="flex flex-wrap items-end gap-3 px-7 py-6">
        <div className="mr-auto">
          <h1 className="text-[34px] font-extrabold leading-tight tracking-tight">Auditoría</h1>
          <p className="mt-1 text-[15px] text-apagado">Quién cambió qué y cuándo. Los eventos no se pueden editar ni borrar.</p>
        </div>
        <select className={clsx(inputCls, "max-w-[240px]")} value={emp} onChange={(e) => setEmp(e.target.value)} aria-label="Empresa">
          <option value="todas">Todas las empresas</option>
          {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <select className={clsx(inputCls, "max-w-[200px]")} value={ent} onChange={(e) => setEnt(e.target.value)} aria-label="Tipo">
          <option value="todas">Todos los tipos</option>
          {entidades.map((e) => <option key={e}>{e}</option>)}
        </select>
      </Panel>
      <Panel className="p-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-apagado">
              <th className="px-3 py-2 font-semibold">Cuándo</th>
              <th className="px-3 py-2 font-semibold">Quién</th>
              <th className="px-3 py-2 font-semibold">Empresa</th>
              <th className="px-3 py-2 font-semibold">Acción</th>
              <th className="px-3 py-2 font-semibold">Antes / después</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((a) => (
              <tr key={a.id} className="border-t border-linea align-top">
                <td className="num whitespace-nowrap px-3 py-2.5 text-apagado">{fechaHora(a.fecha)}</td>
                <td className="px-3 py-2.5">{a.actor}</td>
                <td className="px-3 py-2.5">{empresas.find((e) => e.id === a.empresaId)?.nombre ?? "—"}</td>
                <td className="px-3 py-2.5">
                  <span className="font-semibold">{a.accion}</span>
                  <span className="ml-2 rounded-full bg-hundido px-2 py-0.5 text-[11px] font-semibold text-tinta-2">{a.entidad}</span>
                  {a.detalle && <span className="block text-xs text-apagado">{a.detalle}</span>}
                </td>
                <td className="px-3 py-2.5 text-xs">
                  {a.antes || a.despues ? (
                    <><span className="rounded bg-rosa px-1.5 py-0.5 line-through">{a.antes ?? "—"}</span> → <span className="rounded bg-menta px-1.5 py-0.5">{a.despues ?? "—"}</span></>
                  ) : <span className="text-apagado">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

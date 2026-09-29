"use client";

import clsx from "clsx";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { activoEn } from "@/lib/engine";
import { MES_ACTUAL, fmt } from "@/lib/format";
import { Avatar, Chip, Panel, inputCls } from "@/components/ui";

export default function Empleados() {
  const empleados = useStore((s) => s.empleados);
  const empresas = useStore((s) => s.empresas);
  const [q, setQ] = useState("");
  const [emp, setEmp] = useState("todas");
  const lista = useMemo(() => {
    const t = q.toLowerCase();
    return empleados
      .filter((e) => emp === "todas" || e.empresaId === emp)
      .filter((e) => !t || `${e.nombre} ${e.apellido} ${e.ci} ${e.cargo}`.toLowerCase().includes(t))
      .sort((a, b) => a.apellido.localeCompare(b.apellido));
  }, [empleados, q, emp]);

  return (
    <div className="space-y-3">
      <Panel className="flex flex-wrap items-end gap-3 px-7 py-6">
        <div className="mr-auto">
          <h1 className="text-[34px] font-extrabold leading-tight tracking-tight">Empleados</h1>
          <p className="mt-1 text-[15px] text-apagado">Buscá a cualquier persona de toda tu cartera.</p>
        </div>
        <input className={clsx(inputCls, "max-w-xs")} placeholder="Nombre, cédula o cargo" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        <select className={clsx(inputCls, "max-w-[240px]")} value={emp} onChange={(e) => setEmp(e.target.value)} aria-label="Empresa">
          <option value="todas">Todas las empresas</option>
          {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
      </Panel>
      <Panel className="p-3">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-xs text-apagado">
                <th className="px-3 py-2 font-semibold">Persona</th>
                <th className="px-3 py-2 font-semibold">Empresa</th>
                <th className="px-3 py-2 font-semibold">Cédula</th>
                <th className="px-3 py-2 font-semibold">Categoría</th>
                <th className="px-3 py-2 text-right font-semibold">Sueldo base</th>
                <th className="px-3 py-2 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((e) => {
                const empresa = empresas.find((x) => x.id === e.empresaId)!;
                const s = [...e.sueldos].sort((a, b) => b.desde.localeCompare(a.desde))[0];
                return (
                  <tr key={e.id} className="border-t border-linea hover:bg-hundido/60">
                    <td className="px-3 py-2.5">
                      <Link href={`/empresas/${e.empresaId}?tab=empleados&emp=${e.id}`} className="flex items-center gap-3 hover:underline">
                        <Avatar nombre={`${e.nombre} ${e.apellido}`} tono={empresa.tono} size={32} />
                        <span><span className="block font-semibold">{e.nombre} {e.apellido}</span><span className="block text-xs text-apagado">{e.cargo}</span></span>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5"><Link href={`/empresas/${empresa.id}`} className="hover:underline">{empresa.nombre}</Link></td>
                    <td className="num px-3 py-2.5">{e.ci || <Chip tono="rosa">Falta</Chip>}</td>
                    <td className="px-3 py-2.5">{e.categoria}</td>
                    <td className="num px-3 py-2.5 text-right">{s ? fmt(s.monto) : "Jornal"}</td>
                    <td className="px-3 py-2.5">{activoEn(e, MES_ACTUAL) ? <Chip tono="menta">Activo</Chip> : <Chip tono="gris">Egresado</Chip>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {lista.length === 0 && <p className="py-10 text-center text-sm text-apagado">Nadie coincide con “{q}”.</p>}
        </div>
      </Panel>
    </div>
  );
}

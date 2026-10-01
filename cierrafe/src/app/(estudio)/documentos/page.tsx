"use client";

import clsx from "clsx";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { FileDown, FileText, Files, Eye, EyeOff } from "lucide-react";
import { useStore, vistaPeriodo } from "@/lib/store";
import { MES_ACTUAL, fecha, fmt2, nombreMes } from "@/lib/format";
import { archivoNomina, descargar } from "@/lib/bps";
import { Avatar, Boton, Chip, Panel, inputCls } from "@/components/ui";

const MESES = Array.from({ length: 9 }, (_, i) => `2026-${String(9 - i).padStart(2, "0")}`);

function Contenido() {
  const sp = useSearchParams();
  const d = useStore();
  const [mes, setMes] = useState(MES_ACTUAL);
  const [emp, setEmp] = useState(sp.get("empresa") ?? "todas");
  const vistas = useMemo(
    () => d.empresas.filter((e) => emp === "todas" || e.id === emp).map((e) => vistaPeriodo(e.id, mes, d)),
    [d, mes, emp],
  );
  const cerradas = vistas.filter((v) => v.periodo.etapa === "cerrada");
  const abiertas = vistas.filter((v) => v.periodo.etapa !== "cerrada");
  return (
    <div className="space-y-3">
      <Panel className="flex flex-wrap items-end gap-3 px-7 py-6">
        <div className="mr-auto">
          <h1 className="text-[34px] font-extrabold leading-tight tracking-tight">Recibos y BPS</h1>
          <p className="mt-1 text-[15px] text-apagado">Los recibos se generan solo desde versiones cerradas y no cambian aunque cambien los parámetros.</p>
        </div>
        <select className={clsx(inputCls, "max-w-[200px]")} value={mes} onChange={(e) => setMes(e.target.value)} aria-label="Mes">
          {MESES.map((m) => <option key={m} value={m}>{nombreMes(m)}</option>)}
        </select>
        <select className={clsx(inputCls, "max-w-[240px]")} value={emp} onChange={(e) => setEmp(e.target.value)} aria-label="Empresa">
          <option value="todas">Todas las empresas</option>
          {d.empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
      </Panel>
      {cerradas.map((v) => {
        const res = (v.resultados ?? []).filter((r) => !r.fueraDeAlcance);
        if (!res.length) return null;
        const esActual = mes === MES_ACTUAL;
        const vistos = res.filter((r) => d.vistas[`${r.empleadoId}|${mes}`]).length;
        return (
          <Panel key={v.empresa.id} className="p-3">
            <div className="flex flex-wrap items-center gap-3 px-3 pt-2 pb-3">
              <Avatar nombre={v.empresa.nombre} tono={v.empresa.tono} size={36} />
              <div className="mr-auto">
                <Link href={`/empresas/${v.empresa.id}`} className="font-bold hover:underline">{v.empresa.nombre}</Link>
                <p className="text-xs text-apagado">
                  {res.length} recibos · {nombreMes(mes)}
                  {esActual && ` · ${vistos} de ${res.length} vistos por el empleado`}
                </p>
              </div>
              <Chip tono={v.periodo.bps === "presentado" ? "menta" : v.periodo.bps === "generado" ? "cielo" : "crema"}>
                BPS {v.periodo.bps === "presentado" ? "presentada" : v.periodo.bps === "generado" ? "archivo generado" : "pendiente"}
              </Chip>
              <Boton tam="sm" variante="secundario" href={`/recibos/${v.empresa.id}/${mes}`}>
                <Files size={13} /> Todos en PDF
              </Boton>
              <Boton tam="sm" variante="secundario" onClick={() => descargar(`nomina-${v.empresa.nroBps}-${mes}.txt`, archivoNomina(v.empresa, mes, d.empleados, res))}>
                <FileDown size={13} /> Nómina BPS
              </Boton>
            </div>
            <ul className="grid gap-2 px-1 pb-1 sm:grid-cols-2 xl:grid-cols-3">
              {res.map((r) => {
                const e = d.empleados.find((x) => x.id === r.empleadoId)!;
                return (
                  <li key={r.empleadoId}>
                    <Link href={`/recibo/${e.id}/${mes}`} target="_blank" className="flex items-center gap-3 rounded-2xl bg-hundido px-3 py-2.5 hover:bg-linea">
                      <FileText size={18} className="text-petroleo" />
                      <span className="flex-1 text-sm">
                        <span className="block font-semibold">{e.nombre} {e.apellido}</span>
                        <span className="num block text-xs text-apagado">Líquido {fmt2(r.liquido)}</span>
                      </span>
                      {esActual &&
                        (d.vistas[`${r.empleadoId}|${mes}`] ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-menta px-2 py-0.5 text-[11px] font-semibold text-menta-t" title="El empleado abrió el recibo desde su portal">
                            <Eye size={11} /> Visto {fecha(d.vistas[`${r.empleadoId}|${mes}`])}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-superficie px-2 py-0.5 text-[11px] font-semibold text-apagado">
                            <EyeOff size={11} /> Sin ver
                          </span>
                        ))}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>
        );
      })}
      {abiertas.length > 0 && (
        <Panel className="px-7 py-5 text-sm text-apagado">
          Sin recibos todavía: {abiertas.map((v) => v.empresa.nombre).join(", ")}. Aparecen acá cuando cierres el período.
        </Panel>
      )}
    </div>
  );
}

export default function Documentos() {
  return (
    <Suspense>
      <Contenido />
    </Suspense>
  );
}

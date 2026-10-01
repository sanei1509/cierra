"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { Download, Eye, ArrowLeft } from "lucide-react";
import { useHidratado, useStore, vistaPeriodo } from "@/lib/store";
import { activoEn } from "@/lib/engine";
import { MES_ACTUAL, fmt, fmt2, nombreMes } from "@/lib/format";
import { Avatar, Boton, MarcaEmpresa, Panel } from "@/components/ui";
import { Logo } from "@/components/shell";

function mesesDesde(inicio: string) {
  const out: string[] = [];
  for (let m = 1; m <= Number(MES_ACTUAL.slice(5)); m++) {
    const x = `2026-${String(m).padStart(2, "0")}`;
    if (x >= inicio) out.push(x);
  }
  return out.reverse();
}

function Contenido({ id }: { id: string }) {
  const d = useStore();
  const e = d.empleados.find((x) => x.id === id)!;
  const empresa = d.empresas.find((x) => x.id === e.empresaId)!;
  const recibos = useMemo(
    () =>
      mesesDesde(e.ingreso.slice(0, 7))
        .filter((m) => activoEn(e, m))
        .map((m) => {
          const v = vistaPeriodo(empresa.id, m, d);
          if (v.periodo.etapa !== "cerrada") return null;
          const r = v.resultados?.find((x) => x.empleadoId === id);
          return r && !r.fueraDeAlcance ? { mes: m, r } : null;
        })
        .filter((x): x is NonNullable<typeof x> => !!x),
    [d, e, empresa.id, id],
  );
  const ultimo = recibos[0];

  return (
    <div className="mx-auto min-h-screen max-w-md space-y-3 p-3 pb-10">
      <div className="flex items-center justify-between px-2 py-3">
        <Logo />
        <Avatar nombre={`${e.nombre} ${e.apellido}`} tono="menta" size={38} />
      </div>
      <div className="px-2">
        <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">Hola, {e.nombre}</h1>
        <p className="mt-1 flex items-center gap-2 text-[15px] text-apagado"><MarcaEmpresa empresa={empresa} size={24} /> Tus recibos de {empresa.nombre}</p>
      </div>
      {ultimo ? (
        <Panel className="overflow-hidden !border-petroleo/10 bg-petroleo p-6 text-white">
          <p className="text-sm text-[#DCE9FF]">Último recibo · {nombreMes(ultimo.mes)}</p>
          <p className="num mt-2 text-5xl font-extrabold tracking-tighter">{fmt(ultimo.r.liquido)}</p>
          <p className="mt-1 text-sm text-[#CFE4FF]">Líquido a cobrar</p>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <Boton variante="claro" href={`/recibo/${id}/${ultimo.mes}?desde=portal`}><Eye size={15} /> Ver</Boton>
            <Boton variante="claro" className="!bg-white/12 !text-white hover:!bg-white/20" href={`/recibo/${id}/${ultimo.mes}?desde=portal&imprimir=1`}><Download size={15} /> Descargar</Boton>
          </div>
        </Panel>
      ) : (
        <Panel className="p-6 text-center text-sm text-apagado">Todavía no tenés recibos publicados. Te avisamos por email cuando esté el primero.</Panel>
      )}
      {recibos.length > 1 && (
        <Panel className="p-3">
          <h2 className="px-3 pt-2 pb-1 font-bold">2026</h2>
          <ul>
            {recibos.slice(1).map(({ mes, r }) => (
              <li key={mes} className="border-t border-linea first:border-t-0">
                <Link href={`/recibo/${id}/${mes}?desde=portal`} className="flex items-center justify-between rounded-2xl px-3 py-3.5 hover:bg-hundido">
                  <span>
                    <span className="block font-semibold">{nombreMes(mes).split(" ")[0]}</span>
                    {r.lineas.some((l) => l.concepto === "Aguinaldo") && <span className="text-xs text-crema-t">Incluye aguinaldo</span>}
                  </span>
                  <span className="num font-semibold">{fmt2(r.liquido)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <Panel className="p-5 text-sm">
        <h2 className="font-bold">Mis datos</h2>
        <dl className="mt-3 grid grid-cols-2 gap-y-2">
          <dt className="text-apagado">Cédula</dt><dd>{e.ci || "—"}</dd>
          <dt className="text-apagado">Cargo</dt><dd>{e.cargo}</dd>
          <dt className="text-apagado">Ingreso</dt><dd>{e.ingreso}</dd>
          <dt className="text-apagado">Cuenta</dt><dd>{e.cuenta}</dd>
        </dl>
        <p className="mt-3 text-xs text-apagado">¿Algún dato está mal? Avisale a {empresa.contacto.nombre}. Podés pedir tu recibo en papel cuando quieras.</p>
      </Panel>
      <p className="pt-2 text-center text-xs text-apagado">
        <Link href="/portales" className="inline-flex items-center gap-1 hover:underline"><ArrowLeft size={12} /> Volver a portales</Link>
      </p>
    </div>
  );
}

export default function PortalEmpleado() {
  const { id } = useParams<{ id: string }>();
  const ok = useHidratado();
  const existe = useStore((s) => s.empleados.some((e) => e.id === id));
  if (!ok) return null;
  if (!existe) return <p className="p-10 text-center">No encontramos tu acceso.</p>;
  return <Contenido id={id} />;
}

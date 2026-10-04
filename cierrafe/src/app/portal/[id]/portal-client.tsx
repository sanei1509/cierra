"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowLeft, Download, Eye } from "lucide-react";
import { Logo } from "@/components/shell";
import { Avatar, Boton, MarcaEmpresa, Panel } from "@/components/ui";
import { activoEn } from "@/lib/engine";
import { portalEmpresaConfig } from "@/lib/empresa";
import { fmt, fmt2, MES_ACTUAL, nombreMes } from "@/lib/format";
import { useStore, vistaPeriodo } from "@/lib/store";
import type { DatosOperativosIniciales } from "@/lib/backend-operativo";

function mesesDesde(inicio: string) {
  const out: string[] = [];
  for (let m = 1; m <= Number(MES_ACTUAL.slice(5)); m++) {
    const x = `2026-${String(m).padStart(2, "0")}`;
    if (x >= inicio) out.push(x);
  }
  return out.reverse();
}

export default function PortalEmpleadoClient({ id, datosIniciales }: { id: string; datosIniciales: DatosOperativosIniciales }) {
  const store = useStore();
  const datos = datosIniciales.modo === "real" ? datosIniciales : store;
  const e = datos.empleados.find((x) => x.id === id);
  const empresa = e ? datos.empresas.find((x) => x.id === e.empresaId) : null;
  const recibos = useMemo(() => {
    if (!e || !empresa) return [];
    return mesesDesde(e.ingreso.slice(0, 7))
      .filter((m) => activoEn(e, m))
      .map((m) => {
        const v = vistaPeriodo(empresa.id, m, datos);
        if (v.periodo.etapa !== "cerrada") return null;
        const r = v.resultados?.find((x) => x.empleadoId === id);
        return r && !r.fueraDeAlcance ? { mes: m, r } : null;
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
  }, [datos, e, empresa, id]);

  if (!e || !empresa) return <p className="p-10 text-center">No encontramos tu acceso.</p>;
  if (!portalEmpresaConfig(empresa).portalEmpleadoRecibos) {
    return (
      <div className="mx-auto min-h-screen max-w-md space-y-3 p-3 pb-10">
        <div className="flex items-center justify-between px-2 py-3">
          <Logo />
          <Avatar nombre={`${e.nombre} ${e.apellido}`} tono="menta" size={38} />
        </div>
        <Panel className="p-8 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight">Portal empleado deshabilitado</h1>
          <p className="mt-2 text-sm text-apagado">Tu empresa no tiene habilitada la consulta web de recibos. Pedí tus recibos por el canal habitual.</p>
        </Panel>
      </div>
    );
  }
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
          <dt className="text-apagado">Cédula</dt><dd>{e.ci || "-"}</dd>
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

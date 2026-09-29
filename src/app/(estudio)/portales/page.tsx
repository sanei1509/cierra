"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useStore, useVistas } from "@/lib/store";
import { Avatar, EstadoChip, Panel } from "@/components/ui";

export default function Portales() {
  const vistas = useVistas();
  const empleados = useStore((s) => s.empleados);
  return (
    <div className="space-y-3">
      <Panel className="px-7 py-6">
        <h1 className="text-[34px] font-extrabold leading-tight tracking-tight">Ver como cliente o empleado</h1>
        <p className="mt-1 max-w-2xl text-[15px] text-apagado">
          En producción cada persona entra con su propio acceso y ve solo lo suyo. Acá podés abrir cualquier portal para probar el recorrido completo: el cliente carga novedades o aprueba, y el empleado consulta sus recibos.
        </p>
      </Panel>
      <div className="grid gap-3 xl:grid-cols-2">
        <Panel className="p-6">
          <h2 className="text-lg font-bold tracking-tight">Portal del cliente</h2>
          <p className="text-sm text-apagado">Una empresa, sin jerga: enviar novedades y aprobar.</p>
          <ul className="mt-4 space-y-1.5">
            {vistas.map((v) => (
              <li key={v.empresa.id}>
                <Link href={`/cliente/${v.empresa.id}`} target="_blank" className="flex items-center gap-3 rounded-2xl px-3 py-2 hover:bg-hundido">
                  <Avatar nombre={v.empresa.nombre} tono={v.empresa.tono} size={34} />
                  <span className="flex-1 text-sm">
                    <span className="block font-semibold">{v.empresa.nombre}</span>
                    <span className="block text-xs text-apagado">{v.empresa.contacto.nombre}</span>
                  </span>
                  <EstadoChip estado={v.estado} />
                  <ExternalLink size={14} className="text-apagado" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel className="p-6">
          <h2 className="text-lg font-bold tracking-tight">Portal del empleado</h2>
          <p className="text-sm text-apagado">Pensado para el celular: recibos por mes, ver y descargar.</p>
          <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
            {empleados.filter((e) => e.modalidad === "mensual").slice(0, 24).map((e) => (
              <li key={e.id}>
                <Link href={`/portal/${e.id}`} target="_blank" className="flex items-center gap-3 rounded-2xl px-3 py-2 hover:bg-hundido">
                  <Avatar nombre={`${e.nombre} ${e.apellido}`} tono="menta" size={30} />
                  <span className="text-sm">
                    <span className="block font-semibold">{e.nombre} {e.apellido}</span>
                    <span className="block text-xs text-apagado">{vistas.find((v) => v.empresa.id === e.empresaId)?.empresa.nombre}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

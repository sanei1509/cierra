"use client";

import { Printer } from "lucide-react";
import { ReciboDoc } from "@/components/recibo-doc";
import { Boton } from "@/components/ui";
import { hashDe } from "@/lib/engine";
import { nombreMes } from "@/lib/format";
import { useStore, vistaPeriodo } from "@/lib/store";
import type { DatosOperativosIniciales } from "@/lib/backend-operativo";

export default function RecibosClient({
  empresaId,
  mes,
  datosIniciales,
}: {
  empresaId: string;
  mes: string;
  datosIniciales: DatosOperativosIniciales;
}) {
  const store = useStore();
  const datos = datosIniciales.modo === "real" ? datosIniciales : store;
  const empresa = datos.empresas.find((x) => x.id === empresaId);
  if (!empresa) return <p className="p-10 text-center">Empresa no encontrada.</p>;

  const v = vistaPeriodo(empresa.id, mes, datos);
  const res = v.periodo.etapa === "cerrada" ? (v.resultados ?? []).filter((r) => !r.fueraDeAlcance) : [];
  if (!res.length) return <p className="p-10 text-center text-tinta">No hay recibos emitidos para {empresa.nombre} en {nombreMes(mes)}.</p>;

  return (
    <div className="document-shell min-h-screen py-3 print:min-h-0 print:py-0">
      <div className="mx-auto max-w-3xl space-y-3 px-3 print:space-y-0 print:p-0">
        <div className="no-print flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-panel)] bg-superficie px-5 py-4">
          <div>
            <p className="font-bold">{res.length} recibos · {empresa.nombre}</p>
            <p className="text-sm text-apagado">{nombreMes(mes)}. Al imprimir, elegí “Guardar como PDF” para descargar un solo archivo con todos.</p>
          </div>
          <div className="flex gap-2">
            <Boton variante="secundario" onClick={() => history.back()}>Volver</Boton>
            <Boton onClick={() => window.print()}><Printer size={15} /> Descargar todos en PDF</Boton>
          </div>
        </div>
        {res.map((r) => {
          const e = datos.empleados.find((x) => x.id === r.empleadoId);
          if (!e) return null;
          return <ReciboDoc key={r.empleadoId} empresa={empresa} empleado={e} mes={mes} r={r} periodo={v.periodo} huella={v.vigente?.hash ?? hashDe(r)} />;
        })}
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";
import { marcarReciboVistoReal } from "@/app/(estudio)/actions";
import { ReciboDoc } from "@/components/recibo-doc";
import { Boton } from "@/components/ui";
import { hashDe } from "@/lib/engine";
import { portalEmpresaConfig } from "@/lib/empresa";
import { useStore, vistaPeriodo } from "@/lib/store";
import type { DatosOperativosIniciales } from "@/lib/backend-operativo";

export default function ReciboClient({
  id,
  mes,
  desdePortal,
  imprimir,
  datosIniciales,
}: {
  id: string;
  mes: string;
  desdePortal: boolean;
  imprimir: boolean;
  datosIniciales: DatosOperativosIniciales;
}) {
  const store = useStore();
  const marcarVisto = useStore((s) => s.marcarVisto);
  const datos = datosIniciales.modo === "real" ? datosIniciales : store;
  const e = datos.empleados.find((x) => x.id === id);
  const empresa = datos.empresas.find((x) => x.id === e?.empresaId);
  const v = empresa ? vistaPeriodo(empresa.id, mes, datos) : null;
  const r = v?.resultados?.find((x) => x.empleadoId === id);
  const portalEmpleadoHabilitado = empresa ? portalEmpresaConfig(empresa).portalEmpleadoRecibos : false;
  const listo = !!(e && empresa && v && v.periodo.etapa === "cerrada" && r && !r.fueraDeAlcance);

  useEffect(() => {
    if (listo && desdePortal && empresa && portalEmpleadoHabilitado) {
      marcarVisto(id, mes);
      if (datosIniciales.modo === "real") void marcarReciboVistoReal({ empleadoId: id, empresaId: empresa.id, mes });
    }
    if (listo && imprimir) setTimeout(() => window.print(), 300);
  }, [listo, desdePortal, imprimir, id, mes, marcarVisto, datosIniciales.modo, empresa, portalEmpleadoHabilitado]);

  if (!listo || !e || !empresa || !v || !r) return <p className="p-10 text-center text-tinta">Este recibo todavía no fue emitido.</p>;
  if (desdePortal && !portalEmpleadoHabilitado) return <p className="p-10 text-center text-tinta">La consulta web de recibos no está habilitada para esta empresa.</p>;

  return (
    <div className="document-shell min-h-screen py-3 print:min-h-0 print:py-0">
      <div className="mx-auto max-w-3xl px-3 print:p-0">
        <div className="no-print mb-3 flex justify-end gap-2">
          <Boton variante="secundario" onClick={() => history.back()}>Volver</Boton>
          <Boton onClick={() => window.print()}><Printer size={15} /> Imprimir o guardar PDF</Boton>
        </div>
        <ReciboDoc empresa={empresa} empleado={e} mes={mes} r={r} periodo={v.periodo} huella={v.vigente?.hash ?? hashDe(r)} />
      </div>
    </div>
  );
}

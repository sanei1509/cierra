"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { Printer } from "lucide-react";
import { useHidratado, useStore, vistaPeriodo } from "@/lib/store";
import { hashDe } from "@/lib/engine";
import { Boton } from "@/components/ui";
import { ReciboDoc } from "@/components/recibo-doc";

function Recibo() {
  const { id, mes } = useParams<{ id: string; mes: string }>();
  const sp = useSearchParams();
  const d = useStore();
  const marcarVisto = useStore((s) => s.marcarVisto);
  const e = d.empleados.find((x) => x.id === id);
  const empresa = d.empresas.find((x) => x.id === e?.empresaId);
  const v = empresa ? vistaPeriodo(empresa.id, mes, d) : null;
  const r = v?.resultados?.find((x) => x.empleadoId === id);
  const listo = !!(e && empresa && v && v.periodo.etapa === "cerrada" && r && !r.fueraDeAlcance);
  const desdePortal = sp.get("desde") === "portal";

  useEffect(() => {
    // Solo cuenta como "visto" si lo abre el propio empleado desde su portal
    if (listo && desdePortal) marcarVisto(id, mes);
    if (listo && sp.get("imprimir")) setTimeout(() => window.print(), 300);
  }, [listo, desdePortal, sp, id, mes, marcarVisto]);

  if (!listo || !e || !empresa || !v || !r) return <p className="p-10 text-center text-tinta">Este recibo todavía no fue emitido.</p>;

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

export default function Page() {
  const ok = useHidratado();
  if (!ok) return null;
  return (
    <Suspense>
      <Recibo />
    </Suspense>
  );
}

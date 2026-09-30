import type { Empleado, Empresa, Periodo, ResultadoEmpleado } from "@/lib/types";
import { fmt2, nombreMes } from "@/lib/format";
import { datosEmpresaRecibo } from "@/lib/empresa";
import { ESTUDIO } from "@/lib/seed";
import { MarcaEmpresa } from "./ui";

function Fila({ c, d, i }: { c: string; d?: string; i: number }) {
  return (
    <tr className="border-t border-linea">
      <td className="py-1.5 pr-2">
        {c}
        {d && <span className="ml-1 text-xs text-apagado">{d}</span>}
      </td>
      <td className="num py-1.5 text-right">{fmt2(i)}</td>
    </tr>
  );
}

/** Recibo de sueldo. Se genera solo desde una versión cerrada (RN-06). */
export function ReciboDoc({ empresa, empleado: e, mes, r, periodo, huella }: { empresa: Empresa; empleado: Empleado; mes: string; r: ResultadoEmpleado; periodo: Periodo; huella: string }) {
  const haberes = r.lineas.filter((l) => l.tipo === "haber");
  const desc = r.lineas.filter((l) => l.tipo === "descuento");
  const datos = datosEmpresaRecibo(empresa);
  return (
    <article className="rounded-[var(--radius-panel)] bg-white p-8 text-[13px] break-after-page print:rounded-none print:p-0">
      <header className="flex flex-wrap justify-between gap-4 border-b-2 border-tinta pb-4">
        <div className="flex items-start gap-3">
          <MarcaEmpresa empresa={empresa} size={48} />
          <div>
            <p className="text-lg font-extrabold">{datos.nombre}</p>
            <p>{datos.razonSocial !== datos.nombre ? `${datos.razonSocial} · ` : ""}RUT {datos.rut} · BPS {datos.bps}</p>
            {datos.direccion && <p>{datos.direccion}</p>}
            <p className="text-apagado">{datos.actividad} · Grupo {datos.grupoSubgrupo}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-extrabold">Recibo de sueldo</p>
          <p>{nombreMes(mes)}</p>
        </div>
      </header>
      <section className="grid grid-cols-2 gap-x-6 gap-y-1 border-b border-linea py-4 sm:grid-cols-4">
        {[
          ["Trabajador", `${e.apellido}, ${e.nombre}`],
          ["Cédula", e.ci],
          ["Cargo / categoría", `${e.cargo} · ${e.categoria}`],
          ["Fecha de ingreso", e.ingreso],
          ["Remuneración", "Mensual"],
          ["Días trabajados", String(r.lineas.find((l) => l.codigo === "001")?.cantidad ?? 30)],
          ["Forma de pago", e.cuenta ?? "—"],
          ["Aportación", "Industria y Comercio"],
        ].map(([k, val]) => (
          <div key={k}>
            <p className="text-[11px] text-apagado">{k}</p>
            <p className="font-semibold">{val}</p>
          </div>
        ))}
      </section>
      <section className="grid items-start gap-6 py-4 sm:grid-cols-2">
        <table className="w-full">
          <thead>
            <tr><th className="pb-1 text-left">Haberes</th><th className="pb-1 text-right">Importe</th></tr>
          </thead>
          <tbody>
            {haberes.map((l) => (
              <Fila key={l.codigo} c={l.concepto} d={l.cantidad && l.codigo !== "001" ? `(${l.cantidad})` : undefined} i={l.importe} />
            ))}
            <tr className="border-t-2 border-tinta font-bold"><td className="py-1.5">Total haberes</td><td className="num py-1.5 text-right">{fmt2(r.totalHaberes)}</td></tr>
          </tbody>
        </table>
        <table className="w-full">
          <thead>
            <tr><th className="pb-1 text-left">Descuentos</th><th className="pb-1 text-right">Importe</th></tr>
          </thead>
          <tbody>
            {desc.map((l) => (
              <Fila key={l.codigo} c={l.concepto} d={l.tasa ? `(${(l.tasa * 100).toLocaleString("es-UY")}%)` : undefined} i={l.importe} />
            ))}
            <tr className="border-t-2 border-tinta font-bold"><td className="py-1.5">Total descuentos</td><td className="num py-1.5 text-right">{fmt2(r.descuentos)}</td></tr>
          </tbody>
        </table>
      </section>
      <div className="flex items-center justify-between rounded-2xl bg-petroleo px-5 py-4 text-white print:border-2 print:border-tinta print:bg-white print:text-tinta">
        <span className="font-semibold">Líquido a cobrar</span>
        <span className="num text-2xl font-extrabold">{fmt2(r.liquido)}</span>
      </div>
      <p className="mt-3 text-apagado">Nominal gravado {fmt2(r.nominalGravado)} · Aportes patronales {fmt2(r.aportesPatronales)}</p>
      <footer className="mt-8 grid gap-6 border-t border-linea pt-4 text-[11px] text-apagado sm:grid-cols-2">
        <p>
          Recibo electrónico emitido desde la liquidación cerrada{periodo.cerrado ? ` versión ${periodo.cerrado.version}` : ""}. Huella de integridad {huella}.
          Liquidado por {ESTUDIO.nombre}. Podés solicitar una copia en papel a tu empleador.
        </p>
        <div className="sm:text-right">
          <div className="ml-auto mt-6 w-48 border-t border-tinta pt-1 text-center">Firma del trabajador</div>
        </div>
      </footer>
    </article>
  );
}

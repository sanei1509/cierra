"use client";

import { CUENTAS_ASIENTO_SUELDOS, FLUJO_RRHH, LAUDOS, GRUPOS_FUERA_DE_ALCANCE, TRATAMIENTO_REMUNERACIONES } from "@/lib/params";
import { USUARIOS, ESTUDIO } from "@/lib/seed";
import { fmt } from "@/lib/format";
import { Avatar, Chip, Panel } from "@/components/ui";
import { ParametrosNormativosPanel } from "./parametros-editor";

const ROLES = {
  admin: { l: "Administradora", d: "Todo, incluido reabrir períodos y cambiar parámetros" },
  liquidador: { l: "Liquidador", d: "Cargar novedades, calcular, enviar y cerrar. No reabre." },
  lectura: { l: "Solo lectura", d: "Ve la cartera, no modifica nada" },
};

export default function Configuracion() {
  return (
    <div className="space-y-3">
      <Panel className="px-7 py-6">
        <h1 className="text-[34px] font-extrabold leading-tight tracking-tight">Configuración</h1>
        <p className="mt-1 text-[15px] text-apagado">{ESTUDIO.nombre} · reglas de cálculo, laudos y accesos.</p>
      </Panel>

      <div className="grid min-w-0 gap-3 xl:grid-cols-2">
        <ParametrosNormativosPanel />

        <div className="min-w-0 space-y-3">
          <Panel className="min-w-0 p-6">
            <h2 className="text-lg font-bold tracking-tight">Usuarios del estudio</h2>
            <ul className="mt-4 space-y-2">
              {USUARIOS.map((u) => (
                <li key={u.id} className="flex items-center gap-3 rounded-2xl bg-hundido px-4 py-3">
                  <Avatar nombre={u.nombre} tono="crema" size={36} />
                  <span className="flex-1 text-sm">
                    <span className="block font-semibold">{u.nombre}</span>
                    <span className="block text-xs text-apagado">{ROLES[u.rol].d}</span>
                  </span>
                  <Chip tono={u.rol === "admin" ? "lila" : u.rol === "liquidador" ? "cielo" : "gris"}>{ROLES[u.rol].l}</Chip>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-apagado">Los permisos definen qué acciones puede realizar cada integrante dentro del estudio.</p>
          </Panel>
          <Panel className="min-w-0 p-6">
            <h2 className="text-lg font-bold tracking-tight">Alcance soportado</h2>
            <p className="mt-1 text-sm text-apagado">Trabajadores mensuales de Industria y Comercio y servicios. El sistema bloquea (no estima) estos casos:</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {Object.entries(GRUPOS_FUERA_DE_ALCANCE).map(([g, d]) => <li key={g} className="min-w-0"><Chip tono="rosa" className="!whitespace-normal">Grupo {g}: {d}</Chip></li>)}
              <li><Chip tono="rosa" className="!whitespace-normal">Jornaleros</Chip></li>
            </ul>
          </Panel>
        </div>
      </div>

      <div className="grid min-w-0 gap-3 xl:grid-cols-[420px_1fr]">
        <Panel className="min-w-0 p-6">
          <h2 className="text-lg font-bold tracking-tight">Flujo RRHH de la planilla</h2>
          <ol className="mt-4 space-y-2">
            {FLUJO_RRHH.map((p) => (
              <li key={p.n} className="flex gap-3 rounded-2xl bg-hundido px-4 py-3 text-sm">
                <span className="num flex size-6 shrink-0 items-center justify-center rounded-full bg-petroleo text-xs font-bold text-white">{p.n}</span>
                <span className="flex-1">
                  <span className="block font-semibold">{p.tarea}</span>
                  <span className="text-xs text-apagado">{p.sistema}</span>
                </span>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel className="min-w-0 p-6">
          <h2 className="text-lg font-bold tracking-tight">Tratamiento CESS / IRPF</h2>
          <p className="text-sm text-apagado">Resumen operativo importado de la hoja CESS - BPS. Lo parcial queda visible para no liquidarlo como si fuera una regla simple.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-full text-sm md:min-w-[700px]">
              <thead>
                <tr className="text-left text-xs text-apagado">
                  <th className="py-2 font-semibold">Concepto</th>
                  <th className="py-2 font-semibold">CESS</th>
                  <th className="py-2 font-semibold">IRPF</th>
                </tr>
              </thead>
              <tbody>
                {TRATAMIENTO_REMUNERACIONES.map((r) => (
                  <tr key={r.concepto} className="border-t border-linea">
                    <td className="py-2 font-semibold">{r.concepto}</td>
                    <td className="py-2 text-tinta-2">{r.cess}</td>
                    <td className="py-2 text-tinta-2">{r.irpf}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel className="min-w-0 p-6">
        <h2 className="text-lg font-bold tracking-tight">Asiento de sueldos</h2>
        <p className="text-sm text-apagado">Cuentas base tomadas de la hoja “Asiento sueldos”. En el MVP se convierten en una exportación contable.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[
            ["Debe", CUENTAS_ASIENTO_SUELDOS.debe],
            ["Haber", CUENTAS_ASIENTO_SUELDOS.haber],
          ].map(([titulo, cuentas]) => (
            <section key={titulo as string} className="rounded-3xl bg-hundido px-4 py-3">
              <h3 className="text-sm font-bold">{titulo as string}</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {(cuentas as readonly string[]).map((c) => <li key={c}>{c}</li>)}
              </ul>
            </section>
          ))}
        </div>
      </Panel>

      <Panel className="min-w-0 p-6">
        <h2 className="text-lg font-bold tracking-tight">Laudos por categoría</h2>
        <p className="text-sm text-apagado">Mínimos por grupo, subgrupo y categoría con vigencia. Valores de ejemplo.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-full text-sm md:min-w-[600px]">
            <thead>
              <tr className="text-left text-xs text-apagado">
                <th className="py-2 font-semibold">Grupo</th>
                <th className="py-2 font-semibold">Categoría</th>
                <th className="py-2 text-right font-semibold">Mínimo</th>
                <th className="py-2 pl-6 font-semibold">Vigencia</th>
              </tr>
            </thead>
            <tbody>
              {LAUDOS.map((l) => (
                <tr key={`${l.grupo}${l.subgrupo}${l.categoria}`} className="border-t border-linea">
                  <td className="py-2">{l.grupo}.{l.subgrupo} · {l.nombreGrupo}</td>
                  <td className="py-2">{l.categoria}</td>
                  <td className="num py-2 text-right font-semibold">{fmt(l.minimo)}</td>
                  <td className="py-2 pl-6 text-apagado">desde {l.vigenciaDesde}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

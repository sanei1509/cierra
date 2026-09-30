"use client";

import { CUENTAS_ASIENTO_SUELDOS, FLUJO_RRHH, PARAMETROS, LAUDOS, MOTOR_VERSION, GRUPOS_FUERA_DE_ALCANCE, TRATAMIENTO_REMUNERACIONES } from "@/lib/params";
import { USUARIOS, ESTUDIO } from "@/lib/seed";
import { fmt, pct } from "@/lib/format";
import { UMBRAL_VARIACION } from "@/lib/validations";
import { Avatar, Chip, Panel } from "@/components/ui";

const ROLES = {
  admin: { l: "Administradora", d: "Todo, incluido reabrir períodos y cambiar parámetros" },
  liquidador: { l: "Liquidador", d: "Cargar novedades, calcular, enviar y cerrar. No reabre." },
  lectura: { l: "Solo lectura", d: "Ve la cartera, no modifica nada" },
};

export default function Configuracion() {
  const vig = PARAMETROS.at(-1)!;
  return (
    <div className="space-y-3">
      <Panel className="px-7 py-6">
        <h1 className="text-[34px] font-extrabold leading-tight tracking-tight">Configuración</h1>
        <p className="mt-1 text-[15px] text-apagado">{ESTUDIO.nombre} · reglas de cálculo, laudos y accesos.</p>
      </Panel>

      <div className="grid gap-3 xl:grid-cols-2">
        <Panel className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight">Parámetros normativos</h2>
              <p className="text-sm text-apagado">Cada cambio crea una versión con vigencia. Las liquidaciones cerradas guardan la versión que usaron.</p>
            </div>
            <Chip tono="crema">Valores de ejemplo</Chip>
          </div>
          <ul className="mt-4 space-y-2">
            {[...PARAMETROS].reverse().map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-hundido px-4 py-3 text-sm">
                <span className="font-bold">{p.id}</span>
                <span className="text-apagado">desde {p.vigenciaDesde}{p.vigenciaHasta ? ` hasta ${p.vigenciaHasta}` : ""}</span>
                <span className="ml-auto">{p.vigenciaHasta ? <Chip tono="gris">Histórica</Chip> : <Chip tono="menta">Vigente</Chip>}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
            {[
              ["BFC", vig.bfc ? fmt(vig.bfc) : "—"],
              ["BPC", fmt(vig.bpc)],
              ["Salario mínimo nacional", vig.salarioMinimoNacional ? fmt(vig.salarioMinimoNacional) : "—"],
              ["Cuota mutual", vig.cuotaMutual ? fmt(vig.cuotaMutual) : "—"],
              ["Costo promedio equivalente", vig.costoPromedioEquivalente ? fmt(vig.costoPromedioEquivalente) : "—"],
              ["Tope aporte jubilatorio", fmt(vig.topeJubilatorio)],
              ["Jubilatorio personal / patronal", `${pct(vig.personal.jubilatorio)} / ${pct(vig.patronal.jubilatorio)}`],
              ["FONASA personal", `${pct(vig.fonasa.tasaBaja)} · ${pct(vig.fonasa.tasaSinHijos)} · ${pct(vig.fonasa.tasaConHijos)} (+${pct(vig.fonasa.adicionalConyuge)} cónyuge)`],
              ["FONASA patronal", pct(vig.patronal.fonasa)],
              ["FRL personal / patronal", `${pct(vig.personal.frl, 2)} / ${pct(vig.patronal.frl, 2)}`],
              ["FGCL", pct(vig.patronal.fgcl, 3)],
              ["IRPF deducción", `${pct(vig.irpf.tasaDeduccionBaja)} hasta ${vig.irpf.umbralTasaDeduccionBpc} BPC, luego ${pct(vig.irpf.tasaDeduccionAlta)}`],
              ["Deducción por hijo", `${vig.irpf.deduccionHijoBpcAnual} BPC anuales`],
              ["Valor hora", `sueldo ÷ ${vig.horas.divisor}, recargo ${pct(vig.horas.recargoExtra)}`],
              ["Umbral de variación", `${pct(UMBRAL_VARIACION, 0)} vs. mes anterior`],
              ["Motor", MOTOR_VERSION],
            ].map(([k, v]) => (
              <div key={k} className="border-t border-linea pt-2.5">
                <dt className="text-xs text-apagado">{k}</dt>
                <dd className="num font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5">
            {vig.topesAfap && (
              <>
                <p className="text-xs font-semibold text-apagado">Topes AFAP Ley 16.713</p>
                <div className="mt-2 mb-4 flex flex-wrap gap-1.5">
                  {vig.topesAfap.map((t) => (
                    <span key={t.tramo} className="rounded-full bg-hundido px-2.5 py-1 text-xs">
                      Tramo {t.tramo} <b>{fmt(t.monto)}</b>
                    </span>
                  ))}
                </div>
              </>
            )}
            <p className="text-xs font-semibold text-apagado">Franjas IRPF mensuales</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {vig.irpf.franjasBpc.map((f) => (
                <span key={f.desde} className="rounded-full bg-hundido px-2.5 py-1 text-xs">
                  {f.desde}–{f.hasta ?? "∞"} BPC <b>{pct(f.tasa, 0)}</b>
                </span>
              ))}
            </div>
          </div>
          <p className="mt-5 rounded-2xl bg-crema px-4 py-3 text-xs text-crema-t">{vig.fuente}. Antes del piloto deben validarse con un contador asesor y cargarse con su resolución de origen.</p>
        </Panel>

        <div className="space-y-3">
          <Panel className="p-6">
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
            <p className="mt-3 text-xs text-apagado">Cambiá de usuario desde el menú superior para probar los permisos.</p>
          </Panel>
          <Panel className="p-6">
            <h2 className="text-lg font-bold tracking-tight">Alcance soportado</h2>
            <p className="mt-1 text-sm text-apagado">Trabajadores mensuales de Industria y Comercio y servicios. El sistema bloquea (no estima) estos casos:</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {Object.entries(GRUPOS_FUERA_DE_ALCANCE).map(([g, d]) => <li key={g}><Chip tono="rosa">Grupo {g}: {d}</Chip></li>)}
              <li><Chip tono="rosa">Jornaleros</Chip></li>
            </ul>
          </Panel>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[420px_1fr]">
        <Panel className="p-6">
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

        <Panel className="p-6">
          <h2 className="text-lg font-bold tracking-tight">Tratamiento CESS / IRPF</h2>
          <p className="text-sm text-apagado">Resumen operativo importado de la hoja CESS - BPS. Lo parcial queda visible para no liquidarlo como si fuera una regla simple.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
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

      <Panel className="p-6">
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

      <Panel className="p-6">
        <h2 className="text-lg font-bold tracking-tight">Laudos por categoría</h2>
        <p className="text-sm text-apagado">Mínimos por grupo, subgrupo y categoría con vigencia. Valores de ejemplo.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
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

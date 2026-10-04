"use client";

import { useState } from "react";
import { Mail, Plus } from "lucide-react";
import { CUENTAS_ASIENTO_SUELDOS, FLUJO_RRHH, LAUDOS, GRUPOS_FUERA_DE_ALCANCE, TRATAMIENTO_REMUNERACIONES } from "@/lib/params";
import { USUARIOS, ESTUDIO } from "@/lib/seed";
import { fmt } from "@/lib/format";
import { Avatar, Boton, Campo, Chip, Panel, inputCls } from "@/components/ui";
import { ParametrosNormativosPanel } from "./parametros-editor";

const ROLES = {
  admin: { l: "Administradora", d: "Puede configurar el estudio, reabrir períodos y editar parámetros." },
  liquidador: { l: "Liquidador", d: "Carga novedades, calcula, envía a aprobación y cierra períodos." },
  lectura: { l: "Solo lectura", d: "Consulta empresas, liquidaciones y recibos sin modificar datos." },
};

export default function Configuracion() {
  const [mostrarInvitacion, setMostrarInvitacion] = useState(false);
  const [mensajeInvitacion, setMensajeInvitacion] = useState("");
  const invitar = (form: FormData) => {
    const nombre = String(form.get("nombre") ?? "").trim();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const rol = String(form.get("rol") ?? "liquidador") as keyof typeof ROLES;
    if (!nombre || !/^\S+@\S+\.\S+$/.test(email)) {
      setMensajeInvitacion("Completá nombre y email para preparar la invitación.");
      return;
    }
    setMensajeInvitacion(`Invitación preparada para ${nombre}: rol ${ROLES[rol].l.toLowerCase()} y envío a ${email}. Cuando el envío real esté activo, esto creará el usuario y mandará el email de acceso.`);
    setMostrarInvitacion(false);
  };

  return (
    <div className="space-y-3">
      <Panel className="px-7 py-6">
        <h1 className="text-[34px] font-extrabold leading-tight tracking-tight">Configuración del estudio</h1>
        <p className="mt-1 text-[15px] text-apagado">{ESTUDIO.nombre} · parámetros de cálculo, permisos y referencias normativas.</p>
      </Panel>

      <ParametrosNormativosPanel />

      <div className="grid min-w-0 gap-3 xl:grid-cols-2">
        <div className="min-w-0 space-y-3">
          <Panel className="min-w-0 p-6">
            <div className="flex flex-wrap items-start gap-3">
              <div className="mr-auto">
                <h2 className="text-lg font-bold tracking-tight">Usuarios del estudio</h2>
                <p className="mt-1 text-sm text-apagado">Administrá quién entra al sistema y qué puede hacer dentro del estudio.</p>
              </div>
              <Boton variante="secundario" onClick={() => setMostrarInvitacion((v) => !v)}><Plus size={15} /> Invitar integrante</Boton>
            </div>
            {mostrarInvitacion && (
              <form action={invitar} className="mt-4 rounded-2xl border border-linea bg-hundido p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <Campo label="Nombre"><input name="nombre" className={inputCls} placeholder="Ej. Valentina Rodríguez" /></Campo>
                  <Campo label="Email"><input name="email" type="email" className={inputCls} placeholder="persona@estudio.uy" /></Campo>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                  <Campo label="Rol">
                    <select name="rol" className={inputCls} defaultValue="liquidador">
                      <option value="admin">Administradora</option>
                      <option value="liquidador">Liquidador</option>
                      <option value="lectura">Solo lectura</option>
                    </select>
                  </Campo>
                  <Boton type="submit"><Mail size={15} /> Preparar invitación</Boton>
                </div>
              </form>
            )}
            {mensajeInvitacion && <p className="mt-4 rounded-2xl bg-menta px-4 py-3 text-sm font-semibold text-menta-t">{mensajeInvitacion}</p>}
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
            <p className="mt-3 text-xs text-apagado">Los roles afectan acciones sensibles como editar parámetros, cerrar períodos o reabrir meses.</p>
          </Panel>
        </div>
        <div className="min-w-0 space-y-3">
          <Panel className="min-w-0 p-6">
            <h2 className="text-lg font-bold tracking-tight">Qué casos cubre el sistema</h2>
            <p className="mt-1 text-sm text-apagado">El motor está pensado para trabajadores mensuales de Industria y Comercio y servicios. Cuando un caso queda fuera de alcance, el sistema lo bloquea en vez de estimarlo.</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {Object.entries(GRUPOS_FUERA_DE_ALCANCE).map(([g, d]) => <li key={g} className="min-w-0"><Chip tono="rosa" className="!whitespace-normal">Grupo {g}: {d}</Chip></li>)}
              <li><Chip tono="rosa" className="!whitespace-normal">Jornaleros</Chip></li>
            </ul>
            <p className="mt-3 text-xs text-apagado">Estos bloqueos evitan cerrar liquidaciones que requieren reglas no implementadas todavía.</p>
          </Panel>
        </div>
      </div>

      <div className="grid min-w-0 gap-3 xl:grid-cols-[420px_1fr]">
        <Panel className="min-w-0 p-6">
          <h2 className="text-lg font-bold tracking-tight">Flujo operativo RRHH</h2>
          <p className="mt-1 text-sm text-apagado">Pasos de referencia tomados de la planilla para ubicar dónde entra Cierra dentro del proceso mensual.</p>
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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight">Referencia CESS / IRPF por concepto</h2>
              <p className="mt-1 text-sm text-apagado">Resumen traído de la hoja CESS - BPS. Es una guía de consulta: el motor no aplica automáticamente todas estas reglas.</p>
            </div>
            <Chip tono="crema">Referencia</Chip>
          </div>
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
        <p className="text-sm text-apagado">Cuentas base tomadas de la hoja “Asiento sueldos”. Más adelante esto debería convertirse en una exportación contable revisable.</p>
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
        <p className="text-sm text-apagado">Mínimos de referencia por grupo, subgrupo y categoría. Usalos para validar el flujo; antes del piloto hay que cargar la fuente oficial vigente.</p>
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

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useMemo, useSyncExternalStore } from "react";
import type { AuditEvent, Empleado, Empresa, Novedad, Periodo, VersionLiquidacion } from "./types";
import { crearSeed, USUARIOS } from "./seed";
import { calcularEmpresa, hashDe } from "./engine";
import { clonarParametrosIniciales, MOTOR_VERSION, parametrosVigentesEn, type Parametros } from "./params";
import { MES_ACTUAL } from "./format";
import { validar, pendientes } from "./validations";
import { estadoVisible } from "./status";
import type { TemaPreferido } from "./theme";

interface Datos {
  empresas: Empresa[];
  empleados: Empleado[];
  novedades: Novedad[];
  periodos: Periodo[];
  audit: AuditEvent[];
  usuarioId: string;
  temaPorUsuario: Record<string, TemaPreferido>;
  estudioLogo?: string;
  parametrosNormativos: Parametros[];
  /** Recibos vistos por el empleado: `${empleadoId}|${mes}` -> fecha ISO */
  vistas: Record<string, string>;
}

export type Accion =
  | "editar"
  | "calcular"
  | "cerrar"
  | "reabrir"
  | "configurar";

interface Acciones {
  setUsuario: (id: string) => void;
  setTemaUsuario: (tema: TemaPreferido) => void;
  setEstudioLogo: (logo?: string) => void;
  puede: (a: Accion) => boolean;
  agregarNovedad: (n: Omit<Novedad, "id" | "fecha"> & { id?: string; fecha?: string }) => void;
  editarNovedad: (id: string, n: Omit<Novedad, "id" | "fecha">, actor?: string) => void;
  borrarNovedad: (id: string, actor?: string) => void;
  solicitarNovedades: (periodoId: string) => void;
  abrirSolicitud: (periodoId: string, actor: string) => void;
  enviarNovedadesCliente: (periodoId: string, actor: string, sinNovedades: boolean) => void;
  marcarRecibidas: (periodoId: string) => void;
  calcular: (periodoId: string) => void;
  aceptarAdvertencia: (periodoId: string, alertaId: string, nota: string) => void;
  enviarAprobacion: (periodoId: string) => void;
  responderAprobacion: (periodoId: string, aprobada: boolean, comentario: string, actor: string) => void;
  aprobarInterno: (periodoId: string) => void;
  cancelarLiquidacion: (periodoId: string, motivo: string) => void;
  cerrar: (periodoId: string) => void;
  generarBps: (periodoId: string) => void;
  marcarBpsPresentado: (periodoId: string) => void;
  rectificar: (periodoId: string, motivo: string) => void;
  actualizarEmpleado: (id: string, cambios: Partial<Empleado>, resumen: string) => void;
  agregarNota: (periodoId: string, texto: string) => void;
  agregarEmpresa: (empresa: Empresa, usuarioAcceso: { nombre: string; email: string }) => void;
  agregarEmpleado: (empleado: Empleado, usuarioAcceso?: { nombre: string; email: string }) => void;
  agregarEmpleados: (empleados: Empleado[], empresaId: string) => void;
  actualizarEmpresa: (id: string, cambios: Partial<Empresa>, resumen: string) => void;
  actualizarParametroNormativo: (parametro: Parametros, resumen: string) => void;
  restaurarParametrosNormativos: () => void;
  marcarVisto: (empleadoId: string, mes: string) => void;
  reiniciar: () => void;
}

const ahora = () => new Date().toISOString();
let seq = 0;
const uid = (p: string) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

function parametrosDe(d: Partial<Pick<Datos, "parametrosNormativos">>, mes: string) {
  return parametrosVigentesEn(d.parametrosNormativos?.length ? d.parametrosNormativos : clonarParametrosIniciales(), mes);
}

function versionDe(d: Pick<Datos, "empresas" | "empleados" | "novedades"> & Partial<Pick<Datos, "parametrosNormativos">>, periodo: Periodo, por: string, numero: number): VersionLiquidacion {
  const empresa = d.empresas.find((e) => e.id === periodo.empresaId)!;
  const parametros = parametrosDe(d, periodo.mes);
  const resultados = calcularEmpresa(empresa, d.empleados, periodo.mes, d.novedades, parametros);
  return {
    version: numero,
    creada: ahora(),
    por,
    motor: MOTOR_VERSION,
    parametros: parametros.id,
    resultados,
    hash: hashDe(resultados),
  };
}

function estadoInicial(): Datos {
  const s = crearSeed();
  const parametrosNormativos = clonarParametrosIniciales();
  const fechas: Record<string, string> = {
    espiga: "2026-09-19T12:00:00",
    delprado: "2026-09-20T18:00:00",
    brio: "2026-09-21T10:00:00",
    visionsur: "2026-09-22T13:30:00",
    ferrari: "2026-09-23T12:30:00",
    atlantida: "2026-09-21T09:00:00",
  };
  // Seed de versiones congruentes con la etapa de cada período
  const periodos = s.periodos.map((p) => {
    if (["novedades", "recibidas"].includes(p.etapa)) return p;
    const por = p.empresaId === "delprado" || p.empresaId === "atlantida" || p.empresaId === "brio" ? "Martín Suárez" : "Lucía Pereira";
    const v = { ...versionDe({ ...s, parametrosNormativos }, p, por, 1), creada: fechas[p.empresaId] };
    const np: Periodo = { ...p, versiones: [v] };
    if (p.etapa === "enviada") np.aprobacion = { version: 1, estado: "pendiente", enviada: "2026-09-22T13:40:00" };
    if (p.etapa === "devuelta")
      np.aprobacion = {
        version: 1,
        estado: "devuelta",
        enviada: "2026-09-22T09:00:00",
        fecha: "2026-09-23T17:10:00",
        por: "Sergio Machado",
        comentario: "Falta la comisión de Natalia: son $ 18.000, no $ 12.000.",
      };
    if (p.etapa === "aprobada" || p.etapa === "cerrada")
      np.aprobacion = { version: 1, estado: "aprobada", enviada: fechas[p.empresaId], fecha: fechas[p.empresaId], por: "Cliente" };
    if (p.etapa === "cerrada") np.cerrado = { fecha: fechas[p.empresaId], por, version: 1 };
    return np;
  });
  return {
    ...s,
    periodos,
    usuarioId: "u1",
    temaPorUsuario: {},
    estudioLogo: undefined,
    parametrosNormativos,
    vistas: { "espiga-1|2026-09": "2026-09-19T20:14:00", "espiga-2|2026-09": "2026-09-20T08:02:00", "delprado-1|2026-09": "2026-09-21T12:40:00" },
  };
}

export const useStore = create<Datos & Acciones>()(
  persist(
    (set, get) => {
      const actor = () => USUARIOS.find((u) => u.id === get().usuarioId)!.nombre;
      const log = (e: Omit<AuditEvent, "id" | "fecha" | "actor"> & { actor?: string }) =>
        set((s) => ({ audit: [{ id: uid("a"), fecha: ahora(), actor: e.actor ?? actor(), ...e }, ...s.audit] }));
      const upd = (periodoId: string, f: (p: Periodo) => Partial<Periodo>) =>
        set((s) => ({ periodos: s.periodos.map((p) => (p.id === periodoId ? { ...p, ...f(p) } : p)) }));
      const asegurarPeriodo = (periodoId: string) => {
        const existente = get().periodos.find((p) => p.id === periodoId);
        if (existente) return existente;
        const empresa = get().empresas.find((e) => periodoId.startsWith(`${e.id}-`));
        const mes = empresa ? periodoId.slice(empresa.id.length + 1) : "";
        if (!empresa || !/^\d{4}-\d{2}$/.test(mes)) return undefined;
        const periodo: Periodo = {
          id: periodoId,
          empresaId: empresa.id,
          mes,
          etapa: "novedades",
          fechaObjetivo: `${mes}-28`,
          sinNovedades: false,
          versiones: [],
          advertenciasAceptadas: {},
          bps: "pendiente",
          rectificaciones: [],
          notas: [],
        };
        set((s) => ({ periodos: [...s.periodos, periodo] }));
        return periodo;
      };
      const per = (id: string) => get().periodos.find((p) => p.id === id)!;
      const emp = (id: string) => get().empresas.find((e) => e.id === id)!;

      return {
        ...estadoInicial(),
        setUsuario: (id) => set({ usuarioId: id }),
        setTemaUsuario: (tema) => set((s) => ({ temaPorUsuario: { ...s.temaPorUsuario, [s.usuarioId]: tema } })),
        setEstudioLogo: (logo) => set({ estudioLogo: logo }),
        puede: (a) => {
          const rol = USUARIOS.find((u) => u.id === get().usuarioId)!.rol;
          if (rol === "lectura") return false;
          if (rol === "liquidador") return a !== "reabrir" && a !== "configurar";
          return true;
        },
        agregarNovedad: (n) => {
          set((s) => ({ novedades: [...s.novedades, { ...n, id: n.id ?? uid("n"), fecha: n.fecha ?? ahora() }] }));
          const p = get().periodos.find((x) => x.empresaId === n.empresaId && x.mes === n.mes);
          // Cualquier cambio invalida la versión enviada / aprobada (RN-05)
          if (p && ["enviada", "aprobada", "devuelta"].includes(p.etapa)) upd(p.id, () => ({ etapa: "borrador", aprobacion: undefined }));
          const e = get().empleados.find((x) => x.id === n.empleadoId);
          log({ actor: n.origen === "cliente" ? n.autor : undefined, empresaId: n.empresaId, entidad: "Novedad", accion: `Agregó ${n.tipo.replace("_", " ")} a ${e?.nombre} ${e?.apellido}`, despues: n.cantidad ? String(n.cantidad) : n.importe ? `$ ${n.importe}` : undefined });
        },
        editarNovedad: (id, n, a) => {
          const anterior = get().novedades.find((x) => x.id === id);
          if (!anterior) return;
          set((s) => ({ novedades: s.novedades.map((x) => x.id === id ? { ...x, ...n } : x) }));
          const p = get().periodos.find((x) => x.empresaId === n.empresaId && x.mes === n.mes);
          if (p && ["enviada", "aprobada", "devuelta"].includes(p.etapa)) upd(p.id, () => ({ etapa: "borrador", aprobacion: undefined }));
          log({ actor: a, empresaId: n.empresaId, entidad: "Novedad", accion: `Editó ${n.tipo.replace("_", " ")}`, antes: anterior.cantidad ? String(anterior.cantidad) : anterior.importe ? `$ ${anterior.importe}` : undefined, despues: n.cantidad ? String(n.cantidad) : n.importe ? `$ ${n.importe}` : undefined });
        },
        borrarNovedad: (id, a) => {
          const n = get().novedades.find((x) => x.id === id);
          if (!n) return;
          set((s) => ({ novedades: s.novedades.filter((x) => x.id !== id) }));
          log({ actor: a, empresaId: n.empresaId, entidad: "Novedad", accion: `Eliminó ${n.tipo.replace("_", " ")}`, antes: n.cantidad ? String(n.cantidad) : `$ ${n.importe}` });
        },
        solicitarNovedades: (id) => {
          const p = asegurarPeriodo(id);
          if (!p) return;
          upd(id, (p) => ({ solicitud: { enviada: ahora(), abierta: p.solicitud?.abierta } }));
          const empresa = get().empresas.find((x) => x.id === p.empresaId);
          log({ empresaId: p.empresaId, entidad: "Solicitud", accion: "Solicitó novedades por email", detalle: empresa ? `a ${empresa.contacto.email}` : undefined });
        },
        abrirSolicitud: (id, a) => {
          const p = asegurarPeriodo(id);
          if (!p) return;
          if (p.solicitud && !p.solicitud.abierta) {
            upd(id, (p) => ({ solicitud: { ...p.solicitud!, abierta: ahora() } }));
            log({ actor: a, empresaId: p.empresaId, entidad: "Solicitud", accion: "Abrió la solicitud de novedades" });
          }
        },
        enviarNovedadesCliente: (id, a, sin) => {
          const p = asegurarPeriodo(id);
          if (!p) return;
          upd(id, (p) => ({
            etapa: p.etapa === "novedades" ? "recibidas" : p.etapa,
            sinNovedades: sin,
            solicitud: { enviada: p.solicitud?.enviada ?? ahora(), abierta: p.solicitud?.abierta ?? ahora(), respondida: ahora() },
          }));
          log({ actor: a, empresaId: p.empresaId, entidad: "Novedades", accion: sin ? "Confirmó que no hay novedades" : "Envió novedades del mes" });
        },
        marcarRecibidas: (id) => {
          const p = asegurarPeriodo(id);
          if (!p) return;
          upd(id, () => ({ etapa: "recibidas" }));
          log({ empresaId: p.empresaId, entidad: "Novedades", accion: "Marcó novedades como completas" });
        },
        calcular: (id) => {
          const p = per(id);
          const v = versionDe(get(), p, actor(), p.versiones.length + 1);
          upd(id, (p) => ({ versiones: [...p.versiones, v], etapa: "borrador", aprobacion: undefined }));
          log({ empresaId: p.empresaId, entidad: "Liquidación", accion: `Calculó la versión ${v.version}`, detalle: `${v.motor} · parámetros ${v.parametros} · hash ${v.hash.slice(0, 8)}` });
        },
        aceptarAdvertencia: (id, alertaId, nota) => {
          upd(id, (p) => ({ advertenciasAceptadas: { ...p.advertenciasAceptadas, [alertaId]: nota } }));
          log({ empresaId: per(id).empresaId, entidad: "Alerta", accion: "Aceptó una advertencia", detalle: nota });
        },
        enviarAprobacion: (id) => {
          const p = per(id);
          const v = p.versiones.at(-1)!.version;
          upd(id, () => ({ etapa: "enviada", aprobacion: { version: v, estado: "pendiente", enviada: ahora() } }));
          log({ empresaId: p.empresaId, entidad: "Aprobación", accion: `Envió la versión ${v} a aprobación`, detalle: `a ${emp(p.empresaId).contacto.nombre}` });
        },
        responderAprobacion: (id, ok, comentario, a) => {
          upd(id, (p) => ({
            etapa: ok ? "aprobada" : "devuelta",
            aprobacion: { ...p.aprobacion!, estado: ok ? "aprobada" : "devuelta", comentario, por: a, fecha: ahora() },
          }));
          log({ actor: `${a} (cliente)`, empresaId: per(id).empresaId, entidad: "Aprobación", accion: ok ? `Aprobó la versión ${per(id).aprobacion?.version}` : `Devolvió la versión ${per(id).aprobacion?.version}`, detalle: comentario || undefined });
        },
        aprobarInterno: (id) => {
          const v = per(id).versiones.at(-1)!.version;
          upd(id, () => ({ etapa: "aprobada", aprobacion: { version: v, estado: "aprobada", enviada: ahora(), fecha: ahora(), por: actor() } }));
          log({ empresaId: per(id).empresaId, entidad: "Aprobación", accion: `Aprobó internamente la versión ${v}`, detalle: "Empresa sin aprobación del cliente" });
        },
        cancelarLiquidacion: (id, motivo) => {
          const p = per(id);
          upd(id, () => ({
            etapa: p.solicitud?.respondida || p.sinNovedades ? "recibidas" : "novedades",
            versiones: [],
            aprobacion: undefined,
            cerrado: undefined,
            bps: "pendiente",
            rectificaciones: [],
            advertenciasAceptadas: {},
          }));
          log({ empresaId: p.empresaId, entidad: "Liquidación", accion: "Canceló la liquidación completa", detalle: motivo });
        },
        cerrar: (id) => {
          const p = per(id);
          const v = p.aprobacion?.version ?? p.versiones.at(-1)!.version;
          const n = p.versiones.find((x) => x.version === v)!.resultados.filter((r) => !r.fueraDeAlcance).length;
          upd(id, () => ({ etapa: "cerrada", cerrado: { fecha: ahora(), por: actor(), version: v } }));
          log({ empresaId: p.empresaId, entidad: "Período", accion: `Cerró el período y publicó ${n} recibos`, detalle: `Versión ${v} bloqueada` });
        },
        generarBps: (id) => {
          upd(id, () => ({ bps: "generado" }));
          log({ empresaId: per(id).empresaId, entidad: "BPS", accion: "Generó archivo de nómina" });
        },
        marcarBpsPresentado: (id) => {
          upd(id, () => ({ bps: "presentado" }));
          log({ empresaId: per(id).empresaId, entidad: "BPS", accion: "Marcó la nómina como presentada" });
        },
        rectificar: (id, motivo) => {
          const p = per(id);
          upd(id, (p) => ({
            etapa: "borrador",
            bps: "pendiente",
            rectificaciones: [...p.rectificaciones, { fecha: ahora(), por: actor(), motivo, desdeVersion: p.cerrado!.version }],
            aprobacion: undefined,
          }));
          log({ empresaId: p.empresaId, entidad: "Período", accion: `Inició rectificación de la versión ${p.cerrado?.version}`, detalle: motivo });
        },
        actualizarEmpleado: (id, cambios, resumen) => {
          const e = get().empleados.find((x) => x.id === id)!;
          set((s) => ({ empleados: s.empleados.map((x) => (x.id === id ? { ...x, ...cambios } : x)) }));
          log({ empresaId: e.empresaId, entidad: "Empleado", accion: `Editó ficha de ${e.nombre} ${e.apellido}`, detalle: resumen });
        },
        agregarNota: (id, texto) => {
          upd(id, (p) => ({ notas: [...p.notas, { fecha: ahora(), por: actor(), texto }] }));
        },
        agregarEmpresa: (empresa, usuarioAcceso) => {
          const periodo: Periodo = {
            id: `${empresa.id}-${MES_ACTUAL}`,
            empresaId: empresa.id,
            mes: MES_ACTUAL,
            etapa: "novedades",
            fechaObjetivo: `${MES_ACTUAL}-28`,
            sinNovedades: false,
            versiones: [],
            advertenciasAceptadas: {},
            bps: "pendiente",
            rectificaciones: [],
            notas: [],
          };
          set((s) => ({ empresas: [...s.empresas, empresa], periodos: [...s.periodos, periodo] }));
          log({
            empresaId: empresa.id,
            entidad: "Empresa",
            accion: `Creó empresa ${empresa.nombre}`,
            detalle: `Acceso inicial para ${usuarioAcceso.nombre} <${usuarioAcceso.email}>`,
          });
        },
        agregarEmpleado: (empleado, usuarioAcceso) => {
          set((s) => ({ empleados: [...s.empleados, empleado] }));
          log({
            empresaId: empleado.empresaId,
            entidad: "Empleado",
            accion: `Creó ficha de ${empleado.nombre} ${empleado.apellido}`,
            detalle: usuarioAcceso ? `Acceso inicial para ${usuarioAcceso.nombre} <${usuarioAcceso.email}>` : `Acceso inicial para ${empleado.email}`,
          });
        },
        agregarEmpleados: (nuevos, empresaId) => {
          set((s) => ({ empleados: [...s.empleados, ...nuevos] }));
          log({ empresaId, entidad: "Empleado", accion: `Importó ${nuevos.length} ${nuevos.length === 1 ? "persona" : "personas"} desde Excel`, detalle: nuevos.map((e) => `${e.nombre} ${e.apellido}`).join(", ") });
        },
        actualizarEmpresa: (id, cambios, resumen) => {
          set((s) => ({ empresas: s.empresas.map((e) => (e.id === id ? { ...e, ...cambios } : e)) }));
          log({ empresaId: id, entidad: "Empresa", accion: resumen });
        },
        actualizarParametroNormativo: (parametro, resumen) => {
          set((s) => ({ parametrosNormativos: s.parametrosNormativos.map((p) => (p.id === parametro.id ? parametro : p)) }));
          log({ entidad: "Parámetros normativos", accion: resumen, detalle: `${parametro.id} · ${parametro.fuente}` });
        },
        restaurarParametrosNormativos: () => {
          set({ parametrosNormativos: clonarParametrosIniciales() });
          log({ entidad: "Parámetros normativos", accion: "Restauró los valores referenciales iniciales" });
        },
        marcarVisto: (empleadoId, mes) => {
          const k = `${empleadoId}|${mes}`;
          if (get().vistas[k]) return;
          const e = get().empleados.find((x) => x.id === empleadoId);
          set((s) => ({ vistas: { ...s.vistas, [k]: ahora() } }));
          log({ actor: e ? `${e.nombre} ${e.apellido} (empleado)` : "Empleado", empresaId: e?.empresaId, entidad: "Recibo", accion: `Vio su recibo de ${mes}` });
        },
        reiniciar: () => set({ ...estadoInicial() }),
      };
    },
    {
      name: "cierra-demo-v1",
      version: 6,
      // Cambió el modelo de datos: se regeneran los datos de ejemplo
      migrate: () => estadoInicial() as never,
    },
  ),
);

/** Evita mismatch de hidratación con localStorage */
export function useHidratado() {
  return useSyncExternalStore(
    (cb) => {
      const unsubscribe = useStore.persist.onFinishHydration(cb);
      queueMicrotask(cb);
      return unsubscribe;
    },
    () => useStore.persist?.hasHydrated() ?? false,
    () => false,
  );
}

export function useUsuario() {
  const id = useStore((s) => s.usuarioId);
  return USUARIOS.find((u) => u.id === id)!;
}

/** Vista derivada del período: alertas, estado y resultados vigentes */
export function usePeriodoVista(empresaId: string, mes = MES_ACTUAL) {
  const empresas = useStore((s) => s.empresas);
  const empleados = useStore((s) => s.empleados);
  const novedades = useStore((s) => s.novedades);
  const periodos = useStore((s) => s.periodos);
  const parametrosNormativos = useStore((s) => s.parametrosNormativos);
  const audit = useStore((s) => s.audit);
  return useMemo(
    () => vistaPeriodo(empresaId, mes, { empresas, empleados, novedades, periodos, parametrosNormativos, audit }),
    [empresaId, mes, empresas, empleados, novedades, periodos, parametrosNormativos, audit],
  );
}

export function vistaPeriodo(
  empresaId: string,
  mes: string,
  d: Pick<Datos, "empresas" | "empleados" | "novedades" | "periodos"> & Partial<Pick<Datos, "parametrosNormativos" | "audit">>,
) {
  const empresa = d.empresas.find((e) => e.id === empresaId)!;
  const periodo =
    d.periodos.find((p) => p.empresaId === empresaId && p.mes === mes) ??
    (mes >= MES_ACTUAL
      ? ({
          id: `${empresaId}-${mes}`,
          empresaId,
          mes,
          etapa: "novedades",
          fechaObjetivo: `${mes}-28`,
          sinNovedades: false,
          versiones: [],
          advertenciasAceptadas: {},
          bps: "pendiente",
          rectificaciones: [],
          notas: [],
        } as Periodo)
      : ({
          // Meses anteriores al actual: cerrados, reproducibles desde el motor.
          id: `${empresaId}-${mes}`,
          empresaId,
          mes,
          etapa: "cerrada",
          fechaObjetivo: `${mes}-28`,
          sinNovedades: false,
          versiones: [],
          advertenciasAceptadas: {},
          bps: "presentado",
          rectificaciones: [],
          notas: [],
        } as Periodo));
  const ultima = periodo.versiones.at(-1);
  const vigente =
    periodo.etapa === "cerrada" && periodo.cerrado
      ? periodo.versiones.find((v) => v.version === periodo.cerrado!.version)
      : ultima;
  const parametros = parametrosDe(d, mes);
  const resultados = vigente?.resultados ?? (periodo.etapa === "cerrada" ? calcularEmpresa(empresa, d.empleados, mes, d.novedades, parametros) : undefined);
  const alertas = periodo.etapa === "cerrada" ? [] : validar(empresa, d.empleados, periodo, d.novedades, resultados, d.audit ?? []);
  const pend = pendientes(alertas, periodo);
  const estado = estadoVisible(periodo, alertas);
  const novedadesMes = d.novedades.filter((n) => n.empresaId === empresaId && n.mes === mes);
  // Stale: hubo cambios después de la última versión
  const desactualizada =
    !!ultima &&
    periodo.etapa !== "cerrada" &&
    hashDe(calcularEmpresa(empresa, d.empleados, mes, d.novedades, parametros)) !== ultima.hash;
  return { empresa, periodo, resultados, vigente, alertas, pend, estado, novedadesMes, desactualizada };
}

export function useVistas(mes = MES_ACTUAL) {
  const empresas = useStore((s) => s.empresas);
  const empleados = useStore((s) => s.empleados);
  const novedades = useStore((s) => s.novedades);
  const periodos = useStore((s) => s.periodos);
  const parametrosNormativos = useStore((s) => s.parametrosNormativos);
  const audit = useStore((s) => s.audit);
  return useMemo(
    () => empresas.map((e) => vistaPeriodo(e.id, mes, { empresas, empleados, novedades, periodos, parametrosNormativos, audit })),
    [mes, empresas, empleados, novedades, periodos, parametrosNormativos, audit],
  );
}

export type Vista = ReturnType<typeof vistaPeriodo>;

"use client";

import clsx from "clsx";
import { Calculator, Check, CircleDollarSign, ClipboardList, CreditCard, FileClock, Layers3, Save, Settings2, ShieldCheck } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import {
  generarResumenCobroComercial,
  guardarConfiguracionComercial,
  registrarPagoComercial,
  type GenerarResumenCobroResult,
  type GuardarConfiguracionComercialResult,
  type RegistrarPagoComercialResult,
} from "@/app/admin/actions";
import {
  ADDONS_ADMIN,
  estadoPagoDemo,
  ESTUDIOS_ADMIN,
  fmtCent,
  modulosHabilitados,
  moduloNombre,
  PLANES_ADMIN,
  planPorCodigo,
  resumenCobroDemo,
  totalMensualCent,
  type AjusteCobroAdmin,
  type CodigoModulo,
  type EstudioAdmin,
} from "@/lib/comercial-demo";
import { Boton, Chip, Panel, inputCls } from "./ui";

function estadoChip(estado: EstudioAdmin["estado"]) {
  if (estado === "activo") return <Chip tono="menta">Activo</Chip>;
  if (estado === "prueba") return <Chip tono="crema">Prueba</Chip>;
  return <Chip tono="rosa">Pausado</Chip>;
}

function toggleAddon(addons: CodigoModulo[], codigo: CodigoModulo) {
  return addons.includes(codigo) ? addons.filter((a) => a !== codigo) : [...addons, codigo];
}

function usoNombre(tipo: string) {
  if (tipo === "empresa_activa") return "Empresas activas";
  if (tipo === "empleado_activo") return "Empleados activos";
  if (tipo === "recibo_generado") return "Recibos generados";
  if (tipo === "recibo_enviado") return "Recibos enviados";
  return tipo;
}

export function AdminCommercialConsole() {
  const [estudios, setEstudios] = useState(ESTUDIOS_ADMIN);
  const [seleccionadoId, setSeleccionadoId] = useState(estudios[0].id);
  const [resultado, setResultado] = useState<GuardarConfiguracionComercialResult | null>(null);
  const [resultadoResumen, setResultadoResumen] = useState<GenerarResumenCobroResult | null>(null);
  const [resultadoPago, setResultadoPago] = useState<RegistrarPagoComercialResult | null>(null);
  const [mesCobro, setMesCobro] = useState("2026-10");
  const [ajusteDescripcion, setAjusteDescripcion] = useState("");
  const [ajusteMonto, setAjusteMonto] = useState("");
  const [ajusteNota, setAjusteNota] = useState("");
  const [mesesAdelantados, setMesesAdelantados] = useState(1);
  const [pagosDemo, setPagosDemo] = useState<Record<string, number>>({});
  const [pendiente, startTransition] = useTransition();
  const [pendienteResumen, startResumenTransition] = useTransition();
  const [pendientePago, startPagoTransition] = useTransition();
  const seleccionado = estudios.find((e) => e.id === seleccionadoId) ?? estudios[0];
  const plan = planPorCodigo(seleccionado.planCodigo);
  const modulos = useMemo(() => modulosHabilitados(seleccionado), [seleccionado]);
  const total = totalMensualCent(seleccionado);
  const ajustes = useMemo<AjusteCobroAdmin[]>(() => {
    const importe = Number(ajusteMonto.replace(",", "."));
    if (!ajusteDescripcion.trim() || !Number.isFinite(importe)) return [];
    return [{ descripcion: ajusteDescripcion.trim(), importeCent: Math.round(importe * 100), nota: ajusteNota.trim() || undefined }];
  }, [ajusteDescripcion, ajusteMonto, ajusteNota]);
  const resumenPreview = useMemo(() => resumenCobroDemo(seleccionado, mesCobro, ajustes), [seleccionado, mesCobro, ajustes]);
  const resumenVisible = resultadoResumen?.resumen ?? resumenPreview;
  const pagoKey = `${seleccionado.id}:${mesCobro}`;
  const pagadoDemoCent = pagosDemo[pagoKey] ?? 0;
  const estadoPago = estadoPagoDemo(resumenVisible.totalCent, pagadoDemoCent);

  const actualizar = (cambios: Partial<EstudioAdmin>) => {
    setResultado(null);
    setResultadoResumen(null);
    setResultadoPago(null);
    setEstudios((actuales) => actuales.map((e) => (e.id === seleccionado.id ? { ...e, ...cambios } : e)));
  };

  const seleccionar = (id: string) => {
    setResultado(null);
    setResultadoResumen(null);
    setResultadoPago(null);
    setSeleccionadoId(id);
  };

  const guardar = () => {
    startTransition(async () => {
      try {
        setResultado(await guardarConfiguracionComercial({ estudio: seleccionado }));
      } catch (error) {
        setResultado({
          ok: false,
          modo: "real",
          mensaje: error instanceof Error ? error.message : "No pudimos guardar la configuracion comercial.",
        });
      }
    });
  };

  const generarResumen = () => {
    startResumenTransition(async () => {
      try {
        setResultadoResumen(await generarResumenCobroComercial({ estudio: seleccionado, mes: mesCobro, ajustes }));
      } catch (error) {
        setResultadoResumen({
          ok: false,
          modo: "real",
          mensaje: error instanceof Error ? error.message : "No pudimos generar el resumen de cobro.",
          resumen: resumenPreview,
        });
      }
    });
  };

  const registrarPago = (importeCent: number, meses: number) => {
    startPagoTransition(async () => {
      try {
        const resultadoPagoNuevo = await registrarPagoComercial({
          estudio: seleccionado,
          mes: mesCobro,
          importeCent,
          mesesCubiertos: meses,
          nota: meses > 1 ? `Pago adelantado por ${meses} meses` : "Pago mensual marcado desde consola admin",
        });
        setResultadoPago(resultadoPagoNuevo);
        setPagosDemo((actual) => ({ ...actual, [pagoKey]: (actual[pagoKey] ?? 0) + importeCent }));
      } catch (error) {
        setResultadoPago({
          ok: false,
          modo: "real",
          mensaje: error instanceof Error ? error.message : "No pudimos registrar el pago.",
          pagadoCent: pagadoDemoCent,
        });
      }
    });
  };

  return (
    <div className="grid gap-3 xl:grid-cols-[360px_1fr]">
      <Panel className="overflow-hidden">
        <div className="border-b border-linea px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <ShieldCheck size={18} className="text-petroleo" /> Estudios
          </h2>
        </div>
        <div className="divide-y divide-linea">
          {estudios.map((estudio) => {
            const activo = estudio.id === seleccionado.id;
            return (
              <button
                key={estudio.id}
                type="button"
                onClick={() => seleccionar(estudio.id)}
                className={clsx("block w-full px-5 py-4 text-left transition-colors hover:bg-hundido", activo && "bg-hundido")}
              >
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block text-sm font-bold">{estudio.nombre}</span>
                    <span className="mt-1 block text-xs text-apagado">{planPorCodigo(estudio.planCodigo).nombre} · {fmtCent(totalMensualCent(estudio), estudio.moneda)}</span>
                  </span>
                  {estadoChip(estudio.estado)}
                </span>
              </button>
            );
          })}
        </div>
      </Panel>

      <div className="space-y-3">
        <Panel className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.08em] text-petroleo">
                <CircleDollarSign size={16} /> Comercial
              </p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight">{seleccionado.nombre}</h2>
              <p className="mt-1 text-sm text-apagado">{modulos.length} modulos habilitados · {fmtCent(total, seleccionado.moneda)} mensuales</p>
            </div>
            <Boton type="button" onClick={guardar} disabled={pendiente}>
              <Save size={15} /> {pendiente ? "Guardando..." : "Guardar configuracion"}
            </Boton>
          </div>
          {resultado && (
            <p className={clsx("mt-4 rounded-xl px-3 py-2 text-sm font-semibold", resultado.ok ? "bg-menta text-menta-t" : "bg-rosa text-rosa-t")} role="status">
              {resultado.mensaje}
            </p>
          )}
        </Panel>

        <div className="grid gap-3 lg:grid-cols-3">
          <Panel className="p-5 lg:col-span-2">
            <h3 className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <Layers3 size={18} className="text-petroleo" /> Paquete y add-ons
            </h3>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {PLANES_ADMIN.map((p) => (
                <button
                  key={p.codigo}
                  type="button"
                  onClick={() => actualizar({ planCodigo: p.codigo })}
                  className={clsx("rounded-2xl border px-4 py-3 text-left transition-colors", p.codigo === plan.codigo ? "border-petroleo bg-menta text-menta-t" : "border-linea bg-superficie hover:bg-hundido")}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-bold">{p.nombre}</span>
                    {p.codigo === plan.codigo && <Check size={16} />}
                  </span>
                  <span className="mt-1 block text-xs">{fmtCent(p.precioMensualCent)}</span>
                  <span className="mt-2 block text-xs text-apagado">{p.modulos.length} modulos incluidos</span>
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {ADDONS_ADMIN.map((addon) => (
                <label key={addon.moduloCodigo} className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-linea bg-superficie px-4 py-3 hover:bg-hundido">
                  <span>
                    <span className="block text-sm font-bold">{moduloNombre(addon.moduloCodigo)}</span>
                    <span className="block text-xs text-apagado">{fmtCent(addon.precioMensualCent)} mensual</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={seleccionado.addons.includes(addon.moduloCodigo)}
                    onChange={() => actualizar({ addons: toggleAddon(seleccionado.addons, addon.moduloCodigo) })}
                    className="size-4 accent-petroleo"
                  />
                </label>
              ))}
            </div>
          </Panel>

          <Panel className="p-5">
            <h3 className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <FileClock size={18} className="text-petroleo" /> Contrato
            </h3>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-semibold text-tinta-2">Estado</span>
                <select className={inputCls} value={seleccionado.estado} onChange={(e) => actualizar({ estado: e.target.value as EstudioAdmin["estado"] })}>
                  <option value="prueba">Prueba</option>
                  <option value="activo">Activo</option>
                  <option value="pausado">Pausado</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-semibold text-tinta-2">Notas internas</span>
                <textarea className={clsx(inputCls, "min-h-28 py-3")} value={seleccionado.notas} onChange={(e) => actualizar({ notas: e.target.value })} />
              </label>
            </div>
          </Panel>
        </div>

        <Panel className="p-5">
          <h3 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Settings2 size={18} className="text-petroleo" /> Modulos habilitados
          </h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {modulos.map((m) => (
              <Chip key={m} tono={seleccionado.addons.includes(m) ? "lila" : "gris"}>
                {moduloNombre(m)}
              </Chip>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                <Calculator size={18} className="text-petroleo" /> Resumen de cobro
              </h3>
              <p className="mt-1 text-sm text-apagado">{fmtCent(resumenVisible.totalCent, resumenVisible.moneda)} para {resumenVisible.mes}</p>
            </div>
            <Boton type="button" variante="secundario" onClick={generarResumen} disabled={pendienteResumen}>
              <Calculator size={15} /> {pendienteResumen ? "Generando..." : "Generar resumen"}
            </Boton>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[180px_1fr_160px]">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold text-tinta-2">Mes</span>
              <input className={inputCls} type="month" value={mesCobro} onChange={(e) => setMesCobro(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold text-tinta-2">Ajuste manual</span>
              <input className={inputCls} value={ajusteDescripcion} onChange={(e) => setAjusteDescripcion(e.target.value)} placeholder="Ej. Descuento piloto" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold text-tinta-2">Importe</span>
              <input className={inputCls} value={ajusteMonto} onChange={(e) => setAjusteMonto(e.target.value)} placeholder="-1500" inputMode="decimal" />
            </label>
          </div>
          <label className="mt-3 block">
            <span className="mb-1.5 block text-[13px] font-semibold text-tinta-2">Nota del ajuste</span>
            <input className={inputCls} value={ajusteNota} onChange={(e) => setAjusteNota(e.target.value)} placeholder="Motivo interno visible para administracion" />
          </label>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_180px_180px]">
            <div className="rounded-xl border border-linea bg-hundido px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.06em] text-apagado">Estado de pago</p>
              <p className="mt-1 text-lg font-extrabold capitalize">{estadoPago.estado.replaceAll("_", " ")}</p>
              <p className="mt-1 text-sm text-apagado">
                Pagado {fmtCent(estadoPago.pagadoCent, resumenVisible.moneda)} · Pendiente {fmtCent(estadoPago.saldoPendienteCent, resumenVisible.moneda)}
                {estadoPago.saldoAFavorCent > 0 ? ` · A favor ${fmtCent(estadoPago.saldoAFavorCent, resumenVisible.moneda)}` : ""}
              </p>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold text-tinta-2">Meses adelantados</span>
              <input className={inputCls} type="number" min={1} max={24} value={mesesAdelantados} onChange={(e) => setMesesAdelantados(Math.max(1, Number(e.target.value) || 1))} />
            </label>
            <div className="flex items-end">
              <Boton
                type="button"
                variante="secundario"
                className="w-full"
                onClick={() => registrarPago(resumenVisible.totalCent * mesesAdelantados, mesesAdelantados)}
                disabled={pendientePago || resumenVisible.totalCent <= 0}
              >
                <CreditCard size={15} /> {pendientePago ? "Registrando..." : mesesAdelantados > 1 ? "Pago adelantado" : "Marcar pagado"}
              </Boton>
            </div>
          </div>

          {resultadoPago && (
            <p className={clsx("mt-4 rounded-xl px-3 py-2 text-sm font-semibold", resultadoPago.ok ? "bg-menta text-menta-t" : "bg-rosa text-rosa-t")} role="status">
              {resultadoPago.mensaje}
            </p>
          )}

          {resultadoResumen && (
            <p className={clsx("mt-4 rounded-xl px-3 py-2 text-sm font-semibold", resultadoResumen.ok ? "bg-menta text-menta-t" : "bg-rosa text-rosa-t")} role="status">
              {resultadoResumen.mensaje}
            </p>
          )}

          <div className="mt-4 overflow-hidden rounded-xl border border-linea">
            <div className="grid grid-cols-[1fr_110px] bg-hundido px-3 py-2 text-xs font-bold uppercase tracking-[0.06em] text-apagado">
              <span>Concepto</span>
              <span className="text-right">Importe</span>
            </div>
            <div className="divide-y divide-linea bg-superficie">
              {resumenVisible.lineas.map((linea, index) => (
                <div key={`${linea.tipo}-${linea.concepto}-${index}`} className="grid grid-cols-[1fr_110px] gap-3 px-3 py-3 text-sm">
                  <span>
                    <span className="block font-semibold">{linea.concepto}</span>
                    {linea.nota && <span className="mt-0.5 block text-xs text-apagado">{linea.nota}</span>}
                  </span>
                  <span className={clsx("text-right font-bold", linea.totalCent < 0 && "text-rosa-t")}>{fmtCent(linea.totalCent, resumenVisible.moneda)}</span>
                </div>
              ))}
              {!resumenVisible.lineas.length && <p className="px-3 py-4 text-sm text-apagado">No hay cargos para este estado de contrato.</p>}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {resumenVisible.eventosUso.map((evento) => (
              <Chip key={evento.tipo} tono="gris">
                {usoNombre(evento.tipo)}: {evento.cantidad}
              </Chip>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <h3 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <ClipboardList size={18} className="text-petroleo" /> Auditoria comercial
          </h3>
          <div className="mt-4 rounded-2xl bg-hundido px-4 py-3 text-sm">
            <p className="font-semibold">Cambio pendiente de guardar</p>
            <p className="mt-1 text-apagado">
              {seleccionado.nombre}: {plan.nombre}, {seleccionado.addons.length} add-ons, total {fmtCent(total, seleccionado.moneda)}.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

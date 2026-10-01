"use client";

import clsx from "clsx";
import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useStore, useVistas } from "@/lib/store";
import { USUARIOS } from "@/lib/seed";
import { activoEn, totales } from "@/lib/engine";
import { MES_ACTUAL, fmt } from "@/lib/format";
import { ESTADOS } from "@/lib/status";
import { Avatar, Boton, Campo, Drawer, EstadoChip, MarcaEmpresa, Panel, TONOS, inputCls } from "@/components/ui";
import type { Empresa, Tono } from "@/lib/types";

const TONOS_EMPRESA: Tono[] = ["menta", "cielo", "crema", "lila", "rosa"];

function slugId(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 28);
}

function NuevaEmpresaDrawer({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const agregarEmpresa = useStore((s) => s.agregarEmpresa);
  const usuarioId = useStore((s) => s.usuarioId);
  const existentes = useStore((s) => s.empresas);
  const [error, setError] = useState("");

  const crear = (form: FormData) => {
    setError("");
    const nombre = String(form.get("nombre") ?? "").trim();
    const rut = String(form.get("rut") ?? "").trim();
    const contactoNombre = String(form.get("contactoNombre") ?? "").trim();
    const contactoEmail = String(form.get("contactoEmail") ?? "").trim().toLowerCase();
    const actividad = String(form.get("actividad") ?? "").trim() || "Servicios";
    const grupo = Number(form.get("grupo") ?? 10);
    const subgrupo = String(form.get("subgrupo") ?? "01").trim() || "01";
    const tono = String(form.get("tono") ?? "menta") as Tono;
    if (!nombre || !rut || !contactoNombre || !/^\S+@\S+\.\S+$/.test(contactoEmail)) {
      setError("Completá nombre, RUT, responsable y un email válido.");
      return;
    }
    const base = slugId(nombre) || "empresa";
    const id = existentes.some((e) => e.id === base) ? `${base}-${Date.now().toString(36).slice(-4)}` : base;
    const empresa: Empresa = {
      id,
      nombre,
      nombreVisible: nombre,
      razonSocial: nombre,
      rut,
      nroBps: String(form.get("bps") ?? "").trim() || "pendiente",
      actividad,
      grupo: Number.isFinite(grupo) ? grupo : 10,
      subgrupo,
      responsableId: usuarioId,
      requiereAprobacion: true,
      contacto: { nombre: contactoNombre, email: contactoEmail },
      tono,
    };
    agregarEmpresa(empresa, { nombre: contactoNombre, email: contactoEmail });
    onCerrar();
  };

  return (
    <Drawer abierto={abierto} onCerrar={onCerrar} titulo="Nueva empresa" subtitulo="Alta inicial con usuario responsable">
      <form action={crear} className="space-y-4">
        <Campo label="Nombre de empresa"><input name="nombre" className={inputCls} required /></Campo>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="RUT"><input name="rut" className={inputCls} required /></Campo>
          <Campo label="Nro. BPS"><input name="bps" className={inputCls} placeholder="pendiente" /></Campo>
        </div>
        <Campo label="Actividad"><input name="actividad" className={inputCls} placeholder="Servicios" /></Campo>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Grupo"><input name="grupo" type="number" min="1" className={inputCls} defaultValue={10} /></Campo>
          <Campo label="Subgrupo"><input name="subgrupo" className={inputCls} defaultValue="01" /></Campo>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Responsable"><input name="contactoNombre" className={inputCls} required /></Campo>
          <Campo label="Email de acceso"><input name="contactoEmail" type="email" className={inputCls} required /></Campo>
        </div>
        <Campo label="Color">
          <select name="tono" className={inputCls} defaultValue="menta">
            {TONOS_EMPRESA.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Campo>
        {error && <p className="rounded-xl bg-rosa px-3 py-2 text-sm font-semibold text-rosa-t">{error}</p>}
        <Boton type="submit" tam="lg" className="w-full"><Plus size={16} /> Crear empresa</Boton>
      </form>
    </Drawer>
  );
}

export default function Empresas() {
  const vistas = useVistas();
  const empleados = useStore((s) => s.empleados);
  const [q, setQ] = useState("");
  const [nuevo, setNuevo] = useState(false);
  const lista = vistas
    .filter((v) => v.empresa.nombre.toLowerCase().includes(q.toLowerCase()) || v.empresa.rut.includes(q))
    .sort((a, b) => ESTADOS[a.estado].orden - ESTADOS[b.estado].orden);
  return (
    <div className="space-y-3">
      <Panel className="flex flex-wrap items-end gap-4 px-7 py-6">
        <div className="mr-auto">
          <h1 className="text-[34px] font-extrabold leading-tight tracking-tight">Empresas</h1>
          <p className="mt-1 text-[15px] text-apagado">{vistas.length} clientes · {empleados.filter((e) => activoEn(e, MES_ACTUAL)).length} personas en nómina</p>
        </div>
        <input className={clsx(inputCls, "max-w-xs")} placeholder="Filtrar por nombre o RUT" value={q} onChange={(e) => setQ(e.target.value)} />
        <Boton onClick={() => setNuevo(true)}><Plus size={15} /> Nueva empresa</Boton>
      </Panel>
      <NuevaEmpresaDrawer abierto={nuevo} onCerrar={() => setNuevo(false)} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {lista.map((v) => {
          const n = empleados.filter((e) => e.empresaId === v.empresa.id && activoEn(e, MES_ACTUAL)).length;
          const t = v.resultados ? totales(v.resultados) : null;
          const r = USUARIOS.find((u) => u.id === v.empresa.responsableId)!;
          return (
            <Link key={v.empresa.id} href={`/empresas/${v.empresa.id}`} className="group">
              <Panel className="flex h-full flex-col p-2 transition-transform group-hover:-translate-y-0.5">
                <div className={clsx("rounded-[22px] p-4", TONOS[v.empresa.tono].bg)}>
                  <div className="flex items-start justify-between">
                    <MarcaEmpresa empresa={{ ...v.empresa, tono: "tinta" }} size={40} />
                    <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold">Grupo {v.empresa.grupo}.{v.empresa.subgrupo}</span>
                  </div>
                  <p className="mt-4 text-lg font-bold leading-tight tracking-tight">{v.empresa.nombre}</p>
                  <p className="text-[13px] text-tinta-2">{v.empresa.actividad}</p>
                </div>
                <div className="flex flex-1 flex-col gap-3 px-3 pt-3 pb-2">
                  <EstadoChip estado={v.estado} className="self-start" />
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <div><dt className="text-xs text-apagado">Personas</dt><dd className="num font-semibold">{n}</dd></div>
                    <div><dt className="text-xs text-apagado">Líquido del mes</dt><dd className="num font-semibold">{t && t.liquido ? fmt(t.liquido) : "—"}</dd></div>
                  </dl>
                  <p className="mt-auto flex items-center gap-2 text-xs text-apagado"><Avatar nombre={r.nombre} tono="crema" size={22} /> {r.nombre}</p>
                </div>
              </Panel>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

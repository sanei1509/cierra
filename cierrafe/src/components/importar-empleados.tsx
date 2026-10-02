"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AlertOctagon, AlertTriangle, CheckCircle2, FileDown, FileSpreadsheet, Upload } from "lucide-react";
import { importarEmpleadosReal, type AltaRealResult } from "@/app/(estudio)/actions";
import type { Empleado, Empresa } from "@/lib/types";
import { categoriasDe, laudoDe } from "@/lib/params";
import { MES_ACTUAL, fmt } from "@/lib/format";
import { descargar } from "@/lib/bps";
import { useStore, useUsuario } from "@/lib/store";
import { Boton, ResultadoAccion } from "./ui";

const COLUMNAS = ["nombre", "apellido", "cedula", "email", "cargo", "categoria", "sueldo", "ingreso", "hijos"] as const;
type Col = (typeof COLUMNAS)[number];
type Fila = Partial<Record<Col, unknown>>;

interface Revisada {
  n: number;
  datos: Record<Col, string>;
  errores: string[];
  avisos: string[];
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const ALIAS: Record<string, Col> = { ci: "cedula", "cedula de identidad": "cedula", documento: "cedula", "sueldo base": "sueldo", salario: "sueldo", "fecha de ingreso": "ingreso", "fecha ingreso": "ingreso", correo: "email", mail: "email", puesto: "cargo" };

function aTexto(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function fechaIso(s: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

const soloDigitos = (ci: string) => ci.replace(/\D/g, "");

function revisar(filas: Fila[], empresa: Empresa, existentes: Empleado[]): Revisada[] {
  const cisExistentes = new Set(existentes.map((e) => soloDigitos(e.ci)).filter(Boolean));
  const vistos = new Set<string>();
  return filas.map((f, i) => {
    const datos = Object.fromEntries(COLUMNAS.map((c) => [c, aTexto(f[c])])) as Record<Col, string>;
    const errores: string[] = [];
    const avisos: string[] = [];
    if (!datos.nombre || !datos.apellido) errores.push("Falta nombre o apellido");
    const ci = soloDigitos(datos.cedula);
    if (!ci) errores.push("Falta la cédula");
    else if (ci.length < 7 || ci.length > 8) errores.push("La cédula debe tener 7 u 8 dígitos");
    else if (cisExistentes.has(ci)) errores.push("Ya existe una persona con esa cédula en el estudio");
    else if (vistos.has(ci)) errores.push("Cédula repetida en el archivo");
    vistos.add(ci);
    const sueldo = Number(datos.sueldo.replace(/\./g, "").replace(",", "."));
    if (!sueldo || sueldo <= 0) errores.push("Sueldo inválido");
    if (!fechaIso(datos.ingreso)) errores.push("Fecha de ingreso inválida (usá AAAA-MM-DD o DD/MM/AAAA)");
    const laudo = laudoDe(empresa.grupo, empresa.subgrupo, datos.categoria);
    if (!datos.categoria) avisos.push("Sin categoría");
    else if (!laudo) avisos.push(`La categoría “${datos.categoria}” no está en los laudos del grupo ${empresa.grupo}.${empresa.subgrupo}`);
    else if (sueldo && sueldo < laudo.minimo) avisos.push(`Sueldo por debajo del mínimo (${fmt(laudo.minimo)}): va a bloquear el cálculo`);
    if (datos.email && !/^\S+@\S+\.\S+$/.test(datos.email)) avisos.push("Email con formato raro");
    if (!datos.email) avisos.push("Sin email: no recibirá aviso de recibos");
    return { n: i + 2, datos, errores, avisos };
  });
}

function ejemplo(empresa: Empresa): Fila[] {
  // Categorías reales del grupo de la empresa, para que la demo muestre casos válidos
  const cats = categoriasDe(empresa.grupo, empresa.subgrupo);
  const c = (i: number) => cats[i % Math.max(cats.length, 1)];
  return [
    { nombre: "Carla", apellido: "Moreno", cedula: "4.123.456-7", email: "carla.moreno@gmail.com", cargo: c(0)?.categoria, categoria: c(0)?.categoria, sueldo: (c(0)?.minimo ?? 40000) + 2500, ingreso: `${MES_ACTUAL}-01`, hijos: 1 },
    { nombre: "Diego", apellido: "Pérez", cedula: "5.234.567-1", email: "diego.perez@gmail.com", cargo: c(1)?.categoria, categoria: c(1)?.categoria, sueldo: (c(1)?.minimo ?? 40000) + 1800, ingreso: "03/08/2026", hijos: 0 },
    { nombre: "Lucía", apellido: "Gómez", cedula: "", email: "lucia.gomez@gmail.com", cargo: c(2)?.categoria, categoria: c(2)?.categoria, sueldo: (c(2)?.minimo ?? 40000) + 1000, ingreso: `${MES_ACTUAL}-10`, hijos: 0 },
    { nombre: "Martín", apellido: "Silva", cedula: "3.345.678-2", email: "", cargo: "Ayudante", categoria: "Peón", sueldo: 30000, ingreso: `${MES_ACTUAL}-15`, hijos: 2 },
  ];
}

export function ImportarEmpleados({ empresa, onListo }: { empresa: Empresa; onListo: () => void }) {
  const router = useRouter();
  const usuario = useUsuario();
  const empleados = useStore((s) => s.empleados);
  const agregar = useStore((s) => s.agregarEmpleados);
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [archivo, setArchivo] = useState("");
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState<AltaRealResult | null>(null);
  const [importando, setImportando] = useState(false);
  const revisadas = useMemo(() => (filas ? revisar(filas, empresa, empleados) : []), [filas, empresa, empleados]);
  const validas = revisadas.filter((r) => !r.errores.length);

  const leer = async (f: File) => {
    setError("");
    setResultado(null);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await f.arrayBuffer(), { cellDates: true });
      const hoja = wb.Sheets[wb.SheetNames[0]];
      const crudas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: "" });
      const mapeadas = crudas.map((r) => {
        const out: Fila = {};
        for (const [k, v] of Object.entries(r)) {
          const nk = norm(k);
          const col = (COLUMNAS as readonly string[]).includes(nk) ? (nk as Col) : ALIAS[nk];
          if (col) out[col] = v;
        }
        return out;
      });
      if (!mapeadas.length) throw new Error("vacío");
      setArchivo(f.name);
      setFilas(mapeadas);
    } catch {
      setError("No pudimos leer el archivo. Usá la plantilla (Excel o CSV) con una fila de títulos.");
    }
  };

  const importar = async () => {
    const nuevos: Empleado[] = validas.map((r, i) => ({
      id: `${empresa.id}-imp${Date.now().toString(36)}${i}`,
      empresaId: empresa.id,
      nombre: r.datos.nombre,
      apellido: r.datos.apellido,
      ci: r.datos.cedula,
      email: r.datos.email,
      cargo: r.datos.cargo || r.datos.categoria,
      categoria: r.datos.categoria,
      modalidad: "mensual",
      ingreso: fechaIso(r.datos.ingreso)!,
      sueldos: [{ desde: fechaIso(r.datos.ingreso)!, monto: Number(r.datos.sueldo.replace(/\./g, "").replace(",", ".")) }],
      hijos: Number(r.datos.hijos) || 0,
      conyugeFonasa: false,
    }));
    setError("");
    setResultado(null);
    setImportando(true);
    try {
      const res = await importarEmpleadosReal({
        empresaId: empresa.id,
        actor: usuario.nombre,
        archivo,
        empleados: nuevos.map((empleado) => ({
          nombre: empleado.nombre,
          apellido: empleado.apellido,
          ci: empleado.ci,
          email: empleado.email,
          cargo: empleado.cargo,
          categoria: empleado.categoria,
          ingreso: empleado.ingreso,
          sueldo: empleado.sueldos[0]?.monto ?? 0,
          hijos: empleado.hijos,
        })),
      });
      if (!res.ok) {
        setResultado(res);
        return;
      }
      const conIdsReales = nuevos.map((empleado, i) => ({ ...empleado, id: res.ids?.[i] ?? empleado.id }));
      agregar(conIdsReales, empresa.id);
      setResultado(res);
      if (res.modo === "real") router.refresh();
      onListo();
    } catch (err) {
      setResultado({
        ok: false,
        modo: "real",
        mensaje: err instanceof Error ? err.message : "No pudimos importar los empleados.",
      });
    } finally {
      setImportando(false);
    }
  };

  if (!filas)
    return (
      <div className="space-y-4">
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-petroleo text-xs font-bold text-white">1</span>
            <span>
              Descargá la plantilla y completá una fila por persona.
              <Boton tam="sm" variante="secundario" className="mt-2" onClick={() => descargar("plantilla-empleados.csv", COLUMNAS.join(",") + "\nAna,Rodríguez,1.234.567-8,ana@mail.com,Vendedora,Vendedor,45000,2026-09-01,1\n", "text/csv")}>
                <FileDown size={13} /> Plantilla CSV
              </Boton>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-petroleo text-xs font-bold text-white">2</span>
            <span>Subí el archivo (.xlsx, .xls o .csv). Revisamos cada fila antes de crear nada.</span>
          </li>
        </ol>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-linea px-6 py-10 text-center hover:border-petroleo">
          <Upload size={24} className="text-petroleo" />
          <span className="font-semibold">Elegí un archivo de Excel o CSV</span>
          <span className="text-xs text-apagado">Columnas: {COLUMNAS.join(", ")}</span>
          <input type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={(e) => e.target.files?.[0] && leer(e.target.files[0])} />
        </label>
        {error && <p className="rounded-2xl bg-rosa px-4 py-3 text-sm text-rosa-t">{error}</p>}
        <button className="w-full text-center text-sm font-semibold text-petroleo hover:underline" onClick={() => { setArchivo("ejemplo.xlsx"); setFilas(ejemplo(empresa)); }}>
          No tengo un archivo: probar con uno de ejemplo
        </button>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl bg-hundido px-4 py-3 text-sm">
        <FileSpreadsheet size={18} className="text-petroleo" />
        <span className="flex-1 font-semibold">{archivo}</span>
        <button className="text-xs font-semibold text-petroleo hover:underline" onClick={() => setFilas(null)}>Cambiar archivo</button>
      </div>
      <p className="text-sm">
        <b>{validas.length}</b> {validas.length === 1 ? "fila lista" : "filas listas"} para importar
        {revisadas.length - validas.length > 0 && <> · <b className="text-rosa-t">{revisadas.length - validas.length} con errores</b> (no se importan)</>}
      </p>
      <ResultadoAccion resultado={resultado} />
      <ul className="space-y-2">
        {revisadas.map((r) => (
          <li key={r.n} className={clsx("rounded-2xl border px-4 py-3 text-sm", r.errores.length ? "border-rosa bg-rosa/40" : "border-linea")}>
            <div className="flex items-center gap-2">
              {r.errores.length ? <AlertOctagon size={15} className="text-rosa-t" /> : r.avisos.length ? <AlertTriangle size={15} className="text-crema-t" /> : <CheckCircle2 size={15} className="text-menta-t" />}
              <span className="font-semibold">{r.datos.nombre || "—"} {r.datos.apellido}</span>
              <span className="text-xs text-apagado">fila {r.n} · {r.datos.categoria || "sin categoría"} · {r.datos.sueldo ? fmt(Number(r.datos.sueldo)) : "sin sueldo"}</span>
            </div>
            {[...r.errores.map((t) => ({ t, e: true })), ...r.avisos.map((t) => ({ t, e: false }))].map((x) => (
              <p key={x.t} className={clsx("mt-1 pl-6 text-xs", x.e ? "font-semibold text-rosa-t" : "text-crema-t")}>{x.t}</p>
            ))}
          </li>
        ))}
      </ul>
      <Boton className="w-full" tam="lg" disabled={!validas.length || importando} onClick={() => void importar()}>
        {importando ? "Importando..." : <>Importar {validas.length} {validas.length === 1 ? "persona" : "personas"}</>}
      </Boton>
    </div>
  );
}

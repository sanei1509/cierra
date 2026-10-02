"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { crearEmpleadoInicial, type AltaRealResult } from "../actions";
import { useStore } from "@/lib/store";
import { activoEn } from "@/lib/engine";
import { MES_ACTUAL, fmt } from "@/lib/format";
import { Avatar, Boton, Campo, Chip, Drawer, Panel, ResultadoAccion, inputCls } from "@/components/ui";
import type { Empleado, Empresa, Modalidad } from "@/lib/types";

function NuevoEmpleadoDrawer({
  abierto,
  onCerrar,
  empresaInicial,
  onResultado,
  empresasDisponibles,
  cantidadActual,
  onEmpleadoCreado,
}: {
  abierto: boolean;
  onCerrar: () => void;
  empresaInicial: string;
  onResultado: (resultado: AltaRealResult | null) => void;
  empresasDisponibles?: Empresa[];
  cantidadActual?: number;
  onEmpleadoCreado?: (empleado: Empleado, resultado: AltaRealResult) => void;
}) {
  const empresasDemo = useStore((s) => s.empresas);
  const empleados = useStore((s) => s.empleados);
  const agregarEmpleado = useStore((s) => s.agregarEmpleado);
  const empresas = empresasDisponibles ?? empresasDemo;
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState<AltaRealResult | null>(null);
  const [pendiente, startTransition] = useTransition();

  const crear = (form: FormData) => {
    setError("");
    setResultado(null);
    onResultado(null);
    const empresaId = String(form.get("empresaId") ?? empresaInicial);
    const nombre = String(form.get("nombre") ?? "").trim();
    const apellido = String(form.get("apellido") ?? "").trim();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const ci = String(form.get("ci") ?? "").trim();
    const cargo = String(form.get("cargo") ?? "").trim();
    const categoria = String(form.get("categoria") ?? "").trim();
    const ingreso = String(form.get("ingreso") ?? "").trim();
    const sueldo = Number(form.get("sueldo") ?? 0);
    const modalidad = String(form.get("modalidad") ?? "mensual") as Modalidad;
    if (!empresaId || !nombre || !apellido || !ci || !cargo || !categoria || !ingreso || !/^\S+@\S+\.\S+$/.test(email)) {
      setError("Completá empresa, datos personales, cargo, categoría, ingreso y email válido.");
      return;
    }
    if (modalidad === "mensual" && (!Number.isFinite(sueldo) || sueldo <= 0)) {
      setError("Para mensual necesitás cargar un sueldo base mayor a cero.");
      return;
    }
    const id = `${empresaId}-manual${Date.now().toString(36)}`;
    const empleado: Empleado = {
      id,
      empresaId,
      nombre,
      apellido,
      ci,
      email,
      cargo,
      categoria,
      modalidad,
      ingreso,
      sueldos: modalidad === "mensual" ? [{ desde: ingreso, monto: sueldo }] : [],
      hijos: Number(form.get("hijos") ?? 0) || 0,
      conyugeFonasa: false,
      telefono: String(form.get("telefono") ?? "").trim() || undefined,
    };
    startTransition(async () => {
      try {
        const alta = await crearEmpleadoInicial({
          empresaId,
          nombre,
          apellido,
          ci,
          email,
          cargo,
          categoria,
          ingreso,
          modalidad,
          sueldo,
          hijos: empleado.hijos,
          telefono: empleado.telefono,
        });
        const empleadoCreado = { ...empleado, id: alta.id ?? empleado.id };
        agregarEmpleado(empleadoCreado, { nombre: `${nombre} ${apellido}`, email });
        onEmpleadoCreado?.(empleadoCreado, alta);
        setResultado(alta);
        onResultado(alta);
        onCerrar();
      } catch (error) {
        const fallo = {
          ok: false,
          modo: "real",
          mensaje: error instanceof Error ? error.message : "No pudimos crear el empleado.",
        } satisfies AltaRealResult;
        setResultado(fallo);
        onResultado(fallo);
      }
    });
  };

  return (
    <Drawer abierto={abierto} onCerrar={onCerrar} titulo="Nuevo empleado" subtitulo="Alta inicial con usuario empleado">
      <form action={crear} className="space-y-4">
        <Campo label="Empresa">
          <select name="empresaId" className={inputCls} defaultValue={empresaInicial === "todas" ? empresas[0]?.id : empresaInicial} required>
            {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </Campo>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Nombre"><input name="nombre" className={inputCls} required /></Campo>
          <Campo label="Apellido"><input name="apellido" className={inputCls} required /></Campo>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Cédula"><input name="ci" className={inputCls} required /></Campo>
          <Campo label="Email de acceso"><input name="email" type="email" className={inputCls} required /></Campo>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Cargo"><input name="cargo" className={inputCls} required /></Campo>
          <Campo label="Categoría"><input name="categoria" className={inputCls} required /></Campo>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Ingreso"><input name="ingreso" type="date" className={inputCls} defaultValue={`${MES_ACTUAL}-01`} required /></Campo>
          <Campo label="Modalidad">
            <select name="modalidad" className={inputCls} defaultValue="mensual">
              <option value="mensual">Mensual</option>
              <option value="jornalero">Jornalero</option>
            </select>
          </Campo>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Sueldo base"><input name="sueldo" type="number" min="0" step="1" className={inputCls} /></Campo>
          <Campo label="Hijos"><input name="hijos" type="number" min="0" step="1" className={inputCls} defaultValue={0} /></Campo>
        </div>
        <Campo label="Teléfono"><input name="telefono" className={inputCls} /></Campo>
        {error && <ResultadoAccion resultado={{ ok: false, mensaje: error }} />}
        <ResultadoAccion resultado={resultado && !resultado.ok ? resultado : null} />
        <Boton type="submit" tam="lg" className="w-full" disabled={pendiente}><Plus size={16} /> {pendiente ? "Creando..." : "Crear empleado"}</Boton>
        <p className="text-xs text-apagado">{cantidadActual ?? empleados.length} personas cargadas. El envío real de invitaciones queda para la etapa de autenticación.</p>
      </form>
    </Drawer>
  );
}

export default function EmpleadosClient({ datosIniciales }: { datosIniciales: { modo: "real" | "demo"; empresas: Empresa[]; empleados: Empleado[] } }) {
  const router = useRouter();
  const empleadosDemo = useStore((s) => s.empleados);
  const empresasDemo = useStore((s) => s.empresas);
  const [empleadosOptimistas, setEmpleadosOptimistas] = useState<Empleado[]>([]);
  const [q, setQ] = useState("");
  const [emp, setEmp] = useState("todas");
  const [nuevo, setNuevo] = useState(false);
  const [resultado, setResultado] = useState<AltaRealResult | null>(null);
  const esReal = datosIniciales.modo === "real";
  const empleados = useMemo(() => {
    if (!esReal) return empleadosDemo;
    const reales = new Set(datosIniciales.empleados.map((empleado) => empleado.id));
    return [...datosIniciales.empleados, ...empleadosOptimistas.filter((empleado) => !reales.has(empleado.id))];
  }, [datosIniciales.empleados, empleadosDemo, empleadosOptimistas, esReal]);
  const empresas = esReal ? datosIniciales.empresas : empresasDemo;
  const lista = useMemo(() => {
    const t = q.toLowerCase();
    return empleados
      .filter((e) => emp === "todas" || e.empresaId === emp)
      .filter((e) => !t || `${e.nombre} ${e.apellido} ${e.ci} ${e.cargo}`.toLowerCase().includes(t))
      .sort((a, b) => a.apellido.localeCompare(b.apellido));
  }, [empleados, q, emp]);

  return (
    <div className="space-y-3">
      <Panel className="flex flex-wrap items-end gap-3 px-7 py-6">
        <div className="mr-auto">
          <h1 className="text-[34px] font-extrabold leading-tight tracking-tight">Empleados</h1>
          <p className="mt-1 text-[15px] text-apagado">Buscá a cualquier persona de toda tu cartera.</p>
        </div>
        <input className={clsx(inputCls, "max-w-xs")} placeholder="Nombre, cédula o cargo" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        <select className={clsx(inputCls, "max-w-[240px]")} value={emp} onChange={(e) => setEmp(e.target.value)} aria-label="Empresa">
          <option value="todas">Todas las empresas</option>
          {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <Boton
          onClick={() => {
            setResultado(null);
            setNuevo(true);
          }}
        >
          <Plus size={15} /> Nuevo empleado
        </Boton>
      </Panel>
      <ResultadoAccion resultado={resultado} />
      <NuevoEmpleadoDrawer
        abierto={nuevo}
        onCerrar={() => setNuevo(false)}
        empresaInicial={emp}
        onResultado={setResultado}
        empresasDisponibles={empresas}
        cantidadActual={empleados.length}
        onEmpleadoCreado={(empleado, alta) => {
          if (!esReal || empleados.some((actual) => actual.id === empleado.id)) return;
          setEmpleadosOptimistas((actual) => [...actual, empleado]);
          if (alta.modo === "real") router.refresh();
        }}
      />
      <Panel className="p-3">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-xs text-apagado">
                <th className="px-3 py-2 font-semibold">Persona</th>
                <th className="px-3 py-2 font-semibold">Empresa</th>
                <th className="px-3 py-2 font-semibold">Cédula</th>
                <th className="px-3 py-2 font-semibold">Categoría</th>
                <th className="px-3 py-2 text-right font-semibold">Sueldo base</th>
                <th className="px-3 py-2 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((e) => {
                const empresa = empresas.find((x) => x.id === e.empresaId)!;
                const s = [...e.sueldos].sort((a, b) => b.desde.localeCompare(a.desde))[0];
                return (
                  <tr key={e.id} className="border-t border-linea hover:bg-hundido/60">
                    <td className="px-3 py-2.5">
                      <Link href={`/empresas/${e.empresaId}?tab=empleados&emp=${e.id}`} className="flex items-center gap-3 hover:underline">
                        <Avatar nombre={`${e.nombre} ${e.apellido}`} tono={empresa.tono} size={32} />
                        <span><span className="block font-semibold">{e.nombre} {e.apellido}</span><span className="block text-xs text-apagado">{e.cargo}</span></span>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5"><Link href={`/empresas/${empresa.id}`} className="hover:underline">{empresa.nombre}</Link></td>
                    <td className="num px-3 py-2.5">{e.ci || <Chip tono="rosa">Falta</Chip>}</td>
                    <td className="px-3 py-2.5">{e.categoria}</td>
                    <td className="num px-3 py-2.5 text-right">{s ? fmt(s.monto) : "Jornal"}</td>
                    <td className="px-3 py-2.5">{activoEn(e, MES_ACTUAL) ? <Chip tono="menta">Activo</Chip> : <Chip tono="gris">Egresado</Chip>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {lista.length === 0 && <p className="py-10 text-center text-sm text-apagado">Nadie coincide con “{q}”.</p>}
        </div>
      </Panel>
    </div>
  );
}

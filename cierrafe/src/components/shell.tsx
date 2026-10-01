"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, FileText, Home, Search, Settings, ShieldCheck, Users, Eye, RotateCcw, Menu, X, CalendarDays, ListChecks, KeyRound, UserCog, BriefcaseBusiness, UserRound, Monitor, Moon, Sun, LogIn } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useHidratado, useStore, useUsuario } from "@/lib/store";
import { USUARIOS, ESTUDIO } from "@/lib/seed";
import { MES_ACTUAL, nombreMes } from "@/lib/format";
import { Avatar } from "./ui";
import { TEMA_LABELS, type TemaPreferido } from "@/lib/theme";

const NAV = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/empresas", label: "Empresas", icon: Building2 },
  { href: "/empleados", label: "Empleados", icon: Users },
  { href: "/documentos", label: "Recibos y BPS", icon: FileText },
  { href: "/auditoria", label: "Auditoría", icon: ShieldCheck },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

const ROLES = { admin: "Administradora", liquidador: "Liquidador", lectura: "Solo lectura" };

export function Logo({ claro = false }: { claro?: boolean }) {
  return (
    <span className={clsx("flex items-center gap-2.5", claro ? "text-white" : "text-tinta")}>
      <span className="relative flex size-9 items-center justify-center rounded-full bg-petroleo">
        <span className="absolute inset-[7px] rounded-full border-[3px] border-sol border-r-transparent" />
      </span>
      <span className="text-[19px] font-extrabold tracking-tight">cierra</span>
    </span>
  );
}

function Sidebar({ onNav }: { onNav?: () => void }) {
  const path = usePathname();
  const reiniciar = useStore((s) => s.reiniciar);
  return (
    <nav className="flex h-full flex-col rounded-[var(--radius-panel)] border border-linea bg-superficie p-4 shadow-[0_1px_2px_rgb(17_26_23/0.04)]" aria-label="Principal">
      <div className="px-2 pt-1 pb-7">
        <Logo />
      </div>
      <ul className="space-y-1">
        {NAV.map((n) => {
          const activo = n.href === "/" ? path === "/" : path.startsWith(n.href);
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                onClick={onNav}
                className={clsx(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors",
                  activo ? "bg-hundido text-tinta" : "text-apagado hover:bg-hundido/70 hover:text-tinta",
                )}
              >
                {activo && <span className="absolute -left-4 top-2 bottom-2 w-1 rounded-r-full bg-petroleo" />}
                <n.icon size={19} strokeWidth={activo ? 2.3 : 1.8} className={activo ? "text-petroleo" : ""} />
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-8 px-3 text-xs font-semibold uppercase tracking-[0.08em] text-apagado">Portales</p>
      <Link href="/portales" onClick={onNav} className={clsx("mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium", path.startsWith("/portales") ? "bg-hundido text-tinta" : "text-apagado hover:bg-hundido/70 hover:text-tinta")}>
        <Eye size={19} strokeWidth={1.8} />
        Cliente y empleado
      </Link>
      <Link href="/funciones" onClick={onNav} className={clsx("mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium", path.startsWith("/funciones") ? "bg-hundido text-tinta" : "text-apagado hover:bg-hundido/70 hover:text-tinta")}>
        <ListChecks size={19} strokeWidth={1.8} />
        Guía de funciones
      </Link>

      <div className="mt-auto overflow-hidden rounded-2xl bg-petroleo p-4 text-white">
        <p className="text-sm font-bold">Datos de demostración</p>
        <p className="mt-1 text-xs leading-relaxed text-white/72">Sirven para probar el flujo mientras armamos la base real.</p>
        <button
          onClick={() => {
            reiniciar();
            onNav?.();
          }}
          className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-xl bg-white/12 text-xs font-semibold hover:bg-white/20"
        >
          <RotateCcw size={13} /> Reiniciar datos de ejemplo
        </button>
      </div>
    </nav>
  );
}

function Busqueda() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const empresas = useStore((s) => s.empresas);
  const empleados = useStore((s) => s.empleados);
  const router = useRouter();
  const res = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    const es = empresas.filter((e) => e.nombre.toLowerCase().includes(t) || e.rut.includes(t)).map((e) => ({ id: e.id, label: e.nombre, sub: `RUT ${e.rut}`, href: `/empresas/${e.id}` }));
    const ps = empleados
      .filter((e) => `${e.nombre} ${e.apellido}`.toLowerCase().includes(t) || e.ci.includes(t))
      .map((e) => ({ id: e.id, label: `${e.nombre} ${e.apellido}`, sub: `${empresas.find((x) => x.id === e.empresaId)?.nombre} · CI ${e.ci || "sin cargar"}`, href: `/empresas/${e.empresaId}?tab=empleados&emp=${e.id}` }));
    return [...es, ...ps].slice(0, 7);
  }, [q, empresas, empleados]);
  return (
    <div className="relative w-full max-w-sm">
      <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-apagado" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && res[0]) {
            router.push(res[0].href);
            setQ("");
          }
        }}
        placeholder="Buscar empresa, persona o cédula"
        className="h-11 w-full rounded-xl border border-linea bg-superficie pl-11 pr-4 text-sm outline-none placeholder:text-apagado focus:border-petroleo-3 focus:ring-2 focus:ring-petroleo-3/15"
        aria-label="Buscar"
      />
      {open && res.length > 0 && (
        <ul className="absolute top-12 z-40 w-full overflow-hidden rounded-2xl border border-linea bg-superficie p-2 shadow-xl">
          {res.map((r) => (
            <li key={r.id}>
              <Link href={r.href} onClick={() => setQ("")} className="block rounded-xl px-3 py-2 hover:bg-hundido">
                <span className="block text-sm font-semibold">{r.label}</span>
                <span className="block text-xs text-apagado">{r.sub}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Usuario() {
  const u = useUsuario();
  const setUsuario = useStore((s) => s.setUsuario);
  return (
    <label className="relative flex items-center gap-3 rounded-xl border border-linea bg-superficie py-1.5 pl-1.5 pr-4">
      <Avatar nombre={u.nombre} tono="crema" />
      <span className="hidden text-left leading-tight sm:block">
        <span className="block text-sm font-bold">{u.nombre}</span>
        <span className="block text-xs text-apagado">{ROLES[u.rol]}</span>
      </span>
      <select
        value={u.id}
        onChange={(e) => setUsuario(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label="Cambiar de usuario para probar permisos"
      >
        {USUARIOS.map((x) => (
          <option key={x.id} value={x.id}>
            {x.nombre} · {ROLES[x.rol]}
          </option>
        ))}
      </select>
    </label>
  );
}

const TEMA_ICONOS = { system: Monitor, light: Sun, dark: Moon };

function SelectorTema() {
  const u = useUsuario();
  const tema = useStore((s) => s.temaPorUsuario[u.id] ?? "system");
  const setTema = useStore((s) => s.setTemaUsuario);

  return (
    <div className="flex items-center gap-1 rounded-xl border border-linea bg-superficie p-1" aria-label="Tema visual">
      {(Object.keys(TEMA_LABELS) as TemaPreferido[]).map((t) => {
        const Icono = TEMA_ICONOS[t];
        const activo = tema === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => setTema(t)}
            className={clsx("inline-flex size-8 items-center justify-center rounded-lg transition-colors", activo ? "bg-petroleo text-white" : "text-apagado hover:bg-hundido hover:text-tinta")}
            aria-label={`Usar tema ${TEMA_LABELS[t].toLowerCase()}`}
            title={TEMA_LABELS[t]}
            aria-pressed={activo}
          >
            <Icono size={15} />
          </button>
        );
      })}
    </div>
  );
}

function DevAccessBar() {
  const router = useRouter();
  const setUsuario = useStore((s) => s.setUsuario);
  if (process.env.NODE_ENV === "production") return null;

  const entrarEstudio = (id: string) => {
    setUsuario(id);
    router.push("/");
  };

  return (
    <section className="flex flex-wrap items-center gap-2 rounded-[var(--radius-panel)] border border-dashed border-petroleo/35 bg-sol-suave/55 px-3 py-2" aria-label="Accesos rápidos de desarrollo">
      <span className="flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-[0.08em] text-crema-t">
        <KeyRound size={14} /> Dev roles
      </span>
      <Link href="/admin" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-tinta px-3 text-xs font-semibold text-white hover:bg-tinta-2">
        <UserCog size={13} /> Admin sistema
      </Link>
      <button onClick={() => entrarEstudio("u1")} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-tinta shadow-[0_1px_1px_rgb(17_26_23/0.08)] hover:bg-hundido">
        <ShieldCheck size={13} /> Estudio admin
      </button>
      <button onClick={() => entrarEstudio("u2")} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-tinta shadow-[0_1px_1px_rgb(17_26_23/0.08)] hover:bg-hundido">
        <BriefcaseBusiness size={13} /> Liquidador
      </button>
      <button onClick={() => entrarEstudio("u3")} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-tinta shadow-[0_1px_1px_rgb(17_26_23/0.08)] hover:bg-hundido">
        <Eye size={13} /> Solo lectura
      </button>
      <Link href="/cliente/colon" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-tinta shadow-[0_1px_1px_rgb(17_26_23/0.08)] hover:bg-hundido">
        <Building2 size={13} /> Empresa
      </Link>
      <Link href="/portal/espiga-3" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-tinta shadow-[0_1px_1px_rgb(17_26_23/0.08)] hover:bg-hundido">
        <UserRound size={13} /> Empleado
      </Link>
    </section>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const ok = useHidratado();
  const [menu, setMenu] = useState(false);
  return (
    <div className="mx-auto flex min-h-screen max-w-[1600px] gap-3 p-3">
      <aside className="sticky top-3 hidden h-[calc(100vh-24px)] w-[248px] shrink-0 lg:block">
        <Sidebar />
      </aside>
      {menu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-tinta/30" onClick={() => setMenu(false)} aria-label="Cerrar menú" />
          <div className="entra-drawer absolute inset-y-3 left-3 w-[260px]">
            <Sidebar onNav={() => setMenu(false)} />
          </div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <header className="flex items-center gap-3 rounded-[var(--radius-panel)] bg-hundido/0 px-1 pt-1">
          <button className="rounded-xl border border-linea bg-superficie p-3 lg:hidden" onClick={() => setMenu(true)} aria-label="Abrir menú">
            {menu ? <X size={18} /> : <Menu size={18} />}
          </button>
          {ok && <Busqueda />}
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-xl border border-linea bg-superficie px-4 py-2.5 text-sm font-semibold md:flex">
              <CalendarDays size={16} className="text-petroleo" /> {nombreMes(MES_ACTUAL)}
            </span>
            <span className="hidden rounded-xl border border-linea bg-superficie px-4 py-2.5 text-sm text-apagado xl:block">{ESTUDIO.nombre}</span>
            {ok && <SelectorTema />}
            <Link href="/login" className="hidden size-10 items-center justify-center rounded-xl border border-linea bg-superficie text-apagado hover:bg-hundido hover:text-tinta sm:inline-flex" aria-label="Cambiar acceso" title="Cambiar acceso">
              <LogIn size={16} />
            </Link>
            {ok && <Usuario />}
          </div>
        </header>
        {ok && <DevAccessBar />}
        <main className="min-w-0 flex-1">{ok ? children : <div className="h-[70vh] animate-pulse rounded-[var(--radius-panel)] bg-superficie/60" />}</main>
      </div>
    </div>
  );
}

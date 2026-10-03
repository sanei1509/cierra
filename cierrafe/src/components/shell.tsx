"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, FileText, Home, Search, Settings, ShieldCheck, Users, Eye, Menu, X, CalendarDays } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useHidratado, useStore } from "@/lib/store";
import { ESTUDIO } from "@/lib/seed";
import { MES_ACTUAL, nombreMes } from "@/lib/format";
import { DelegatedStudyFloat } from "./delegated-study-float";
import { AccountMenu } from "./account-menu";

const NAV = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/empresas", label: "Empresas", icon: Building2 },
  { href: "/empleados", label: "Empleados", icon: Users },
  { href: "/documentos", label: "Recibos y BPS", icon: FileText },
  { href: "/auditoria", label: "Auditoría", icon: ShieldCheck },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

type LogoVariant = "auto" | "full" | "symbol" | "darkSurface";

export function Logo({ claro = false, variant, className }: { claro?: boolean; variant?: LogoVariant; className?: string }) {
  const modo: LogoVariant = variant ?? (claro ? "darkSurface" : "auto");
  if (modo === "full") {
    return <Image src="/brand/cierra-logo.png" alt="Cierra" width={174} height={58} priority className={clsx("h-auto w-[150px] object-contain", className)} />;
  }
  if (modo === "symbol") {
    return <Image src="/brand/cierra-symbol.png" alt="Cierra" width={44} height={44} priority className={clsx("size-10 object-contain", className)} />;
  }
  const darkLogo = (
    <span className={clsx("flex items-center gap-2.5", className)} aria-label="Cierra">
      <Image src="/brand/cierra-symbol.png" alt="" width={40} height={40} priority className="size-9 shrink-0 object-contain" />
      <span className="text-[20px] font-extrabold tracking-tight text-[#F5F8FF]">cierra</span>
    </span>
  );
  if (modo === "darkSurface") return darkLogo;
  return (
    <span className={clsx("inline-flex items-center", className)}>
      <Image src="/brand/cierra-logo.png" alt="Cierra" width={174} height={58} priority className="cierra-logo-full h-auto w-[150px] object-contain" />
      <span className="cierra-logo-dark hidden">{darkLogo}</span>
    </span>
  );
}

function Sidebar({ onNav, vistaDelegada }: { onNav?: () => void; vistaDelegada?: boolean }) {
  const path = usePathname();
  return (
    <nav className="flex h-full min-h-0 flex-col overflow-y-auto rounded-[var(--radius-panel)] border border-linea bg-superficie p-4 shadow-[var(--cierra-shadow-soft)]" aria-label="Principal">
      {vistaDelegada ? (
        <DelegatedStudyFloat />
      ) : (
        <div className="px-2 pt-1 pb-7">
          <Logo />
        </div>
      )}
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
                  activo ? "bg-petroleo/10 text-tinta" : "text-apagado hover:bg-hundido/70 hover:text-tinta",
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
      <Link href="/portales" onClick={onNav} className={clsx("mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium", path.startsWith("/portales") ? "bg-petroleo/10 text-tinta" : "text-apagado hover:bg-hundido/70 hover:text-tinta")}>
        <Eye size={19} strokeWidth={1.8} />
        Cliente y empleado
      </Link>
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

export function Shell({ children, vistaDelegada = false, logoutAction }: { children: ReactNode; vistaDelegada?: boolean; logoutAction: () => Promise<void> }) {
  const ok = useHidratado();
  const [menu, setMenu] = useState(false);
  return (
    <div className="mx-auto flex min-h-screen max-w-[1600px] gap-3 p-3">
      <aside className="sticky top-3 hidden h-[calc(100vh-24px)] w-[248px] shrink-0 lg:block">
        <Sidebar vistaDelegada={vistaDelegada} />
      </aside>
      {menu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-[#0B1220]/50" onClick={() => setMenu(false)} aria-label="Cerrar menú" />
          <div className="entra-drawer absolute inset-y-3 left-3 w-[260px]">
            <Sidebar onNav={() => setMenu(false)} vistaDelegada={vistaDelegada} />
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
            {ok && <AccountMenu logoutAction={logoutAction} />}
          </div>
        </header>
        <main className="min-w-0 flex-1">{ok ? children : <div className="h-[70vh] animate-pulse rounded-[var(--radius-panel)] bg-superficie/60" />}</main>
      </div>
    </div>
  );
}

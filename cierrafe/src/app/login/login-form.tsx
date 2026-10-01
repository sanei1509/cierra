"use client";

import { useActionState, useState } from "react";
import { Building2, BriefcaseBusiness, Eye, LogIn, ShieldCheck, UserCog, UserRound } from "lucide-react";
import { iniciarSesion, type LoginState } from "./actions";
import { Boton } from "@/components/ui";
import { ACCESOS_DESARROLLO, type DevAccess, type DevAccessId } from "@/lib/dev-session";

const inicial: LoginState = { email: "", error: null };
const loginInputCls =
  "h-11 w-full rounded-[14px] border border-[#D8E1F0] bg-white px-3.5 text-sm text-[#102247] outline-none transition-colors placeholder:text-[#97A3BA] focus:border-[#2F6BFF] focus:ring-2 focus:ring-[#2F6BFF]/20";

const iconos = {
  system_admin: UserCog,
  admin_as_study: ShieldCheck,
  studio_admin: ShieldCheck,
  payroll_operator: BriefcaseBusiness,
  studio_readonly: Eye,
  company_owner: Building2,
  employee_self: UserRound,
} satisfies Record<DevAccessId, typeof UserCog>;

function GoogleMark() {
  return (
    <span className="relative flex size-5 items-center justify-center rounded-full bg-white text-[17px] font-extrabold leading-none text-[#4285F4]" aria-hidden>
      G
    </span>
  );
}

function AccesosDesarrollo({
  accesos,
  password,
  onSeleccionar,
}: {
  accesos: DevAccess[];
  password: string;
  onSeleccionar: (email: string, password: string) => void;
}) {
  return (
    <details className="group rounded-[18px] border border-[#D8E1F0] bg-white/78 px-4 py-3 shadow-[0_8px_22px_rgba(16,34,71,0.06)]">
      <summary className="flex min-w-0 cursor-pointer list-none items-center justify-between gap-2 text-xs font-bold uppercase tracking-[0.08em] text-[#2459E6] marker:hidden">
        <span className="truncate">Accesos rápidos de desarrollo</span>
        <span className="text-[#97A3BA] transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {accesos.map((acceso) => {
          const Icono = iconos[acceso.id];
          return (
            <button
              key={acceso.id}
              className="flex w-full items-center gap-3 rounded-[14px] border border-[#D8E1F0] bg-white px-3 py-2.5 text-left transition-colors hover:border-[#2F6BFF]/35 hover:bg-[#EAF2FF] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/25"
              type="button"
              onClick={() => onSeleccionar(acceso.email, password)}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF2FF] text-[#2F6BFF]">
                <Icono size={17} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-[#102247]">{acceso.label}</span>
                <span className="block truncate text-xs text-[#667592]">{acceso.email}</span>
              </span>
            </button>
          );
        })}
      </div>
    </details>
  );
}

export function LoginForm({ mostrarAccesosDesarrollo = false, devPassword = "CierraDemo123" }: { mostrarAccesosDesarrollo?: boolean; devPassword?: string }) {
  const [state, action, pending] = useActionState(iniciarSesion, inicial);
  const [email, setEmail] = useState(state.email);
  const [password, setPassword] = useState("");

  return (
    <div className="space-y-3">
      <form action={action} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-[#1B315F]">Email</span>
          <input name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={loginInputCls} placeholder="tu@email.com" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-[#1B315F]">Contraseña</span>
          <span className="relative block">
            <input name="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className={`${loginInputCls} pr-11`} placeholder="Tu contraseña" />
            <Eye size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#667592]" aria-hidden />
          </span>
        </label>
        {state.error && <p className="rounded-[14px] border border-[#E25555]/30 bg-[#FDE7E7] px-3 py-2 text-sm font-semibold text-[#B43232]">{state.error}</p>}
        <Boton type="submit" tam="lg" className="w-full !bg-[#2F6BFF] !text-white hover:!bg-[#2459E6]" disabled={pending}>
          <LogIn size={17} /> {pending ? "Entrando..." : "Entrar"}
        </Boton>
        <div className="flex items-center gap-3 py-0.5 text-xs font-semibold text-[#97A3BA]" aria-hidden>
          <span className="h-px flex-1 bg-[#D8E1F0]" />
          o
          <span className="h-px flex-1 bg-[#D8E1F0]" />
        </div>
        <button
          type="button"
          disabled
          className="inline-flex h-12 w-full cursor-not-allowed items-center justify-center gap-3 rounded-[14px] border border-[#D8E1F0] bg-white px-6 text-[15px] font-semibold text-[#102247] transition-colors hover:bg-[#F7FAFF] disabled:bg-[#F1F5FC] disabled:text-[#667592]"
          title="Se conectará cuando configuremos OAuth contra usuarios registrados"
        >
          <GoogleMark /> Entrar con Google
        </button>
      </form>

      {mostrarAccesosDesarrollo && (
        <AccesosDesarrollo
          accesos={ACCESOS_DESARROLLO}
          password={devPassword}
          onSeleccionar={(emailSeleccionado, passwordSeleccionado) => {
            setEmail(emailSeleccionado);
            setPassword(passwordSeleccionado);
          }}
        />
      )}
    </div>
  );
}

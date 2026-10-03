"use client";

import { useActionState, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Building2, BriefcaseBusiness, Eye, EyeOff, LogIn, ShieldCheck, UserCog, UserRound } from "lucide-react";
import Link from "next/link";
import { iniciarSesion, type LoginState } from "./actions";
import { Boton } from "@/components/ui";
import { CierraLoadingOverlay } from "@/components/cierra-loading";
import { ACCESOS_DESARROLLO, type DevAccess, type DevAccessId } from "@/lib/dev-session";

const inicial: LoginState = { email: "", error: null, submitKey: 0 };
const LOGIN_LOADER_DELAY_MS = 2500;
const loginInputCls =
  "h-11 w-full rounded-[14px] border border-[#D8E1F0] bg-white px-3.5 text-sm text-[#102247] outline-none transition-colors placeholder:text-[#7E8CA6] hover:border-[#B8C8E2] focus:border-[#2F6BFF] focus:ring-2 focus:ring-[#2F6BFF]/20 aria-invalid:border-[#E25555] aria-invalid:ring-2 aria-invalid:ring-[#E25555]/15";
const errorId = "login-error";

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
    <svg className="size-5" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path fill="#4285F4" d="M21.8 12.2c0-.7-.1-1.3-.2-1.9H12v3.7h5.5a4.7 4.7 0 0 1-2 3.1v2.5h3.2c1.9-1.7 3.1-4.3 3.1-7.4Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 .9-3.4.9a6 6 0 0 1-5.7-4.1H3v2.5A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.3 13.9a6 6 0 0 1 0-3.8V7.6H3a10 10 0 0 0 0 8.8l3.3-2.5Z" />
      <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.7 9.7 0 0 0 12 2a10 10 0 0 0-9 5.6l3.3 2.5A6 6 0 0 1 12 6Z" />
    </svg>
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
      <summary className="flex min-w-0 cursor-pointer list-none items-center justify-between gap-2 text-[11px] font-bold uppercase leading-snug tracking-[0.08em] text-[#2459E6] marker:hidden sm:text-xs">
        <span>Accesos rápidos de desarrollo</span>
        <span className="text-[#97A3BA] transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <div className="mt-3 grid max-h-[240px] gap-2 overflow-y-auto overscroll-contain pr-1 sm:max-h-[260px] sm:grid-cols-2 lg:max-h-[168px] lg:grid-cols-1">
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
  const formRef = useRef<HTMLFormElement>(null);
  const submitKeyInputRef = useRef<HTMLInputElement>(null);
  const loaderReadyInputRef = useRef<HTMLInputElement>(null);
  const siguienteSubmitKeyRef = useRef(inicial.submitKey);
  const [email, setEmail] = useState(state.email);
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [submitKey, setSubmitKey] = useState(inicial.submitKey);
  const mostrandoCarga = pending || submitKey > state.submitKey;

  return (
    <div className="space-y-3">
      {mostrandoCarga && <CierraLoadingOverlay />}
      <form
        ref={formRef}
        action={action}
        className="space-y-4"
        onSubmit={(event) => {
          if (loaderReadyInputRef.current?.value === "1") {
            loaderReadyInputRef.current.value = "0";
            return;
          }
          if (!event.currentTarget.checkValidity()) return;

          event.preventDefault();
          const siguienteSubmitKey = siguienteSubmitKeyRef.current + 1;
          siguienteSubmitKeyRef.current = siguienteSubmitKey;
          if (submitKeyInputRef.current) submitKeyInputRef.current.value = String(siguienteSubmitKey);
          flushSync(() => setSubmitKey(siguienteSubmitKey));

          window.setTimeout(() => {
            if (loaderReadyInputRef.current) loaderReadyInputRef.current.value = "1";
            formRef.current?.requestSubmit();
          }, LOGIN_LOADER_DELAY_MS);
        }}
      >
        <input ref={submitKeyInputRef} type="hidden" name="submitKey" defaultValue={inicial.submitKey} />
        <input ref={loaderReadyInputRef} type="hidden" name="loaderReady" defaultValue="0" />
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-sm font-semibold text-[#1B315F]">Email</label>
          <input id="login-email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required aria-invalid={Boolean(state.error)} aria-describedby={state.error ? errorId : undefined} className={loginInputCls} placeholder="tu@email.com" />
        </div>
        <div>
          <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <label htmlFor="login-password" className="text-sm font-semibold text-[#1B315F]">Contraseña</label>
            <Link
              href="/login/recuperar"
              className="rounded-md text-xs font-bold text-[#2459E6] underline-offset-4 transition-colors hover:text-[#2F6BFF] hover:underline focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/25"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <span className="relative block">
            <input id="login-password" name="password" type={mostrarPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required aria-invalid={Boolean(state.error)} aria-describedby={state.error ? errorId : undefined} className={`${loginInputCls} pr-11`} placeholder="Tu contraseña" />
            <button
              type="button"
              className="absolute right-2.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#667592] transition-colors hover:bg-[#EAF2FF] hover:text-[#2459E6] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/25"
              aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={mostrarPassword}
              onClick={() => setMostrarPassword((actual) => !actual)}
            >
              {mostrarPassword ? <EyeOff size={17} aria-hidden /> : <Eye size={17} aria-hidden />}
            </button>
          </span>
        </div>
        {state.error && <p id={errorId} role="alert" className="rounded-[14px] border border-[#E25555]/30 bg-[#FDE7E7] px-3 py-2 text-sm font-semibold text-[#B43232]">{state.error}</p>}
        <Boton type="submit" tam="lg" className="w-full !bg-[#2F6BFF] !text-white hover:!bg-[#2459E6] active:!bg-[#1D4FD4] focus:!ring-2 focus:!ring-[#2F6BFF]/30 disabled:!bg-[#D8E1F0] disabled:!text-[#667592]" disabled={mostrandoCarga}>
          <LogIn size={17} /> {mostrandoCarga ? "Entrando..." : "Entrar"}
        </Boton>
        <div className="flex items-center gap-3 py-0.5 text-xs font-semibold text-[#97A3BA]" aria-hidden>
          <span className="h-px flex-1 bg-[#D8E1F0]" />
          o
          <span className="h-px flex-1 bg-[#D8E1F0]" />
        </div>
        <button
          type="button"
          className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-[14px] border border-[#CBD7EA] bg-white px-6 text-[15px] font-semibold text-[#102247] shadow-[0_8px_18px_rgba(16,34,71,0.04)] transition-colors hover:border-[#AFC0DA] hover:bg-[#F7FAFF] active:bg-[#EEF4FF] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/25"
          aria-describedby="google-pending"
          title="Google todavía no está configurado para autenticar usuarios"
        >
          <GoogleMark /> Continuar con Google
        </button>
        <p id="google-pending" className="sr-only">Google todavía no está configurado y este botón no inicia autenticación.</p>
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

"use client";

import { useActionState } from "react";
import { Eye, LogIn } from "lucide-react";
import { iniciarSesion, type LoginState } from "./actions";
import { Boton } from "@/components/ui";

const inicial: LoginState = { email: "", error: null };
const loginInputCls =
  "h-11 w-full rounded-[14px] border border-[#D8E1F0] bg-white px-3.5 text-sm text-[#102247] outline-none transition-colors placeholder:text-[#97A3BA] focus:border-[#2F6BFF] focus:ring-2 focus:ring-[#2F6BFF]/20";

function GoogleMark() {
  return (
    <span className="relative flex size-5 items-center justify-center rounded-full bg-white text-[17px] font-extrabold leading-none text-[#4285F4]" aria-hidden>
      G
    </span>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState(iniciarSesion, inicial);

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-[#1B315F]">Email</span>
        <input name="email" type="email" autoComplete="email" defaultValue={state.email} required className={loginInputCls} placeholder="tu@email.com" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-[#1B315F]">Contraseña</span>
        <span className="relative block">
          <input name="password" type="password" autoComplete="current-password" required className={`${loginInputCls} pr-11`} placeholder="Tu contraseña" />
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
  );
}

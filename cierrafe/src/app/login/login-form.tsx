"use client";

import { useActionState } from "react";
import { KeyRound, LogIn } from "lucide-react";
import { iniciarSesion, type LoginState } from "./actions";
import { Boton, inputCls } from "@/components/ui";

const inicial: LoginState = { email: "", error: null };

export function LoginForm() {
  const [state, action, pending] = useActionState(iniciarSesion, inicial);

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-tinta-2">Email</span>
        <input name="email" type="email" autoComplete="email" defaultValue={state.email} required className={inputCls} placeholder="tu@email.com" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-tinta-2">Contraseña</span>
        <input name="password" type="password" autoComplete="current-password" required className={inputCls} placeholder="Tu contraseña" />
      </label>
      {state.error && <p className="rounded-xl border border-rosa/60 bg-rosa px-3 py-2 text-sm font-semibold text-rosa-t">{state.error}</p>}
      <Boton type="submit" tam="lg" className="w-full" disabled={pending}>
        <LogIn size={17} /> {pending ? "Entrando..." : "Entrar"}
      </Boton>
      <button
        type="button"
        disabled
        className="inline-flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-linea bg-white px-6 text-[15px] font-semibold text-apagado"
        title="Se conectará cuando configuremos OAuth contra usuarios registrados"
      >
        <KeyRound size={17} /> Entrar con Google
      </button>
    </form>
  );
}

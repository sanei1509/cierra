import Link from "next/link";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/shell";
import { Panel } from "@/components/ui";

const inputCls =
  "h-11 w-full rounded-[14px] border border-[#D8E1F0] bg-white px-3.5 text-sm text-[#102247] outline-none transition-colors placeholder:text-[#7E8CA6] hover:border-[#B8C8E2] focus:border-[#2F6BFF] focus:ring-2 focus:ring-[#2F6BFF]/20";

export default function RecuperarPasswordPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#FFFFFF_0%,#F7FAFF_52%,#EAF2FF_100%)] px-4 py-8 text-[#102247] sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[430px] flex-col justify-center">
        <div className="mb-6">
          <Logo variant="full" className="w-[154px]" />
        </div>

        <Panel className="rounded-[24px] border-[#E3EAF6] bg-white p-6 shadow-[0_22px_60px_rgba(16,34,71,0.12)] sm:p-7">
          <p className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.08em] text-[#2F6BFF]">
            <span className="flex size-8 items-center justify-center rounded-xl bg-[#EAF2FF] text-[#2F6BFF]" aria-hidden>
              <ShieldCheck size={16} />
            </span>
            Recuperar acceso
          </p>
          <h1 className="mt-3 text-[29px] font-extrabold leading-tight tracking-tight text-[#102247]">Restablecer contraseña</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#667592]">
            Ingresá el email habilitado para tu cuenta. Esta pantalla deja preparado el flujo, pero todavía falta conectar el backend de envío de recuperación.
          </p>

          <form className="mt-6 space-y-4">
            <div>
              <label htmlFor="recover-email" className="mb-1.5 block text-sm font-semibold text-[#1B315F]">Email</label>
              <input id="recover-email" name="email" type="email" autoComplete="email" required className={inputCls} placeholder="tu@email.com" />
            </div>

            <button
              type="button"
              disabled
              className="inline-flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-[14px] bg-[#D8E1F0] px-6 text-[15px] font-semibold text-[#667592]"
              title="Pendiente de conectar al backend de recuperación"
            >
              <Mail size={17} aria-hidden />
              Envío pendiente de conectar
            </button>
          </form>

          <p className="mt-4 rounded-[14px] border border-[#D8E1F0] bg-[#F7FAFF] px-3.5 py-3 text-xs leading-relaxed text-[#667592]">
            Falta implementar el endpoint o acción backend que genere el token, guarde su vencimiento y envíe el email de restablecimiento.
          </p>

          <Link
            href="/login"
            className="mt-5 inline-flex items-center gap-2 rounded-lg text-sm font-bold text-[#2459E6] transition-colors hover:text-[#2F6BFF] hover:underline focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/25"
          >
            <ArrowLeft size={16} aria-hidden />
            Volver al login
          </Link>
        </Panel>
      </div>
    </main>
  );
}

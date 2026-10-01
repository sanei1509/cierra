import { Building2, Eye, KeyRound, ShieldCheck, UserCog, UserRound, BriefcaseBusiness } from "lucide-react";
import { LoginForm } from "./login-form";
import { entrarComoDesarrollo } from "./actions";
import { Logo } from "@/components/shell";
import { Panel } from "@/components/ui";
import { ACCESOS_DESARROLLO, type DevAccessId } from "@/lib/dev-session";

const iconos = {
  system_admin: UserCog,
  admin_as_study: ShieldCheck,
  studio_admin: ShieldCheck,
  payroll_operator: BriefcaseBusiness,
  studio_readonly: Eye,
  company_owner: Building2,
  employee_self: UserRound,
} satisfies Record<DevAccessId, typeof UserCog>;

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-lienzo p-3 lg:grid-cols-[minmax(0,1fr)_460px]">
      <section className="relative hidden overflow-hidden rounded-[var(--radius-panel)] bg-petroleo p-8 text-white lg:flex lg:flex-col">
        <div className="absolute inset-x-0 bottom-0 h-64 bg-[linear-gradient(180deg,transparent,rgb(232_183_57/0.18))]" />
        <Logo claro />
        <div className="relative mt-auto max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.1em] text-sol">Cierra</p>
          <h1 className="mt-3 text-5xl font-extrabold leading-[1.02] tracking-tight">Un acceso para cada nivel del sistema.</h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/72">
            Admin, estudio, empresa y empleado entran por la misma puerta. La diferencia la marca el mail que ya fue registrado por quien corresponde.
          </p>
        </div>
      </section>

      <section className="flex min-w-0 items-center justify-center px-2 py-8 sm:px-6">
        <div className="w-full max-w-md space-y-3">
          <div className="px-1 lg:hidden">
            <Logo />
          </div>
          <Panel className="p-6 sm:p-7">
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.08em] text-petroleo">
              <KeyRound size={16} /> Acceso
            </p>
            <h2 className="mt-2 text-[30px] font-extrabold leading-tight tracking-tight">Entrar a Cierra</h2>
            <p className="mt-2 text-sm leading-relaxed text-apagado">
              Usá un mail que ya haya sido cargado en el sistema: nosotros damos acceso al estudio, el estudio a sus empresas, y la empresa a sus empleados.
            </p>
            <div className="mt-6">
              <LoginForm />
            </div>
          </Panel>

          {process.env.NODE_ENV !== "production" && (
            <Panel className="p-4">
              <p className="px-1 text-xs font-bold uppercase tracking-[0.08em] text-crema-t">Accesos rápidos de desarrollo</p>
              <div className="mt-3 grid gap-2">
                {ACCESOS_DESARROLLO.map((acceso) => {
                  const Icono = iconos[acceso.id];
                  const action = entrarComoDesarrollo.bind(null, acceso.id);
                  return (
                    <form key={acceso.id} action={action}>
                      <button className="flex w-full items-center gap-3 rounded-xl border border-linea bg-white px-3 py-3 text-left hover:bg-hundido" type="submit">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-hundido text-petroleo">
                          <Icono size={18} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-bold">{acceso.label}</span>
                          <span className="block truncate text-xs text-apagado">{acceso.email}</span>
                        </span>
                      </button>
                    </form>
                  );
                })}
              </div>
            </Panel>
          )}
        </div>
      </section>
    </main>
  );
}

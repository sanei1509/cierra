import type { ReactNode } from "react";
import { Building2, KeyRound, ReceiptText, Users, ClipboardCheck } from "lucide-react";
import { LoginForm } from "./login-form";
import { Panel } from "@/components/ui";
import { Logo } from "@/components/shell";

const conceptos = [
  { label: "Empresas", icon: Building2 },
  { label: "Empleados", icon: Users },
  { label: "Liquidaciones", icon: ClipboardCheck },
  { label: "Recibos", icon: ReceiptText },
];


function PreviewCard({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[18px] border border-[#D8E1F0]/80 bg-white/92 p-4 text-[#102247] shadow-[0_18px_42px_rgba(16,34,71,0.14)] backdrop-blur ${className}`}>
      <p className="text-xs font-extrabold text-[#102247]">{title}</p>
      {children}
    </div>
  );
}

export default function LoginPage() {
  const mostrarAccesosDesarrollo = process.env.NODE_ENV !== "production";
  const devPassword = process.env.CIERRA_DEV_PASSWORD ?? "CierraDemo123";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F7FAFF] p-2 text-[#102247] sm:p-3 lg:p-4">
      <div className="relative mx-auto grid w-full min-w-0 grid-cols-1 min-h-[calc(100vh-16px)] max-w-[1360px] overflow-hidden rounded-[30px] border border-white bg-[linear-gradient(135deg,#FFFFFF_0%,#F7FAFF_52%,#EAF2FF_100%)] shadow-[0_20px_58px_rgba(16,34,71,0.14)] lg:min-h-[calc(100vh-32px)] lg:grid-cols-[minmax(0,1fr)_430px] xl:grid-cols-[minmax(0,1fr)_480px]">
        <section className="relative hidden min-h-[690px] overflow-hidden px-12 py-9 lg:flex lg:flex-col xl:px-16">
          <div className="relative z-20">
            <Logo variant="full" className="w-[168px]" />
          </div>

          <div className="relative z-20 mt-9 max-w-2xl">
            <h1 className="max-w-[660px] text-[43px] font-extrabold leading-[1.06] tracking-tight text-[#102247] xl:text-[51px]">
              Todo el trabajo mensual de tu estudio, en un solo lugar.
            </h1>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-[#667592] xl:text-lg">
              Empresas, empleados, novedades, liquidaciones y recibos organizados en una plataforma clara, segura y moderna.
            </p>
          </div>

          <div className="relative z-20 mt-7 grid max-w-[515px] grid-cols-4 gap-4">
            {conceptos.map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-2 rounded-2xl border border-white bg-white/82 px-3 py-4 text-center shadow-[0_10px_24px_rgba(16,34,71,0.08)]">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-[#EAF2FF] text-[#2F6BFF]">
                  <item.icon size={20} />
                </span>
                <span className="text-xs font-bold text-[#1B315F]">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[355px] overflow-hidden">
            <div className="absolute -left-24 bottom-[-92px] h-[300px] w-[760px] rounded-[50%] bg-[linear-gradient(135deg,#2F6BFF_0%,#6CB3FF_100%)] opacity-95" />
            <div className="absolute left-[22%] bottom-[-34px] h-[255px] w-[680px] rounded-[50%] bg-[#CFE4FF]/90" />
            <div className="absolute left-[-6%] bottom-[112px] h-[210px] w-[710px] rounded-[50%] border border-white/75" />
            <div className="absolute left-[44%] bottom-[42px] h-[230px] w-[520px] rounded-[50%] bg-[#EAF2FF]/80" />
            <div className="absolute left-[44%] bottom-[138px] h-32 w-[390px] rounded-[50%] border border-[#F5B633]" />
          </div>

          <div className="pointer-events-none absolute inset-x-12 bottom-9 z-10 h-[218px] xl:inset-x-16">
            <PreviewCard title="Liquidaciones" className="absolute left-0 bottom-3 w-[250px] rotate-[-6deg]">
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-[#667592]">Agosto 2026</span>
                <span className="rounded-full bg-[#E4F8EF] px-2 py-0.5 font-bold text-[#147A52]">Finalizada</span>
              </div>
              <div className="mt-4 flex h-20 items-end gap-2">
                {[36, 54, 48, 61, 42, 70, 50, 78].map((h, i) => (
                  <span key={i} className="flex-1 rounded-t-md bg-[#9EDBBF]" style={{ height: h }} />
                ))}
              </div>
            </PreviewCard>

            <PreviewCard title="Empleados" className="absolute left-[260px] bottom-16 w-[165px] rotate-[-7deg]">
              <p className="mt-2 text-3xl font-extrabold text-[#102247]">52</p>
              <p className="text-xs text-[#667592]">empleados activos</p>
              <div className="mt-3 flex -space-x-2">
                {["NA", "MP", "JR"].map((x) => <span key={x} className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-[#EAF2FF] text-[10px] font-bold text-[#2459E6]">{x}</span>)}
                <span className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-[#FFF5D9] text-[10px] font-bold text-[#926410]">+46</span>
              </div>
            </PreviewCard>

            <PreviewCard title="Recibos" className="absolute right-[112px] bottom-[78px] w-[205px] rotate-[-7deg]">
              {["Agosto 2026", "Julio 2026", "Junio 2026"].map((m) => (
                <p key={m} className="mt-2 flex items-center justify-between gap-2 text-xs text-[#667592]"><span>{m}</span><span className="rounded-full bg-[#E4F8EF] px-2 py-0.5 font-bold text-[#147A52]">Enviados</span></p>
              ))}
            </PreviewCard>

            <PreviewCard title="Empresas" className="absolute right-0 bottom-0 w-[174px] rotate-[-6deg]">
              <div className="mt-3 flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-[#EAF2FF] text-[#2F6BFF]"><Building2 size={19} /></span>
                <span><span className="block text-3xl font-extrabold text-[#102247]">8</span><span className="block text-xs text-[#667592]">empresas activas</span></span>
              </div>
            </PreviewCard>
          </div>
        </section>

        <section className="relative z-20 flex min-w-0 overflow-hidden items-center justify-center px-3 py-7 sm:px-8 lg:bg-transparent">
          <div className="min-w-0 max-w-[394px] space-y-3" style={{ width: "min(394px, calc(100vw - 48px))" }}>
            <div className="px-1 lg:hidden">
              <Logo variant="full" className="w-[154px]" />
              <p className="mt-5 text-2xl font-extrabold leading-tight text-[#102247]">Todo el trabajo mensual de tu estudio, en un solo lugar.</p>
            </div>

            <Panel className="rounded-[24px] border-[rgba(16,34,71,0.10)] bg-white p-6 shadow-[0_16px_50px_rgba(16,34,71,0.10)] sm:p-7">
              <p className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.08em] text-[#2F6BFF]">
                <KeyRound size={16} /> Acceso
              </p>
              <h2 className="mt-3 text-[29px] font-extrabold leading-tight tracking-tight text-[#102247]">Entrar a Cierra</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#667592]">Accedé con el email habilitado para tu cuenta.</p>
              <div className="mt-6">
                <LoginForm mostrarAccesosDesarrollo={mostrarAccesosDesarrollo} devPassword={mostrarAccesosDesarrollo ? devPassword : ""} />
              </div>
              <a
                href="https://nmbtech.net"
                target="_blank"
                rel="noreferrer"
                className="mt-5 block rounded-[14px] bg-[#EAF2FF] px-4 py-3 text-center transition-colors hover:bg-[#DCEBFF] focus:outline-none focus:ring-2 focus:ring-[#2F6BFF]/25"
              >
                <p className="text-sm font-bold text-[#102247]">¿Necesitás acceso?</p>
                <p className="text-xs font-medium text-[#667592]">Conectá con un administrador.</p>
              </a>
            </Panel>
          </div>
        </section>
      </div>
    </main>
  );
}

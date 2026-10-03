import Link from "next/link";
import { Building2, Layers3, LogOut, Menu, ReceiptText, ShieldCheck, Users, UserCog } from "lucide-react";
import { listarDatosConsolaComercial } from "./actions";
import { cerrarSesion, entrarComoDesarrollo } from "../login/actions";
import { AdminCommercialConsole } from "@/components/admin-commercial-console";
import { Boton, Panel } from "@/components/ui";
import { Logo } from "@/components/shell";

const accesos = [
  { href: "/", titulo: "Entrar al estudio demo", detalle: "Vista del contador con cartera, empresas y liquidaciones.", icon: Building2 },
  { href: "/funciones", titulo: "Funciones cubiertas", detalle: "Inventario actual de lo que ya hace Cierra.", icon: Layers3 },
  { href: "/portales", titulo: "Portales", detalle: "Accesos de prueba para empresa y empleado.", icon: Users },
  { href: "/documentos", titulo: "Recibos y BPS", detalle: "Documentos publicados y archivo de nomina.", icon: ReceiptText },
];

export default async function AdminSistema() {
  const actuarComoEstudio = entrarComoDesarrollo.bind(null, "admin_as_study");
  const datosComerciales = await listarDatosConsolaComercial();

  return (
    <main className="min-h-screen space-y-3 px-3 py-2 sm:px-4">
      <header className="flex h-14 items-center justify-between gap-3">
        <Logo className="w-[132px]" />
        <details className="group relative">
          <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-xl border border-linea bg-superficie text-tinta shadow-[0_1px_2px_rgb(16_34_71/0.05)] transition-colors hover:bg-hundido [&::-webkit-details-marker]:hidden" aria-label="Abrir menú de cuenta">
            <Menu size={18} />
          </summary>
          <div className="absolute right-0 top-12 z-20 w-44 rounded-xl border border-linea bg-superficie p-1.5 shadow-[var(--cierra-shadow-soft)]">
            <form action={cerrarSesion}>
              <button type="submit" className="flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-semibold text-tinta-2 hover:bg-hundido hover:text-tinta">
                <LogOut size={15} /> Salir
              </button>
            </form>
          </div>
        </details>
      </header>

      <section className="rounded-[var(--radius-panel)] border border-linea/80 bg-superficie px-5 py-4">
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.08em] text-petroleo">
          <ShieldCheck size={16} /> Admin sistema
        </p>
        <h1 className="mt-1 text-[28px] font-extrabold leading-tight tracking-tight">Control general de Cierra</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-apagado">
          Administrá estudios, accesos, módulos contratados, precios, actividad global y soporte desde un único lugar.
        </p>
      </section>

      <AdminCommercialConsole datosIniciales={datosComerciales} />

      <div className="grid gap-3 md:grid-cols-2">
        <Panel className="p-5">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.08em] text-petroleo">
            <UserCog size={16} /> Operación delegada
          </p>
          <h2 className="mt-2 text-lg font-bold tracking-tight">Funcionar como estudio contable</h2>
          <p className="mt-2 text-sm leading-relaxed text-apagado">
            Para servicio directo o soporte: entrás al tablero del estudio, podés operar empresas y empleados, y la sesión queda marcada como iniciada por admin.
          </p>
          <form action={actuarComoEstudio} className="mt-4">
            <Boton type="submit" className="w-full">
              <ShieldCheck size={15} /> Funcionar como estudio contable
            </Boton>
          </form>
        </Panel>
        <Panel className="p-5">
          <h2 className="text-lg font-bold tracking-tight">Atajos de desarrollo</h2>
          <div className="mt-4 grid gap-2">
            {accesos.map((a) => (
              <Link key={a.href} href={a.href} className="flex items-center gap-3 rounded-xl border border-linea bg-superficie px-3 py-3 hover:bg-hundido">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-hundido text-petroleo">
                  <a.icon size={18} />
                </span>
                <span>
                  <span className="block text-sm font-bold">{a.titulo}</span>
                  <span className="block text-xs text-apagado">{a.detalle}</span>
                </span>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </main>
  );
}

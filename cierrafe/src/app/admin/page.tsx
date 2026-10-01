import Link from "next/link";
import { ArrowLeft, Building2, Layers3, ReceiptText, ShieldCheck, Users, UserCog } from "lucide-react";
import { entrarComoDesarrollo } from "../login/actions";
import { AdminCommercialConsole } from "@/components/admin-commercial-console";
import { Boton, Panel } from "@/components/ui";
import { Logo } from "@/components/shell";

const accesos = [
  { href: "/", titulo: "Entrar al estudio demo", detalle: "Vista del contador con cartera, empresas y liquidaciones.", icon: Building2 },
  { href: "/funciones", titulo: "Funciones cubiertas", detalle: "Inventario actual de lo que ya hace Cierra.", icon: Layers3 },
  { href: "/portales", titulo: "Portales", detalle: "Accesos de prueba para empresa y empleado.", icon: Users },
  { href: "/documentos", titulo: "Recibos y BPS", detalle: "Documentos publicados y archivo de nomina.", icon: ReceiptText },
];

export default function AdminSistema() {
  const actuarComoEstudio = entrarComoDesarrollo.bind(null, "admin_as_study");

  return (
    <main className="mx-auto min-h-screen max-w-6xl space-y-3 p-3">
      <Panel className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <Logo />
        <Boton variante="secundario" href="/">
          <ArrowLeft size={15} /> Volver al estudio
        </Boton>
      </Panel>

      <Panel className="px-7 py-6">
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.08em] text-petroleo">
          <ShieldCheck size={16} /> Admin sistema
        </p>
        <h1 className="mt-2 text-[34px] font-extrabold leading-tight tracking-tight">Control general de Cierra</h1>
        <p className="mt-2 max-w-3xl text-[15px] text-apagado">
          Pantalla provisoria para desarrollo. Este rol va a administrar estudios, accesos, modulos contratados, precios, actividad global y soporte.
        </p>
      </Panel>

      <AdminCommercialConsole />

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
              <Link key={a.href} href={a.href} className="flex items-center gap-3 rounded-xl border border-linea bg-white px-3 py-3 hover:bg-hundido">
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

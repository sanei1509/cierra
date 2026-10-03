import { cookies } from "next/headers";
import { ShieldCheck } from "lucide-react";
import { listarDatosConsolaComercial } from "./actions";
import { AdminRestoreRedirect } from "./admin-restore-redirect";
import { cerrarSesion, entrarComoDesarrollo } from "../login/actions";
import { AdminAccountMenu } from "./admin-account-menu";
import { AdminCommercialConsole } from "@/components/admin-commercial-console";
import { Logo } from "@/components/shell";
import { exigirSesionDev } from "@/lib/dev-auth";
import { DEV_SESSION_COOKIE, parsearSesionDev } from "@/lib/dev-session";

export default async function AdminSistema() {
  const actuarComoEstudio = entrarComoDesarrollo.bind(null, "admin_as_study");
  const sesionDev = parsearSesionDev((await cookies()).get(DEV_SESSION_COOKIE)?.value);
  if (sesionDev && sesionDev.actor !== "sistema" && sesionDev.delegadoPor) {
    return <AdminRestoreRedirect />;
  }

  const sesion = await exigirSesionDev(["sistema"]);
  const datosComerciales = await listarDatosConsolaComercial();
  const auditoriaActor =
    "email" in sesion && sesion.email
      ? sesion.email
      : "espacio" in sesion && sesion.espacio.actorTipo === "sistema"
        ? process.env.CIERRA_DEV_ADMIN_EMAIL ?? "admin@cierra.local"
        : (sesion.usuarioId ?? undefined);

  return (
    <main className="min-h-screen space-y-3 px-3 py-2 sm:px-4">
      <header className="flex h-14 items-center justify-between gap-3">
        <Logo className="w-[132px]" />
        <AdminAccountMenu logoutAction={cerrarSesion} />
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

      <AdminCommercialConsole datosIniciales={datosComerciales} auditoriaActor={auditoriaActor} actuarComoEstudioAction={actuarComoEstudio} />
    </main>
  );
}

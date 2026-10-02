import { cargarDatosPortalEmpleado } from "@/lib/backend-operativo";
import ReciboClient from "./recibo-client";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; mes: string }>;
  searchParams: Promise<{ desde?: string; imprimir?: string }>;
}) {
  const [{ id, mes }, sp] = await Promise.all([params, searchParams]);
  const datosIniciales = await cargarDatosPortalEmpleado(id);
  return <ReciboClient id={id} mes={mes} desdePortal={sp.desde === "portal"} imprimir={Boolean(sp.imprimir)} datosIniciales={datosIniciales} />;
}

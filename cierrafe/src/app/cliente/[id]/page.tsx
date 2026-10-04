import { cargarDatosPortalEmpresa, contextoOperativoActual } from "@/lib/backend-operativo";
import { cerrarSesion } from "@/app/login/actions";
import ClienteClient from "./cliente-client";

export default async function PortalClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [datosIniciales, ctx] = await Promise.all([cargarDatosPortalEmpresa(id), contextoOperativoActual()]);
  const mostrarVolverEstudio = ctx?.actorTipo === "estudio";
  return <ClienteClient id={id} datosIniciales={datosIniciales} mostrarVolverEstudio={mostrarVolverEstudio} logoutAction={cerrarSesion} />;
}

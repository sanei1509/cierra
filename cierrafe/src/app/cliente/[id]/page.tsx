import { cargarDatosPortalEmpresa } from "@/lib/backend-operativo";
import ClienteClient from "./cliente-client";

export default async function PortalClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const datosIniciales = await cargarDatosPortalEmpresa(id);
  return <ClienteClient id={id} datosIniciales={datosIniciales} />;
}

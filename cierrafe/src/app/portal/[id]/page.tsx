import { cargarDatosPortalEmpleado } from "@/lib/backend-operativo";
import PortalEmpleadoClient from "./portal-client";

export default async function PortalEmpleadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const datosIniciales = await cargarDatosPortalEmpleado(id);
  return <PortalEmpleadoClient id={id} datosIniciales={datosIniciales} />;
}

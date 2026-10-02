import { cargarDatosOperativosIniciales } from "@/lib/backend-operativo";
import PortalesClient from "./portales-client";

export default async function PortalesPage() {
  const datosIniciales = await cargarDatosOperativosIniciales();
  return <PortalesClient datosIniciales={datosIniciales} />;
}

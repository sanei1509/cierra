import { cargarDatosOperativosIniciales } from "@/lib/backend-operativo";
import EmpresasClient from "./empresas-client";

export default async function EmpresasPage() {
  const datosIniciales = await cargarDatosOperativosIniciales();
  return <EmpresasClient datosIniciales={datosIniciales} />;
}

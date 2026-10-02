import { cargarDatosOperativosIniciales } from "@/lib/backend-operativo";
import EmpresaClient from "./empresa-client";

export default async function EmpresaPage() {
  const datosIniciales = await cargarDatosOperativosIniciales();
  return <EmpresaClient datosIniciales={datosIniciales} />;
}

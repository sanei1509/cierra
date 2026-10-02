import { cargarDatosOperativosIniciales } from "@/lib/backend-operativo";
import EmpleadosClient from "./empleados-client";

export default async function EmpleadosPage() {
  const datosIniciales = await cargarDatosOperativosIniciales();
  return <EmpleadosClient datosIniciales={datosIniciales} />;
}

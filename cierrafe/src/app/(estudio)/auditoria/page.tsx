import { cargarDatosOperativosIniciales } from "@/lib/backend-operativo";
import AuditoriaClient from "./auditoria-client";

export default async function AuditoriaPage() {
  const datosIniciales = await cargarDatosOperativosIniciales();
  return <AuditoriaClient datosIniciales={datosIniciales} />;
}

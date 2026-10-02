import { cargarDatosOperativosIniciales } from "@/lib/backend-operativo";
import InicioClient from "./inicio-client";

export default async function InicioPage() {
  const datosIniciales = await cargarDatosOperativosIniciales();
  return <InicioClient datosIniciales={datosIniciales} />;
}

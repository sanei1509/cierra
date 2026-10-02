import { cargarDatosOperativosIniciales } from "@/lib/backend-operativo";
import DocumentosClient from "./documentos-client";

export default async function Documentos() {
  const datosIniciales = await cargarDatosOperativosIniciales();
  return <DocumentosClient datosIniciales={datosIniciales} />;
}

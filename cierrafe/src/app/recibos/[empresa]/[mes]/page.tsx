import { cargarDatosRecibosEmpresa } from "@/lib/backend-operativo";
import RecibosClient from "./recibos-client";

export default async function Page({ params }: { params: Promise<{ empresa: string; mes: string }> }) {
  const { empresa, mes } = await params;
  const datosIniciales = await cargarDatosRecibosEmpresa(empresa);
  return <RecibosClient empresaId={empresa} mes={mes} datosIniciales={datosIniciales} />;
}

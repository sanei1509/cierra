import type { Empleado, Empresa, ResultadoEmpleado } from "./types";

/**
 * Exportación de nómina. FORMATO DE EJEMPLO: la especificación real de BPS
 * (declaración nominada / software propio) se implementa en la fase 1.
 */
export function archivoNomina(empresa: Empresa, mes: string, empleados: Empleado[], resultados: ResultadoEmpleado[]) {
  const filas = resultados
    .filter((r) => !r.fueraDeAlcance)
    .map((r) => {
      const e = empleados.find((x) => x.id === r.empleadoId)!;
      const dias = r.lineas.find((l) => l.codigo === "001")?.cantidad ?? 30;
      return [e.ci.replace(/\D/g, ""), `${e.apellido}, ${e.nombre}`, e.ingreso, dias, "1", e.hijos > 0 ? "S" : "N", r.nominalGravado.toFixed(2)].join(";");
    });
  return [
    `# NOMINA DE EJEMPLO - NO PRESENTAR - formato BPS pendiente de implementación`,
    `# Empresa ${empresa.nroBps};RUT ${empresa.rut};Periodo ${mes.replace("-", "")}`,
    "documento;nombre;ingreso;dias;vinculo;hijos_fonasa;nominal_gravado",
    ...filas,
  ].join("\n");
}

export function descargar(nombre: string, contenido: string, tipo = "text/plain") {
  const url = URL.createObjectURL(new Blob([contenido], { type: `${tipo};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

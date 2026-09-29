/**
 * Parámetros normativos versionados por vigencia (RF-043, RN-03, RN-11).
 *
 * IMPORTANTE: los valores son REFERENCIALES para el prototipo. Antes de
 * liquidar casos reales deben validarse contra BPS / DGI / MTSS y cargarse
 * con su fuente. Ningún valor del motor vive fuera de esta tabla.
 */

export interface Parametros {
  id: string;
  vigenciaDesde: string; // YYYY-MM
  vigenciaHasta: string | null;
  fuente: string;
  bpc: number;
  personal: { jubilatorio: number; frl: number };
  fonasa: {
    umbralBpc: number; // hasta este múltiplo de BPC aplica tasa baja
    tasaBaja: number;
    tasaSinHijos: number;
    tasaConHijos: number;
    adicionalConyuge: number;
  };
  topeJubilatorio: number;
  patronal: { jubilatorio: number; fonasa: number; frl: number; fgcl: number };
  irpf: {
    franjasBpc: { desde: number; hasta: number | null; tasa: number }[];
    incremento6DesdeBpc: number;
    deduccionHijoBpcAnual: number;
    tasaDeduccionBaja: number;
    tasaDeduccionAlta: number;
    umbralTasaDeduccionBpc: number;
  };
  horas: { divisor: number; recargoExtra: number };
  /** Feriado pago trabajado: jornales adicionales por día (regla de ejemplo) */
  feriadoFactor: number;
}

const franjas = [
  { desde: 0, hasta: 7, tasa: 0 },
  { desde: 7, hasta: 10, tasa: 0.1 },
  { desde: 10, hasta: 15, tasa: 0.15 },
  { desde: 15, hasta: 30, tasa: 0.24 },
  { desde: 30, hasta: 50, tasa: 0.25 },
  { desde: 50, hasta: 75, tasa: 0.27 },
  { desde: 75, hasta: 115, tasa: 0.31 },
  { desde: 115, hasta: null, tasa: 0.36 },
];

const base2026: Omit<Parametros, "id" | "vigenciaDesde" | "vigenciaHasta" | "fuente" | "bpc" | "topeJubilatorio"> = {
  personal: { jubilatorio: 0.15, frl: 0.001 },
  fonasa: { umbralBpc: 2.5, tasaBaja: 0.03, tasaSinHijos: 0.045, tasaConHijos: 0.06, adicionalConyuge: 0.02 },
  patronal: { jubilatorio: 0.075, fonasa: 0.05, frl: 0.001, fgcl: 0.00025 },
  irpf: {
    franjasBpc: franjas,
    incremento6DesdeBpc: 10,
    deduccionHijoBpcAnual: 20,
    tasaDeduccionBaja: 0.14,
    tasaDeduccionAlta: 0.08,
    umbralTasaDeduccionBpc: 15,
  },
  horas: { divisor: 200, recargoExtra: 1 },
  feriadoFactor: 2,
};

export const PARAMETROS: Parametros[] = [
  {
    id: "UY-2026-01",
    vigenciaDesde: "2026-01",
    vigenciaHasta: "2026-06",
    fuente: "Referencial prototipo · validar BPC y topes 2026",
    bpc: 6864,
    topeJubilatorio: 262000,
    ...base2026,
  },
  {
    id: "UY-2026-07",
    vigenciaDesde: "2026-07",
    vigenciaHasta: null,
    fuente: "Referencial prototipo · ajuste de topes julio 2026",
    bpc: 6864,
    topeJubilatorio: 271000,
    ...base2026,
  },
];

export function parametrosVigentes(mes: string): Parametros {
  const p = PARAMETROS.find(
    (x) => x.vigenciaDesde <= mes && (x.vigenciaHasta === null || mes <= x.vigenciaHasta),
  );
  if (!p) throw new Error(`Sin parámetros vigentes para ${mes}`);
  return p;
}

/** Laudos mínimos por grupo / subgrupo / categoría (referenciales) */
export interface Laudo {
  grupo: number;
  subgrupo: string;
  nombreGrupo: string;
  categoria: string;
  minimo: number;
  vigenciaDesde: string;
}

export const LAUDOS: Laudo[] = [
  { grupo: 1, subgrupo: "06", nombreGrupo: "Panaderías", categoria: "Panadero", minimo: 45200, vigenciaDesde: "2026-07" },
  { grupo: 1, subgrupo: "06", nombreGrupo: "Panaderías", categoria: "Ayudante", minimo: 37400, vigenciaDesde: "2026-07" },
  { grupo: 1, subgrupo: "06", nombreGrupo: "Panaderías", categoria: "Vendedor", minimo: 38600, vigenciaDesde: "2026-07" },
  { grupo: 10, subgrupo: "01", nombreGrupo: "Comercio en general", categoria: "Cadete", minimo: 34500, vigenciaDesde: "2026-07" },
  { grupo: 10, subgrupo: "01", nombreGrupo: "Comercio en general", categoria: "Vendedor", minimo: 41800, vigenciaDesde: "2026-07" },
  { grupo: 10, subgrupo: "01", nombreGrupo: "Comercio en general", categoria: "Administrativo", minimo: 44200, vigenciaDesde: "2026-07" },
  { grupo: 10, subgrupo: "01", nombreGrupo: "Comercio en general", categoria: "Encargado", minimo: 52900, vigenciaDesde: "2026-07" },
  { grupo: 12, subgrupo: "03", nombreGrupo: "Restoranes, cafés y bares", categoria: "Mozo", minimo: 38900, vigenciaDesde: "2026-07" },
  { grupo: 12, subgrupo: "03", nombreGrupo: "Restoranes, cafés y bares", categoria: "Cocinero", minimo: 43600, vigenciaDesde: "2026-07" },
  { grupo: 12, subgrupo: "03", nombreGrupo: "Restoranes, cafés y bares", categoria: "Cajero", minimo: 40100, vigenciaDesde: "2026-07" },
  { grupo: 19, subgrupo: "01", nombreGrupo: "Servicios profesionales", categoria: "Recepcionista", minimo: 39800, vigenciaDesde: "2026-07" },
  { grupo: 19, subgrupo: "01", nombreGrupo: "Servicios profesionales", categoria: "Administrativo", minimo: 42500, vigenciaDesde: "2026-07" },
  { grupo: 19, subgrupo: "01", nombreGrupo: "Servicios profesionales", categoria: "Asistente", minimo: 46000, vigenciaDesde: "2026-07" },
  { grupo: 19, subgrupo: "01", nombreGrupo: "Servicios profesionales", categoria: "Técnico", minimo: 55300, vigenciaDesde: "2026-07" },
];

export const GRUPOS_FUERA_DE_ALCANCE: Record<number, string> = {
  9: "Industria de la construcción (régimen de aportación unificado)",
  22: "Rural",
  21: "Servicio doméstico",
};

export function laudoDe(grupo: number, subgrupo: string, categoria: string) {
  return LAUDOS.find((l) => l.grupo === grupo && l.subgrupo === subgrupo && l.categoria === categoria);
}

export function categoriasDe(grupo: number, subgrupo: string) {
  return LAUDOS.filter((l) => l.grupo === grupo && l.subgrupo === subgrupo);
}

export const MOTOR_VERSION = "motor 0.3.0";

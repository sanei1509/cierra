const nf0 = new Intl.NumberFormat("es-UY", { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat("es-UY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmt = (n: number) => `$ ${nf0.format(Math.round(n))}`;
export const fmt2 = (n: number) => `$ ${nf2.format(n)}`;
export const num = (n: number) => nf0.format(n);
export const pct = (n: number, d = 1) => `${(n * 100).toLocaleString("es-UY", { maximumFractionDigits: d })}%`;

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export const nombreMes = (mes: string) => {
  const [y, m] = mes.split("-").map(Number);
  const n = MESES[m - 1];
  return `${n[0].toUpperCase()}${n.slice(1)} ${y}`;
};
export const mesCorto = (mes: string) => MESES[Number(mes.slice(5, 7)) - 1].slice(0, 3);

export const fecha = (iso: string) => {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return d.toLocaleDateString("es-UY", { day: "numeric", month: "short" });
};
export const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-UY", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export const mesAnterior = (mes: string) => {
  const [y, m] = mes.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
};

export const iniciales = (s: string) =>
  s
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

/** Fecha "hoy" fija para que la demo sea reproducible */
export const HOY = "2026-10-04T10:30:00";
export const MES_ACTUAL = "2026-10";

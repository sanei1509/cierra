export type TemaPreferido = "system" | "light" | "dark";
export type TemaResuelto = "light" | "dark";

export const TEMA_LABELS: Record<TemaPreferido, string> = {
  system: "Sistema",
  light: "Claro",
  dark: "Oscuro",
};

export function resolverTema(preferencia: TemaPreferido, sistemaOscuro: boolean): TemaResuelto {
  if (preferencia === "system") return sistemaOscuro ? "dark" : "light";
  return preferencia;
}

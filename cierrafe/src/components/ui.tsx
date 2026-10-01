"use client";

import clsx from "clsx";
import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, type ReactNode, type ButtonHTMLAttributes } from "react";
import type { Tono } from "@/lib/types";
import { ESTADOS, type EstadoVisible } from "@/lib/status";
import { iniciales } from "@/lib/format";
import { nombreEmpresaVisible } from "@/lib/empresa";

export const TONOS: Record<Tono | "tinta", { bg: string; fg: string; dot: string }> = {
  menta: { bg: "bg-menta", fg: "text-menta-t", dot: "bg-menta-t" },
  lila: { bg: "bg-lila", fg: "text-lila-t", dot: "bg-lila-t" },
  crema: { bg: "bg-crema", fg: "text-crema-t", dot: "bg-crema-t" },
  cielo: { bg: "bg-cielo", fg: "text-cielo-t", dot: "bg-cielo-t" },
  rosa: { bg: "bg-rosa", fg: "text-rosa-t", dot: "bg-rosa-t" },
  tinta: { bg: "bg-petroleo", fg: "text-white", dot: "bg-sol" },
};

export function Panel({ className, children, ...p }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("rounded-[var(--radius-panel)] border border-linea/80 shadow-[var(--cierra-shadow-soft)]", !/(^|\s)!?bg-/.test(className ?? "") && "bg-superficie", className)} {...p}>
      {children}
    </div>
  );
}

export function EstadoChip({ estado, className }: { estado: EstadoVisible; className?: string }) {
  const e = ESTADOS[estado];
  const t = TONOS[e.tono];
  return (
    <span className={clsx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", t.bg, t.fg, className)}>
      <span className={clsx("size-1.5 rounded-full", t.dot)} aria-hidden />
      {e.label}
    </span>
  );
}

export function Chip({ tono = "menta", children, className }: { tono?: Tono | "tinta" | "gris"; children: ReactNode; className?: string }) {
  const t = tono === "gris" ? { bg: "bg-hundido", fg: "text-tinta-2" } : TONOS[tono];
  return (
    <span className={clsx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", t.bg, t.fg, className)}>
      {children}
    </span>
  );
}

type BtnVariant = "primario" | "secundario" | "fantasma" | "peligro" | "claro";
const BTN: Record<BtnVariant, string> = {
  primario: "bg-petroleo text-white shadow-[0_8px_18px_rgb(47_107_255/0.22)] hover:bg-petroleo-2 disabled:bg-hundido disabled:text-apagado disabled:shadow-none disabled:hover:bg-hundido",
  secundario: "border border-linea bg-superficie text-tinta hover:border-petroleo/45 hover:bg-hundido disabled:bg-hundido disabled:text-apagado disabled:hover:border-linea",
  fantasma: "text-tinta-2 hover:bg-hundido hover:text-tinta disabled:text-apagado disabled:hover:bg-transparent",
  peligro: "bg-rosa text-rosa-t hover:bg-rosa-t hover:text-white disabled:bg-hundido disabled:text-apagado",
  claro: "bg-superficie text-petroleo hover:bg-sol-suave disabled:bg-hundido disabled:text-apagado",
};

export function Boton({
  variante = "primario",
  tam = "md",
  className,
  href,
  children,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: BtnVariant; tam?: "sm" | "md" | "lg"; href?: string }) {
  const cls = clsx(
    "inline-flex items-center justify-center gap-2 rounded-[14px] font-semibold transition-colors duration-200 disabled:cursor-not-allowed",
    tam === "sm" && "h-8 px-3.5 text-[13px]",
    tam === "md" && "h-10 px-5 text-sm",
    tam === "lg" && "h-12 px-6 text-[15px]",
    BTN[variante],
    className,
  );
  if (href)
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  return (
    <button className={cls} {...p}>
      {children}
    </button>
  );
}

export function Avatar({ nombre, tono = "menta", size = 36 }: { nombre: string; tono?: Tono | "tinta"; size?: number }) {
  const t = TONOS[tono];
  return (
    <span
      className={clsx("inline-flex shrink-0 items-center justify-center rounded-full font-bold", t.bg, t.fg)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {iniciales(nombre)}
    </span>
  );
}

export function Drawer({ abierto, onCerrar, titulo, subtitulo, children, ancho = 520 }: { abierto: boolean; onCerrar: () => void; titulo: ReactNode; subtitulo?: ReactNode; children: ReactNode; ancho?: number }) {
  useEffect(() => {
    if (!abierto) return;
    const f = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [abierto, onCerrar]);
  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal>
      <button className="entra-fade absolute inset-0 bg-[#0B1220]/45 backdrop-blur-[2px]" aria-label="Cerrar" onClick={onCerrar} />
      <div className="entra-drawer relative m-2 flex w-full flex-col overflow-hidden rounded-[var(--radius-panel)] border border-linea bg-superficie shadow-xl sm:m-3" style={{ maxWidth: ancho }}>
        <div className="flex items-start justify-between gap-4 border-b border-linea px-6 py-5">
          <div>
            <h2 className="text-lg font-bold tracking-tight">{titulo}</h2>
            {subtitulo && <div className="mt-0.5 text-sm text-apagado">{subtitulo}</div>}
          </div>
          <button onClick={onCerrar} className="rounded-xl p-2 text-apagado hover:bg-hundido" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function Modal({ abierto, onCerrar, titulo, children }: { abierto: boolean; onCerrar: () => void; titulo: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!abierto) return;
    const f = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [abierto, onCerrar]);
  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal>
      <button className="entra-fade absolute inset-0 bg-[#0B1220]/50 backdrop-blur-[2px]" aria-label="Cerrar" onClick={onCerrar} />
      <div className="entra-fade relative w-full max-w-md rounded-[var(--radius-panel)] border border-linea bg-superficie p-6 shadow-xl">
        <h2 className="text-lg font-bold tracking-tight">{titulo}</h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

export function Campo({ label, children, ayuda }: { label: string; children: ReactNode; ayuda?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-tinta-2">{label}</span>
      {children}
      {ayuda && <span className="mt-1 block text-xs text-apagado">{ayuda}</span>}
    </label>
  );
}

export const inputCls =
  "h-11 w-full rounded-[14px] border border-linea bg-superficie px-3.5 text-sm text-tinta outline-none transition-colors placeholder:text-apagado focus:border-petroleo-3 focus:bg-superficie focus:ring-2 focus:ring-petroleo-3/20";

export function Vacio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-linea bg-hundido/45 px-6 py-10 text-center">
      <p className="font-semibold">{titulo}</p>
      {children && <div className="mt-1 text-sm text-apagado">{children}</div>}
    </div>
  );
}

/** Logo de la empresa si existe; si no, sus iniciales */
export function MarcaEmpresa({ empresa, size = 40 }: { empresa: { nombre: string; nombreVisible?: string; tono: Tono | "tinta"; logo?: string }; size?: number }) {
  const nombre = nombreEmpresaVisible(empresa);
  if (empresa.logo)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={empresa.logo} alt={`Logo de ${nombre}`} width={size} height={size} className="shrink-0 rounded-full bg-white object-contain ring-1 ring-linea" style={{ width: size, height: size }} />
    );
  return <Avatar nombre={nombre} tono={empresa.tono} size={size} />;
}

/** Reduce una imagen a máx. `lado` px y la devuelve como data URL (para no llenar el almacenamiento) */
export function imagenADataUrl(f: File, lado = 240): Promise<string> {
  return new Promise((ok, mal) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, lado / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      ok(c.toDataURL("image/png"));
    };
    img.onerror = mal;
    img.src = URL.createObjectURL(f);
  });
}

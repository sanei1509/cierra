"use client";

import clsx from "clsx";
import { LogOut, Menu, Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useStore, useUsuario } from "@/lib/store";
import { TEMA_LABELS, type TemaPreferido } from "@/lib/theme";

const TEMA_ICONOS = { system: Monitor, light: Sun, dark: Moon };

export function AccountMenu({ logoutAction }: { logoutAction: () => Promise<void> }) {
  const [abierto, setAbierto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const usuario = useUsuario();
  const tema = useStore((s) => s.temaPorUsuario[usuario.id] ?? "system");
  const setTema = useStore((s) => s.setTemaUsuario);

  useEffect(() => {
    if (!abierto) return;
    const cerrarSiAfuera = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setAbierto(false);
    };
    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAbierto(false);
    };
    document.addEventListener("pointerdown", cerrarSiAfuera);
    document.addEventListener("keydown", cerrarConEscape);
    return () => {
      document.removeEventListener("pointerdown", cerrarSiAfuera);
      document.removeEventListener("keydown", cerrarConEscape);
    };
  }, [abierto]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="flex size-10 items-center justify-center rounded-xl border border-linea bg-superficie text-tinta shadow-[0_1px_2px_rgb(16_34_71/0.05)] transition-colors hover:bg-hundido"
        onClick={() => setAbierto((actual) => !actual)}
        aria-label="Abrir menú de cuenta"
        aria-haspopup="menu"
        aria-expanded={abierto}
      >
        <Menu size={18} />
      </button>

      {abierto && (
        <div className="absolute right-0 top-12 z-20 w-64 rounded-xl border border-linea bg-superficie p-1.5 shadow-[var(--cierra-shadow-soft)]" role="menu">
          <div className="px-2 py-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-apagado">Tema</p>
            <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl border border-linea bg-hundido p-1">
              {(Object.keys(TEMA_LABELS) as TemaPreferido[]).map((t) => {
                const Icono = TEMA_ICONOS[t];
                const activo = tema === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTema(t)}
                    className={clsx("inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors", activo ? "bg-petroleo text-white" : "text-tinta-2 hover:bg-superficie hover:text-tinta")}
                    aria-pressed={activo}
                  >
                    <Icono size={14} /> {TEMA_LABELS[t]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="my-1 border-t border-linea" />
          <form action={logoutAction}>
            <button type="submit" className="flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-semibold text-tinta-2 hover:bg-hundido hover:text-tinta" role="menuitem">
              <LogOut size={15} /> Salir
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

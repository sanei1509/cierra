"use client";

import { useEffect } from "react";
import { useHidratado, useStore, useUsuario } from "@/lib/store";
import { resolverTema } from "@/lib/theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const hidratado = useHidratado();
  const usuario = useUsuario();
  const tema = useStore((s) => s.temaPorUsuario[usuario.id] ?? "system");

  useEffect(() => {
    if (!hidratado) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const aplicar = () => {
      const resuelto = resolverTema(tema, media.matches);
      document.documentElement.dataset.theme = resuelto;
      document.documentElement.style.colorScheme = resuelto;
    };

    aplicar();
    media.addEventListener("change", aplicar);
    return () => media.removeEventListener("change", aplicar);
  }, [hidratado, tema]);

  return children;
}

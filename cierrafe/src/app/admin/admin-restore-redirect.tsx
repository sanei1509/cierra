"use client";

import { useEffect } from "react";

export function AdminRestoreRedirect() {
  useEffect(() => {
    window.location.replace("/restaurar-admin");
  }, []);

  return (
    <main className="min-h-screen px-3 py-3 sm:px-4">
      <section className="rounded-[var(--radius-panel)] border border-linea/80 bg-superficie px-5 py-4">
        <p className="text-sm font-semibold text-apagado">Volviendo al dashboard de admin...</p>
      </section>
    </main>
  );
}

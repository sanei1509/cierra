import Link from "next/link";
import { ArrowLeft, GripHorizontal, ShieldCheck } from "lucide-react";

export function DelegatedStudyFloat() {
  return (
    <div className="mb-3 rounded-2xl border border-linea bg-superficie p-2 shadow-[0_10px_28px_rgb(8_20_44/0.12)]" role="status" aria-label="Vista de estudio iniciada desde admin">
      <p className="flex min-h-8 items-center gap-2 px-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-petroleo">
        <GripHorizontal size={14} className="shrink-0 text-apagado" />
        <ShieldCheck size={14} className="shrink-0" />
        <span className="truncate">Vista de estudio</span>
      </p>
      <Link
        href="/restaurar-admin"
        className="mt-1 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-petroleo px-3 text-sm font-bold text-white hover:bg-petroleo-2 focus:outline-none focus:ring-2 focus:ring-petroleo-3/25"
      >
        <ArrowLeft size={15} /> Volver al admin
      </Link>
    </div>
  );
}

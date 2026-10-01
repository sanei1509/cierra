import clsx from "clsx";

export function CierraLoadingOverlay({ className }: { className?: string }) {
  return (
    <div
      className={clsx("fixed inset-0 z-[80] flex items-center justify-center bg-[#E8EDF5]/68 backdrop-blur-[1px]", className)}
      role="status"
      aria-live="polite"
      aria-label="Cargando"
    >
      <span className="sr-only">Cargando</span>
      <div className="relative flex size-72 items-center justify-center rounded-full bg-white/36 shadow-[0_24px_80px_rgb(16_34_71/0.18)] sm:size-80" aria-hidden>
        <span className="cierra-loader-symbol cierra-loader-symbol-base absolute size-60 sm:size-72" />
        <span className="cierra-loader-symbol cierra-loader-symbol-fill absolute size-60 sm:size-72" />
        <span className="cierra-loader-symbol-pulse absolute right-[15%] top-[30%] size-12 rounded-full bg-[#F5B633]/55 blur-[2px]" />
      </div>
    </div>
  );
}

import clsx from "clsx";

export function CierraLoadingOverlay({ className }: { className?: string }) {
  return (
    <div
      className={clsx("fixed inset-0 z-[80] flex items-center justify-center bg-[#D7DEE9]/78 backdrop-blur-[1px]", className)}
      role="status"
      aria-live="polite"
      aria-label="Cargando"
    >
      <span className="sr-only">Cargando</span>
      <div className="relative flex size-[22.5rem] items-center justify-center sm:size-[27rem]" aria-hidden>
        <span className="cierra-loader-symbol cierra-loader-symbol-base absolute size-[22.5rem] sm:size-[27rem]" />
        <span className="cierra-loader-symbol cierra-loader-symbol-fill absolute size-[22.5rem] sm:size-[27rem]" />
        <span className="cierra-loader-symbol-pulse absolute right-[14%] top-[30%] size-16 rounded-full bg-[#F5B633]/55 blur-[2px]" />
      </div>
    </div>
  );
}

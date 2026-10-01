import clsx from "clsx";
import Image from "next/image";

export function CierraLoadingOverlay({ className }: { className?: string }) {
  return (
    <div
      className={clsx("fixed inset-0 z-[80] flex items-center justify-center bg-[#E8EDF5]/72 backdrop-blur-[1px] backdrop-grayscale", className)}
      role="status"
      aria-live="polite"
      aria-label="Cargando"
    >
      <span className="sr-only">Cargando</span>
      <div className="relative size-56 sm:size-64" aria-hidden>
        <Image src="/brand/cierra-symbol.png" alt="" fill sizes="256px" className="object-contain grayscale opacity-[0.18]" priority />
        <span className="cierra-loader-fill absolute inset-0">
          <Image src="/brand/cierra-symbol.png" alt="" fill sizes="256px" className="object-contain" priority />
        </span>
        <span className="cierra-loader-pulse absolute right-[11%] top-[28%] size-7 rounded-full bg-[#F5B633] shadow-[0_0_24px_rgb(245_182_51/0.65)]" />
      </div>
    </div>
  );
}

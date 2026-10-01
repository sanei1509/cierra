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
      <div className="relative size-28 sm:size-32" aria-hidden>
        <Image src="/brand/cierra-symbol.png" alt="" fill sizes="128px" className="object-contain grayscale opacity-20" priority />
        <span className="cierra-loader-fill absolute inset-x-0 bottom-0 overflow-hidden">
          <Image src="/brand/cierra-symbol.png" alt="" width={128} height={128} className="absolute bottom-0 left-0 h-28 w-28 object-contain sm:h-32 sm:w-32" priority />
        </span>
      </div>
    </div>
  );
}

import clsx from "clsx";
import Image from "next/image";

export function CierraLoadingOverlay({ className }: { className?: string }) {
  return (
    <div
      className={clsx("fixed inset-0 z-[80] flex items-center justify-center bg-[#E8EDF5]/68 backdrop-blur-[1px]", className)}
      role="status"
      aria-live="polite"
      aria-label="Cargando"
    >
      <span className="sr-only">Cargando</span>
      <div className="relative flex size-64 items-center justify-center rounded-full bg-white/36 shadow-[0_24px_80px_rgb(16_34_71/0.16)] sm:size-72" aria-hidden>
        <Image src="/brand/cierra-symbol.png" alt="" width={240} height={240} className="absolute inset-6 h-[calc(100%-3rem)] w-[calc(100%-3rem)] object-contain grayscale opacity-70" priority />
        <span className="cierra-loader-fill absolute inset-0">
          <Image src="/brand/cierra-symbol.png" alt="" width={240} height={240} className="absolute inset-6 h-[calc(100%-3rem)] w-[calc(100%-3rem)] object-contain drop-shadow-[0_18px_38px_rgb(47_107_255/0.28)]" priority />
        </span>
        <span className="cierra-loader-pulse absolute right-[16%] top-[30%] size-9 rounded-full bg-[#F5B633] shadow-[0_0_30px_rgb(245_182_51/0.8)]" />
      </div>
    </div>
  );
}

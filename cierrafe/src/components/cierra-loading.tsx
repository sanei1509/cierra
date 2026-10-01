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
      <div className="relative flex size-80 items-center justify-center rounded-full bg-white/40 shadow-[0_24px_80px_rgb(16_34_71/0.18)] sm:size-96" aria-hidden>
        <svg className="cierra-loader-mark size-72 overflow-visible sm:size-88" viewBox="0 0 240 240" fill="none">
          <defs>
            <linearGradient id="cierra-loader-blue" x1="55" x2="180" y1="66" y2="190" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1F6BFF" />
              <stop offset="0.58" stopColor="#2F8DFF" />
              <stop offset="1" stopColor="#55C2FF" />
            </linearGradient>
          </defs>
          <path
            d="M185 70a78 78 0 1 0 0 100"
            pathLength={1}
            stroke="#8E9AAD"
            strokeLinecap="round"
            strokeWidth="58"
            opacity="0.5"
          />
          <path
            className="cierra-loader-stroke"
            d="M185 70a78 78 0 1 0 0 100"
            pathLength={1}
            stroke="url(#cierra-loader-blue)"
            strokeLinecap="round"
            strokeWidth="58"
          />
          <path
            d="M185 70a78 78 0 0 1 28 50"
            pathLength={1}
            stroke="#C99B24"
            strokeLinecap="round"
            strokeWidth="58"
            opacity="0.22"
          />
          <path
            className="cierra-loader-cap"
            d="M185 70a78 78 0 0 1 28 50"
            pathLength={1}
            stroke="#F5B633"
            strokeLinecap="round"
            strokeWidth="58"
          />
        </svg>
      </div>
    </div>
  );
}

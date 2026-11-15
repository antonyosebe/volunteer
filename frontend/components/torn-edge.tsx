export function TornEdge({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 48"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute left-0 h-8 w-full text-paper md:h-12 ${flip ? "top-0 rotate-180" : "bottom-0"}`}
    >
      <path
        fill="currentColor"
        d="M0 26C70 40 110 8 190 22C270 36 310 8 400 20C490 32 530 6 620 20C710 34 760 8 850 22C940 36 990 8 1080 22C1170 36 1230 8 1320 22C1380 30 1410 16 1440 24V48H0Z"
      />
    </svg>
  );
}

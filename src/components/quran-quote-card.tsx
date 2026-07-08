import { BookOpen } from "lucide-react";

export const quranQuoteOptions = [
  "وَقُلْ رَبِّ زِدْنِي عِلْمًا",
  "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ",
  "إِنَّ هَذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ",
  "وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا",
  "اقْرَأْ وَرَبُّكَ الْأَكْرَمُ",
];

type QuranQuoteCardProps = {
  quote?: string;
  compact?: boolean;
  className?: string;
};

export function QuranQuoteCard({
  quote = quranQuoteOptions[0],
  compact = false,
  className = "",
}: QuranQuoteCardProps) {
  return (
    <aside
      aria-label="اقتباس قرآني"
      className={[
        "relative overflow-hidden rounded-[var(--radius)] border border-[#d9c596]/70 bg-[#fffdf8] text-center shadow-[var(--shadow-sm)]",
        compact ? "px-4 py-4" : "px-4 py-5",
        className,
      ].join(" ")}
      dir="rtl"
    >
      <OrnamentCorner className="right-0 top-0" />
      <OrnamentCorner className="bottom-0 left-0 rotate-180" />

      <div className="relative mx-auto flex w-full max-w-[13rem] items-center justify-center gap-2">
        <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[#b58a3a]/70 to-[#b58a3a]/30" />
        <span className="grid size-8 shrink-0 place-items-center rounded-full border border-[#d9c596] bg-[#fbf3df] text-[#0b5d42] shadow-inner">
          <BookOpen aria-hidden className="size-4" />
        </span>
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#b58a3a]/70 to-[#b58a3a]/30" />
      </div>

      <div className="relative mx-auto mt-3 flex w-28 items-center justify-center gap-2" aria-hidden="true">
        <span className="size-1.5 rotate-45 rounded-[2px] bg-[#b58a3a]" />
        <span className="h-px flex-1 bg-[#b58a3a]/45" />
        <span className="size-2 rounded-full bg-[#b58a3a]" />
        <span className="h-px flex-1 bg-[#b58a3a]/45" />
        <span className="size-1.5 rotate-45 rounded-[2px] bg-[#b58a3a]" />
      </div>

      <p
        className={[
          "font-display relative mt-3 font-semibold leading-8 text-[#0b5d42]",
          compact ? "text-[1rem]" : "text-[1.08rem]",
        ].join(" ")}
      >
        {quote}
      </p>

      <div className="relative mx-auto mt-3 flex w-24 items-center justify-center gap-1.5 text-[#b58a3a]" aria-hidden="true">
        <span className="h-px flex-1 bg-[#b58a3a]/40" />
        <span className="text-sm leading-none">۞</span>
        <span className="h-px flex-1 bg-[#b58a3a]/40" />
      </div>
    </aside>
  );
}

function OrnamentCorner({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 80 80"
      className={`pointer-events-none absolute size-20 text-[#b58a3a]/20 ${className}`}
      fill="none"
    >
      <path d="M78 2H34C16.3 2 2 16.3 2 34v44" stroke="currentColor" strokeWidth="2" />
      <path d="M66 14H38c-13.3 0-24 10.7-24 24v28" stroke="currentColor" strokeWidth="1.4" />
      <path d="M49 15 62 28 49 41 36 28 49 15Z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M24 45c8-1 14-7 15-15 1 8 7 14 15 15-8 1-14 7-15 15-1-8-7-14-15-15Z" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

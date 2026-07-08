import { getSurahByNumber, quranSurahs } from "./quran-surahs";

export type QuranPassage = {
  juz: number;
  fromSurahNo: number;
  fromSurahName: string;
  fromAyah: number;
  toSurahNo: number;
  toSurahName: string;
  toAyah: number;
  approximateAyahs: number;
};

type Boundary = { surah: number; ayah: number };

const starts: Boundary[] = [
  { surah: 1, ayah: 1 }, { surah: 2, ayah: 142 }, { surah: 2, ayah: 253 },
  { surah: 3, ayah: 93 }, { surah: 4, ayah: 24 }, { surah: 4, ayah: 148 },
  { surah: 5, ayah: 82 }, { surah: 6, ayah: 111 }, { surah: 7, ayah: 88 },
  { surah: 8, ayah: 41 }, { surah: 9, ayah: 93 }, { surah: 11, ayah: 6 },
  { surah: 12, ayah: 53 }, { surah: 15, ayah: 1 }, { surah: 17, ayah: 1 },
  { surah: 18, ayah: 75 }, { surah: 21, ayah: 1 }, { surah: 23, ayah: 1 },
  { surah: 25, ayah: 21 }, { surah: 27, ayah: 56 }, { surah: 29, ayah: 46 },
  { surah: 33, ayah: 31 }, { surah: 36, ayah: 28 }, { surah: 39, ayah: 32 },
  { surah: 41, ayah: 47 }, { surah: 46, ayah: 1 }, { surah: 51, ayah: 31 },
  { surah: 58, ayah: 1 }, { surah: 67, ayah: 1 }, { surah: 78, ayah: 1 },
];

const ends: Boundary[] = starts.slice(1).map((start) => {
  if (start.ayah > 1) return { surah: start.surah, ayah: start.ayah - 1 };
  const previous = getSurahByNumber(start.surah - 1);
  return { surah: start.surah - 1, ayah: previous?.ayahCount ?? 1 };
}).concat({ surah: 114, ayah: 6 });

export const juzOptions = Array.from({ length: 30 }, (_, index) => index + 1);

export function suggestQuranPassage(
  selectedJuz: number[],
  length: "short" | "medium" | "long",
  seed = Date.now(),
): QuranPassage | null {
  const valid = [...new Set(selectedJuz)].filter((juz) => juz >= 1 && juz <= 30);
  if (!valid.length) return null;

  const juz = valid[Math.abs(seed) % valid.length];
  const start = starts[juz - 1];
  const end = ends[juz - 1];
  const target = length === "short" ? 5 : length === "long" ? 15 : 10;
  const candidates = quranSurahs
    .filter((surah) => surah.number >= start.surah && surah.number <= end.surah)
    .map((surah) => {
      const min = surah.number === start.surah ? start.ayah : 1;
      const max = surah.number === end.surah ? end.ayah : surah.ayahCount;
      return { surah, min, max, available: max - min + 1 };
    })
    .filter((item) => item.available >= Math.min(target, 3));

  if (!candidates.length) return null;
  const chosen = candidates[Math.abs(Math.floor(seed / 31)) % candidates.length];
  const count = Math.min(target, chosen.available);
  const room = Math.max(0, chosen.available - count);
  const fromAyah = chosen.min + (room ? Math.abs(Math.floor(seed / 997)) % (room + 1) : 0);

  return {
    juz,
    fromSurahNo: chosen.surah.number,
    fromSurahName: chosen.surah.name,
    fromAyah,
    toSurahNo: chosen.surah.number,
    toSurahName: chosen.surah.name,
    toAyah: fromAyah + count - 1,
    approximateAyahs: count,
  };
}

export function passageLabel(passage: Pick<QuranPassage, "fromSurahName" | "fromAyah" | "toSurahName" | "toAyah">) {
  if (!passage.fromSurahName) return "";
  return passage.fromSurahName === passage.toSurahName
    ? `سورة ${passage.fromSurahName} من الآية ${passage.fromAyah} إلى ${passage.toAyah}`
    : `من سورة ${passage.fromSurahName} آية ${passage.fromAyah} إلى سورة ${passage.toSurahName} آية ${passage.toAyah}`;
}

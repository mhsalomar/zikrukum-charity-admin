"use server";

import fs from "fs";
import path from "path";

export type AyahEntry = { surahNo: number; ayahNo: number; text: string };

type QuranData = Record<string, Record<string, string>>;
let _cache: QuranData | null = null;

function data(): QuranData {
  if (!_cache) {
    const p = path.join(process.cwd(), "src/lib/quran-text.json");
    _cache = JSON.parse(fs.readFileSync(p, "utf-8")) as QuranData;
  }
  return _cache;
}

const MAX_AYAHS = 60;

export async function getAyahRangeText(
  fromSurahNo: number,
  fromAyah: number,
  toSurahNo: number,
  toAyah: number,
): Promise<AyahEntry[]> {
  if (
    fromSurahNo < 1 || fromSurahNo > 114 ||
    toSurahNo < 1 || toSurahNo > 114 ||
    fromSurahNo > toSurahNo
  ) return [];

  const quran = data();
  const result: AyahEntry[] = [];

  for (let s = fromSurahNo; s <= toSurahNo; s++) {
    const surahData = quran[String(s)];
    if (!surahData) continue;

    const maxAyah = Object.keys(surahData).length;
    const startAyah = s === fromSurahNo ? Math.max(1, fromAyah) : 1;
    const endAyah = s === toSurahNo ? Math.min(toAyah, maxAyah) : maxAyah;

    for (let a = startAyah; a <= endAyah; a++) {
      const text = surahData[String(a)];
      if (text) result.push({ surahNo: s, ayahNo: a, text });
      if (result.length >= MAX_AYAHS) return result;
    }
  }

  return result;
}

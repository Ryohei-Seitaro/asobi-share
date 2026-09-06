// ジャンルの2階層タクソノミー（カテゴリ ＞ サブジャンル）。
// trips.genre には従来どおり「サブジャンル（葉）」の文字列を保存する。
// カテゴリはこのテーブルから導出するだけなので、DBマイグレーションは不要。

export const GENRE_TAXONOMY: { category: string; subgenres: string[] }[] = [
  { category: "定番", subgenres: ["観光", "デート", "家族旅行"] },
  { category: "遊び・合宿", subgenres: ["合宿", "サークル遊び", "BBQ"] },
  { category: "山・キャンプ", subgenres: ["山登り", "キャンプ"] },
  { category: "水辺", subgenres: ["海", "川", "湖", "釣り"] },
  { category: "ウィンター", subgenres: ["スノボ", "スキー"] },
  { category: "スポーツ", subgenres: ["ゴルフ", "ピックルボール"] },
];

export const GENRE_CATEGORIES = GENRE_TAXONOMY.map((g) => g.category);

export const ALL_SUBGENRES = GENRE_TAXONOMY.flatMap((g) => g.subgenres);

export function subgenresOf(category: string): string[] {
  return GENRE_TAXONOMY.find((g) => g.category === category)?.subgenres ?? [];
}

export function categoryOf(subgenre: string): string | null {
  return GENRE_TAXONOMY.find((g) => g.subgenres.includes(subgenre))?.category ?? null;
}

export function isSubgenre(value: string): boolean {
  return ALL_SUBGENRES.includes(value);
}

export function isCategory(value: string): boolean {
  return GENRE_CATEGORIES.includes(value);
}

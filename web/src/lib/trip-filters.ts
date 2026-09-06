// 「つくる」画面のdaysLabel選択肢と、見つける画面のフィルタ条件を対応づける定義。
// 両方から参照することで、表示ラベルと構造化フィルタ用の数値がズレないようにする。

export const DAYS_LABEL_TO_NIGHTS: Record<string, number> = {
  日帰り: 0,
  "1泊2日": 1,
  "2泊3日": 2,
  "3泊4日": 3,
};

export function nightsToLabel(nights: number): string {
  if (nights <= 0) return "日帰り";
  return `${nights}泊${nights + 1}日`;
}

export const INTL_OPTIONS = [
  { key: "all", label: "すべて" },
  { key: "domestic", label: "国内" },
  { key: "international", label: "海外" },
] as const;
export type IntlKey = (typeof INTL_OPTIONS)[number]["key"];

export const NIGHTS_OPTIONS = [
  { key: "all", label: "すべて" },
  { key: "0", label: "日帰り" },
  { key: "1", label: "1泊2日" },
  { key: "2plus", label: "2泊以上" },
] as const;
export type NightsKey = (typeof NIGHTS_OPTIONS)[number]["key"];

export const PARTY_OPTIONS = [
  { key: "all", label: "すべて" },
  { key: "1", label: "1人" },
  { key: "2", label: "2人" },
  { key: "3-4", label: "3〜4人" },
  { key: "5plus", label: "5人以上" },
] as const;
export type PartyKey = (typeof PARTY_OPTIONS)[number]["key"];

// バケットキー → [下限, 上限(nullなら上限なし)]
export const PARTY_RANGE: Record<Exclude<PartyKey, "all">, [number, number | null]> = {
  "1": [1, 1],
  "2": [2, 2],
  "3-4": [3, 4],
  "5plus": [5, null],
};

export const BUDGET_OPTIONS = [
  { key: "0", label: "すべて" },
  { key: "3000", label: "¥3,000以下" },
  { key: "5000", label: "¥5,000以下" },
  { key: "10000", label: "¥1万以下" },
  { key: "20000", label: "¥2万以下" },
] as const;

// 季節フィルタ。旅程の開始日（trips.startDate）の「月」で判定する。
export const SEASON_OPTIONS = [
  { key: "all", label: "すべて" },
  { key: "spring", label: "春 (3〜5月)" },
  { key: "summer", label: "夏 (6〜8月)" },
  { key: "autumn", label: "秋 (9〜11月)" },
  { key: "winter", label: "冬 (12〜2月)" },
] as const;
export type SeasonKey = (typeof SEASON_OPTIONS)[number]["key"];

export const SEASON_MONTHS: Record<Exclude<SeasonKey, "all">, number[]> = {
  spring: [3, 4, 5],
  summer: [6, 7, 8],
  autumn: [9, 10, 11],
  winter: [12, 1, 2],
};

export function seasonOfMonth(month: number): Exclude<SeasonKey, "all"> {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

const SEASON_LABEL: Record<Exclude<SeasonKey, "all">, string> = {
  spring: "春",
  summer: "夏",
  autumn: "秋",
  winter: "冬",
};

// "2026-05-16" → "5月・春"（開始日が無ければ null）
export function monthSeasonLabel(startDate: string | null | undefined): string | null {
  if (!startDate) return null;
  const m = Number(startDate.slice(5, 7));
  if (!m) return null;
  return `${m}月・${SEASON_LABEL[seasonOfMonth(m)]}`;
}

// 日数ラベルを開始日・終了日から求める（終了日が無ければ null）
export function daysLabelFromDates(startDate: string, endDate: string): string {
  const s = new Date(`${startDate}T00:00:00`);
  const e = new Date(`${endDate}T00:00:00`);
  const nights = Math.max(0, Math.round((e.getTime() - s.getTime()) / 86400000));
  return nightsToLabel(nights);
}

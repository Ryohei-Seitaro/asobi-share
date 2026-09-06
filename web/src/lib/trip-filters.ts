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

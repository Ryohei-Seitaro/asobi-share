// 見つける画面のフィルタ定義。サーバー（初期値の正規化・SSR）とクライアント
// （即時の絞り込み）の両方から使う純ロジック。"use client" は付けない。
//
// 以前は各フィルタが `<Link href="/?...">` でフルのサーバー遷移していたため、
// チップを1つ押すたびに DB 再クエリ + ページ再レンダリングが走っていた。
// 全件を1回だけ取得し、絞り込み・並べ替えはこの関数でブラウザ内で行う。

import { categoryOf, isCategory, isSubgenre, subgenresOf } from "@/lib/genres";
import {
  INTL_OPTIONS,
  NIGHTS_OPTIONS,
  PARTY_OPTIONS,
  PARTY_RANGE,
  SEASON_OPTIONS,
  SEASON_MONTHS,
  type IntlKey,
  type NightsKey,
  type PartyKey,
  type SeasonKey,
} from "@/lib/trip-filters";

export const TAB_KEYS = ["saves", "trend", "likes", "mine", "saved"] as const;
export type TabKey = (typeof TAB_KEYS)[number];

export type Filters = {
  q: string; // 行き先・キーワード
  gcat: string; // ジャンルのカテゴリ（"" = すべて）
  genre: string; // ジャンルのサブジャンル（"すべて" = カテゴリ内すべて）
  tab: TabKey;
  budget: number; // 0 = すべて
  intl: IntlKey;
  nights: NightsKey;
  party: PartyKey;
  season: SeasonKey;
};

export const DEFAULT_FILTERS: Filters = {
  q: "",
  gcat: "",
  genre: "すべて",
  tab: "saves",
  budget: 0,
  intl: "all",
  nights: "all",
  party: "all",
  season: "all",
};

export function isPersonalTab(tab: TabKey): boolean {
  return tab === "mine" || tab === "saved";
}

type RawParams = Record<string, string | string[] | undefined>;

function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

// URLクエリ → Filters。不正値は既定に落とす。個人タブ時は絞り込みを無視する
// （元の実装と同じ。フィルタUIも個人タブでは隠れる）。
export function normalizeFilters(params: RawParams): Filters {
  const sort = str(params.sort);
  const tab: TabKey = (TAB_KEYS as readonly string[]).includes(sort ?? "") ? (sort as TabKey) : "saves";
  const personal = isPersonalTab(tab);

  const rawGenre = str(params.genre);
  const genre = !personal && rawGenre && isSubgenre(rawGenre) ? rawGenre : "すべて";

  const rawGcat = str(params.gcat);
  const gcat = personal
    ? ""
    : genre !== "すべて"
      ? (categoryOf(genre) ?? "")
      : rawGcat && isCategory(rawGcat)
        ? rawGcat
        : "";

  const rawBudget = str(params.budget);
  const budget = !personal && rawBudget ? Number(rawBudget) || 0 : 0;

  const rawIntl = str(params.intl);
  const intl: IntlKey =
    !personal && INTL_OPTIONS.some((o) => o.key === rawIntl) ? (rawIntl as IntlKey) : "all";

  const rawNights = str(params.nights);
  const nights: NightsKey =
    !personal && NIGHTS_OPTIONS.some((o) => o.key === rawNights) ? (rawNights as NightsKey) : "all";

  const rawParty = str(params.party);
  const party: PartyKey =
    !personal && PARTY_OPTIONS.some((o) => o.key === rawParty) ? (rawParty as PartyKey) : "all";

  const rawSeason = str(params.season);
  const season: SeasonKey =
    !personal && SEASON_OPTIONS.some((o) => o.key === rawSeason) ? (rawSeason as SeasonKey) : "all";

  const q = personal ? "" : (str(params.q) ?? "").trim().slice(0, 60);

  return { q, gcat, genre, tab, budget, intl, nights, party, season };
}

// 現在のフィルタに部分更新を当てて次のフィルタを作る。
// - カテゴリを切り替えたらサブジャンルはリセット
// - サブジャンルを選んだらカテゴリを追従
// - 個人タブに切り替えたら絞り込みは全部落とす
export function nextFilters(base: Filters, overrides: Partial<Filters>): Filters {
  const f: Filters = { ...base, ...overrides };
  if (overrides.gcat !== undefined && overrides.genre === undefined) f.genre = "すべて";
  if (overrides.genre !== undefined && overrides.genre !== "すべて") {
    f.gcat = categoryOf(overrides.genre) ?? f.gcat;
  }
  if (overrides.tab !== undefined && isPersonalTab(overrides.tab)) {
    return {
      ...f,
      q: "",
      gcat: "",
      genre: "すべて",
      budget: 0,
      intl: "all",
      nights: "all",
      party: "all",
      season: "all",
    };
  }
  return f;
}

// Filters → "/" or "/?..."（既定値は省く。共有・ブックマーク用にURLへ書き戻す）
export function filtersToQuery(f: Filters): string {
  const qs = new URLSearchParams();
  if (f.q) qs.set("q", f.q);
  if (f.gcat) qs.set("gcat", f.gcat);
  if (f.genre !== "すべて") qs.set("genre", f.genre);
  if (f.tab !== "saves") qs.set("sort", f.tab);
  if (f.budget) qs.set("budget", String(f.budget));
  if (f.intl !== "all") qs.set("intl", f.intl);
  if (f.nights !== "all") qs.set("nights", f.nights);
  if (f.party !== "all") qs.set("party", f.party);
  if (f.season !== "all") qs.set("season", f.season);
  const s = qs.toString();
  return s ? `/?${s}` : "/";
}

export function activeFilterCount(f: Filters): number {
  return [
    !!f.q,
    f.genre !== "すべて" || !!f.gcat,
    !!f.budget,
    f.intl !== "all",
    f.nights !== "all",
    f.party !== "all",
    f.season !== "all",
  ].filter(Boolean).length;
}

// クライアントへ渡す旅程の最小形。
export type DiscoverTrip = {
  id: string;
  authorId: string;
  title: string;
  genre: string;
  startDate: string | null;
  daysLabel: string;
  nights: number;
  international: boolean;
  partySizeMin: number;
  partySizeMax: number | null;
  coverPhotos: string[];
  priceYen: number;
  savesCount: number;
  likesCount: number;
  trendScore: number;
};

type SelectCtx = {
  userId: string | null;
  savedIds: string[]; // 保存日時の新しい順で渡す（"保存済み"タブの並び順に使う）
};

// 元のDrizzleクエリと同じ条件・同じ並び順をブラウザ内で再現する。
export function selectTrips(trips: DiscoverTrip[], f: Filters, ctx: SelectCtx): DiscoverTrip[] {
  if (f.tab === "mine") {
    return trips
      .filter((t) => ctx.userId != null && t.authorId === ctx.userId)
      .sort((a, b) => b.savesCount - a.savesCount);
  }
  if (f.tab === "saved") {
    const order = new Map(ctx.savedIds.map((id, i) => [id, i] as const));
    return trips.filter((t) => order.has(t.id)).sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  }

  const q = f.q.trim().toLowerCase();
  const subgenres = f.genre === "すべて" && f.gcat ? new Set(subgenresOf(f.gcat)) : null;
  const [partyLo, partyHi]: [number | null, number | null] =
    f.party !== "all" ? PARTY_RANGE[f.party] : [null, null];
  const seasonMonths = f.season !== "all" ? new Set<number>(SEASON_MONTHS[f.season]) : null;

  const out = trips.filter((t) => {
    if (q && !(t.title.toLowerCase().includes(q) || t.genre.toLowerCase().includes(q))) return false;

    if (f.genre !== "すべて") {
      if (t.genre !== f.genre) return false;
    } else if (subgenres && !subgenres.has(t.genre)) {
      return false;
    }

    if (f.budget && !(t.priceYen === 0 || t.priceYen <= f.budget)) return false;

    if (f.intl === "domestic" && t.international) return false;
    if (f.intl === "international" && !t.international) return false;

    if (f.nights === "0" && t.nights !== 0) return false;
    if (f.nights === "1" && t.nights !== 1) return false;
    if (f.nights === "2plus" && t.nights < 2) return false;

    if (seasonMonths) {
      const m = t.startDate ? Number(t.startDate.slice(5, 7)) : 0;
      if (!m || !seasonMonths.has(m)) return false;
    }

    if (partyLo !== null) {
      // 元のDB条件: (partyHi==null OR partySizeMin<=partyHi)
      //           AND (partySizeMax IS NULL OR partySizeMax>=partyLo)
      if (partyHi !== null && !(t.partySizeMin <= partyHi)) return false;
      if (!(t.partySizeMax === null || t.partySizeMax >= partyLo)) return false;
    }

    return true;
  });

  const key: keyof Pick<DiscoverTrip, "savesCount" | "likesCount" | "trendScore"> =
    f.tab === "likes" ? "likesCount" : f.tab === "trend" ? "trendScore" : "savesCount";
  return out.sort((a, b) => b[key] - a[key]);
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { TripCardPhotos } from "@/components/TripCardPhotos";
import { GENRE_CATEGORIES, subgenresOf } from "@/lib/genres";
import {
  BUDGET_OPTIONS,
  INTL_OPTIONS,
  NIGHTS_OPTIONS,
  PARTY_OPTIONS,
  SEASON_OPTIONS,
  monthSeasonLabel,
} from "@/lib/trip-filters";
import {
  activeFilterCount,
  filtersToQuery,
  isPersonalTab,
  nextFilters,
  selectTrips,
  type DiscoverTrip,
  type Filters,
} from "@/lib/discover-filters";

const TABS = [
  { key: "saves", label: "保存が多い順" },
  { key: "trend", label: "ランキング順" },
  { key: "likes", label: "いいね順" },
  { key: "mine", label: "わたしの旅程" },
  { key: "saved", label: "保存済み" },
] as const;

function Chips({
  label,
  options,
  activeKey,
  onPick,
}: {
  label: string;
  options: readonly { key: string; label: string }[];
  activeKey: string;
  onPick: (key: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] tracking-wide text-ink-3">{label}</p>
      <div className="scrollbar-none flex gap-[7px] overflow-x-auto pb-0.5">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => onPick(o.key)}
            className={`shrink-0 rounded-full border px-[11px] py-1.5 text-[12px] font-medium ${
              o.key === activeKey
                ? "border-plan bg-plan text-white"
                : "border-line bg-surface-3 text-ink-2"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DiscoverClient({
  trips,
  savedIds,
  purchasedIds,
  userId,
  initialFilters,
}: {
  trips: DiscoverTrip[];
  savedIds: string[];
  purchasedIds: string[];
  userId: string | null;
  initialFilters: Filters;
}) {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [filtersOpen, setFiltersOpen] = useState(() => activeFilterCount(initialFilters) > 0);

  // フィルタが変わったらURLへ書き戻す（共有・ブックマーク・戻る操作のため）。
  // Nextのルーターは通さない＝サーバーへの往復なしでアドレスバーだけ更新する。
  useEffect(() => {
    const url = filtersToQuery(filters);
    if (typeof window !== "undefined" && window.location.pathname + window.location.search !== url) {
      window.history.replaceState(window.history.state, "", url);
    }
  }, [filters]);

  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);
  const purchasedSet = useMemo(() => new Set(purchasedIds), [purchasedIds]);

  const list = useMemo(
    () => selectTrips(trips, filters, { userId, savedIds }),
    [trips, filters, userId, savedIds]
  );

  const update = (overrides: Partial<Filters>) => setFilters((f) => nextFilters(f, overrides));

  const { tab, q, gcat, genre, intl, nights, party, season, budget } = filters;
  const personal = isPersonalTab(tab);
  const activeCount = activeFilterCount(filters);

  return (
    <div className="flex-1 overflow-y-auto bg-surface-3">
      {!personal && (
        <div className="mx-4 mt-3.5 flex items-center gap-2 rounded-[11px] border border-line bg-surface px-3 py-2 text-[13px]">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="shrink-0 text-ink-3">
            <circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M9.4 9.4 L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => update({ q: e.target.value.slice(0, 60) })}
            placeholder="行き先・キーワードで探す"
            className="min-w-0 flex-1 bg-transparent py-1 text-[13px] text-ink outline-none placeholder:text-ink-3"
          />
          {q && (
            <button
              type="button"
              onClick={() => update({ q: "" })}
              aria-label="キーワードを消す"
              className="shrink-0 text-ink-3"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      )}

      {!personal && (
        <details
          open={filtersOpen}
          onToggle={(e) => setFiltersOpen(e.currentTarget.open)}
          className="group mx-4 mt-2.5 rounded-[13px] border border-line bg-surface"
        >
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3.5 py-3 text-[13px] font-medium text-ink [&::-webkit-details-marker]:hidden">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M1.5 3 H12.5 M3.5 7 H10.5 M5.5 11 H8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            フィルタ
            {activeCount > 0 && (
              <span className="rounded-full bg-plan px-[7px] py-0.5 text-[10.5px] font-bold text-white">
                {activeCount}
              </span>
            )}
            {activeCount > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  update({
                    q: "",
                    gcat: "",
                    genre: "すべて",
                    budget: 0,
                    intl: "all",
                    nights: "all",
                    party: "all",
                    season: "all",
                  });
                }}
                className="text-[12px] font-normal text-ink-3 underline"
              >
                解除
              </button>
            )}
            <svg
              width="11"
              height="11"
              viewBox="0 0 11 11"
              aria-hidden="true"
              className="ml-auto shrink-0 text-ink-3 transition-transform group-open:rotate-180"
            >
              <path d="M1.5 3.5 L5.5 7.5 L9.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <div className="flex flex-col gap-3 border-t border-line-soft px-3.5 pb-3.5 pt-3">
            <Chips
              label="ジャンル（カテゴリ）"
              options={[{ key: "", label: "すべて" }, ...GENRE_CATEGORIES.map((c) => ({ key: c, label: c }))]}
              activeKey={gcat}
              onPick={(k) => update({ gcat: k })}
            />
            {gcat && (
              <Chips
                label={`${gcat} のなかで`}
                options={[
                  { key: "すべて", label: `${gcat}すべて` },
                  ...subgenresOf(gcat).map((g) => ({ key: g, label: g })),
                ]}
                activeKey={genre}
                onPick={(k) => update({ genre: k })}
              />
            )}
            <Chips label="国内・海外" options={INTL_OPTIONS} activeKey={intl} onPick={(k) => update({ intl: k as Filters["intl"] })} />
            <Chips label="日数" options={NIGHTS_OPTIONS} activeKey={nights} onPick={(k) => update({ nights: k as Filters["nights"] })} />
            <Chips label="人数" options={PARTY_OPTIONS} activeKey={party} onPick={(k) => update({ party: k as Filters["party"] })} />
            <Chips label="季節（行った月）" options={SEASON_OPTIONS} activeKey={season} onPick={(k) => update({ season: k as Filters["season"] })} />
            <Chips label="予算" options={BUDGET_OPTIONS} activeKey={String(budget)} onPick={(k) => update({ budget: Number(k) })} />
          </div>
        </details>
      )}

      <div className="flex flex-wrap gap-[5px] px-4 pb-0.5 pt-2.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => update({ tab: t.key })}
            className={`rounded-full border px-2.5 py-1 text-[11.5px] font-medium ${
              t.key === tab
                ? "border-transparent bg-plan-soft text-plan font-bold"
                : "border-transparent text-ink-3"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {personal && !userId ? (
        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <p className="text-[13px] text-ink-2">
            {tab === "mine" ? "自分の旅程" : "保存した旅程"}を見るにはログインしてください。
          </p>
          <SignInButton mode="modal">
            <button className="rounded-xl bg-plan px-6 py-3 text-[14px] font-bold text-white">ログインする</button>
          </SignInButton>
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-4 pb-5 pt-3">
          {list.length === 0 && (
            <p className="px-1 py-5 text-[13px] text-ink-3">
              {tab === "mine"
                ? "まだ投稿がありません。「つくる」から最初の旅程を作りましょう。"
                : tab === "saved"
                  ? "まだ保存した旅程がありません。気になる旅程を保存しましょう。"
                  : "この条件に合う旅程はまだありません。"}
            </p>
          )}
          {list.map((trip) => {
            const metric =
              tab === "likes"
                ? `${trip.likesCount} いいね`
                : tab === "trend"
                  ? `急上昇 ${trip.trendScore}`
                  : `${trip.savesCount} 保存`;
            const isSaved = savedSet.has(trip.id);
            const isPurchased = purchasedSet.has(trip.id);
            return (
              <Link
                key={trip.id}
                href={`/trips/${trip.id}`}
                className="overflow-hidden rounded-[14px] border border-line bg-surface text-left text-ink"
              >
                <TripCardPhotos photos={trip.coverPhotos} alt={trip.title} isSaved={isSaved} isPurchased={isPurchased} />
                <div className="px-[13px] pb-[13px] pt-[11px]">
                  <p className="mb-[5px] text-[14px] font-bold leading-[1.45]">{trip.title}</p>
                  <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-ink-2">
                    <span className="rounded-[5px] border border-line px-[7px] py-0.5">#{trip.genre}</span>
                    <span className="rounded-[5px] bg-surface-2 px-[7px] py-0.5 font-mono-num tabular-nums">
                      {trip.daysLabel}
                    </span>
                    {monthSeasonLabel(trip.startDate) && (
                      <span className="rounded-[5px] bg-surface-2 px-[7px] py-0.5">
                        {monthSeasonLabel(trip.startDate)}
                      </span>
                    )}
                    <span className="rounded-[5px] bg-surface-2 px-[7px] py-0.5">
                      {trip.international ? "海外" : "国内"}
                    </span>
                    <span className="rounded-[5px] bg-surface-2 px-[7px] py-0.5 font-mono-num tabular-nums">
                      {trip.partySizeMin}
                      {trip.partySizeMax ? `〜${trip.partySizeMax}` : "〜"}人
                    </span>
                    <span
                      className={`rounded-[5px] px-[7px] py-0.5 font-mono-num tabular-nums ${
                        isPurchased
                          ? "bg-plan-soft text-plan font-medium"
                          : trip.priceYen
                            ? "bg-money-soft text-money font-medium"
                            : "bg-plan-soft text-plan"
                      }`}
                    >
                      {isPurchased ? "購入済み" : trip.priceYen ? `¥${trip.priceYen}` : "無料"}
                    </span>
                    <span className="ml-auto">{metric}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

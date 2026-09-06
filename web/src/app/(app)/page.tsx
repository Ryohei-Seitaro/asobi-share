import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { and, desc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { getDb } from "@/db";
import { trips as tripsTable, tripSaves } from "@/db/schema";
import { getOrCreateUser } from "@/lib/auth";
import { ChatSuggest } from "@/components/ChatSuggest";
import { TripCardPhotos } from "@/components/TripCardPhotos";
import { GENRE_CATEGORIES, subgenresOf, categoryOf, isCategory, isSubgenre } from "@/lib/genres";
import {
  BUDGET_OPTIONS,
  INTL_OPTIONS,
  NIGHTS_OPTIONS,
  PARTY_OPTIONS,
  PARTY_RANGE,
  type IntlKey,
  type NightsKey,
  type PartyKey,
} from "@/lib/trip-filters";

const TABS = [
  { key: "saves", label: "保存が多い順", kind: "sort" },
  { key: "trend", label: "ランキング順", kind: "sort" },
  { key: "likes", label: "いいね順", kind: "sort" },
  { key: "mine", label: "わたしの旅程", kind: "personal" },
  { key: "saved", label: "保存済み", kind: "personal" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const SORT_COLUMN = {
  saves: tripsTable.savesCount,
  trend: tripsTable.trendScore,
  likes: tripsTable.likesCount,
} as const;

type Filters = {
  gcat: string; // ジャンルのカテゴリ（"" = すべて）
  genre: string; // ジャンルのサブジャンル（"すべて" = カテゴリ内すべて）
  tab: TabKey;
  budget: number; // 0 = すべて
  intl: IntlKey;
  nights: NightsKey;
  party: PartyKey;
};

function hrefFor(base: Filters, overrides: Partial<Filters>): string {
  const f = { ...base, ...overrides };
  // カテゴリを切り替えたらサブジャンルはリセット / サブジャンルを選んだらカテゴリを追従
  if (overrides.gcat !== undefined && overrides.genre === undefined) f.genre = "すべて";
  if (overrides.genre !== undefined && overrides.genre !== "すべて") {
    f.gcat = categoryOf(overrides.genre) ?? f.gcat;
  }
  const qs = new URLSearchParams();
  if (f.gcat) qs.set("gcat", f.gcat);
  if (f.genre !== "すべて") qs.set("genre", f.genre);
  if (f.tab !== "saves") qs.set("sort", f.tab);
  if (f.budget) qs.set("budget", String(f.budget));
  if (f.intl !== "all") qs.set("intl", f.intl);
  if (f.nights !== "all") qs.set("nights", f.nights);
  if (f.party !== "all") qs.set("party", f.party);
  const s = qs.toString();
  return s ? `/?${s}` : "/";
}

function FilterChips({
  label,
  options,
  activeKey,
  hrefFn,
}: {
  label: string;
  options: readonly { key: string; label: string }[];
  activeKey: string;
  hrefFn: (key: string) => string;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] tracking-wide text-ink-3">{label}</p>
      <div className="scrollbar-none flex gap-[7px] overflow-x-auto pb-0.5">
        {options.map((o) => (
          <Link
            key={o.key}
            href={hrefFn(o.key)}
            className={`shrink-0 rounded-full border px-[11px] py-1.5 text-[12px] font-medium ${
              o.key === activeKey
                ? "border-plan bg-plan text-white"
                : "border-line bg-surface-3 text-ink-2"
            }`}
          >
            {o.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{
    gcat?: string;
    genre?: string;
    sort?: string;
    budget?: string;
    intl?: string;
    nights?: string;
    party?: string;
  }>;
}) {
  const params = await searchParams;
  const tab: TabKey = TABS.find((t) => t.key === params.sort)?.key ?? "saves";
  const isPersonalTab = tab === "mine" || tab === "saved";
  const genre =
    !isPersonalTab && params.genre && isSubgenre(params.genre) ? params.genre : "すべて";
  const gcat =
    isPersonalTab
      ? ""
      : genre !== "すべて"
        ? (categoryOf(genre) ?? "")
        : params.gcat && isCategory(params.gcat)
          ? params.gcat
          : "";
  const budget = !isPersonalTab && params.budget ? Number(params.budget) : 0;
  const intl: IntlKey =
    !isPersonalTab && INTL_OPTIONS.some((o) => o.key === params.intl) ? (params.intl as IntlKey) : "all";
  const nights: NightsKey =
    !isPersonalTab && NIGHTS_OPTIONS.some((o) => o.key === params.nights)
      ? (params.nights as NightsKey)
      : "all";
  const party: PartyKey =
    !isPersonalTab && PARTY_OPTIONS.some((o) => o.key === params.party) ? (params.party as PartyKey) : "all";

  const filters: Filters = { gcat, genre, tab, budget, intl, nights, party };

  const db = getDb();
  const user = await getOrCreateUser();

  let list: (typeof tripsTable.$inferSelect)[] = [];
  if (tab === "mine") {
    if (user) {
      list = await db
        .select()
        .from(tripsTable)
        .where(eq(tripsTable.authorId, user.id))
        .orderBy(desc(tripsTable.savesCount));
    }
  } else if (tab === "saved") {
    if (user) {
      list = (
        await db
          .select({ trip: tripsTable })
          .from(tripSaves)
          .innerJoin(tripsTable, eq(tripSaves.tripId, tripsTable.id))
          .where(eq(tripSaves.userId, user.id))
          .orderBy(desc(tripSaves.createdAt))
      ).map((r) => r.trip);
    }
  } else {
    const conditions = [
      genre !== "すべて"
        ? eq(tripsTable.genre, genre)
        : gcat
          ? inArray(tripsTable.genre, subgenresOf(gcat))
          : undefined,
      budget ? or(eq(tripsTable.priceYen, 0), lte(tripsTable.priceYen, budget)) : undefined,
      intl === "domestic" ? eq(tripsTable.international, false) : undefined,
      intl === "international" ? eq(tripsTable.international, true) : undefined,
      nights === "0" ? eq(tripsTable.nights, 0) : undefined,
      nights === "1" ? eq(tripsTable.nights, 1) : undefined,
      nights === "2plus" ? gte(tripsTable.nights, 2) : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);

    if (party !== "all") {
      const [lo, hi] = PARTY_RANGE[party];
      const partyConditions = [
        hi != null ? lte(tripsTable.partySizeMin, hi) : undefined,
        or(isNull(tripsTable.partySizeMax), gte(tripsTable.partySizeMax, lo)),
      ].filter((c): c is NonNullable<typeof c> => c !== undefined);
      if (partyConditions.length) conditions.push(and(...partyConditions)!);
    }

    list = await db
      .select()
      .from(tripsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(SORT_COLUMN[tab]));
  }

  const savedTripIds = new Set(
    user
      ? (
          await db.select({ tripId: tripSaves.tripId }).from(tripSaves).where(eq(tripSaves.userId, user.id))
        ).map((r) => r.tripId)
      : []
  );

  const activeFilterCount = [
    genre !== "すべて" || !!gcat,
    !!budget,
    intl !== "all",
    nights !== "all",
    party !== "all",
  ].filter(Boolean).length;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2.5 border-b border-line-soft px-4 py-3.5">
        <h1 className="flex-1 font-display text-[17px] font-semibold">見つける</h1>
        <Link
          href="/search"
          aria-label="条件から探す"
          className="grid h-8 w-8 place-items-center rounded-[9px] border border-line text-ink-2"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">
            <circle cx="6.3" cy="6.3" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M9.6 9.6 L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto bg-surface-3">
        <div className="mx-4 mt-3.5 flex items-center gap-2 rounded-[11px] border border-line bg-surface px-3 py-2.5 text-[13px] text-ink-3">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M9.4 9.4 L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          行き先・キーワードで探す
        </div>

        {!isPersonalTab && (
          <details className="group mx-4 mt-2.5 rounded-[13px] border border-line bg-surface">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3.5 py-3 text-[13px] font-medium text-ink [&::-webkit-details-marker]:hidden">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path
                  d="M1.5 3 H12.5 M3.5 7 H10.5 M5.5 11 H8.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              フィルタ
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-plan px-[7px] py-0.5 text-[10.5px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
              {activeFilterCount > 0 && (
                <Link
                  href={hrefFor(filters, { gcat: "", genre: "すべて", budget: 0, intl: "all", nights: "all", party: "all" })}
                  className="text-[12px] font-normal text-ink-3 underline"
                >
                  解除
                </Link>
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
              <FilterChips
                label="ジャンル（カテゴリ）"
                options={[{ key: "", label: "すべて" }, ...GENRE_CATEGORIES.map((c) => ({ key: c, label: c }))]}
                activeKey={gcat}
                hrefFn={(k) => hrefFor(filters, { gcat: k })}
              />
              {gcat && (
                <FilterChips
                  label={`${gcat} のなかで`}
                  options={[
                    { key: "すべて", label: `${gcat}すべて` },
                    ...subgenresOf(gcat).map((g) => ({ key: g, label: g })),
                  ]}
                  activeKey={genre}
                  hrefFn={(k) => hrefFor(filters, { genre: k })}
                />
              )}
              <FilterChips
                label="国内・海外"
                options={INTL_OPTIONS}
                activeKey={intl}
                hrefFn={(k) => hrefFor(filters, { intl: k as IntlKey })}
              />
              <FilterChips
                label="日数"
                options={NIGHTS_OPTIONS}
                activeKey={nights}
                hrefFn={(k) => hrefFor(filters, { nights: k as NightsKey })}
              />
              <FilterChips
                label="人数"
                options={PARTY_OPTIONS}
                activeKey={party}
                hrefFn={(k) => hrefFor(filters, { party: k as PartyKey })}
              />
              <FilterChips
                label="予算"
                options={BUDGET_OPTIONS}
                activeKey={String(budget)}
                hrefFn={(k) => hrefFor(filters, { budget: Number(k) })}
              />
            </div>
          </details>
        )}

        <div className="flex flex-wrap gap-[5px] px-4 pb-0.5 pt-2.5">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={hrefFor(filters, { tab: t.key })}
              className={`rounded-full border px-2.5 py-1 text-[11.5px] font-medium ${
                t.key === tab
                  ? "border-transparent bg-plan-soft text-plan font-bold"
                  : "border-transparent text-ink-3"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {isPersonalTab && !user ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <p className="text-[13px] text-ink-2">
              {tab === "mine" ? "自分の旅程" : "保存した旅程"}を見るにはログインしてください。
            </p>
            <SignInButton mode="modal">
              <button className="rounded-xl bg-plan px-6 py-3 text-[14px] font-bold text-white">
                ログインする
              </button>
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
              const photos = trip.coverPhotos.length ? trip.coverPhotos : [];
              const isSaved = savedTripIds.has(trip.id);
              return (
                <Link
                  key={trip.id}
                  href={`/trips/${trip.id}`}
                  className="overflow-hidden rounded-[14px] border border-line bg-surface text-left text-ink"
                >
                  <TripCardPhotos photos={photos} alt={trip.title} isSaved={isSaved} />
                  <div className="px-[13px] pb-[13px] pt-[11px]">
                    <p className="mb-[5px] text-[14px] font-bold leading-[1.45]">{trip.title}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-ink-2">
                      <span className="rounded-[5px] border border-line px-[7px] py-0.5">#{trip.genre}</span>
                      <span className="rounded-[5px] bg-surface-2 px-[7px] py-0.5 font-mono-num tabular-nums">
                        {trip.daysLabel}
                      </span>
                      <span className="rounded-[5px] bg-surface-2 px-[7px] py-0.5">
                        {trip.international ? "海外" : "国内"}
                      </span>
                      <span className="rounded-[5px] bg-surface-2 px-[7px] py-0.5 font-mono-num tabular-nums">
                        {trip.partySizeMin}
                        {trip.partySizeMax ? `〜${trip.partySizeMax}` : "〜"}人
                      </span>
                      <span
                        className={`rounded-[5px] px-[7px] py-0.5 font-mono-num tabular-nums ${
                          trip.priceYen ? "bg-money-soft text-money font-medium" : "bg-plan-soft text-plan"
                        }`}
                      >
                        {trip.priceYen ? `¥${trip.priceYen}` : "無料"}
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
      <ChatSuggest />
    </div>
  );
}

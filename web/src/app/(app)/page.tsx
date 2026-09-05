import Link from "next/link";
import Image from "next/image";
import { and, desc, eq, lte, or } from "drizzle-orm";
import { getDb } from "@/db";
import { trips as tripsTable } from "@/db/schema";
import { ChatSuggest } from "@/components/ChatSuggest";

const GENRES = [
  "すべて",
  "デート",
  "国内旅行",
  "海外旅行",
  "合宿",
  "サークル遊び",
  "家族旅行",
  "山登り",
  "ゴルフ",
  "釣り",
  "キャンプ",
  "海",
  "川",
  "湖",
  "BBQ",
  "スノボ",
  "スキー",
  "ピックルボール",
];

const SORTS = [
  { key: "saves", label: "保存が多い順" },
  { key: "trend", label: "ランキング順" },
  { key: "likes", label: "いいね順" },
] as const;

type SortKey = (typeof SORTS)[number]["key"];

const SORT_COLUMN = {
  saves: tripsTable.savesCount,
  trend: tripsTable.trendScore,
  likes: tripsTable.likesCount,
} as const;

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string; sort?: string; budget?: string }>;
}) {
  const params = await searchParams;
  const genre = params.genre ?? "すべて";
  const sort: SortKey = (SORTS.find((s) => s.key === params.sort)?.key ?? "saves");
  const budget = params.budget ? Number(params.budget) : undefined;

  const db = getDb();
  const conditions = [
    genre === "すべて" ? undefined : eq(tripsTable.genre, genre),
    budget ? or(eq(tripsTable.priceYen, 0), lte(tripsTable.priceYen, budget)) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);

  const list = await db
    .select()
    .from(tripsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(SORT_COLUMN[sort]));

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

        {budget && (
          <div className="mx-4 mt-2.5 flex items-center gap-2 rounded-[11px] bg-plan-soft px-3 py-2 text-[12px] text-plan">
            <span>🔍 検索条件（予算¥{budget.toLocaleString()}以下）に合わせて絞り込み中</span>
            <Link href="/" className="ml-auto shrink-0 font-bold underline">
              解除
            </Link>
          </div>
        )}

        <div className="scrollbar-none flex gap-[7px] overflow-x-auto px-4 pb-1 pt-3.5">
          {GENRES.map((g) => (
            <Link
              key={g}
              href={g === "すべて" ? "/" : `/?genre=${encodeURIComponent(g)}${sort !== "saves" ? `&sort=${sort}` : ""}`}
              className={`shrink-0 rounded-full border px-[13px] py-1.5 text-[12.5px] font-medium ${
                g === genre
                  ? "border-plan bg-plan text-white"
                  : "border-line bg-surface text-ink-2"
              }`}
            >
              {g}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-[5px] px-4 pb-0.5 pt-2.5">
          {SORTS.map((s) => (
            <Link
              key={s.key}
              href={`/?sort=${s.key}${genre !== "すべて" ? `&genre=${encodeURIComponent(genre)}` : ""}`}
              className={`rounded-full border px-2.5 py-1 text-[11.5px] font-medium ${
                s.key === sort
                  ? "border-transparent bg-plan-soft text-plan font-bold"
                  : "border-transparent text-ink-3"
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-3 px-4 pb-5 pt-3">
          {list.length === 0 && (
            <p className="px-1 py-5 text-[13px] text-ink-3">このジャンルの旅程はまだありません。</p>
          )}
          {list.map((trip) => {
            const metric =
              sort === "likes"
                ? `${trip.likesCount} いいね`
                : sort === "trend"
                  ? `急上昇 ${trip.trendScore}`
                  : `${trip.savesCount} 保存`;
            const photos = trip.coverPhotos.length ? trip.coverPhotos : [];
            return (
              <Link
                key={trip.id}
                href={`/trips/${trip.id}`}
                className="overflow-hidden rounded-[14px] border border-line bg-surface text-left text-ink"
              >
                <div className="grid h-[104px] grid-cols-[2fr_1fr_1fr] gap-0.5">
                  {photos.map((url, i) => (
                    <span key={i} className="relative block overflow-hidden bg-surface-2">
                      <Image
                        src={url}
                        alt={trip.title}
                        fill
                        sizes="200px"
                        className="object-cover"
                      />
                    </span>
                  ))}
                </div>
                <div className="px-[13px] pb-[13px] pt-[11px]">
                  <p className="mb-[5px] text-[14px] font-bold leading-[1.45]">{trip.title}</p>
                  <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-ink-2">
                    <span className="rounded-[5px] border border-line px-[7px] py-0.5">#{trip.genre}</span>
                    <span className="rounded-[5px] bg-surface-2 px-[7px] py-0.5 font-mono-num tabular-nums">
                      {trip.daysLabel}
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
      </div>
      <ChatSuggest />
    </div>
  );
}

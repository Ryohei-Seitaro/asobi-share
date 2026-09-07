import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { trips as tripsTable, tripSaves, tripPurchases } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";
import { ChatSuggest } from "@/components/ChatSuggest";
import { DiscoverClient } from "@/components/DiscoverClient";
import { normalizeFilters } from "@/lib/discover-filters";

// Neon のサーバーレス Postgres はアイドルでゼロにスケールする。コールドスタート直後の
// 最初のクエリが一過性で失敗することがあるため、1回だけ短い待機を挟んで再試行する。
// それでも失敗したら投げて (app)/error.tsx に委ねる（reset で温まったDBへ再実行できる）。
async function withColdStartRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    await new Promise((r) => setTimeout(r, 700));
    return fn();
  }
}

// 見つける画面。フィルタ・タブ・並べ替え・検索は以前フルのサーバー遷移だったため
// 1操作ごとに DB 再クエリ + ページ再レンダリングが走っていた。ここでは候補となる
// 旅程を1回だけ取得してクライアントに渡し、絞り込みはブラウザ内で即時に行う。
export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initialFilters = normalizeFilters(params);

  const db = getDb();
  // 読み取り専用ページなので Clerk API を叩かず JWT から userId だけ取る。
  const userId = await getCurrentUserId();

  const [trips, savedRows, purchasedRows] = await withColdStartRetry(() =>
    Promise.all([
    db
      .select({
        id: tripsTable.id,
        authorId: tripsTable.authorId,
        title: tripsTable.title,
        genre: tripsTable.genre,
        startDate: tripsTable.startDate,
        daysLabel: tripsTable.daysLabel,
        nights: tripsTable.nights,
        international: tripsTable.international,
        partySizeMin: tripsTable.partySizeMin,
        partySizeMax: tripsTable.partySizeMax,
        coverPhotos: tripsTable.coverPhotos,
        priceYen: tripsTable.priceYen,
        savesCount: tripsTable.savesCount,
        likesCount: tripsTable.likesCount,
        trendScore: tripsTable.trendScore,
      })
      .from(tripsTable)
      .orderBy(desc(tripsTable.savesCount)),
    userId
      ? db
          .select({ tripId: tripSaves.tripId })
          .from(tripSaves)
          .where(eq(tripSaves.userId, userId))
          .orderBy(desc(tripSaves.createdAt))
      : Promise.resolve([] as { tripId: string }[]),
    userId
      ? db.select({ tripId: tripPurchases.tripId }).from(tripPurchases).where(eq(tripPurchases.userId, userId))
      : Promise.resolve([] as { tripId: string }[]),
    ])
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2.5 border-b border-line-soft px-4 py-3.5">
        <h1 className="flex-1 font-display text-[17px] font-semibold">見つける</h1>
      </div>

      <DiscoverClient
        trips={trips}
        savedIds={savedRows.map((r) => r.tripId)}
        purchasedIds={purchasedRows.map((r) => r.tripId)}
        userId={userId}
        initialFilters={initialFilters}
      />

      <ChatSuggest />
    </div>
  );
}

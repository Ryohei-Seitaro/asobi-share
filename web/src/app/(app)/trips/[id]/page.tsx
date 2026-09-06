import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { trips as tripsTable, tripSaves, tripLikes, tripPurchases, coinBalances } from "@/db/schema";
import { TripDetail } from "@/components/TripDetail";
import { getCurrentUserId } from "@/lib/auth";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();

  const trip = await db.query.trips.findFirst({
    where: eq(tripsTable.id, id),
    with: {
      author: true,
      days: {
        orderBy: (days, { asc }) => [asc(days.dayIndex)],
        with: {
          events: {
            orderBy: (events, { asc }) => [asc(events.orderIndex)],
            with: {
              photos: {
                orderBy: (photos, { asc }) => [asc(photos.orderIndex)],
              },
            },
          },
        },
      },
    },
  });

  if (!trip) notFound();

  const userId = await getCurrentUserId();
  let initialSaved = false;
  let initialLiked = false;
  let purchased = trip.priceYen === 0; // 無料旅程は購入済み扱い
  let coinBalance = 0;
  if (userId) {
    const isAuthor = trip.authorId === userId;
    const [saveRow, likeRow, purchaseRow, balanceRow] = await Promise.all([
      db.query.tripSaves.findFirst({ where: and(eq(tripSaves.tripId, id), eq(tripSaves.userId, userId)) }),
      db.query.tripLikes.findFirst({ where: and(eq(tripLikes.tripId, id), eq(tripLikes.userId, userId)) }),
      db.query.tripPurchases.findFirst({ where: and(eq(tripPurchases.tripId, id), eq(tripPurchases.userId, userId)) }),
      db.query.coinBalances.findFirst({ where: eq(coinBalances.userId, userId) }),
    ]);
    initialSaved = !!saveRow;
    initialLiked = !!likeRow;
    purchased = purchased || !!purchaseRow || isAuthor;
    coinBalance = balanceRow?.balance ?? 0;
  }

  // 未購入なら有料ライン以降のイベント本文をサーバー側で伏せる（クライアントに渡さない）。
  // 時間帯だけ残して「有料エリアの予定」のプレースホルダーにする。
  const paidFrom = trip.paidFromEventOrder;
  const safeTrip =
    !purchased && paidFrom != null
      ? {
          ...trip,
          days: trip.days.map((d) => ({
            ...d,
            events: d.events.map((ev) =>
              ev.orderIndex >= paidFrom
                ? {
                    ...ev,
                    title: "有料エリアの予定",
                    place: "",
                    detail: null,
                    caution: null,
                    mapUrl: null,
                    tabelogUrl: null,
                    photos: [],
                  }
                : ev
            ),
          })),
        }
      : trip;

  return (
    <TripDetail
      trip={safeTrip}
      initialSaved={initialSaved}
      initialLiked={initialLiked}
      isLoggedIn={!!userId}
      purchased={purchased}
      coinBalance={coinBalance}
    />
  );
}

import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { trips as tripsTable, tripSaves, tripLikes } from "@/db/schema";
import { TripDetail } from "@/components/TripDetail";
import { getOrCreateUser } from "@/lib/auth";

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

  const user = await getOrCreateUser();
  let initialSaved = false;
  let initialLiked = false;
  if (user) {
    const [saveRow, likeRow] = await Promise.all([
      db.query.tripSaves.findFirst({ where: and(eq(tripSaves.tripId, id), eq(tripSaves.userId, user.id)) }),
      db.query.tripLikes.findFirst({ where: and(eq(tripLikes.tripId, id), eq(tripLikes.userId, user.id)) }),
    ]);
    initialSaved = !!saveRow;
    initialLiked = !!likeRow;
  }

  return <TripDetail trip={trip} initialSaved={initialSaved} initialLiked={initialLiked} isLoggedIn={!!user} />;
}

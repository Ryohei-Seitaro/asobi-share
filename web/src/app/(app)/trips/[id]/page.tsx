import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { trips as tripsTable } from "@/db/schema";
import { TripDetail } from "@/components/TripDetail";

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

  return <TripDetail trip={trip} />;
}

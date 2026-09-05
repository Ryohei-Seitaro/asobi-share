import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { trips as tripsTable } from "@/db/schema";
import { ShareView } from "@/components/ShareView";

export default async function SharePage({
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
        with: { events: { orderBy: (events, { asc }) => [asc(events.orderIndex)] } },
      },
    },
  });
  if (!trip) notFound();

  const eventCount = trip.days.reduce((sum, d) => sum + d.events.length, 0);

  return (
    <ShareView
      tripId={trip.id}
      title={trip.title}
      authorName={trip.author.name}
      coverPhotos={trip.coverPhotos}
      savesCount={trip.savesCount}
      eventCount={eventCount}
    />
  );
}

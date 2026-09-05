import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { trips as tripsTable } from "@/db/schema";
import { getOrCreateUser } from "@/lib/auth";
import { TripEditor } from "@/components/TripEditor";

export default async function EditTripPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const user = await getOrCreateUser();
  if (!user) redirect("/create");

  const db = getDb();
  const trip = await db.query.trips.findFirst({
    where: eq(tripsTable.id, tripId),
    with: {
      days: {
        orderBy: (days, { asc }) => [asc(days.dayIndex)],
        with: {
          events: {
            orderBy: (events, { asc }) => [asc(events.orderIndex)],
          },
        },
      },
    },
  });

  if (!trip) notFound();
  if (trip.authorId !== user.id) redirect("/create");

  return <TripEditor trip={trip} />;
}

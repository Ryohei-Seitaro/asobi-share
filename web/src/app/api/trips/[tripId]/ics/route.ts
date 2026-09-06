import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { trips, tripDays, tripEvents } from "@/db/schema";
import { generateIcs, type IcsEventInput } from "@/lib/ics";

// 旅程をGoogleカレンダー互換の.icsとして書き出す。
// trip_daysに実日付を持たないため、今日を1日目としてdayIndex分だけ加算した日付を仮に割り当てる。
export async function GET(_req: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const db = getDb();

  const trip = await db.query.trips.findFirst({ where: eq(trips.id, tripId) });
  if (!trip) return new NextResponse("Not found", { status: 404 });

  const days = await db.query.tripDays.findMany({
    where: eq(tripDays.tripId, tripId),
    orderBy: (d, { asc }) => [asc(d.dayIndex)],
  });

  const baseDate = new Date();
  const events: IcsEventInput[] = [];

  for (const day of days) {
    const dayEvents = await db.query.tripEvents.findMany({
      where: eq(tripEvents.dayId, day.id),
      orderBy: (e, { asc }) => [asc(e.orderIndex)],
    });
    const d = new Date(baseDate);
    d.setDate(d.getDate() + day.dayIndex);
    const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

    for (const ev of dayEvents) {
      events.push({
        uid: `${ev.id}@asobi-share`,
        title: ev.title,
        location: ev.place,
        description: ev.detail,
        dateStr,
        startHHMM: ev.planStart,
        endHHMM: ev.planEnd,
      });
    }
  }

  const ics = generateIcs(trip.title, events);
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${trip.id}.ics"`,
    },
  });
}

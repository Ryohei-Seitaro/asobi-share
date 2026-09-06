import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { trips } from "@/db/schema";
import { generateIcs, type IcsEventInput } from "@/lib/ics";
import { buildTripCalendarEvents, nextSaturdayIso } from "@/lib/tripCalendar";

// 旅程をGoogleカレンダー互換の.icsとして書き出す。
// ?start=YYYY-MM-DD を1日目として各DAYの日付を割り当てる（未指定なら次の土曜）。
// Apple カレンダー / Outlook / TimeTree（モバイルの共有→カレンダーに追加）で取り込める。
export async function GET(req: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const db = getDb();

  const trip = await db.query.trips.findFirst({ where: eq(trips.id, tripId) });
  if (!trip) return new NextResponse("Not found", { status: 404 });

  const startParam = new URL(req.url).searchParams.get("start");
  const start = startParam && /^\d{4}-\d{2}-\d{2}$/.test(startParam) ? startParam : nextSaturdayIso();

  const calEvents = await buildTripCalendarEvents(tripId, start);
  const events: IcsEventInput[] = calEvents.map((e) => ({
    uid: e.uid,
    title: e.title,
    location: e.location,
    description: e.description,
    dateStr: e.dateCompact,
    startHHMM: e.startHHMM,
    endHHMM: e.endHHMM,
  }));

  const ics = generateIcs(trip.title, events);
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${trip.id}.ics"`,
    },
  });
}

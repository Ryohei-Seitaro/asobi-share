// 旅程（trip_days / trip_events）を、指定した開始日を1日目としてカレンダー予定の
// 配列に展開する。DAY N は開始日 + (N-1) 日にマッピングする。
// .ics 書き出し（api/trips/[tripId]/ics）と Google Calendar 直接登録の両方で使う。

import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { tripDays, tripEvents } from "@/db/schema";

export type TripCalendarEvent = {
  uid: string;
  title: string;
  location: string | null;
  description: string | null;
  dateIso: string; // "YYYY-MM-DD"
  dateCompact: string; // "YYYYMMDD"
  startHHMM: string; // "10:00"
  endHHMM: string; // "11:30"（開始より前なら開始と同値に丸める）
};

// "2026-05-16" → Date（ローカルタイム正午基準にして DST/タイムゾーンずれを避ける）
function parseIsoDate(iso: string): Date | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function buildTripCalendarEvents(
  tripId: string,
  startIso: string
): Promise<TripCalendarEvent[]> {
  const base = parseIsoDate(startIso) ?? new Date();
  const db = getDb();

  const days = await db.query.tripDays.findMany({
    where: eq(tripDays.tripId, tripId),
    orderBy: (d, { asc }) => [asc(d.dayIndex)],
  });

  const out: TripCalendarEvent[] = [];
  for (const day of days) {
    const events = await db.query.tripEvents.findMany({
      where: eq(tripEvents.dayId, day.id),
      orderBy: (e, { asc }) => [asc(e.orderIndex)],
    });

    const d = new Date(base);
    d.setDate(d.getDate() + day.dayIndex);
    const dateIso = fmtIso(d);
    const dateCompact = dateIso.replace(/-/g, "");

    for (const ev of events) {
      out.push({
        uid: `${ev.id}@asobi-share`,
        title: ev.title,
        location: ev.mapUrl || ev.place || null,
        description: ev.detail,
        dateIso,
        dateCompact,
        startHHMM: ev.planStart,
        endHHMM: ev.planEnd > ev.planStart ? ev.planEnd : ev.planStart,
      });
    }
  }
  return out;
}

// 「次の土曜日」の ISO 文字列。カレンダー追加ダイアログの初期値に使う。
export function nextSaturdayIso(from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 12, 0, 0);
  const delta = (6 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + delta);
  return fmtIso(d);
}

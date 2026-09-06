"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { getDb } from "@/db";
import { trips, tripDays, tripEvents } from "@/db/schema";
import { getOrCreateUser } from "@/lib/auth";
import { parseIcsEvents } from "@/lib/ics";
import { insertCalendarEvent } from "@/lib/googleCalendar";
import { DAYS_LABEL_TO_NIGHTS, nightsToLabel } from "@/lib/trip-filters";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function normalizeStartDate(v: FormDataEntryValue | null | undefined): string | null {
  const s = String(v ?? "").trim();
  return ISO_DATE.test(s) ? s : null;
}

export async function createTrip(formData: FormData) {
  const user = await getOrCreateUser();
  if (!user) throw new Error("ログインが必要です");

  const title = String(formData.get("title") ?? "").trim();
  const genre = String(formData.get("genre") ?? "").trim();
  const daysLabel = String(formData.get("daysLabel") ?? "日帰り").trim();
  const startDate = normalizeStartDate(formData.get("startDate"));
  const international = formData.get("scope") === "international";
  const partySizeMin = Math.max(1, Number(formData.get("partySizeMin") ?? 1) || 1);
  const partySizeMaxRaw = String(formData.get("partySizeMax") ?? "").trim();
  const partySizeMax = partySizeMaxRaw ? Math.max(partySizeMin, Number(partySizeMaxRaw)) : null;
  if (!title || !genre) throw new Error("タイトルとジャンルは必須です");

  const db = getDb();
  const [trip] = await db
    .insert(trips)
    .values({
      authorId: user.id,
      title,
      genre,
      startDate,
      daysLabel,
      nights: DAYS_LABEL_TO_NIGHTS[daysLabel] ?? 0,
      international,
      partySizeMin,
      partySizeMax,
      coverPhotos: [],
      visibility: "private",
    })
    .returning();

  await db.insert(tripDays).values({
    tripId: trip.id,
    dayIndex: 0,
    dateLabel: "",
    openTime: "08:00",
    closeTime: "22:00",
  });

  redirect(`/create/${trip.id}`);
}

// チャットの付箋（メモ取り込み）から旅程を一括作成する。
export async function createTripFromMemo(data: {
  title: string;
  genre: string;
  startDate?: string | null;
  coverPhotos: string[];
  days: {
    dateLabel: string;
    events: { title: string; place: string; start: string; end: string; detail: string }[];
  }[];
}) {
  const user = await getOrCreateUser();
  if (!user) throw new Error("ログインが必要です");

  const title = data.title.trim();
  const genre = data.genre.trim();
  const startDate = normalizeStartDate(data.startDate);
  if (!title || !genre) throw new Error("タイトルとジャンルは必須です");

  const db = getDb();
  const dayList = data.days.length > 0 ? data.days : [{ dateLabel: "", events: [] }];
  const nights = Math.max(0, dayList.length - 1);
  const daysLabel = nightsToLabel(nights);

  const [trip] = await db
    .insert(trips)
    .values({
      authorId: user.id,
      title,
      genre,
      startDate,
      daysLabel,
      nights,
      coverPhotos: data.coverPhotos,
      visibility: "private",
    })
    .returning();

  for (let i = 0; i < dayList.length; i++) {
    const d = dayList[i];
    const [dayRow] = await db
      .insert(tripDays)
      .values({
        tripId: trip.id,
        dayIndex: i,
        dateLabel: d.dateLabel,
        openTime: "08:00",
        closeTime: "22:00",
      })
      .returning();

    for (let j = 0; j < d.events.length; j++) {
      const ev = d.events[j];
      await db.insert(tripEvents).values({
        dayId: dayRow.id,
        orderIndex: j,
        title: ev.title,
        place: ev.place || ev.title,
        category: "other",
        planStart: ev.start,
        planEnd: ev.end,
        actualStart: ev.start,
        actualEnd: ev.end,
        detail: ev.detail || null,
      });
    }
  }

  redirect(`/create/${trip.id}`);
}

export async function addDay(tripId: string) {
  const db = getDb();
  const existing = await db.query.tripDays.findMany({ where: eq(tripDays.tripId, tripId) });
  await db.insert(tripDays).values({
    tripId,
    dayIndex: existing.length,
    dateLabel: "",
    openTime: "08:00",
    closeTime: "22:00",
  });
  // 日数は日付（DAY数）から自動で求める
  const nights = existing.length; // 追加後の日数 = existing.length + 1 → 泊数 = existing.length
  await db.update(trips).set({ nights, daysLabel: nightsToLabel(nights) }).where(eq(trips.id, tripId));
  revalidatePath(`/create/${tripId}`);
}

// 旅程の開始日（1日目の日付）を設定・変更する。
export async function setTripStartDate(tripId: string, startDate: string | null) {
  const value = normalizeStartDate(startDate);
  const db = getDb();
  await db.update(trips).set({ startDate: value }).where(eq(trips.id, tripId));
  revalidatePath(`/create/${tripId}`);
}

// http(s)以外のスキーム（javascript: 等）が紛れ込むのを防ぐ。
function sanitizeUrl(url: string | undefined | null): string | null {
  const trimmed = (url ?? "").trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

export async function addEvent(
  tripId: string,
  dayId: string,
  data: {
    title: string;
    place: string;
    mapUrl?: string;
    tabelogUrl?: string;
    planStart: string;
    planEnd: string;
    detail: string;
  }
) {
  const db = getDb();
  const existing = await db.query.tripEvents.findMany({ where: eq(tripEvents.dayId, dayId) });
  await db.insert(tripEvents).values({
    dayId,
    orderIndex: existing.length,
    title: data.title,
    place: data.place,
    mapUrl: sanitizeUrl(data.mapUrl),
    tabelogUrl: sanitizeUrl(data.tabelogUrl),
    category: "other",
    planStart: data.planStart,
    planEnd: data.planEnd,
    actualStart: data.planStart,
    actualEnd: data.planEnd,
    detail: data.detail || null,
  });
  revalidatePath(`/create/${tripId}`);
}

// Googleカレンダー等からエクスポートされた.icsを取り込み、指定の日に予定として追加する。
export async function importIcsToDay(
  tripId: string,
  dayId: string,
  icsText: string
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const parsed = parseIcsEvents(icsText);
  if (parsed.length === 0) {
    return { ok: false, error: "取り込める予定が見つかりませんでした（.icsファイルを確認してください）" };
  }

  const db = getDb();
  const existing = await db.query.tripEvents.findMany({ where: eq(tripEvents.dayId, dayId) });
  let order = existing.length;

  for (const ev of parsed) {
    await db.insert(tripEvents).values({
      dayId,
      orderIndex: order++,
      title: ev.title,
      place: ev.location ?? "",
      category: "other",
      planStart: ev.start,
      planEnd: ev.end > ev.start ? ev.end : ev.start,
      actualStart: ev.start,
      actualEnd: ev.end > ev.start ? ev.end : ev.start,
      detail: ev.description,
    });
  }

  revalidatePath(`/create/${tripId}`);
  return { ok: true, count: parsed.length };
}

// Google Calendar APIを使い、この旅程の全予定をユーザーのGoogleカレンダーに直接作成する。
// 事前にClerk側でGoogleソーシャル接続に calendar.events スコープを追加している必要がある。
export async function pushTripToGoogleCalendar(
  tripId: string
): Promise<{ ok: true; created: number; failed: number } | { ok: false; error: string }> {
  const user = await getOrCreateUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  const client = await clerkClient();
  const tokenList = await client.users.getUserOauthAccessToken(user.id, "google");
  const accessToken = tokenList.data[0]?.token;
  if (!accessToken) {
    return {
      ok: false,
      error:
        "Googleカレンダーへのアクセス許可が見つかりません。Googleアカウントでログインし直し、カレンダーへのアクセスを許可してください。",
    };
  }

  const db = getDb();
  const days = await db.query.tripDays.findMany({
    where: eq(tripDays.tripId, tripId),
    orderBy: (d, { asc }) => [asc(d.dayIndex)],
  });

  const baseDate = new Date();
  let created = 0;
  let failed = 0;

  for (const day of days) {
    const events = await db.query.tripEvents.findMany({
      where: eq(tripEvents.dayId, day.id),
      orderBy: (e, { asc }) => [asc(e.orderIndex)],
    });
    const d = new Date(baseDate);
    d.setDate(d.getDate() + day.dayIndex);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    for (const ev of events) {
      const result = await insertCalendarEvent(accessToken, {
        title: ev.title,
        location: ev.mapUrl || ev.place,
        description: ev.detail,
        dateStr,
        startHHMM: ev.planStart,
        endHHMM: ev.planEnd > ev.planStart ? ev.planEnd : ev.planStart,
      });
      if (result.ok) created++;
      else failed++;
    }
  }

  if (created === 0 && failed > 0) {
    return { ok: false, error: "Googleカレンダーへの登録にすべて失敗しました。カレンダーへのアクセス許可を確認してください。" };
  }
  return { ok: true, created, failed };
}

export async function setPaidFrom(tripId: string, orderIndex: number | null) {
  const db = getDb();
  await db.update(trips).set({ paidFromEventOrder: orderIndex }).where(eq(trips.id, tripId));
  revalidatePath(`/create/${tripId}`);
}

export async function publishTrip(
  tripId: string,
  data: {
    visibility: "public" | "friends" | "private";
    priceYen: number;
    priceCoin: number | null;
  }
) {
  const db = getDb();
  await db
    .update(trips)
    .set({ visibility: data.visibility, priceYen: data.priceYen, priceCoin: data.priceCoin })
    .where(eq(trips.id, tripId));
  redirect(`/trips/${tripId}`);
}

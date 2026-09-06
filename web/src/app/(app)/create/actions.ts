"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { trips, tripDays, tripEvents } from "@/db/schema";
import { getOrCreateUser } from "@/lib/auth";
import { DAYS_LABEL_TO_NIGHTS } from "@/lib/trip-filters";

export async function createTrip(formData: FormData) {
  const user = await getOrCreateUser();
  if (!user) throw new Error("ログインが必要です");

  const title = String(formData.get("title") ?? "").trim();
  const genre = String(formData.get("genre") ?? "").trim();
  const daysLabel = String(formData.get("daysLabel") ?? "日帰り").trim();
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
  revalidatePath(`/create/${tripId}`);
}

export async function addEvent(
  tripId: string,
  dayId: string,
  data: {
    title: string;
    place: string;
    category: "sightseeing" | "food" | "transport" | "other";
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
    category: data.category,
    planStart: data.planStart,
    planEnd: data.planEnd,
    actualStart: data.planStart,
    actualEnd: data.planEnd,
    detail: data.detail || null,
  });
  revalidatePath(`/create/${tripId}`);
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

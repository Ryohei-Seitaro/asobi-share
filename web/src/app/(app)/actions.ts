"use server";

import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { trips } from "@/db/schema";

const MOOD_GENRE: Record<string, string> = {
  まったり過ごしたい: "湖",
  体を動かしたい: "山登り",
  絶景が見たい: "海",
  おいしいものが食べたい: "デート",
  新しい発見がほしい: "ピックルボール",
};

export async function suggestTripByMood(mood: string) {
  const db = getDb();
  const genre = MOOD_GENRE[mood];

  let list = genre
    ? await db.select().from(trips).where(eq(trips.genre, genre)).orderBy(desc(trips.trendScore)).limit(1)
    : [];

  if (list.length === 0) {
    list = await db.select().from(trips).orderBy(desc(trips.trendScore)).limit(1);
  }

  const trip = list[0];
  if (!trip) return null;

  return {
    id: trip.id,
    title: trip.title,
    genre: trip.genre,
    coverPhoto: trip.coverPhotos[0] ?? null,
  };
}

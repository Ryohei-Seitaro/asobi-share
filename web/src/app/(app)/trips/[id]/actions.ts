"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { trips, tripSaves, tripLikes } from "@/db/schema";
import { getOrCreateUser } from "@/lib/auth";

export async function toggleSave(tripId: string): Promise<{ saved: boolean; savesCount: number }> {
  const user = await getOrCreateUser();
  if (!user) throw new Error("ログインが必要です");

  const db = getDb();
  const existing = await db.query.tripSaves.findFirst({
    where: and(eq(tripSaves.tripId, tripId), eq(tripSaves.userId, user.id)),
  });

  let saved: boolean;
  if (existing) {
    await db.delete(tripSaves).where(and(eq(tripSaves.tripId, tripId), eq(tripSaves.userId, user.id)));
    await db.update(trips).set({ savesCount: sql`${trips.savesCount} - 1` }).where(eq(trips.id, tripId));
    saved = false;
  } else {
    await db.insert(tripSaves).values({ tripId, userId: user.id });
    await db.update(trips).set({ savesCount: sql`${trips.savesCount} + 1` }).where(eq(trips.id, tripId));
    saved = true;
  }

  const [row] = await db.select({ savesCount: trips.savesCount }).from(trips).where(eq(trips.id, tripId));
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/");
  return { saved, savesCount: row.savesCount };
}

export async function toggleLike(tripId: string): Promise<{ liked: boolean; likesCount: number }> {
  const user = await getOrCreateUser();
  if (!user) throw new Error("ログインが必要です");

  const db = getDb();
  const existing = await db.query.tripLikes.findFirst({
    where: and(eq(tripLikes.tripId, tripId), eq(tripLikes.userId, user.id)),
  });

  let liked: boolean;
  if (existing) {
    await db.delete(tripLikes).where(and(eq(tripLikes.tripId, tripId), eq(tripLikes.userId, user.id)));
    await db.update(trips).set({ likesCount: sql`${trips.likesCount} - 1` }).where(eq(trips.id, tripId));
    liked = false;
  } else {
    await db.insert(tripLikes).values({ tripId, userId: user.id });
    await db.update(trips).set({ likesCount: sql`${trips.likesCount} + 1` }).where(eq(trips.id, tripId));
    liked = true;
  }

  const [row] = await db.select({ likesCount: trips.likesCount }).from(trips).where(eq(trips.id, tripId));
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/");
  return { liked, likesCount: row.likesCount };
}

"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { getDb } from "@/db";
import { trips, tripSaves, tripLikes, tripPurchases, coinBalances, coinTransactions } from "@/db/schema";
import { getOrCreateUser } from "@/lib/auth";
import { insertCalendarEvent } from "@/lib/googleCalendar";
import { buildTripCalendarEvents } from "@/lib/tripCalendar";

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

// 保存した旅程を、指定した開始日でユーザーのGoogleカレンダーに一括登録する。
// 事前にClerk側でGoogleソーシャル接続に calendar.events スコープを追加している必要がある。
export async function addTripToGoogleCalendar(
  tripId: string,
  startIso: string
): Promise<{ ok: true; created: number; failed: number } | { ok: false; error: string }> {
  const user = await getOrCreateUser();
  if (!user) return { ok: false, error: "ログインが必要です" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startIso)) return { ok: false, error: "日付の形式が正しくありません" };

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

  const events = await buildTripCalendarEvents(tripId, startIso);
  if (events.length === 0) return { ok: false, error: "登録できる予定がありません" };

  let created = 0;
  let failed = 0;
  for (const ev of events) {
    const result = await insertCalendarEvent(accessToken, {
      title: ev.title,
      location: ev.location,
      description: ev.description,
      dateStr: ev.dateIso,
      startHHMM: ev.startHHMM,
      endHHMM: ev.endHHMM,
    });
    if (result.ok) created++;
    else failed++;
  }

  if (created === 0 && failed > 0) {
    return {
      ok: false,
      error: "Googleカレンダーへの登録にすべて失敗しました。カレンダーへのアクセス許可を確認してください。",
    };
  }
  return { ok: true, created, failed };
}

export async function purchaseTrip(
  tripId: string,
  method: "yen" | "coin"
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getOrCreateUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  const db = getDb();

  const alreadyPurchased = await db.query.tripPurchases.findFirst({
    where: and(eq(tripPurchases.tripId, tripId), eq(tripPurchases.userId, user.id)),
  });
  if (alreadyPurchased) return { ok: true };

  const trip = await db.query.trips.findFirst({ where: eq(trips.id, tripId) });
  if (!trip) return { ok: false, error: "旅程が見つかりません" };
  if (trip.authorId === user.id) return { ok: true }; // 投稿者本人は購入不要

  if (method === "coin") {
    if (trip.priceCoin == null) return { ok: false, error: "コイン購入には対応していません" };
    const balanceRow = await db.query.coinBalances.findFirst({ where: eq(coinBalances.userId, user.id) });
    const balance = balanceRow?.balance ?? 0;
    if (balance < trip.priceCoin) {
      return { ok: false, error: "コインが不足しています。チャージしてから購入してください。" };
    }
    await db
      .update(coinBalances)
      .set({ balance: sql`${coinBalances.balance} - ${trip.priceCoin}` })
      .where(eq(coinBalances.userId, user.id));
    await db.insert(coinTransactions).values({
      userId: user.id,
      amount: -trip.priceCoin,
      type: "purchase",
      relatedTripId: tripId,
    });
    await db.insert(tripPurchases).values({
      tripId,
      userId: user.id,
      paidWith: "coin",
      amount: trip.priceCoin,
    });
  } else {
    // 円決済: 決済プロバイダ未統合のためモックとして記録のみ行う
    await db.insert(tripPurchases).values({
      tripId,
      userId: user.id,
      paidWith: "yen",
      amount: trip.priceYen,
    });
  }

  revalidatePath(`/trips/${tripId}`);
  return { ok: true };
}

import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { coinBalances, users } from "@/db/schema";

// 読み取り専用ページ用：ログイン中ユーザーのIDだけを返す。
// auth() はミドルウェアが検証済みのセッションJWTから読むだけなので、
// Clerk Backend API への往復が発生しない（currentUser() は往復する）。
// 未ログインは null。
export async function getCurrentUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

// ClerkでログインしたユーザーをDBのusersテーブルと紐付ける。
// 既存レコードがあればそれを返す（idはClerkのuserIdなのでPK1発の参照だけ）。
// 無ければClerkのプロフィールを取得して作成する（初回アクセス時のみ。
// Clerk Webhookの代わりにオンデマンド作成）。
export async function getOrCreateUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const db = getDb();
  const existing = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (existing) return existing;

  // ここに来るのは初回アクセスのユーザーだけ。名前・アバターのために
  // ここで初めて Clerk Backend API を叩く。
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const name =
    clerkUser.firstName ?? clerkUser.username ?? clerkUser.emailAddresses[0]?.emailAddress ?? "ゲスト";

  const [created] = await db
    .insert(users)
    .values({ id: clerkUser.id, name, avatarUrl: clerkUser.imageUrl })
    .returning();

  await db.insert(coinBalances).values({ userId: clerkUser.id, balance: 0 }).onConflictDoNothing();

  return created;
}

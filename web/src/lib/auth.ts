import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { coinBalances, users } from "@/db/schema";

// ClerkでログインしたユーザーをDBのusersテーブルと紐付ける。
// 初回アクセス時にレコードがなければ作成する（Clerk Webhookの代わりにオンデマンド作成）。
export async function getOrCreateUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const db = getDb();
  const existing = await db.query.users.findFirst({ where: eq(users.id, clerkUser.id) });
  if (existing) return existing;

  const name =
    clerkUser.firstName ?? clerkUser.username ?? clerkUser.emailAddresses[0]?.emailAddress ?? "ゲスト";

  const [created] = await db
    .insert(users)
    .values({ id: clerkUser.id, name, avatarUrl: clerkUser.imageUrl })
    .returning();

  await db.insert(coinBalances).values({ userId: clerkUser.id, balance: 0 }).onConflictDoNothing();

  return created;
}

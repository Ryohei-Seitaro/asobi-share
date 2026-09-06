"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { coinBalances, coinTransactions, payoutAccounts, payoutRequests } from "@/db/schema";
import { getOrCreateUser } from "@/lib/auth";

const YEN_PER_COIN = 2;

// 円決済は決済プロバイダ未統合のためモックとして記録のみ行う（購入フローと同様の扱い）
export async function chargeCoin(amountYen: number): Promise<{ ok: true; balance: number } | { ok: false; error: string }> {
  const user = await getOrCreateUser();
  if (!user) return { ok: false, error: "ログインが必要です" };
  if (!Number.isFinite(amountYen) || amountYen < 100) {
    return { ok: false, error: "チャージ額は100円以上で指定してください" };
  }

  const db = getDb();
  const coinAmount = Math.round(amountYen / YEN_PER_COIN);

  await db
    .insert(coinBalances)
    .values({ userId: user.id, balance: coinAmount })
    .onConflictDoUpdate({
      target: coinBalances.userId,
      set: { balance: sql`${coinBalances.balance} + ${coinAmount}` },
    });

  await db.insert(coinTransactions).values({
    userId: user.id,
    amount: coinAmount,
    type: "charge",
  });

  const row = await db.query.coinBalances.findFirst({ where: eq(coinBalances.userId, user.id) });
  revalidatePath("/me");
  revalidatePath("/me/charge");
  return { ok: true, balance: row?.balance ?? coinAmount };
}

export async function savePayoutAccount(data: {
  bankName: string;
  branchName: string;
  accountType: "ordinary" | "checking";
  accountNumber: string;
  accountHolder: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getOrCreateUser();
  if (!user) return { ok: false, error: "ログインが必要です" };

  const bankName = data.bankName.trim();
  const branchName = data.branchName.trim();
  const accountNumber = data.accountNumber.trim();
  const accountHolder = data.accountHolder.trim();
  if (!bankName || !branchName || !accountNumber || !accountHolder) {
    return { ok: false, error: "すべての項目を入力してください" };
  }
  if (!/^\d{1,8}$/.test(accountNumber)) {
    return { ok: false, error: "口座番号は数字のみで入力してください" };
  }

  const db = getDb();
  await db
    .insert(payoutAccounts)
    .values({
      userId: user.id,
      bankName,
      branchName,
      accountType: data.accountType,
      accountNumber,
      accountHolder,
    })
    .onConflictDoUpdate({
      target: payoutAccounts.userId,
      set: {
        bankName,
        branchName,
        accountType: data.accountType,
        accountNumber,
        accountHolder,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/me/payout");
  return { ok: true };
}

export async function requestPayout(amountYen: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getOrCreateUser();
  if (!user) return { ok: false, error: "ログインが必要です" };
  if (!Number.isFinite(amountYen) || amountYen < 1) {
    return { ok: false, error: "申請額が不正です" };
  }

  const db = getDb();
  const account = await db.query.payoutAccounts.findFirst({ where: eq(payoutAccounts.userId, user.id) });
  if (!account) return { ok: false, error: "先に振込先口座を登録してください" };

  await db.insert(payoutRequests).values({
    userId: user.id,
    amountYen,
    status: "pending",
  });

  revalidatePath("/me");
  revalidatePath("/me/payout");
  return { ok: true };
}

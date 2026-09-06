import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { coinBalances } from "@/db/schema";
import { getOrCreateUser } from "@/lib/auth";
import { CoinChargeView } from "@/components/CoinChargeView";

export default async function ChargePage({
  searchParams,
}: {
  searchParams: Promise<{ return?: string; need?: string }>;
}) {
  const user = await getOrCreateUser();
  if (!user) redirect("/me");

  const { return: returnParam, need } = await searchParams;

  // オープンリダイレクト防止：自サイト内の絶対パス（`/...`）のみ許可する
  const returnTo =
    returnParam && returnParam.startsWith("/") && !returnParam.startsWith("//")
      ? returnParam
      : null;

  const needNum = need ? Number(need) : NaN;
  const needCoin = Number.isFinite(needNum) && needNum > 0 ? Math.ceil(needNum) : null;

  const db = getDb();
  const balanceRow = await db.query.coinBalances.findFirst({ where: eq(coinBalances.userId, user.id) });

  return (
    <CoinChargeView
      initialBalance={balanceRow?.balance ?? 0}
      returnTo={returnTo}
      needCoin={needCoin}
    />
  );
}

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { coinBalances } from "@/db/schema";
import { getOrCreateUser } from "@/lib/auth";
import { CoinChargeView } from "@/components/CoinChargeView";

export default async function ChargePage() {
  const user = await getOrCreateUser();
  if (!user) redirect("/me");

  const db = getDb();
  const balanceRow = await db.query.coinBalances.findFirst({ where: eq(coinBalances.userId, user.id) });

  return <CoinChargeView initialBalance={balanceRow?.balance ?? 0} />;
}

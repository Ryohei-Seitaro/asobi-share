import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { payoutAccounts, payoutRequests, trips as tripsTable } from "@/db/schema";
import { getOrCreateUser } from "@/lib/auth";
import { PayoutView } from "@/components/PayoutView";

export default async function PayoutPage() {
  const user = await getOrCreateUser();
  if (!user) redirect("/me");

  const db = getDb();

  const myTrips = await db.select().from(tripsTable).where(eq(tripsTable.authorId, user.id));
  const paidSalesYen = myTrips.filter((t) => t.priceYen > 0).reduce((sum, t) => sum + t.priceYen, 0);
  const availableYen = Math.round(paidSalesYen * 0.85);

  const account = await db.query.payoutAccounts.findFirst({ where: eq(payoutAccounts.userId, user.id) });
  const requests = await db.query.payoutRequests.findMany({
    where: eq(payoutRequests.userId, user.id),
    orderBy: desc(payoutRequests.createdAt),
  });

  return (
    <PayoutView
      initialAccount={
        account
          ? {
              bankName: account.bankName,
              branchName: account.branchName,
              accountType: account.accountType as "ordinary" | "checking",
              accountNumber: account.accountNumber,
              accountHolder: account.accountHolder,
            }
          : null
      }
      availableYen={availableYen}
      requests={requests.map((r) => ({
        id: r.id,
        amountYen: r.amountYen,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      }))}
    />
  );
}

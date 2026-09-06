import Image from "next/image";
import Link from "next/link";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { coinBalances, trips as tripsTable } from "@/db/schema";
import { getOrCreateUser } from "@/lib/auth";

export default async function MePage() {
  const user = await getOrCreateUser();

  if (!user) {
    return (
      <>
        <div className="border-b border-line-soft px-4 py-3.5">
          <h1 className="font-display text-[17px] font-semibold">マイページ</h1>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-[13px] text-ink-2">
            自分の旅程・保存数・コイン残高を見るにはログインしてください。
          </p>
          <SignInButton mode="modal">
            <button className="rounded-xl bg-plan px-6 py-3 text-[14px] font-bold text-white">
              ログインする
            </button>
          </SignInButton>
        </div>
      </>
    );
  }

  const db = getDb();
  const [myTrips, balanceRow] = await Promise.all([
    db
      .select()
      .from(tripsTable)
      .where(eq(tripsTable.authorId, user.id))
      .orderBy(desc(tripsTable.savesCount)),
    db.query.coinBalances.findFirst({ where: eq(coinBalances.userId, user.id) }),
  ]);
  const coinBalance = balanceRow?.balance ?? 0;

  const totalSaves = myTrips.reduce((sum, t) => sum + t.savesCount, 0);
  const totalLikes = myTrips.reduce((sum, t) => sum + t.likesCount, 0);
  const paidSalesYen = myTrips
    .filter((t) => t.priceYen > 0)
    .reduce((sum, t) => sum + t.priceYen, 0);

  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-line-soft px-4 py-3.5">
        <h1 className="flex-1 font-display text-[17px] font-semibold">マイページ</h1>
        <UserButton />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center gap-3 border-b border-line-soft bg-surface px-4 py-[18px]">
          {user.avatarUrl ? (
            <span className="relative block h-[52px] w-[52px] shrink-0 overflow-hidden rounded-full">
              <Image src={user.avatarUrl} alt={user.name} fill className="object-cover" />
            </span>
          ) : (
            <span className="h-[52px] w-[52px] shrink-0 rounded-full bg-gradient-to-br from-[#8FB4E8] to-[#C79BD8]" />
          )}
          <div>
            <h3 className="text-[16px] font-bold">{user.name}</h3>
            <p className="mt-0.5 text-[11.5px] text-ink-3">旅程 {myTrips.length}本</p>
          </div>
        </div>

        <div className="grid grid-cols-3 border-b border-line-soft bg-surface">
          <Stat value={totalSaves} label="保存された数" highlight />
          <Stat value={totalLikes} label="いいねされた数" />
          <Stat value={myTrips.length} label="旅程" />
        </div>

        <p className="px-4 pb-1.5 pt-4 text-[11px] tracking-wide text-ink-3">今月の受け取り</p>
        <div className="mx-4 rounded-[13px] border border-line bg-surface p-3.5">
          <span className="block font-mono-num text-[26px] font-medium tabular-nums text-money">
            ¥{Math.round(paidSalesYen * 0.85).toLocaleString()}
          </span>
          <span className="mb-[11px] block text-[11px] text-ink-3">有料旅程の売上</span>
          <Row label={`有料旅程の売上（${myTrips.filter((t) => t.priceYen > 0).length}件）`} value={`¥${paidSalesYen.toLocaleString()}`} />
          <Row label="手数料（15%）" value={`−¥${Math.round(paidSalesYen * 0.15).toLocaleString()}`} />
          <Link
            href="/me/payout"
            className="mt-[11px] block w-full rounded-[10px] border border-money py-2.5 text-center text-[13px] font-bold text-money"
          >
            受け取る
          </Link>
        </div>

        <div className="mx-4 mt-2.5 rounded-[13px] border border-line bg-surface p-3.5">
          <span className="block font-mono-num text-[26px] font-medium tabular-nums text-coin">
            🪙 {coinBalance.toLocaleString()}
          </span>
          <span className="mb-[11px] block text-[11px] text-ink-3">保有コイン残高</span>
          <Link
            href="/me/charge"
            className="mt-[11px] block w-full rounded-[10px] border border-coin py-2.5 text-center text-[13px] font-bold text-coin"
          >
            コインをチャージする
          </Link>
        </div>
      </div>
    </>
  );
}

function Stat({ value, label, highlight }: { value: number; label: string; highlight?: boolean }) {
  return (
    <div className="border-r border-line-soft py-[13px] text-center last:border-r-0">
      <b className={`block font-mono-num text-[19px] font-medium tabular-nums ${highlight ? "text-plan" : ""}`}>
        {value.toLocaleString()}
      </b>
      <span className="text-[10.5px] text-ink-3">{label}</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-t border-line-soft py-[5px] text-[12px] text-ink-2">
      <span>{label}</span>
      <b className="font-mono-num font-medium tabular-nums text-ink">{value}</b>
    </div>
  );
}

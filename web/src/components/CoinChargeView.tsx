"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { chargeCoin } from "@/app/(app)/me/actions";

const AMOUNTS = [500, 1000, 3000, 5000, 10000];
const YEN_PER_COIN = 2;

export function CoinChargeView({
  initialBalance,
  returnTo = null,
  needCoin = null,
}: {
  initialBalance: number;
  returnTo?: string | null;
  needCoin?: number | null;
}) {
  const router = useRouter();

  // 記事から「不足分をチャージ」で来た場合、初期の金額を不足分にあわせておく
  const suggestedYen = needCoin
    ? Math.max(100, Math.ceil((needCoin * YEN_PER_COIN) / 100) * 100)
    : null;

  const [amountYen, setAmountYen] = useState(1000);
  const [customYen, setCustomYen] = useState(suggestedYen ? String(suggestedYen) : "");
  const [balance, setBalance] = useState(initialBalance);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const effectiveYen = customYen ? Number(customYen) : amountYen;
  const coinAmount = Math.round((effectiveYen || 0) / YEN_PER_COIN);

  // チャージ完了後、元の記事へ自動で戻す（「一時的に遷移」の挙動）。
  // router.refresh() で戻り先のコイン残高を最新化する。
  useEffect(() => {
    if (!done || !returnTo) return;
    const t = setTimeout(() => {
      router.push(returnTo);
      router.refresh();
    }, 1400);
    return () => clearTimeout(t);
  }, [done, returnTo, router]);

  function submit() {
    setError(null);
    setDone(false);
    startTransition(async () => {
      const result = await chargeCoin(effectiveYen, returnTo ?? undefined);
      if (result.ok) {
        setBalance(result.balance);
        setDone(true);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-line-soft px-4 py-3.5">
        <Link
          href={returnTo ?? "/me"}
          aria-label={returnTo ? "元の画面へ戻る" : "マイページへ戻る"}
          className="grid h-8 w-8 place-items-center rounded-[9px] border border-line text-ink-2"
        >
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path d="M9 1 L3 7 L9 13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="font-display text-[17px] font-semibold">コインをチャージ</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-[18px]">
        {needCoin != null && !done && (
          <div className="mb-4 rounded-[11px] border border-coin bg-coin-soft px-3.5 py-3 text-[12.5px] leading-[1.6] text-ink-2">
            この記事を読むには、あと
            <b className="font-mono-num tabular-nums text-coin"> 🪙{needCoin.toLocaleString()} </b>
            必要です。下の金額はその不足分にあわせています。
          </div>
        )}

        <div className="mb-4 rounded-[13px] border border-line bg-surface p-3.5 text-center">
          <span className="block font-mono-num text-[26px] font-medium tabular-nums text-coin">
            🪙 {balance.toLocaleString()}
          </span>
          <span className="text-[11px] text-ink-3">現在の残高</span>
        </div>

        <p className="mb-2 text-[11px] tracking-wide text-ink-3">チャージ額を選ぶ（¥{YEN_PER_COIN} = 🪙1）</p>
        <div className="mb-3.5 grid grid-cols-3 gap-2">
          {AMOUNTS.map((y) => (
            <button
              key={y}
              onClick={() => {
                setAmountYen(y);
                setCustomYen("");
                setDone(false);
              }}
              className={`rounded-[10px] border py-3 text-center text-[13px] font-bold ${
                !customYen && amountYen === y ? "border-coin bg-coin-soft text-coin" : "border-line bg-surface text-ink-2"
              }`}
            >
              ¥{y.toLocaleString()}
            </button>
          ))}
        </div>

        <label htmlFor="custom-yen" className="mb-1.5 block text-[11px] tracking-wide text-ink-3">
          金額を自分で指定する
        </label>
        <input
          id="custom-yen"
          type="number"
          min={100}
          step={100}
          placeholder="例：2500"
          value={customYen}
          onChange={(e) => {
            setCustomYen(e.target.value);
            setDone(false);
          }}
          className="mb-3.5 w-full rounded-[9px] border border-line bg-surface-3 px-[11px] py-[9px] text-[13.5px] text-ink"
        />

        <div className="mb-4 rounded-[10px] border border-line bg-surface-3 p-[11px] text-[12.5px] text-ink-2">
          <div className="flex justify-between">
            <span>チャージ額</span>
            <b className="font-mono-num tabular-nums text-ink">¥{(effectiveYen || 0).toLocaleString()}</b>
          </div>
          <div className="mt-[5px] flex justify-between">
            <span>付与コイン</span>
            <b className="font-mono-num tabular-nums text-coin">🪙 {coinAmount.toLocaleString()}</b>
          </div>
        </div>

        {error && <p className="mb-3 text-[12px] leading-[1.5] text-actual">{error}</p>}
        {done && !error && (
          <p className="mb-3 text-[12px] leading-[1.5] text-coin">
            チャージが完了しました。{returnTo ? "記事に戻ります…" : ""}
          </p>
        )}

        {done && returnTo ? (
          <button
            onClick={() => {
              router.push(returnTo);
              router.refresh();
            }}
            className="w-full rounded-xl bg-coin py-[14px] text-[14.5px] font-bold text-white"
          >
            記事に戻る
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={isPending || !effectiveYen || effectiveYen < 100}
            className="w-full rounded-xl bg-coin py-[14px] text-[14.5px] font-bold text-white disabled:opacity-50"
          >
            この内容でチャージする
          </button>
        )}
        <p className="mt-3 text-[11px] leading-[1.6] text-ink-3">
          決済プロバイダは未接続のため、現在は記録のみのモック処理です。
        </p>
      </div>
    </>
  );
}
